// Savings goals: progress rings, add money, create / edit / delete.
import { useMemo, useState } from 'react';
import type { Goal } from '../../types';
import { useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { Empty, Field, Ring, ScreenHeader, haptic } from '../../ui/kit';
import { pct, rupees, uid } from '../../lib/format';
import { fmtLong, todayISO } from '../../lib/date';
import { goalProgress } from '../../engines/budget';
import { AmountDisplay, Keypad, keypadValue } from './Keypad';
import { ConfirmButton } from './parts';

const SUGGESTION = { name: 'Portfolio shoot fund', target: 15000 };
const digitsOnly = (s: string) => s.replace(/[^\d]/g, '').slice(0, 9);

function GoalForm({ goal, preset, onDone }: { goal?: Goal; preset?: { name: string; target: number }; onDone: () => void }) {
  const put = useStore((s) => s.put);
  const remove = useStore((s) => s.remove);
  const showToast = useStore((s) => s.showToast);
  const [name, setName] = useState(goal?.name ?? preset?.name ?? '');
  const [target, setTarget] = useState(String(goal?.target ?? preset?.target ?? ''));
  const [saved, setSaved] = useState(goal ? String(goal.saved || '') : '');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const t = Number(target) || 0;
  const valid = name.trim().length > 0 && t > 0;

  function save() {
    if (!valid) return;
    put('goals', { id: goal?.id ?? uid('goal'), name: name.trim(), target: t, saved: Number(saved) || 0, deadline: deadline || undefined });
    haptic(15);
    showToast(goal ? 'Goal updated' : `Goal "${name.trim()}" created`, { undo: true });
    onDone();
  }
  return (
    <div className="stack">
      <Field label="Name"><input className="input" value={name} maxLength={40} placeholder="Portfolio shoot fund" onChange={(e) => setName(e.target.value)} /></Field>
      <div className="grid-2">
        <Field label="Target (₹)"><input className="input num" inputMode="numeric" value={target} placeholder="15000" onChange={(e) => setTarget(digitsOnly(e.target.value))} /></Field>
        <Field label="Saved so far (₹)"><input className="input num" inputMode="numeric" value={saved} placeholder="0" onChange={(e) => setSaved(digitsOnly(e.target.value))} /></Field>
      </div>
      <Field label="Deadline (optional)"><input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
      <button type="button" className="btn btn-primary btn-block" disabled={!valid} onClick={save}>{goal ? 'Save goal' : 'Create goal'}</button>
      {goal && (
        <ConfirmButton
          label="Delete goal" className="btn btn-danger btn-block"
          onConfirm={() => { remove('goals', goal.id); showToast('Goal deleted', { undo: true }); onDone(); }}
        />
      )}
    </div>
  );
}

function AddMoney({ goal, onDone }: { goal: Goal; onDone: () => void }) {
  const patch = useStore((s) => s.patch);
  const showToast = useStore((s) => s.showToast);
  const [digits, setDigits] = useState('');
  const n = keypadValue(digits);
  const after = goal.saved + n;
  return (
    <div className="mn-form">
      <AmountDisplay digits={digits} tone="income" label="Amount to add" />
      <p className="small muted mn-center num">
        {rupees(goal.saved)} → {rupees(after)} of {rupees(goal.target)} ({pct(Math.min(1, after / goal.target))})
      </p>
      <Keypad digits={digits} onChange={setDigits} />
      <button
        type="button" className="btn btn-primary btn-block mn-save" disabled={n <= 0}
        onClick={() => {
          patch('goals', goal.id, { saved: after });
          haptic(15);
          showToast(after >= goal.target ? `${goal.name} reached` : `${rupees(n)} added to ${goal.name}`, { undo: true });
          onDone();
        }}
      >
        {n > 0 ? `Add ${rupees(n)}` : 'Enter an amount'}
      </button>
    </div>
  );
}

export function Goals() {
  const goalsMap = useStore((s) => s.data.goals);
  const openSheet = useStore((s) => s.openSheet);
  const closeSheet = useStore((s) => s.closeSheet);
  const today = todayISO();
  const goals = useMemo(
    () => Object.values(goalsMap).filter((g) => !g.deleted).sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') || a.name.localeCompare(b.name)),
    [goalsMap],
  );
  const savedAll = goals.reduce((s, g) => s + g.saved, 0);
  const targetAll = goals.reduce((s, g) => s + g.target, 0);

  const create = (preset?: { name: string; target: number }) => openSheet('New goal', () => <GoalForm preset={preset} onDone={closeSheet} />);

  return (
    <div className="mn-screen">
      <ScreenHeader
        title="Savings goals" back
        right={<button type="button" className="icon-btn mn-add-btn" aria-label="New goal" onClick={() => create()}><Icon name="plus" /></button>}
      />
      {goals.length === 0 ? (
        <div className="card">
          <Empty icon="goal" title="No savings goals yet">
            Save toward something that moves your career. Each goal gets a progress ring.
          </Empty>
          <button type="button" className="mn-suggest" onClick={() => create(SUGGESTION)}>
            <span className="mn-link-ico"><Icon name="camera" size={20} /></span>
            <span className="grow">
              <strong>{SUGGESTION.name}</strong>
              <span className="small muted num"> · {rupees(SUGGESTION.target)}</span>
            </span>
            <span className="small mn-accent">Start</span>
          </button>
        </div>
      ) : (
        <>
          <div className="mn-hero">
            <span className="label">Saved across {goals.length} {goals.length === 1 ? 'goal' : 'goals'}</span>
            <div className="mn-hero-amt num">{rupees(savedAll)}</div>
            <span className="small muted num">of {rupees(targetAll)} · {pct(targetAll ? Math.min(1, savedAll / targetAll) : 0)}</span>
          </div>
          <div className="stack mn-goals">
            {goals.map((g) => {
              const p = goalProgress(g, today);
              return (
                <article key={g.id} className={`card mn-goal${p.done ? ' mn-goal-done' : ''}`}>
                  <div className="row">
                    <Ring value={p.ratio} size={76} stroke={8} color={p.done ? 'var(--success)' : 'var(--accent)'}>
                      {p.done ? <Icon name="check" size={26} /> : <strong className="num mn-ring-pct">{pct(p.ratio)}</strong>}
                    </Ring>
                    <div className="grow mn-goal-main">
                      <strong className="mn-goal-name">{g.name}</strong>
                      <span className="num">{rupees(g.saved)} <span className="muted small">of {rupees(g.target)}</span></span>
                      <span className="small muted">
                        {p.done ? 'Goal reached' : `${rupees(p.left)} to go`}
                        {g.deadline && !p.done && ` · by ${fmtLong(g.deadline)}`}
                        {p.perDay !== undefined && ` · ${rupees(Math.ceil(p.perDay))}/day`}
                        {g.deadline && !p.done && p.daysLeft === 0 && ' · deadline passed'}
                      </span>
                    </div>
                    <button type="button" className="icon-btn" aria-label={`Edit ${g.name}`} onClick={() => openSheet('Edit goal', () => <GoalForm goal={g} onDone={closeSheet} />)}>
                      <Icon name="edit" size={20} />
                    </button>
                  </div>
                  {!p.done && (
                    <button type="button" className="btn btn-block mn-goal-add" onClick={() => openSheet(`Add to ${g.name}`, () => <AddMoney goal={g} onDone={closeSheet} />)}>
                      <Icon name="plus" size={18} /> Add money
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
