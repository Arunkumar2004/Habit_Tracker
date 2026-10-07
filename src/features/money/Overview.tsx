// Money overview: month summary, safe per day, alerts, charts, career investment, recent entries, links.
import { useMemo, useState } from 'react';
import type { ScreenProps } from '../../app/screens';
import { useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { Bar, ScreenHeader } from '../../ui/kit';
import { Bars, Donut, Sparkline } from '../../ui/charts';
import { pct, rupees } from '../../lib/format';
import { fmtMonth, fmtShort, monthKey, todayISO } from '../../lib/date';
import {
  accountBalances, budgetAlerts, careerByMonth, dailySpend, incomeVsExpense, monthTotals, safePerDay, sortTx,
  spendByCategory, totalBudget, txInMonth, budgetStatus,
} from '../../engines/budget';
import { LinkRow, MonthSwitcher, TxRow, openTxEditor, useMoney } from './parts';

const short = (m: string) => fmtMonth(`${m}-01`).slice(0, 3);
const compact = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : rupees(n));

export function Overview({ params }: ScreenProps) {
  const today = todayISO();
  const thisMonth = monthKey(today);
  const [month, setMonth] = useState(params.month && params.month <= thisMonth ? params.month : thisMonth);
  const money = useMoney();
  const goals = useStore((s) => s.data.goals);
  const recurring = useStore((s) => s.data.recurring);
  const navigate = useStore((s) => s.navigate);
  const isNow = month === thisMonth;

  const v = useMemo(() => {
    const totals = monthTotals(money, month);
    const budget = totalBudget(money);
    const byCat = spendByCategory(money, month);
    const slices = Object.entries(byCat)
      .map(([id, value]) => ({ id, label: money.categories[id]?.name ?? 'Other', value, color: money.categories[id]?.color ?? 'var(--c8)' }))
      .sort((a, b) => b.value - a.value);
    const career = careerByMonth(money, month, 6);
    const balances = accountBalances(money);
    return {
      totals, budget, slices, career,
      alerts: budgetAlerts(money, month),
      safe: safePerDay(money, today),
      daily: dailySpend(money, month).map((d, i) => ({ label: String(i + 1), value: d.total })),
      ive: incomeVsExpense(money, month, 6).map((m) => ({ label: short(m.month), value: m.income, value2: m.expense })),
      recent: sortTx(txInMonth(money, month)).slice(0, 5),
      count: txInMonth(money, month).length,
      balance: Object.values(balances).reduce((s, n) => s + n, 0),
      budgetsSet: Object.values(money.categories).filter((c) => c.kind === 'expense' && c.monthlyBudget > 0).length,
    };
  }, [money, month, today]);

  const status = budgetStatus(v.totals.expense, v.budget);
  const left = v.budget - v.totals.expense;
  const goalCount = Object.values(goals).filter((g) => !g.deleted).length;
  const recActive = Object.values(recurring).filter((r) => !r.deleted && r.active).length;
  const monthName = fmtMonth(`${month}-01`).split(' ')[0];

  return (
    <div className="mn-screen">
      <ScreenHeader
        title="Money"
        right={
          <button type="button" className="icon-btn" aria-label="Search entries" onClick={() => navigate('money', 'entries', { month })}>
            <Icon name="search" />
          </button>
        }
      />
      <MonthSwitcher month={month} onChange={setMonth} max={thisMonth} />

      <section className={`mn-hero mn-hero-${status}`}>
        <div className="row">
          <span className="label grow">Spent in {monthName}</span>
          {v.budget > 0 && (
            <span className={`pill ${status === 'over' ? 'pill-bad' : status === 'warn' ? 'pill-warn' : 'pill-ok'}`}>
              {status === 'over' ? 'Over budget' : status === 'warn' ? `${pct(v.totals.expense / v.budget)} used` : 'On track'}
            </span>
          )}
        </div>
        <div className="mn-hero-amt num">{rupees(v.totals.expense)}</div>
        {v.budget > 0 ? (
          <>
            <Bar value={v.totals.expense / v.budget} overIsBad />
            <div className="row small">
              <span className="grow muted">of {rupees(v.budget)} budget</span>
              <span className={`num ${left < 0 ? 'mn-neg' : ''}`}>{left < 0 ? `${rupees(-left)} over` : `${rupees(left)} left`}</span>
            </div>
          </>
        ) : (
          <button type="button" className="mn-inline-link small" onClick={() => navigate('money', 'budgets')}>
            Set a monthly budget to see what is safe to spend <Icon name="chevron" size={14} />
          </button>
        )}
      </section>

      <div className="grid-3 mn-stats">
        <div className="mn-stat">
          <span className="label">{isNow ? 'Safe / day' : 'Left'}</span>
          <strong className={`num ${isNow ? (v.safe > 0 ? 'mn-pos' : v.budget > 0 ? 'mn-neg' : '') : left < 0 ? 'mn-neg' : ''}`}>
            {isNow ? (v.budget > 0 ? rupees(v.safe) : '—') : v.budget > 0 ? rupees(left) : '—'}
          </strong>
        </div>
        <div className="mn-stat">
          <span className="label">Income</span>
          <strong className="num mn-pos">{rupees(v.totals.income)}</strong>
        </div>
        <div className="mn-stat">
          <span className="label">Net</span>
          <strong className={`num ${v.totals.net < 0 ? 'mn-neg' : 'mn-pos'}`}>{v.totals.net > 0 ? '+' : ''}{rupees(v.totals.net)}</strong>
        </div>
      </div>

      {v.alerts.length > 0 && (
        <div className="mn-alerts" aria-label="Budget alerts">
          {v.alerts.map((a) => (
            <button
              key={a.category.id} type="button" className={`pill ${a.status === 'over' ? 'pill-bad' : 'pill-warn'} mn-alert`}
              onClick={() => navigate('money', 'budgets')}
            >
              {a.category.name} {a.status === 'over' ? `over by ${rupees(a.spent - a.budget)}` : pct(a.ratio)}
            </button>
          ))}
        </div>
      )}

      <section className="section">
        <div className="section-head"><h2 className="label">Where it went</h2></div>
        <div className="card">
          {v.slices.length === 0 ? (
            <p className="muted small mn-nodata">No spending in {monthName} yet. Tap + to add your first expense.</p>
          ) : (
            <div className="mn-donut">
              <Donut data={v.slices} size={148} centerLabel="Spent" centerValue={compact(v.totals.expense)} />
              <ul className="mn-legend">
                {v.slices.slice(0, 6).map((s) => (
                  <li key={s.id}>
                    <i style={{ background: s.color }} />
                    <span className="grow">{s.label}</span>
                    <span className="num small">{rupees(s.value)}</span>
                  </li>
                ))}
                {v.slices.length > 6 && (
                  <li className="muted">
                    <i style={{ background: 'var(--line)' }} />
                    <span className="grow">{v.slices.length - 6} more</span>
                    <span className="num small">{rupees(v.slices.slice(6).reduce((s, x) => s + x.value, 0))}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="label">Daily spend</h2>
          {isNow && v.budget > 0 && <span className="small muted num">Safe today {rupees(v.safe)}</span>}
        </div>
        <div className="card mn-chart">
          <Bars data={v.daily} height={140} format={rupees} />
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2 className="label">Income vs expense</h2><span className="small muted">6 months</span></div>
        <div className="card mn-chart">
          <Bars data={v.ive} height={150} format={compact} series={['Income', 'Expense']} />
        </div>
      </section>

      <section className="section">
        <div className="card mn-career">
          <div className="row">
            <span className="mn-link-ico"><Icon name="star" size={20} /></span>
            <div className="grow">
              <span className="label">Career investment</span>
              <div className="mn-career-amt num">{rupees(v.career[v.career.length - 1].total)}</div>
              <span className="small muted">
                in {monthName} · {rupees(v.career.reduce((s, c) => s + c.total, 0))} over 6 months
              </span>
            </div>
            <Sparkline values={v.career.map((c) => c.total)} width={88} height={36} />
          </div>
          <p className="small muted mn-career-note">Gym, grooming, wardrobe and portfolio spend. It is an investment in your career, not waste.</p>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="label">Recent</h2>
          {v.count > 0 && (
            <button type="button" className="mn-inline-link small" onClick={() => navigate('money', 'entries', { month })}>
              See all {v.count}
            </button>
          )}
        </div>
        {v.recent.length === 0 ? (
          <div className="card muted small mn-nodata">Entries you add in {monthName} show here.</div>
        ) : (
          <div className="list">
            {v.recent.map((t) => (
              <TxRow key={t.id} t={t} cats={money.categories} accounts={money.accounts} onOpen={(x) => openTxEditor(x)} showDate={fmtShort(t.date)} />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="list">
          <LinkRow icon="list" label="Entries" meta={`${v.count} in ${short(month)}`} onClick={() => navigate('money', 'entries', { month })} />
          <LinkRow icon="target" label="Budgets" meta={v.budgetsSet ? `${v.budgetsSet} set` : 'Not set'} onClick={() => navigate('money', 'budgets')} />
          <LinkRow icon="goal" label="Savings goals" meta={goalCount ? String(goalCount) : undefined} onClick={() => navigate('money', 'goals')} />
          <LinkRow icon="repeat" label="Recurring" meta={recActive ? `${recActive} active` : undefined} onClick={() => navigate('money', 'recurring')} />
          <LinkRow icon="wallet" label="Accounts" meta={rupees(v.balance)} onClick={() => navigate('money', 'accounts')} />
        </div>
      </section>
    </div>
  );
}
