// Progression engine (blueprint 6). Pure functions over the user's workouts.
//  - Every set at the top of the rep range → add weight (+2.5 kg compound, +1–2 kg isolation).
//  - Otherwise → same weight, beat last time by 1 rep.
//  - No progress for 3 weeks → "Check sleep + protein, then eat a bit more."
//  - Every 8–10 weeks → an easy week (same exercises, half the sets).
import type { Data, Workout, WorkoutSet } from '../types';
import type { Exercise } from '../data/sessions';
import { diffDays } from '../lib/date';

export const PLATEAU_TEXT = 'Check sleep + protein, then eat a bit more.';
export const EASY_WEEK_TEXT = 'Easy week: same exercises, half the sets.';
/** Hard weeks before an easy week is due (week 9, 18, 27 …; never later than week 10 after the last one). */
export const HARD_WEEKS = 8;

export interface LastPerformance { date: string; workoutId: string; sets: WorkoutSet[] }

const doneSets = (sets: WorkoutSet[]) => sets.filter((s) => s.done && s.reps > 0);

/** Newest finished workout that has at least one done set of this exercise (optionally before/at a date, skipping one id). */
export function lastPerformance(data: Data, exId: string, opts: { onOrBefore?: string; excludeId?: string } = {}): LastPerformance | null {
  let best: { w: Workout; sets: WorkoutSet[] } | null = null;
  for (const w of Object.values(data.workouts)) {
    if (!w.finished || w.id === opts.excludeId) continue;
    if (opts.onOrBefore && w.date > opts.onOrBefore) continue;
    const e = w.exercises.find((x) => x.ex === exId);
    const sets = e ? doneSets(e.sets) : [];
    if (!sets.length) continue;
    if (!best || w.date > best.w.date || (w.date === best.w.date && w.updatedAt > best.w.updatedAt)) best = { w, sets };
  }
  return best ? { date: best.w.date, workoutId: best.w.id, sets: best.sets } : null;
}

export type SuggestAction = 'start' | 'increase' | 'same';
export interface Suggestion { action: SuggestAction; kg: number | null; text: string }

type ExLike = Pick<Exercise, 'sets' | 'repLow' | 'repHigh' | 'unit' | 'kind' | 'bodyweight'>;

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmtKg = (n: number) => `${r2(n)} kg`;

/** Working weight of a session = the heaviest done set. */
export function workingKg(sets: WorkoutSet[]): number {
  return doneSets(sets).reduce((m, s) => Math.max(m, s.kg || 0), 0);
}

/** Next-weight suggestion from last time's sets. */
export function suggestNext(ex: ExLike, last: WorkoutSet[] | null): Suggestion {
  const sets = last ? doneSets(last) : [];
  if (ex.unit === 'min') return { action: 'start', kg: null, text: 'Next: run the full 10 minutes, steady and slow.' };
  if (!sets.length) {
    return {
      action: 'start', kg: null,
      text: ex.bodyweight
        ? `Start: bodyweight, aim for ${ex.repLow}–${ex.repHigh}${ex.unit === 'sec' ? ' s' : ' reps'}.`
        : `Start light: a weight you can lift ${ex.repHigh} times with 2 reps left.`,
    };
  }
  const kg = workingKg(sets);
  const allTop = sets.length >= ex.sets && sets.every((s) => s.reps >= ex.repHigh);

  if (ex.unit === 'sec') {
    return allTop
      ? { action: 'increase', kg: kg || null, text: `Next: hold ${ex.repHigh + 10} s, or add a slow breath at the end.` }
      : { action: 'same', kg: kg || null, text: 'Next: hold each set 5 s longer than last time.' };
  }
  const repWord = ex.unit === 'per leg' ? 'rep each leg' : 'rep';
  if (allTop) {
    if (ex.bodyweight && kg === 0) return { action: 'increase', kg: 2.5, text: 'Next: add 2.5 kg (belt or dumbbell), or slow the lowering to 3 s.' };
    if (ex.kind === 'compound') return { action: 'increase', kg: kg + 2.5, text: `Next: ${fmtKg(kg + 2.5)} (+2.5 kg)` };
    return { action: 'increase', kg: kg + 1, text: `Next: ${r2(kg + 1)}–${r2(kg + 2)} kg (+1–2 kg)` };
  }
  const weight = kg > 0 ? `stay ${fmtKg(kg)}` : 'stay bodyweight';
  return { action: 'same', kg: kg || null, text: `Next: ${weight}, beat 1 ${repWord}` };
}

/** Best set of a session as one number: estimated 1-rep max (Epley) for loaded sets, reps for bodyweight sets. */
export function sessionScore(sets: WorkoutSet[]): number {
  let best = 0;
  for (const s of doneSets(sets)) {
    const v = s.kg > 0 ? s.kg * (1 + s.reps / 30) : s.reps;
    if (v > best) best = v;
  }
  return Math.round(best * 100) / 100;
}

/**
 * No progress for 3 weeks: the exercise was done at least twice in the last 21 days, there is history before that,
 * and nothing in the last 21 days beat the best from before.
 */
export function isPlateau(data: Data, exId: string, today: string): boolean {
  let before = 0;
  let recent = 0;
  let recentCount = 0;
  for (const w of Object.values(data.workouts)) {
    if (!w.finished || w.date > today) continue;
    const e = w.exercises.find((x) => x.ex === exId);
    if (!e || !doneSets(e.sets).length) continue;
    const score = sessionScore(e.sets);
    const age = diffDays(w.date, today);
    if (age < 21) {
      recent = Math.max(recent, score);
      recentCount++;
    } else {
      before = Math.max(before, score);
    }
  }
  return recentCount >= 2 && before > 0 && recent <= before;
}

export interface EasyWeek { due: boolean; inEasy: boolean; weeksSince: number; text: string }
/** `easyWeeks` = plan week numbers already done as easy weeks. Due after 8 hard weeks (week 9, then 8 hard weeks again). */
export function easyWeekStatus(week: number, easyWeeks: number[]): EasyWeek {
  const inEasy = easyWeeks.includes(week);
  const last = easyWeeks.filter((w) => w < week).reduce((m, w) => Math.max(m, w), 0);
  const weeksSince = week - last - 1; // hard weeks completed since the last easy week
  const due = !inEasy && weeksSince >= HARD_WEEKS;
  return { due, inEasy, weeksSince, text: EASY_WEEK_TEXT };
}
/** Half the sets, rounded up. */
export function easySets(sets: number): number {
  return Math.max(1, Math.ceil(sets / 2));
}

export type PbLift = 'bench' | 'squat' | 'pulldown';
export const PB_LIFTS: Record<PbLift, { ex: string; label: string }> = {
  bench: { ex: 'bench_press', label: 'Bench press' },
  squat: { ex: 'squat', label: 'Squat' },
  pulldown: { ex: 'lat_pulldown', label: 'Lat pulldown' },
};
export type PersonalBests = Record<PbLift, number>;

/** Heaviest done set (kg) for bench, squat and pulldown across finished workouts. */
export function personalBests(data: Data, opts: { excludeId?: string } = {}): PersonalBests {
  const out: PersonalBests = { bench: 0, squat: 0, pulldown: 0 };
  for (const w of Object.values(data.workouts)) {
    if (!w.finished || w.id === opts.excludeId) continue;
    for (const lift of Object.keys(PB_LIFTS) as PbLift[]) {
      const e = w.exercises.find((x) => x.ex === PB_LIFTS[lift].ex);
      if (e) out[lift] = Math.max(out[lift], workingKg(e.sets));
    }
  }
  return out;
}

export interface PbBeaten { lift: PbLift; label: string; kg: number; prev: number }
/** PBs this workout beats compared with every other finished workout. A first-ever lift counts as a PB. */
export function pbsBeaten(data: Data, workout: Workout): PbBeaten[] {
  const prev = personalBests(data, { excludeId: workout.id });
  const out: PbBeaten[] = [];
  for (const lift of Object.keys(PB_LIFTS) as PbLift[]) {
    const e = workout.exercises.find((x) => x.ex === PB_LIFTS[lift].ex);
    const kg = e ? workingKg(e.sets) : 0;
    if (kg > 0 && kg > prev[lift]) out.push({ lift, label: PB_LIFTS[lift].label, kg, prev: prev[lift] });
  }
  return out;
}

/** "6 kg · 15 15 14 13" (or "BW · 10 9 8", "40 s 40 s" for holds). */
export function lastLine(sets: WorkoutSet[], unit: Exercise['unit']): string {
  const d = doneSets(sets);
  if (!d.length) return '';
  const kg = workingKg(d);
  const reps = d.map((s) => (unit === 'sec' ? `${s.reps}s` : String(s.reps))).join(' ');
  return `${kg > 0 ? fmtKg(kg) : 'BW'} · ${reps}`;
}
