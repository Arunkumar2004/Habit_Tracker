// Shared bits for Today and Habits: value formatting, tick action, the "type a number" sheet.
import { useState } from 'react';
import type { Data, Habit, ReviewArea } from '../../types';
import { useStore } from '../../store/store';
import { haptic } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { num } from '../../lib/format';
import { fmtShort, todayISO } from '../../lib/date';
import { habitRaw, habitTarget } from '../../engines/schedule';

export const AREA_LABEL: Record<ReviewArea, string> = {
  physique: 'Physique', posture: 'Posture', skin: 'Skin', hair_beard: 'Hair + beard', walk: 'Runway walk',
  posing: 'Posing', style: 'Style', sleep: 'Sleep', food: 'Food', confidence: 'Confidence',
};

/** One value in the habit's unit: 2500 ml → '2.5 L', 7400 steps → '7.4k', 96 g → '96 g', 7.5 h → '7.5 h'. */
export function fmtValue(habit: Pick<Habit, 'unit'>, v: number, withUnit = true): string {
  const u = habit.unit ?? '';
  if (u === 'ml') return withUnit && v < 1000 ? `${num(v)} ml` : `${num(v / 1000, 2)}${withUnit ? ' L' : ''}`;
  if (u === 'steps') return v >= 1000 ? `${num(v / 1000, 1)}k` : num(v);
  return `${num(v, 2)}${withUnit && u ? ` ${u}` : ''}`;
}

/** '2.5 / 3.5 L', '96 / 130 g', '7.4k / 10k'. */
export function fmtPair(habit: Pick<Habit, 'unit'>, v: number, target: number): string {
  return `${fmtValue(habit, v, false)} / ${fmtValue(habit, target)}`;
}

/** The + button increment for a counter (falls back to a tenth of the target). */
export function stepOf(habit: Habit, target: number): number {
  if (habit.step && habit.step > 0) return habit.step;
  if (habit.type === 'number') return habit.unit === 'h' ? 0.5 : 1;
  return Math.max(1, Math.round(target / 10));
}

export function valueOf(data: Data, habit: Habit, date: string): number {
  return habitRaw(habit, data.days[date]);
}

/** Tick or untick a check habit, with a vibration and an Undo toast. Returns the new state. */
export function toggleCheck(habit: Habit, date: string): boolean {
  const s = useStore.getState();
  const cur = s.data.days[date]?.habits[habit.id] === true;
  s.setHabit(date, habit.id, !cur);
  haptic(cur ? 8 : 14);
  const when = date === todayISO() ? '' : ` (${fmtShort(date)})`;
  s.showToast(`${habit.name} ${cur ? 'unticked' : 'done'}${when}`, { undo: true });
  return !cur;
}

/** Add one step to a counter, with a vibration and an Undo toast. */
export function bump(habit: Habit, date: string, delta: number) {
  const s = useStore.getState();
  s.bumpHabit(date, habit.id, delta);
  haptic(10);
  s.showToast(`${habit.name} +${fmtValue(habit, delta)}`, { undo: true });
}

/** Suggested quick values for the number sheet. */
function presets(habit: Habit, target: number): number[] {
  if (habit.unit === 'h') return [6, 6.5, 7, 7.5, 8, 8.5, 9];
  if (habit.unit === 'ml') return [1000, 1500, 2000, 2500, 3000, 3500, 4000];
  if (habit.unit === 'steps') return [4000, 6000, 8000, 10000, 12000];
  return [0.5, 0.75, 1].map((k) => Math.round(target * k));
}

/** Sheet to type an exact value for a counter / number habit on a date. */
export function openValueSheet(habit: Habit, date: string) {
  const { openSheet } = useStore.getState();
  const title = date === todayISO() ? habit.name : `${habit.name} · ${fmtShort(date)}`;
  openSheet(title, () => <ValueSheet habit={habit} date={date} />);
}

function ValueSheet({ habit, date }: { habit: Habit; date: string }) {
  const data = useStore((s) => s.data);
  const close = useStore((s) => s.closeSheet);
  const target = habitTarget(habit, data);
  const cur = valueOf(data, habit, date);
  const [text, setText] = useState(cur ? String(cur) : '');
  const n = Number(text.replace(',', '.'));
  const valid = text.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= target * 20;
  const unitLabel = habit.unit === 'ml' ? 'ml' : habit.unit ?? '';

  function save(v: number) {
    const s = useStore.getState();
    s.setHabit(date, habit.id, Math.round(v * 100) / 100);
    haptic(12);
    s.showToast(`${habit.name}: ${fmtValue(habit, v)}`, { undo: true });
    close();
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save(n);
      }}
    >
      <p className="muted small td-sheet-note">Target {fmtValue(habit, target)}. Type the exact number or pick one.</p>
      <div className="td-value-input">
        <input
          className="input num" inputMode="decimal" autoFocus aria-label={`${habit.name} in ${unitLabel || 'units'}`}
          value={text} onChange={(e) => setText(e.target.value)} placeholder="0"
        />
        {unitLabel && <span className="muted">{unitLabel}</span>}
      </div>
      <div className="chips">
        {presets(habit, target).map((p) => (
          <button key={p} type="button" className="chip num" aria-pressed={n === p} onClick={() => setText(String(p))}>
            {fmtValue(habit, p)}
          </button>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn grow" onClick={() => save(0)} disabled={!cur}>
          <Icon name="close" /> Clear
        </button>
        <button type="submit" className="btn btn-primary grow" disabled={!valid}>
          <Icon name="check" /> Save
        </button>
      </div>
    </form>
  );
}
