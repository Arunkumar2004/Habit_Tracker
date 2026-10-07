// Entry form for quick add, edit and transfers: amount keypad → category → Save (3 taps for the usual case).
import { useMemo, useState } from 'react';
import type { Transaction, TxType } from '../../types';
import { useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { Segmented, haptic } from '../../ui/kit';
import { rupees, uid } from '../../lib/format';
import { fmtShort, todayISO } from '../../lib/date';
import { categoriesOf } from '../../engines/budget';
import { AmountDisplay, Keypad, keypadValue } from './Keypad';
import { ConfirmButton, defaultAccountId, setEditorRender, sortedAccounts, useMoney } from './parts';

const TYPE_OPTS: { value: TxType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

export function TxForm({ tx, initialType = 'expense', allowTypeSwitch, onDone }: {
  tx?: Transaction | null; initialType?: TxType; allowTypeSwitch?: boolean; onDone: () => void;
}) {
  const money = useMoney();
  const put = useStore((s) => s.put);
  const remove = useStore((s) => s.remove);
  const showToast = useStore((s) => s.showToast);
  const today = todayISO();

  const accounts = useMemo(() => sortedAccounts(money.accounts), [money.accounts]);
  const [type, setType] = useState<TxType>(tx?.type ?? initialType);
  const [digits, setDigits] = useState(tx ? String(Math.round(tx.amount)) : '');
  const [category, setCategory] = useState(tx?.category ?? '');
  const [account, setAccount] = useState(tx?.account ?? defaultAccountId(money.accounts));
  const [toAccount, setToAccount] = useState(
    tx?.toAccount ?? accounts.find((a) => a.id !== (tx?.account ?? defaultAccountId(money.accounts)))?.id ?? '',
  );
  const [career, setCareer] = useState(tx?.career ?? false);
  const [note, setNote] = useState(tx?.note ?? '');
  const [date, setDate] = useState(tx?.date ?? today);
  const [more, setMore] = useState(!!tx);

  const cats = useMemo(() => (type === 'transfer' ? [] : categoriesOf(money, type)), [money, type]);
  const amount = keypadValue(digits);
  const valid =
    amount > 0 && !!date &&
    (type === 'transfer' ? !!account && !!toAccount && account !== toAccount : !!category && !!money.categories[category] && !!account);

  function pickType(t: TxType) {
    setType(t);
    if (t !== type) {
      setCategory('');
      setCareer(false);
    }
  }
  function pickCategory(id: string) {
    haptic();
    setCategory(id);
    setCareer(money.categories[id]?.career ?? false);
  }

  function save() {
    if (!valid) return;
    const rec: Omit<Transaction, 'updatedAt'> = {
      id: tx?.id ?? uid('tx'),
      type, amount, date,
      category: type === 'transfer' ? '' : category,
      account,
      toAccount: type === 'transfer' ? toAccount : undefined,
      note: note.trim() || undefined,
      career: type === 'expense' ? career : false,
      recurringId: tx?.recurringId,
    };
    put('transactions', rec);
    haptic(15);
    const what = type === 'transfer' ? 'Transfer' : type === 'income' ? 'Income' : 'Expense';
    showToast(tx ? 'Entry updated' : `${what} ${rupees(amount)} saved`, { undo: true });
    onDone();
  }

  const tone = type === 'income' ? 'income' : type === 'expense' ? 'expense' : 'ink';
  return (
    <div className="mn-form">
      {(allowTypeSwitch || tx) && <Segmented label="Entry type" value={type} options={TYPE_OPTS} onChange={pickType} />}

      <AmountDisplay digits={digits} tone={tone} label="Amount" />
      <Keypad digits={digits} onChange={setDigits} />

      {type === 'transfer' ? (
        <>
          <div className="mn-chiprow">
            <span className="label">From</span>
            <div className="chips">
              {accounts.map((a) => (
                <button key={a.id} type="button" className="chip" aria-pressed={account === a.id} onClick={() => setAccount(a.id)}>{a.name}</button>
              ))}
            </div>
          </div>
          <div className="mn-chiprow">
            <span className="label">To</span>
            <div className="chips">
              {accounts.map((a) => (
                <button
                  key={a.id} type="button" className="chip" aria-pressed={toAccount === a.id} disabled={a.id === account}
                  onClick={() => setToAccount(a.id)}
                >{a.name}</button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mn-chiprow">
            <span className="label">Category</span>
            <div className="chips mn-cats">
              {cats.map((c) => (
                <button
                  key={c.id} type="button" className="chip mn-catchip" aria-pressed={category === c.id} onClick={() => pickCategory(c.id)}
                  style={{ ['--mn-tint' as string]: c.color }}
                >
                  <Icon name={c.icon} size={16} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="mn-chiprow">
            <span className="label">{type === 'income' ? 'Into' : 'Paid with'}</span>
            <div className="chips">
              {accounts.map((a) => (
                <button key={a.id} type="button" className="chip" aria-pressed={account === a.id} onClick={() => setAccount(a.id)}>{a.name}</button>
              ))}
            </div>
          </div>
          {type === 'expense' && (
            <button
              type="button" className="mn-toggle" role="switch" aria-checked={career} onClick={() => { haptic(); setCareer(!career); }}
            >
              <span className="mn-toggle-track" aria-hidden="true"><i /></span>
              <span className="grow">
                <strong>Career investment</strong>
                <span className="small muted"> · counts toward your model career spend</span>
              </span>
            </button>
          )}
        </>
      )}

      {more ? (
        <div className="grid-2">
          <label className="field">
            <span>Note</span>
            <input className="input" value={note} maxLength={80} placeholder="Sunscreen SPF 50" onChange={(e) => setNote(e.target.value)} />
          </label>
          <label className="field">
            <span>Date</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost mn-more" onClick={() => setMore(true)}>
          <Icon name="calendar" size={18} />
          {date === today ? 'Today' : fmtShort(date)} · Add a note or change the date
        </button>
      )}

      <button type="button" className="btn btn-primary btn-block mn-save" disabled={!valid} onClick={save}>
        {valid ? `Save ${rupees(amount)}` : amount <= 0 ? 'Enter an amount' : type === 'transfer' ? 'Pick two accounts' : 'Pick a category'}
      </button>

      {tx && (
        <ConfirmButton
          label="Delete entry"
          className="btn btn-danger btn-block"
          onConfirm={() => {
            remove('transactions', tx.id);
            showToast('Entry deleted', { undo: true });
            onDone();
          }}
        />
      )}
    </div>
  );
}

setEditorRender((t, close, type) => <TxForm tx={t} initialType={type} allowTypeSwitch={!t} onDone={close} />);
