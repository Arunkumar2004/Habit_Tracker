// Entries: grouped by day with day totals; search and filter by type, category, account and month.
import { useMemo, useState } from 'react';
import type { ScreenProps } from '../../app/screens';
import type { TxType } from '../../types';
import { Icon } from '../../ui/Icon';
import { Empty, ScreenHeader, Segmented } from '../../ui/kit';
import { rupees } from '../../lib/format';
import { fmtMonth, fmtShort, monthKey, todayISO } from '../../lib/date';
import { allTx, categoriesOf, filterTransactions, groupByDay } from '../../engines/budget';
import { TxRow, openTxEditor, sortedAccounts, useMoney } from './parts';

type TypeFilter = TxType | 'all';
const TYPE_OPTS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Spent' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Moves' },
];

export function Entries({ params }: ScreenProps) {
  const money = useMoney();
  const thisMonth = monthKey(todayISO());
  const [q, setQ] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [category, setCategory] = useState(params.category ?? '');
  const [account, setAccount] = useState('');
  const [month, setMonth] = useState(params.month ?? thisMonth);

  const all = useMemo(() => allTx(money), [money]);
  const months = useMemo(() => {
    const set = new Set(all.map((t) => monthKey(t.date)));
    set.add(thisMonth);
    if (month) set.add(month);
    return [...set].sort().reverse();
  }, [all, thisMonth, month]);
  const cats = useMemo(() => [...categoriesOf(money, 'expense'), ...categoriesOf(money, 'income')], [money]);
  const accounts = useMemo(() => sortedAccounts(money.accounts), [money.accounts]);

  const list = useMemo(
    () => filterTransactions(all, { q, type, category: category || undefined, account: account || undefined, month: month || undefined }, money.categories),
    [all, q, type, category, account, month, money.categories],
  );
  const groups = useMemo(() => groupByDay(list), [list]);
  const spent = groups.reduce((s, g) => s + g.expense, 0);
  const earned = groups.reduce((s, g) => s + g.income, 0);
  const filtered = !!q || type !== 'all' || !!category || !!account;

  function clear() {
    setQ(''); setType('all'); setCategory(''); setAccount('');
  }

  return (
    <div className="mn-screen">
      <ScreenHeader
        title="Entries"
        back
        right={
          <>
            <button type="button" className="icon-btn" aria-label="Transfer between accounts" onClick={() => openTxEditor(null, 'transfer')}>
              <Icon name="repeat" />
            </button>
            <button type="button" className="icon-btn mn-add-btn" aria-label="Add entry" onClick={() => openTxEditor(null, 'expense')}>
              <Icon name="plus" />
            </button>
          </>
        }
      />

      <div className="mn-filters">
        <label className="mn-search">
          <Icon name="search" size={18} />
          <input
            className="input" type="search" value={q} placeholder="Search notes, categories, amounts" aria-label="Search entries"
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <Segmented label="Entry type" value={type} options={TYPE_OPTS} onChange={setType} />
        <div className="grid-3">
          <select className="input mn-select" aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input mn-select" aria-label="Account" value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="input mn-select" aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {months.map((m) => <option key={m} value={m}>{fmtMonth(`${m}-01`)}</option>)}
          </select>
        </div>
      </div>

      <div className="row small mn-summary">
        <span className="grow muted">{list.length} {list.length === 1 ? 'entry' : 'entries'}</span>
        {spent > 0 && <span className="num mn-neg">−{rupees(spent)}</span>}
        {earned > 0 && <span className="num mn-pos">+{rupees(earned)}</span>}
        {filtered && <button type="button" className="mn-inline-link" onClick={clear}>Clear filters</button>}
      </div>

      {groups.length === 0 ? (
        <div className="card">
          <Empty icon="list" title={filtered ? 'No entries match' : 'No entries yet'}>
            {filtered ? 'Try a different search or clear the filters.' : 'Tap + to add an expense or income. It takes three taps.'}
          </Empty>
        </div>
      ) : (
        <div className="stack">
          {groups.map((g) => (
            <section key={g.date} className="mn-day">
              <div className="mn-day-head">
                <span className="label">{fmtShort(g.date)}</span>
                <span className="small num muted">
                  {g.expense > 0 && <>−{rupees(g.expense)}</>}
                  {g.expense > 0 && g.income > 0 && ' · '}
                  {g.income > 0 && <span className="mn-pos">+{rupees(g.income)}</span>}
                </span>
              </div>
              <div className="list">
                {g.items.map((t) => (
                  <TxRow key={t.id} t={t} cats={money.categories} accounts={money.accounts} onOpen={(x) => openTxEditor(x)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
