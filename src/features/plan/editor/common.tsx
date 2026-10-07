// Shared bits for the plan editor: the one write path, inline inputs, two-tap remove, move buttons.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { currentPlanBody, savePlan } from '../../../plan/resolve';
import type { PlanBody } from '../../../plan/templates';
import { Icon } from '../../../ui/Icon';
import { haptic } from '../../../ui/kit';

/**
 * Every edit goes through here: take a fresh deep copy of the saved plan, change the copy, save it whole.
 * `change` may mutate the copy (it is never the store's object). Return false to skip saving.
 */
export function editPlan(change: (next: PlanBody) => void | boolean, toast?: string) {
  const next = currentPlanBody();
  if (change(next) === false) return;
  savePlan(next, toast);
}

/** Text input that saves on blur or Enter. Blank values revert when `required`. */
export function CommitInput({ id, value, onCommit, label, placeholder, required, className = 'input', maxLength = 80 }: {
  id: string; value: string; onCommit: (v: string) => void; label: string; placeholder?: string; required?: boolean;
  className?: string; maxLength?: number;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const v = draft.trim().replace(/\s+/g, ' ');
    if (!v && required) {
      setDraft(value);
      return;
    }
    if (v !== value) onCommit(v);
    else if (draft !== value) setDraft(value);
  };
  return (
    <input
      id={id} className={className} value={draft} aria-label={label} placeholder={placeholder} maxLength={maxLength}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

/** Two-tap confirm: the first tap arms (for 3 s), the second does it. */
export function useArm(ms = 3000) {
  const [armed, setArmed] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const arm = () => {
    setArmed(true);
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setArmed(false), ms);
  };
  const disarm = () => {
    window.clearTimeout(t.current);
    setArmed(false);
  };
  return { armed, arm, disarm };
}

/** Trash icon; first tap turns it into "Remove", second tap runs `onConfirm`. */
export function RemoveButton({ what, onConfirm }: { what: string; onConfirm: () => void }) {
  const { armed, arm, disarm } = useArm();
  return (
    <button
      type="button" className={`pe-icon-btn pe-remove ${armed ? 'is-armed' : ''}`}
      aria-label={armed ? `Tap again to remove ${what}` : `Remove ${what}`}
      onClick={() => {
        if (armed) {
          disarm();
          haptic(15);
          onConfirm();
        } else arm();
      }}
    >
      {armed ? <span className="pe-remove-text">Remove</span> : <Icon name="trash" size={18} />}
    </button>
  );
}

/** Up and down buttons for a list row. */
export function MoveButtons({ index, count, what, onMove }: { index: number; count: number; what: string; onMove: (delta: number) => void }) {
  return (
    <>
      <button type="button" className="pe-icon-btn" aria-label={`Move ${what} up`} disabled={index === 0} onClick={() => onMove(-1)}>
        <span className="pe-rot-up" aria-hidden="true"><Icon name="chevron" size={18} /></span>
      </button>
      <button type="button" className="pe-icon-btn" aria-label={`Move ${what} down`} disabled={index >= count - 1} onClick={() => onMove(1)}>
        <span className="pe-rot-down" aria-hidden="true"><Icon name="chevron" size={18} /></span>
      </button>
    </>
  );
}

/** Editable list row: the main area opens the editor; actions sit on the right. */
export function EditRow({ title, meta, lead, onEdit, editLabel, children }: {
  title: ReactNode; meta?: ReactNode; lead?: ReactNode; onEdit: () => void; editLabel: string; children?: ReactNode;
}) {
  return (
    <li className="pe-row">
      <button type="button" className="pe-row-main" onClick={onEdit} aria-label={editLabel}>
        {lead}
        <span className="pe-row-text">
          <span className="pe-row-title">{title}</span>
          {meta && <span className="pe-row-meta small muted">{meta}</span>}
        </span>
        <span className="pe-row-edit" aria-hidden="true"><Icon name="edit" size={16} /></span>
      </button>
      {children && <span className="pe-row-actions">{children}</span>}
    </li>
  );
}

/** Save / cancel footer for sheet forms. */
export function SheetActions({ onSave, onCancel, saveLabel = 'Save', disabled }: {
  onSave: () => void; onCancel: () => void; saveLabel?: string; disabled?: boolean;
}) {
  return (
    <div className="pe-sheet-actions">
      <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      <button type="button" className="btn btn-primary" onClick={onSave} disabled={disabled}>{saveLabel}</button>
    </div>
  );
}
