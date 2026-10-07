// Small shared pieces for the Money screens.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Account, Category, Transaction } from '../../types';
import { useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { haptic } from '../../ui/kit';
import { rupees } from '../../lib/format';
import { fmtMonth } from '../../lib/date';
import { shiftMonth, type MoneyData } from '../../engines/budget';

/** The money slices of the store, memoised so engine calls only rerun when money data changes. */
export function useMoney(): MoneyData & { accounts: Record<string, Account> } {
  const transactions = useStore((s) => s.data.transactions);
  const categories = useStore((s) => s.data.categories);
  const accounts = useStore((s) => s.data.accounts);
  const profile = useStore((s) => s.data.profile);
  return useMemo(() => ({ transactions, categories, accounts, profile }), [transactions, categories, accounts, profile]);
}

const KIND_ORDER: Record<Account['kind'], number> = { upi: 0, cash: 1, card: 2, bank: 3 };
export function sortedAccounts(accounts: Record<string, Account>): Account[] {
  return Object.values(accounts)
    .filter((a) => !a.deleted)
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name));
}
export function defaultAccountId(accounts: Record<string, Account>): string {
  if (accounts.upi) return 'upi';
  return sortedAccounts(accounts)[0]?.id ?? '';
}
export const ACCOUNT_ICON: Record<Account['kind'], string> = { upi: 'phone', cash: 'wallet', card: 'bills', bank: 'money' };

export function CatBadge({ cat, transfer }: { cat?: Category; transfer?: boolean }) {
  const color = transfer ? 'var(--c3)' : cat?.color ?? 'var(--c8)';
  return (
    <span className="mn-badge" style={{ color, ['--mn-tint' as string]: color }}>
      <Icon name={transfer ? 'repeat' : cat?.icon ?? 'other'} size={20} />
    </span>
  );
}

export function txTitle(t: Transaction, cats: Record<string, Category>, accounts: Record<string, Account>): string {
  if (t.type === 'transfer') return `${accounts[t.account]?.name ?? 'Account'} to ${accounts[t.toAccount ?? '']?.name ?? 'account'}`;
  return t.note?.trim() || cats[t.category]?.name || (t.type === 'income' ? 'Income' : 'Expense');
}

export function TxRow({ t, cats, accounts, onOpen, showDate }: {
  t: Transaction; cats: Record<string, Category>; accounts: Record<string, Account>; onOpen: (t: Transaction) => void; showDate?: string;
}) {
  const cat = cats[t.category];
  const sub = [
    t.type === 'transfer' ? 'Transfer' : t.note?.trim() ? cat?.name : null,
    t.type !== 'transfer' ? accounts[t.account]?.name : null,
    showDate,
    t.recurringId ? 'Repeats' : null,
  ].filter(Boolean).join(' · ');
  const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '';
  return (
    <button type="button" className="list-item mn-tx" onClick={() => onOpen(t)}>
      <CatBadge cat={cat} transfer={t.type === 'transfer'} />
      <span className="grow mn-tx-main">
        <span className="mn-tx-title">{txTitle(t, cats, accounts)}</span>
        {sub && <span className="small muted mn-tx-sub">{sub}{t.career && t.type === 'expense' ? <span className="mn-career-dot" aria-label="Career investment" /> : null}</span>}
      </span>
      <span className={`num mn-tx-amt mn-tx-${t.type}`}>{sign}{rupees(t.amount)}</span>
    </button>
  );
}

/** Opens the edit sheet for an entry. The form module registers itself here to avoid an import cycle. */
let editorRender: ((t: Transaction | null, close: () => void, type?: Transaction['type']) => ReactNode) | null = null;
export function setEditorRender(fn: typeof editorRender) {
  editorRender = fn;
}
export function openTxEditor(t: Transaction | null, type: Transaction['type'] = 'expense') {
  const { openSheet, closeSheet } = useStore.getState();
  if (!editorRender) return;
  const title = t ? 'Edit entry' : type === 'transfer' ? 'Transfer' : type === 'income' ? 'Add income' : 'Add expense';
  const r = editorRender;
  openSheet(title, () => r(t, closeSheet, type));
}

/** A delete button that asks for a second tap instead of a browser confirm. */
export function ConfirmButton({ label, confirmLabel = 'Tap again to delete', onConfirm, className = 'btn btn-danger' }: {
  label: string; confirmLabel?: string; onConfirm: () => void; className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button" className={`${className}${armed ? ' mn-armed' : ''}`}
      onClick={() => { haptic(); if (armed) onConfirm(); else setArmed(true); }}
    >
      <Icon name="trash" size={18} />
      {armed ? confirmLabel : label}
    </button>
  );
}

export function MonthSwitcher({ month, onChange, max }: { month: string; onChange: (m: string) => void; max: string }) {
  return (
    <div className="mn-month" role="group" aria-label="Month">
      <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}>
        <Icon name="back" />
      </button>
      <strong className="mn-month-label">{fmtMonth(`${month}-01`)}</strong>
      <button
        type="button" className="icon-btn" aria-label="Next month" disabled={month >= max}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <span className="mn-flip"><Icon name="back" /></span>
      </button>
    </div>
  );
}

/** Tappable row linking to a Money sub-screen. */
export function LinkRow({ icon, label, meta, onClick }: { icon: string; label: string; meta?: string; onClick: () => void }) {
  return (
    <button type="button" className="list-item mn-link" onClick={onClick}>
      <span className="mn-link-ico"><Icon name={icon} size={20} /></span>
      <span className="grow">{label}</span>
      {meta && <span className="small muted num">{meta}</span>}
      <Icon name="chevron" size={18} />
    </button>
  );
}
