import { describe, expect, it } from 'vitest';
import type { Account, Category, Data, Profile, Recurring, Transaction } from '../types';
import {
  accountBalances, addMonthsClamped, budgetAlerts, budgetStatus, careerByMonth, careerTotal, categoryBudgets,
  dailySpend, daysLeftInMonth, dueOccurrences, filterTransactions, goalProgress, groupByDay, incomeVsExpense,
  monthTotals, recurringToCreate, safePerDay, shiftMonth, spendByCategory, todaySummary, totalBudget,
} from './budget';

const NOW = 1;
function cat(id: string, kind: 'expense' | 'income', monthlyBudget = 0, career = false, order = 0): Category {
  return { id, name: id[0].toUpperCase() + id.slice(1), icon: id, color: 'var(--c1)', kind, monthlyBudget, career, order, updatedAt: NOW };
}
let seq = 0;
function tx(p: Partial<Transaction> & Pick<Transaction, 'amount' | 'date'>): Transaction {
  return { id: `t${++seq}`, type: 'expense', category: 'food', account: 'upi', career: false, updatedAt: seq, ...p };
}
function acc(id: string, openingBalance: number): Account {
  return { id, name: id, kind: 'upi', openingBalance, updatedAt: NOW };
}
function data(txs: Transaction[], cats: Category[] = [], monthlyBudget = 0, accounts: Account[] = []): Data {
  const d = {
    profile: { me: { id: 'me', monthlyBudget, updatedAt: NOW } as Profile },
    habits: {}, days: {}, workouts: {}, measurements: {}, photos: {}, reviews: {}, milestones: {}, checklists: {},
    transactions: Object.fromEntries(txs.map((t) => [t.id, t])),
    categories: Object.fromEntries(cats.map((c) => [c.id, c])),
    accounts: Object.fromEntries(accounts.map((a) => [a.id, a])),
    recurring: {}, goals: {}, plans: {},
  };
  return d as Data;
}

describe('months', () => {
  it('shifts across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-10', 3)).toBe('2027-01');
    expect(shiftMonth('2026-10', -12)).toBe('2025-10');
  });
  it('counts days left including today', () => {
    expect(daysLeftInMonth('2026-10-07')).toBe(25);
    expect(daysLeftInMonth('2026-10-31')).toBe(1);
    expect(daysLeftInMonth('2026-02-01')).toBe(28);
  });
  it('clamps month adds to the month end', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsClamped('2026-12-15', 1)).toBe('2027-01-15');
  });
});

describe('month totals and categories', () => {
  const d = data([
    tx({ amount: 450, date: '2026-10-08', category: 'grooming', career: true }),
    tx({ amount: 200, date: '2026-10-08', category: 'food' }),
    tx({ amount: 300, date: '2026-10-02', category: 'food' }),
    tx({ amount: 25000, date: '2026-10-01', type: 'income', category: 'salary' }),
    tx({ amount: 1000, date: '2026-10-03', type: 'transfer', category: '', account: 'bank', toAccount: 'cash' }),
    tx({ amount: 999, date: '2026-09-30', category: 'food' }),
  ]);
  it('totals income, expense and net, ignoring transfers and other months', () => {
    expect(monthTotals(d, '2026-10')).toEqual({ income: 25000, expense: 950, net: 24050 });
  });
  it('sums spend by category', () => {
    expect(spendByCategory(d, '2026-10')).toEqual({ grooming: 450, food: 500 });
  });
  it('totals career investment by month', () => {
    expect(careerTotal(d, '2026-10')).toBe(450);
    expect(careerByMonth(d, '2026-10', 2)).toEqual([{ month: '2026-09', total: 0 }, { month: '2026-10', total: 450 }]);
  });
  it('lists daily spend for every day of the month', () => {
    const days = dailySpend(d, '2026-10');
    expect(days).toHaveLength(31);
    expect(days[7]).toEqual({ date: '2026-10-08', total: 650 });
    expect(days[1].total).toBe(300);
    expect(days[2].total).toBe(0);
  });
  it('gives income vs expense for 6 months, oldest first', () => {
    const r = incomeVsExpense(d, '2026-10');
    expect(r.map((m) => m.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(r[4]).toEqual({ month: '2026-09', income: 0, expense: 999, net: -999 });
    expect(r[5].income).toBe(25000);
  });
});

describe('budget status', () => {
  it('is ok under 80 %, warn from 80 %, over from 100 %', () => {
    expect(budgetStatus(799, 1000)).toBe('ok');
    expect(budgetStatus(800, 1000)).toBe('warn');
    expect(budgetStatus(999, 1000)).toBe('warn');
    expect(budgetStatus(1000, 1000)).toBe('over');
    expect(budgetStatus(5000, 0)).toBe('ok');
  });
  it('reports per-category spent vs budget and alerts worst first', () => {
    const d = data(
      [tx({ amount: 4200, date: '2026-10-05', category: 'food' }), tx({ amount: 1100, date: '2026-10-05', category: 'gym' })],
      [cat('food', 'expense', 5000, false, 1), cat('gym', 'expense', 1000, true, 2), cat('fun', 'expense', 2000, false, 3)],
    );
    const b = categoryBudgets(d, '2026-10');
    expect(b.map((x) => [x.category.id, x.spent, x.status])).toEqual([['food', 4200, 'warn'], ['gym', 1100, 'over'], ['fun', 0, 'ok']]);
    expect(budgetAlerts(d, '2026-10').map((x) => x.category.id)).toEqual(['gym', 'food']);
  });
});

describe('safe per day', () => {
  it('uses the sum of category budgets', () => {
    // budget 8000, spent 1000, 7 Oct → 25 days left: 7000 / 25 = 280
    const d = data([tx({ amount: 1000, date: '2026-10-03' })], [cat('food', 'expense', 5000), cat('fun', 'expense', 3000)], 20000);
    expect(totalBudget(d)).toBe(8000);
    expect(safePerDay(d, '2026-10-07')).toBe(280);
  });
  it('falls back to profile.monthlyBudget when no category budgets are set', () => {
    // 15500 − 3000 = 12500; 7 Oct → 25 days left: 500
    const d = data([tx({ amount: 3000, date: '2026-10-01' })], [cat('food', 'expense')], 15500);
    expect(totalBudget(d)).toBe(15500);
    expect(safePerDay(d, '2026-10-07')).toBe(500);
  });
  it('is never negative', () => {
    const d = data([tx({ amount: 9000, date: '2026-10-01' })], [], 5000);
    expect(safePerDay(d, '2026-10-07')).toBe(0);
  });
  it('summarises today for the Today strip', () => {
    // budget 10000; spent before today 2500; today 250 → left 7250; 25 days → 290/day
    const d = data(
      [tx({ amount: 2500, date: '2026-10-02' }), tx({ amount: 250, date: '2026-10-07' }), tx({ amount: 9000, date: '2026-10-07', type: 'income', category: 'salary' })],
      [], 10000,
    );
    const s = todaySummary(d, '2026-10-07');
    expect(s.spentToday).toBe(250);
    expect(s.budgetLeft).toBe(7250);
    expect(s.safePerDay).toBe(290);
    expect(s.overBudget).toBe(false); // today's allowance (10000 − 2500) / 25 = 300
  });
  it('flags over budget when today is above the day allowance or the month is used up', () => {
    const d = data([tx({ amount: 2500, date: '2026-10-02' }), tx({ amount: 301, date: '2026-10-07' })], [], 10000);
    expect(todaySummary(d, '2026-10-07').overBudget).toBe(true); // allowance 300
    const d2 = data([tx({ amount: 12000, date: '2026-10-02' })], [], 10000);
    expect(todaySummary(d2, '2026-10-07')).toEqual({ spentToday: 0, safePerDay: 0, budgetLeft: -2000, overBudget: true });
    const d3 = data([tx({ amount: 500, date: '2026-10-07' })], [], 0);
    expect(todaySummary(d3, '2026-10-07').overBudget).toBe(false);
  });
});

describe('accounts', () => {
  it('balances opening + income − expense ± transfers', () => {
    const d = data(
      [
        tx({ amount: 25000, date: '2026-10-01', type: 'income', category: 'salary', account: 'bank' }),
        tx({ amount: 5000, date: '2026-10-02', type: 'transfer', category: '', account: 'bank', toAccount: 'cash' }),
        tx({ amount: 300, date: '2026-10-03', account: 'cash' }),
        tx({ amount: 450, date: '2026-10-03', account: 'upi' }),
      ],
      [], 0, [acc('bank', 10000), acc('cash', 500), acc('upi', 0)],
    );
    expect(accountBalances(d)).toEqual({ bank: 30000, cash: 5200, upi: -450 });
  });
});

describe('recurring', () => {
  const base = { active: true };
  it('returns due monthly dates up to today and the next date', () => {
    expect(dueOccurrences({ ...base, frequency: 'monthly', nextDate: '2026-08-05' }, '2026-10-07'))
      .toEqual({ dates: ['2026-08-05', '2026-09-05', '2026-10-05'], next: '2026-11-05' });
  });
  it('includes today and keeps the month-end day', () => {
    expect(dueOccurrences({ ...base, frequency: 'monthly', nextDate: '2026-01-31' }, '2026-03-31'))
      .toEqual({ dates: ['2026-01-31', '2026-02-28', '2026-03-31'], next: '2026-04-30' });
  });
  it('handles weekly and yearly', () => {
    expect(dueOccurrences({ ...base, frequency: 'weekly', nextDate: '2026-09-23' }, '2026-10-07'))
      .toEqual({ dates: ['2026-09-23', '2026-09-30', '2026-10-07'], next: '2026-10-14' });
    expect(dueOccurrences({ ...base, frequency: 'yearly', nextDate: '2025-10-07' }, '2026-10-07'))
      .toEqual({ dates: ['2025-10-07', '2026-10-07'], next: '2027-10-07' });
  });
  it('creates nothing when not yet due or paused', () => {
    expect(dueOccurrences({ ...base, frequency: 'monthly', nextDate: '2026-10-08' }, '2026-10-07')).toEqual({ dates: [], next: '2026-10-08' });
    expect(dueOccurrences({ active: false, frequency: 'monthly', nextDate: '2026-09-01' }, '2026-10-07')).toEqual({ dates: [], next: '2026-09-01' });
  });
  it('builds transactions with deterministic ids and skips existing ones', () => {
    const rec: Recurring = {
      id: 'rc_gym', updatedAt: NOW, frequency: 'monthly', nextDate: '2026-09-01', active: true,
      template: { type: 'expense', amount: 1500, category: 'gym', account: 'upi', career: true, note: 'Gym membership' },
    };
    const first = recurringToCreate(rec, '2026-10-07', {});
    expect(first.txs.map((t) => [t.id, t.date, t.amount, t.recurringId])).toEqual([
      ['tx_rc_gym_2026-09-01', '2026-09-01', 1500, 'rc_gym'],
      ['tx_rc_gym_2026-10-01', '2026-10-01', 1500, 'rc_gym'],
    ]);
    expect(first.next).toBe('2026-11-01');
    const again = recurringToCreate(rec, '2026-10-07', { 'tx_rc_gym_2026-09-01': {}, 'tx_rc_gym_2026-10-01': {} });
    expect(again.txs).toEqual([]);
  });
});

describe('goals', () => {
  it('reports progress, amount left and per day to the deadline', () => {
    const g = goalProgress({ target: 15000, saved: 6000, deadline: '2026-10-16' }, '2026-10-07');
    expect(g.ratio).toBe(0.4);
    expect(g.left).toBe(9000);
    expect(g.done).toBe(false);
    expect(g.daysLeft).toBe(10);
    expect(g.perDay).toBe(900);
  });
  it('caps at 100 % and marks done', () => {
    expect(goalProgress({ target: 15000, saved: 16000 })).toEqual({ ratio: 1, left: 0, done: true });
    expect(goalProgress({ target: 0, saved: 0 })).toEqual({ ratio: 0, left: 0, done: false });
  });
});

describe('search, filter and grouping', () => {
  const list = [
    tx({ amount: 450, date: '2026-10-08', category: 'grooming', note: 'Sunscreen SPF 50' }),
    tx({ amount: 200, date: '2026-10-08', category: 'food', account: 'cash' }),
    tx({ amount: 25000, date: '2026-10-01', type: 'income', category: 'salary', account: 'bank' }),
    tx({ amount: 1000, date: '2026-09-03', type: 'transfer', category: '', account: 'bank', toAccount: 'cash' }),
  ];
  const cats = { food: cat('food', 'expense') };
  it('filters by text, type, category, account and month', () => {
    expect(filterTransactions(list, { q: 'sunscreen' })).toHaveLength(1);
    expect(filterTransactions(list, { q: 'FOOD' }, cats)).toHaveLength(1);
    expect(filterTransactions(list, { type: 'income' })).toHaveLength(1);
    expect(filterTransactions(list, { category: 'grooming' })).toHaveLength(1);
    expect(filterTransactions(list, { account: 'cash' })).toHaveLength(2); // includes the transfer in
    expect(filterTransactions(list, { month: '2026-10' })).toHaveLength(3);
    expect(filterTransactions(list, { type: 'all' })).toHaveLength(4);
  });
  it('groups by day, newest first, with day totals', () => {
    const g = groupByDay(list);
    expect(g.map((x) => x.date)).toEqual(['2026-10-08', '2026-10-01', '2026-09-03']);
    expect(g[0]).toMatchObject({ expense: 650, income: 0 });
    expect(g[0].items[0].amount).toBe(200); // last edited first
    expect(g[1]).toMatchObject({ expense: 0, income: 25000 });
  });
});
