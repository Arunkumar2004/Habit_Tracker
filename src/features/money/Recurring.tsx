// Recurring entries (gym membership, phone, subscriptions): list, add, edit, pause, delete.
// Due entries are added on boot and right after saving (see seed.ts).
import { useMemo, useState } from 'react';
import type { Recurring as Rec } from '../../types';
import { useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { Empty, Field, ScreenHeader, Segmented, haptic } from '../../ui/kit';
import { rupees, uid } from '../../lib/format';
import { fmtShort, todayISO } from '../../lib/date';
import { categoriesOf } from '../../engines/budget';
import { CatBadge, ConfirmButton, defaultAccountId, sortedAccounts, useMoney } from './parts';
import { processRecurring } from './seed';

type Freq = Rec['frequency'];
const FREQ_OPTS: { value: Freq; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' },
];
const FREQ_LABEL: Record<Freq, string> = { monthly: 'Monthly', weekly: 'Weekly', yearly: 'Yearly' };
const SUGGESTIONS = [
  { note: 'Gym membership', category: 'gym', amount: 1500 },
  { note: 'Phone', category: 'bills', amount: 399 },
  { note: 'Subscription', category: 'fun', amount: 199 },
];

function RecForm({ rec, onDone }: { rec?: Rec; onDone: () => void }) {
  const money = useMoney();
  const put = useStore((s) => s.put);
  const remove = useStore((s) => s.remove);
  const showToast = useStore((s) => s.showToast);
  const accounts = useMemo(() => sortedAccounts(money.accounts), [money.accounts]);
  const [type, setType] = useState<'expense' | 'income'>(rec?.template.type === 'income' ? 'income' : 'expense');
  const [note, setNote] = useState(rec?.template.note ?? '');
  const [amount, setAmount] = useState(rec ? String(rec.template.amount) : '');
  const [category, setCategory] = useState(rec?.template.category ?? '');
  const [account, setAccount] = useState(rec?.template.account ?? defaultAccountId(money.accounts));
  const [frequency, setFrequency] = useState<Freq>(rec?.frequency ?? 'monthly');
  const [nextDate, setNextDate] = useState(rec?.nextDate ?? todayISO());
  const cats = useMemo(() => categoriesOf(money, type), [money, type]);
  const n = Number(amount) || 0;
  const valid = n > 0 && !!money.categories[category] && !!account && !!nextDate;

  function save() {
    if (!valid) return;
    const id = rec?.id ?? uid('rc');
    put('recurring', {
      id, frequency, nextDate, active: rec?.active ?? true,
      template: {
        type, amount: n, category, account, note: note.trim() || money.categories[category]?.name,
        career: type === 'expense' ? money.categories[category]?.career ?? false : false,
      },
    });
    haptic(15);
    const made = processRecurring();
    showToast(made > 0 ? `Saved. Added ${made} due ${made === 1 ? 'entry' : 'entries'}` : 'Recurring entry saved', { undo: made === 0 });
    onDone();
  }

  return (
    <div className="stack">
      {!rec && (
        <div className="chips" aria-label="Suggestions">
          {SUGGESTIONS.filter((s) => money.categories[s.category]).map((s) => (
            <button
              key={s.note} type="button" className="chip"
              onClick={() => { setType('expense'); setNote(s.note); setCategory(s.category); if (!amount) setAmount(String(s.amount)); }}
            >
              <Icon name="plus" size={14} /> {s.note}
            </button>
          ))}
        </div>
      )}
      <Segmented label="Type" value={type} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} onChange={(t) => { setType(t); setCategory(''); }} />
      <div className="grid-2">
        <Field label="Name"><input className="input" value={note} maxLength={40} placeholder="Gym membership" onChange={(e) => setNote(e.target.value)} /></Field>
        <Field label="Amount (₹)">
          <input className="input num" inputMode="numeric" value={amount} placeholder="1500" onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, '').slice(0, 9))} />
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Category">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Pick one</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={type === 'income' ? 'Into' : 'Paid with'}>
          <select className="input" value={account} onChange={(e) => setAccount(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      </div>
      <Segmented label="How often" value={frequency} options={FREQ_OPTS} onChange={setFrequency} />
      <Field label={rec ? 'Next date' : 'First date'}><input className="input" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} /></Field>
      <p className="small muted">Entries are added on their due date. A first date in the past adds the missed ones now.</p>
      <button type="button" className="btn btn-primary btn-block" disabled={!valid} onClick={save}>{rec ? 'Save changes' : 'Add recurring entry'}</button>
      {rec && (
        <ConfirmButton
          label="Delete recurring entry" className="btn btn-danger btn-block"
          onConfirm={() => { remove('recurring', rec.id); showToast('Recurring entry deleted. Past entries stay.', { undo: true }); onDone(); }}
        />
      )}
    </div>
  );
}

export function RecurringScreen() {
  const money = useMoney();
  const recMap = useStore((s) => s.data.recurring);
  const patch = useStore((s) => s.patch);
  const openSheet = useStore((s) => s.openSheet);
  const closeSheet = useStore((s) => s.closeSheet);
  const showToast = useStore((s) => s.showToast);
  const list = useMemo(
    () => Object.values(recMap).filter((r) => !r.deleted).sort((a, b) => Number(b.active) - Number(a.active) || a.nextDate.localeCompare(b.nextDate)),
    [recMap],
  );
  const monthly = list
    .filter((r) => r.active && r.template.type === 'expense')
    .reduce((s, r) => s + (r.frequency === 'monthly' ? r.template.amount : r.frequency === 'weekly' ? (r.template.amount * 52) / 12 : r.template.amount / 12), 0);

  const add = () => openSheet('New recurring entry', () => <RecForm onDone={closeSheet} />);

  function toggle(r: Rec) {
    haptic();
    patch('recurring', r.id, { active: !r.active });
    showToast(r.active ? `${r.template.note ?? 'Entry'} paused` : `${r.template.note ?? 'Entry'} resumed`, { undo: true });
    if (!r.active) processRecurring();
  }

  return (
    <div className="mn-screen">
      <ScreenHeader
        title="Recurring" back
        right={<button type="button" className="icon-btn mn-add-btn" aria-label="Add recurring entry" onClick={add}><Icon name="plus" /></button>}
      />
      {list.length === 0 ? (
        <div className="card">
          <Empty icon="repeat" title="Nothing repeats yet">
            Add your gym membership, phone plan or subscriptions once. They are added on their due date.
          </Empty>
          <button type="button" className="btn btn-primary btn-block" onClick={add}><Icon name="plus" size={18} /> Add recurring entry</button>
        </div>
      ) : (
        <>
          <div className="mn-hero">
            <span className="label">Fixed spend</span>
            <div className="mn-hero-amt num">{rupees(monthly)}<span className="mn-per"> / month</span></div>
            <span className="small muted">{list.filter((r) => r.active).length} active · {list.filter((r) => !r.active).length} paused</span>
          </div>
          <div className="list">
            {list.map((r) => (
              <div key={r.id} className={`list-item mn-rec${r.active ? '' : ' mn-paused'}`}>
                <button type="button" className="mn-rec-main" onClick={() => openSheet('Edit recurring entry', () => <RecForm rec={r} onDone={closeSheet} />)}>
                  <CatBadge cat={money.categories[r.template.category]} />
                  <span className="grow mn-tx-main">
                    <span className="mn-tx-title">{r.template.note || money.categories[r.template.category]?.name || 'Entry'}</span>
                    <span className="small muted">
                      {FREQ_LABEL[r.frequency]} · {r.active ? `next ${fmtShort(r.nextDate)}` : 'paused'}
                    </span>
                  </span>
                  <span className={`num mn-tx-amt mn-tx-${r.template.type}`}>{r.template.type === 'income' ? '+' : '−'}{rupees(r.template.amount)}</span>
                </button>
                <button type="button" className="mn-pause" onClick={() => toggle(r)} aria-label={r.active ? `Pause ${r.template.note ?? 'entry'}` : `Resume ${r.template.note ?? 'entry'}`}>
                  <Icon name={r.active ? 'pause' : 'play'} size={18} />
                </button>
              </div>
            ))}
          </div>
          <p className="small muted">Tap an entry to edit or delete it. Deleting keeps the entries already added.</p>
        </>
      )}
    </div>
  );
}
