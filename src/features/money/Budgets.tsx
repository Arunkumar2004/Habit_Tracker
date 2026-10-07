// Budgets: a monthly budget per expense category, with progress bars and inline amount editing.
import { useEffect, useMemo, useState } from 'react';
import type { ScreenProps } from '../../app/screens';
import { useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { Bar, ScreenHeader } from '../../ui/kit';
import { pct, rupees } from '../../lib/format';
import { fmtMonth, monthKey, todayISO } from '../../lib/date';
import { budgetSource, categoryBudgets, daysLeftInMonth, monthTotals, totalBudget } from '../../engines/budget';
import { CatBadge, useMoney } from './parts';

/** Rupee input that commits on blur or Enter. */
export function MoneyInput({ value, onCommit, label }: { value: number; onCommit: (n: number) => void; label: string }) {
  const [draft, setDraft] = useState(value ? String(value) : '');
  useEffect(() => setDraft(value ? String(value) : ''), [value]);
  function commit() {
    const n = Math.max(0, Math.round(Number(draft.replace(/[^\d]/g, '')) || 0));
    if (n !== value) onCommit(n);
    else setDraft(value ? String(value) : '');
  }
  return (
    <span className="mn-moneyin">
      <span aria-hidden="true">₹</span>
      <input
        className="num" inputMode="numeric" pattern="[0-9]*" placeholder="0" aria-label={label} value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 9))}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
    </span>
  );
}

export function Budgets({ params }: ScreenProps) {
  const money = useMoney();
  const patch = useStore((s) => s.patch);
  const showToast = useStore((s) => s.showToast);
  const navigate = useStore((s) => s.navigate);
  const today = todayISO();
  const month = params.month ?? monthKey(today);

  const rows = useMemo(() => categoryBudgets(money, month), [money, month]);
  const total = totalBudget(money);
  const source = budgetSource(money);
  const spent = monthTotals(money, month).expense;
  const profileBudget = money.profile.me?.monthlyBudget ?? 0;
  const unbudgeted = rows.filter((r) => r.budget === 0).reduce((s, r) => s + r.spent, 0);

  return (
    <div className="mn-screen">
      <ScreenHeader title="Budgets" back />

      <section className="mn-hero">
        <span className="label">{fmtMonth(`${month}-01`)} budget</span>
        <div className="mn-hero-amt num">{total > 0 ? rupees(total) : 'Not set'}</div>
        {total > 0 && <Bar value={spent / total} overIsBad />}
        <div className="row small">
          <span className="grow muted">
            {source === 'categories' ? 'Sum of your category budgets' : source === 'profile' ? 'Your overall monthly budget' : 'Set amounts below'}
          </span>
          {total > 0 && <span className="num">{rupees(spent)} spent · {pct(spent / total)}</span>}
        </div>
        {month === monthKey(today) && total > 0 && (
          <span className="small muted">{daysLeftInMonth(today)} days left this month</span>
        )}
      </section>

      {source !== 'categories' && money.profile.me && (
        <div className="card mn-overall">
          <div className="row">
            <div className="grow">
              <strong>Overall monthly budget</strong>
              <div className="small muted">Used until you set category budgets.</div>
            </div>
            <MoneyInput
              label="Overall monthly budget" value={profileBudget}
              onCommit={(n) => { patch('profile', 'me', { monthlyBudget: n }); showToast(`Monthly budget set to ${rupees(n)}`, { undo: true }); }}
            />
          </div>
        </div>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="label">By category</h2>
          <span className="small muted">Alerts at 80% and 100%</span>
        </div>
        <div className="list">
          {rows.map((r) => (
            <div key={r.category.id} className="mn-budget">
              <div className="row">
                <CatBadge cat={r.category} />
                <button
                  type="button" className="grow mn-budget-name" onClick={() => navigate('money', 'entries', { month, category: r.category.id })}
                  aria-label={`${r.category.name}: see entries`}
                >
                  <strong>{r.category.name}</strong>
                  <span className="small muted num">
                    {rupees(r.spent)} spent
                    {r.budget > 0 && (r.left >= 0 ? ` · ${rupees(r.left)} left` : ` · ${rupees(-r.left)} over`)}
                  </span>
                </button>
                <MoneyInput
                  label={`${r.category.name} monthly budget`} value={r.budget}
                  onCommit={(n) => { patch('categories', r.category.id, { monthlyBudget: n }); showToast(`${r.category.name} budget ${n ? `set to ${rupees(n)}` : 'cleared'}`, { undo: true }); }}
                />
              </div>
              {r.budget > 0 && (
                <div className="row mn-budget-bar">
                  <span className="grow"><Bar value={r.ratio} overIsBad /></span>
                  {r.status !== 'ok' && (
                    <span className={`pill ${r.status === 'over' ? 'pill-bad' : 'pill-warn'}`}>
                      {r.status === 'over' ? <><Icon name="info" size={12} /> Over</> : pct(r.ratio)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {unbudgeted > 0 && source === 'categories' && (
          <p className="small muted">{rupees(unbudgeted)} spent in categories with no budget.</p>
        )}
      </section>
    </div>
  );
}
