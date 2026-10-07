// Accounts: balance per account (opening + income − expense ± transfers), add / edit accounts, transfer.
import { useMemo, useState } from 'react';
import type { Account } from '../../types';
import { useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { Field, ScreenHeader, Segmented, haptic } from '../../ui/kit';
import { rupees, uid } from '../../lib/format';
import { accountBalances, allTx } from '../../engines/budget';
import { ACCOUNT_ICON, ConfirmButton, openTxEditor, sortedAccounts, useMoney } from './parts';

const KIND_OPTS: { value: Account['kind']; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank', label: 'Bank' },
];

function AccountForm({ account, inUse, onDone }: { account?: Account; inUse?: boolean; onDone: () => void }) {
  const put = useStore((s) => s.put);
  const remove = useStore((s) => s.remove);
  const showToast = useStore((s) => s.showToast);
  const [name, setName] = useState(account?.name ?? '');
  const [kind, setKind] = useState<Account['kind']>(account?.kind ?? 'bank');
  const [neg, setNeg] = useState((account?.openingBalance ?? 0) < 0);
  const [opening, setOpening] = useState(account?.openingBalance ? String(Math.abs(account.openingBalance)) : '');
  const valid = name.trim().length > 0;

  function save() {
    if (!valid) return;
    const ob = (Number(opening) || 0) * (neg ? -1 : 1);
    put('accounts', { id: account?.id ?? uid('acc'), name: name.trim(), kind, openingBalance: ob });
    haptic(15);
    showToast(account ? 'Account updated' : `${name.trim()} added`, { undo: true });
    onDone();
  }
  return (
    <div className="stack">
      <Field label="Name"><input className="input" value={name} maxLength={30} placeholder="HDFC savings" onChange={(e) => setName(e.target.value)} /></Field>
      <Segmented label="Kind" value={kind} options={KIND_OPTS} onChange={setKind} />
      <Field label="Opening balance (₹)">
        <input className="input num" inputMode="numeric" value={opening} placeholder="0" onChange={(e) => setOpening(e.target.value.replace(/[^\d]/g, '').slice(0, 9))} />
      </Field>
      {kind === 'card' && (
        <button type="button" className="mn-toggle" role="switch" aria-checked={neg} onClick={() => setNeg(!neg)}>
          <span className="mn-toggle-track" aria-hidden="true"><i /></span>
          <span className="grow small">Opening balance is money owed (card dues)</span>
        </button>
      )}
      <button type="button" className="btn btn-primary btn-block" disabled={!valid} onClick={save}>{account ? 'Save account' : 'Add account'}</button>
      {account && !inUse && (
        <ConfirmButton
          label="Delete account" className="btn btn-danger btn-block"
          onConfirm={() => { remove('accounts', account.id); showToast('Account deleted', { undo: true }); onDone(); }}
        />
      )}
      {account && inUse && <p className="small muted">This account has entries, so it cannot be deleted.</p>}
    </div>
  );
}

export function Accounts() {
  const money = useMoney();
  const openSheet = useStore((s) => s.openSheet);
  const closeSheet = useStore((s) => s.closeSheet);
  const accounts = useMemo(() => sortedAccounts(money.accounts), [money.accounts]);
  const balances = useMemo(() => accountBalances(money), [money]);
  const used = useMemo(() => {
    const s = new Set<string>();
    for (const t of allTx(money)) { s.add(t.account); if (t.toAccount) s.add(t.toAccount); }
    return s;
  }, [money]);
  const total = accounts.reduce((s, a) => s + (balances[a.id] ?? 0), 0);

  const add = () => openSheet('New account', () => <AccountForm onDone={closeSheet} />);

  return (
    <div className="mn-screen">
      <ScreenHeader
        title="Accounts" back
        right={<button type="button" className="icon-btn mn-add-btn" aria-label="Add account" onClick={add}><Icon name="plus" /></button>}
      />
      <div className="mn-hero">
        <span className="label">Total balance</span>
        <div className={`mn-hero-amt num${total < 0 ? ' mn-neg' : ''}`}>{rupees(total)}</div>
        <span className="small muted">Opening balance plus income, minus spending, with transfers between accounts.</span>
      </div>

      <div className="list">
        {accounts.map((a) => {
          const b = balances[a.id] ?? 0;
          return (
            <button
              key={a.id} type="button" className="list-item"
              onClick={() => openSheet(`Edit ${a.name}`, () => <AccountForm account={a} inUse={used.has(a.id)} onDone={closeSheet} />)}
            >
              <span className="mn-link-ico"><Icon name={ACCOUNT_ICON[a.kind]} size={20} /></span>
              <span className="grow mn-tx-main">
                <span className="mn-tx-title">{a.name}</span>
                <span className="small muted">{KIND_OPTS.find((k) => k.value === a.kind)?.label} · opened with {rupees(a.openingBalance)}</span>
              </span>
              <span className={`num mn-tx-amt${b < 0 ? ' mn-neg' : ''}`}>{rupees(b)}</span>
            </button>
          );
        })}
      </div>
      {accounts.length === 0 && <p className="small muted">Add an account to track where your money sits.</p>}

      <div className="grid-2 mn-actions">
        <button type="button" className="btn" disabled={accounts.length < 2} onClick={() => openTxEditor(null, 'transfer')}>
          <Icon name="repeat" size={18} /> Transfer
        </button>
        <button type="button" className="btn" onClick={add}><Icon name="plus" size={18} /> Add account</button>
      </div>
      <p className="small muted">Set an opening balance so totals match your bank app. Tap an account to change it.</p>
    </div>
  );
}
