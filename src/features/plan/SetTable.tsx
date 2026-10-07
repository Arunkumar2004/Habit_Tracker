// Workout logger pieces: numeric inputs, set rows and the rest timer bar.
import { useEffect, useState } from 'react';
import type { WorkoutSet } from '../../types';
import type { Exercise } from '../../data/sessions';
import { Icon } from '../../ui/Icon';
import { clock } from './Stepper';

/** Number input that keeps what you type ("62." stays) and reports a parsed number. Opens the numeric keypad. */
export function NumInput({ value, onChange, placeholder, label, decimal }: {
  value: number; onChange: (n: number) => void; placeholder?: string; label: string; decimal?: boolean;
}) {
  const [text, setText] = useState(value ? String(value) : '');
  useEffect(() => {
    if ((parseFloat(text) || 0) !== value) setText(value ? String(value) : '');
    // Only resync when the stored value changes from outside.
  }, [value]); // eslint-disable-line
  return (
    <input
      className="input pl-num-in num"
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={label}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
        setText(t);
        onChange(parseFloat(t) || 0);
      }}
    />
  );
}

export function SetTable({ ex, sets, targetReps, onChange, onTick, onAdd, onRemove }: {
  ex: Exercise;
  sets: WorkoutSet[];
  targetReps: number[];
  onChange: (i: number, s: WorkoutSet) => void;
  onTick: (i: number) => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const repsHead = ex.unit === 'sec' ? 'Sec' : ex.unit === 'per leg' ? 'Reps/leg' : 'Reps';
  return (
    <div className="pl-sets">
      <div className="pl-set-head label">
        <span>Set</span>
        <span>{ex.bodyweight ? '+kg' : 'kg'}</span>
        <span>{repsHead}</span>
        <span aria-hidden="true" />
      </div>
      {sets.map((s, i) => (
        <div key={i} className={`pl-set-row ${s.done ? 'is-done' : ''}`}>
          <span className="pl-set-n num">{i + 1}</span>
          <NumInput
            label={`Set ${i + 1} weight in kg`} decimal value={s.kg} placeholder={ex.bodyweight ? '0' : '–'}
            onChange={(kg) => onChange(i, { ...s, kg })}
          />
          <NumInput
            label={`Set ${i + 1} ${repsHead.toLowerCase()}`} value={s.reps} placeholder={String(targetReps[i] ?? ex.repLow)}
            onChange={(reps) => onChange(i, { ...s, reps })}
          />
          <button
            type="button" className={`pl-tick ${s.done ? 'on' : ''}`} onClick={() => onTick(i)}
            aria-pressed={s.done} aria-label={s.done ? `Untick set ${i + 1}` : `Tick set ${i + 1}`}
          >
            <Icon name="check" />
          </button>
        </div>
      ))}
      <div className="pl-set-actions">
        <button type="button" className="btn btn-ghost" onClick={onAdd}><Icon name="plus" /> Add set</button>
        {sets.length > 1 && (
          <button type="button" className="btn btn-ghost" onClick={onRemove}><Icon name="minus" /> Remove set</button>
        )}
      </div>
    </div>
  );
}

export function RestBar({ leftSec, totalSec, onSkip, onAdd }: { leftSec: number; totalSec: number; onSkip: () => void; onAdd: () => void }) {
  return (
    <div className="pl-rest" role="timer" aria-live="off">
      <div className="pl-rest-fill" style={{ transform: `scaleX(${totalSec ? leftSec / totalSec : 0})` }} aria-hidden="true" />
      <Icon name="timer" />
      <span className="grow"><span className="label">Rest</span> <strong className="num">{clock(leftSec)}</strong></span>
      <button type="button" className="pl-rest-btn" onClick={onAdd} aria-label="Add 15 seconds of rest">+15 s</button>
      <button type="button" className="pl-rest-btn" onClick={onSkip}>Skip</button>
    </div>
  );
}

export function HowTo({ ex }: { ex: Exercise }) {
  return (
    <div className="pl-howto">
      <div>
        <span className="label">How</span>
        <ol>{ex.how.map((h, i) => <li key={i}>{h}</li>)}</ol>
      </div>
      <div className="pl-avoid">
        <span className="label">Avoid</span>
        <ul>{ex.avoid.map((a, i) => <li key={i}>{a}</li>)}</ul>
      </div>
      <span className="small muted"><Icon name="timer" size={14} /> Rest {ex.restSec ? `${ex.restSec} s` : 'as needed'} between sets</span>
    </div>
  );
}
