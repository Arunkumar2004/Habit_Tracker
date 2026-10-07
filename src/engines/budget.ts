// OWNER: Money agent. Budget engine (blueprint 2.4 and 6). Pure functions, no store access.
// Contract (keep names and signatures): todaySummary and spendByCategory are used by Today and Progress.
import type { Category, Data, Goal, Recurring, Transaction, TxType } from '../types';
import { addDays, daysInMonth, diffDays, monthKey, parseISO } from '../lib/date';

/** The slices of Data the money engine reads. Whole `Data` objects fit this type. */
export type MoneyData = Pick<Data, 'transactions' | 'categories' | 'profile'> & Partial<Pick<Data, 'accounts'>>;

// ---------- Months and days ----------

/** '2026-10' shifted by n months, e.g. shiftMonth('2026-01', -1) = '2025-12'. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12 + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}
/** The n months ending at `end`, oldest first. */
export function monthsBack(end: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftMonth(end, -i));
  return out;
}
export function monthDays(month: string): number {
  return daysInMonth(`${month}-01`);
}
/** Days left in the month of `date`, including `date` itself (31 Oct = 1). */
export function daysLeftInMonth(date: string): number {
  return daysInMonth(date) - parseISO(date).getDate() + 1;
}
/** Date plus n months, clamped to the month end (31 Jan + 1 month = 28 or 29 Feb). */
export function addMonthsClamped(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const month = shiftMonth(`${y}-${String(m).padStart(2, '0')}`, n);
  const day = Math.min(d, monthDays(month));
  return `${month}-${String(day).padStart(2, '0')}`;
}

// ---------- Transactions ----------

export function allTx(data: MoneyData): Transaction[] {
  return Object.values(data.transactions).filter((t) => !t.deleted);
}
/** Newest first: date, then last edit. */
export function sortTx(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) => (a.date === b.date ? b.updatedAt - a.updatedAt : a.date < b.date ? 1 : -1));
}
export function txInMonth(data: MoneyData, month: string): Transaction[] {
  return allTx(data).filter((t) => monthKey(t.date) === month);
}

export interface MonthTotals { income: number; expense: number; net: number }
export function monthTotals(data: MoneyData, month: string): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of txInMonth(data, month)) {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

/** Total expense per category id for a month ('YYYY-MM'). */
export function spendByCategory(data: Data | MoneyData, month: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of txInMonth(data, month)) {
    if (t.type !== 'expense') continue;
    const k = t.category || 'other';
    out[k] = (out[k] ?? 0) + t.amount;
  }
  return out;
}

// ---------- Budgets ----------

export type BudgetStatus = 'ok' | 'warn' | 'over';
/** ok under 80 %, warn from 80 %, over from 100 %. No budget set = ok. */
export function budgetStatus(spent: number, budget: number): BudgetStatus {
  if (budget <= 0) return 'ok';
  const r = spent / budget;
  if (r >= 1) return 'over';
  if (r >= 0.8) return 'warn';
  return 'ok';
}

export function categoriesOf(data: MoneyData, kind: Category['kind']): Category[] {
  return Object.values(data.categories)
    .filter((c) => !c.deleted && c.kind === kind)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export interface CategoryBudget {
  category: Category;
  spent: number;
  budget: number;
  left: number;
  ratio: number; // spent ÷ budget (0 when no budget)
  status: BudgetStatus;
}
/** Spent vs budget for every expense category in a month. */
export function categoryBudgets(data: MoneyData, month: string): CategoryBudget[] {
  const spend = spendByCategory(data, month);
  return categoriesOf(data, 'expense').map((c) => {
    const spent = spend[c.id] ?? 0;
    const budget = c.monthlyBudget > 0 ? c.monthlyBudget : 0;
    return {
      category: c, spent, budget, left: budget - spent,
      ratio: budget > 0 ? spent / budget : 0, status: budgetStatus(spent, budget),
    };
  });
}
/** Categories at 80 % or more of their budget, worst first. */
export function budgetAlerts(data: MoneyData, month: string): CategoryBudget[] {
  return categoryBudgets(data, month).filter((b) => b.status !== 'ok').sort((a, b) => b.ratio - a.ratio);
}

/** Sum of category budgets, or the profile's monthly budget when no category budget is set. */
export function totalBudget(data: MoneyData): number {
  const sum = categoriesOf(data, 'expense').reduce((s, c) => s + Math.max(0, c.monthlyBudget || 0), 0);
  if (sum > 0) return sum;
  return Math.max(0, data.profile.me?.monthlyBudget ?? 0);
}
/** Where the total comes from, for copy on the Budgets screen. */
export function budgetSource(data: MoneyData): 'categories' | 'profile' | 'none' {
  const sum = categoriesOf(data, 'expense').reduce((s, c) => s + Math.max(0, c.monthlyBudget || 0), 0);
  if (sum > 0) return 'categories';
  return (data.profile.me?.monthlyBudget ?? 0) > 0 ? 'profile' : 'none';
}

/** Safe to spend per day = (budget − spent this month) ÷ days left including `date`. Never negative. */
export function safePerDay(data: MoneyData, date: string): number {
  const budget = totalBudget(data);
  if (budget <= 0) return 0;
  const spent = monthTotals(data, monthKey(date)).expense;
  return Math.max(0, budget - spent) / daysLeftInMonth(date);
}

export interface TodayMoney { spentToday: number; safePerDay: number; budgetLeft: number; overBudget: boolean }
/**
 * Safe per day = (monthly budget left) ÷ (days left this month, including today).
 * overBudget: the month budget is used up, or today's spend is above today's allowance
 * (budget left at the start of today ÷ days left).
 */
export function todaySummary(data: Data | MoneyData, date: string): TodayMoney {
  const month = monthKey(date);
  const budget = totalBudget(data);
  let spentMonth = 0;
  let spentToday = 0;
  for (const t of txInMonth(data, month)) {
    if (t.type !== 'expense') continue;
    spentMonth += t.amount;
    if (t.date === date) spentToday += t.amount;
  }
  const budgetLeft = budget - spentMonth;
  const days = daysLeftInMonth(date);
  const allowance = Math.max(0, budget - (spentMonth - spentToday)) / days;
  return {
    spentToday,
    safePerDay: budget > 0 ? Math.max(0, budgetLeft) / days : 0,
    budgetLeft,
    overBudget: budget > 0 && (budgetLeft < 0 || spentToday > allowance),
  };
}

// ---------- Charts ----------

/** Expense per day of a month, every day present (zeros included). */
export function dailySpend(data: MoneyData, month: string): { date: string; total: number }[] {
  const days = monthDays(month);
  const out = Array.from({ length: days }, (_, i) => ({ date: `${month}-${String(i + 1).padStart(2, '0')}`, total: 0 }));
  for (const t of txInMonth(data, month)) {
    if (t.type !== 'expense') continue;
    const i = parseISO(t.date).getDate() - 1;
    if (out[i]) out[i].total += t.amount;
  }
  return out;
}
/** Income and expense for the n months ending at `end`, oldest first. */
export function incomeVsExpense(data: MoneyData, end: string, n = 6): ({ month: string } & MonthTotals)[] {
  return monthsBack(end, n).map((month) => ({ month, ...monthTotals(data, month) }));
}
/** Career investment: everything spent with `career` true, in one month. */
export function careerTotal(data: MoneyData, month: string): number {
  return txInMonth(data, month).reduce((s, t) => (t.type === 'expense' && t.career ? s + t.amount : s), 0);
}
export function careerByMonth(data: MoneyData, end: string, n = 6): { month: string; total: number }[] {
  return monthsBack(end, n).map((month) => ({ month, total: careerTotal(data, month) }));
}

// ---------- Accounts ----------

/** Balance per account id: opening + income − expense − transfers out + transfers in. */
export function accountBalances(data: MoneyData): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of Object.values(data.accounts ?? {})) if (!a.deleted) out[a.id] = a.openingBalance || 0;
  for (const t of allTx(data)) {
    if (t.type === 'income') { if (t.account in out) out[t.account] += t.amount; }
    else if (t.type === 'expense') { if (t.account in out) out[t.account] -= t.amount; }
    else {
      if (t.account in out) out[t.account] -= t.amount;
      if (t.toAccount && t.toAccount in out) out[t.toAccount] += t.amount;
    }
  }
  return out;
}

// ---------- Recurring ----------

export function nthOccurrence(start: string, freq: Recurring['frequency'], k: number): string {
  if (freq === 'weekly') return addDays(start, 7 * k);
  if (freq === 'yearly') return addMonthsClamped(start, 12 * k);
  return addMonthsClamped(start, k);
}
/**
 * Dates to create for a recurring entry, from its nextDate up to and including `upTo`, and the next date after that.
 * Monthly and yearly keep the day of month of nextDate, clamped to short months. Paused entries create nothing.
 */
export function dueOccurrences(rec: Pick<Recurring, 'frequency' | 'nextDate' | 'active'>, upTo: string): { dates: string[]; next: string } {
  if (!rec.active || rec.nextDate > upTo) return { dates: [], next: rec.nextDate };
  const dates: string[] = [];
  let k = 0;
  let d = rec.nextDate;
  while (d <= upTo && k < 1000) {
    dates.push(d);
    k++;
    d = nthOccurrence(rec.nextDate, rec.frequency, k);
  }
  return { dates, next: d };
}
/** Deterministic id so two devices adding the same due entry merge instead of duplicating. */
export function recurringTxId(recurringId: string, date: string): string {
  return `tx_${recurringId}_${date}`;
}
/** The transactions a recurring entry should create up to `upTo` (skips ids that already exist). */
export function recurringToCreate(rec: Recurring, upTo: string, existing: Record<string, unknown>): { txs: Omit<Transaction, 'updatedAt'>[]; next: string } {
  const { dates, next } = dueOccurrences(rec, upTo);
  const txs = dates
    .map((date) => ({ ...rec.template, id: recurringTxId(rec.id, date), date, recurringId: rec.id }))
    .filter((t) => !(t.id in existing));
  return { txs, next };
}

// ---------- Goals ----------

export interface GoalProgress { ratio: number; left: number; done: boolean; daysLeft?: number; perDay?: number }
export function goalProgress(goal: Pick<Goal, 'target' | 'saved' | 'deadline'>, today?: string): GoalProgress {
  const ratio = goal.target > 0 ? Math.min(1, Math.max(0, goal.saved / goal.target)) : 0;
  const left = Math.max(0, goal.target - goal.saved);
  const done = goal.target > 0 && goal.saved >= goal.target;
  const out: GoalProgress = { ratio, left, done };
  if (goal.deadline && today) {
    const days = diffDays(today, goal.deadline) + 1;
    out.daysLeft = Math.max(0, days);
    if (days > 0 && !done) out.perDay = left / days;
  }
  return out;
}

// ---------- Search, filter and grouping ----------

export interface TxFilter { q?: string; type?: TxType | 'all'; category?: string; account?: string; month?: string }
export function filterTransactions(list: Transaction[], f: TxFilter, categories: Record<string, Category> = {}): Transaction[] {
  const q = (f.q ?? '').trim().toLowerCase();
  return list.filter((t) => {
    if (f.type && f.type !== 'all' && t.type !== f.type) return false;
    if (f.category && t.category !== f.category) return false;
    if (f.account && t.account !== f.account && t.toAccount !== f.account) return false;
    if (f.month && monthKey(t.date) !== f.month) return false;
    if (q) {
      const hay = `${t.note ?? ''} ${categories[t.category]?.name ?? ''} ${t.amount}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
export interface DayGroup { date: string; items: Transaction[]; expense: number; income: number }
/** Groups newest day first; items newest first. */
export function groupByDay(list: Transaction[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const t of sortTx(list)) {
    let g = map.get(t.date);
    if (!g) { g = { date: t.date, items: [], expense: 0, income: 0 }; map.set(t.date, g); }
    g.items.push(t);
    if (t.type === 'expense') g.expense += t.amount;
    else if (t.type === 'income') g.income += t.amount;
  }
  return [...map.values()];
}
