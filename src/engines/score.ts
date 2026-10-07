// OWNER: Today+Habits agent. Contract (keep names and signatures): used by Progress (weekly log, insights).
// Score engine (blueprint 6): daily score = habits done ÷ habits scheduled, with part credit for counters/numbers.
import type { Data } from '../types';
import { addDays } from '../lib/date';
import { activeHabits, habitProgress, isScheduled } from './schedule';

export { habitProgress, habitTarget, isDone } from './schedule';

export interface DayScore { score: number; done: number; total: number; band: 'great' | 'ok' | 'missed' }

export const GREAT = 0.8;
export const OK = 0.5;

export function bandOf(score: number): DayScore['band'] {
  return score >= GREAT ? 'great' : score >= OK ? 'ok' : 'missed';
}

/** Habits done ÷ habits scheduled; counters give part credit. 0.8+ great, 0.5–0.79 ok, else missed. */
export function dayScore(data: Data, date: string): DayScore {
  let sum = 0;
  let done = 0;
  let total = 0;
  for (const h of activeHabits(data)) {
    if (!isScheduled(h, date, data)) continue;
    const p = habitProgress(h, date, data);
    total++;
    sum += p;
    if (p >= 1) done++;
  }
  const score = total ? Math.round((sum / total) * 10000) / 10000 : 0;
  return { score, done, total, band: bandOf(score) };
}

/** Day streak: consecutive days (ending today or yesterday) at score ≥ 0.8. */
export function dayStreak(data: Data, today: string): number {
  const start = data.profile.me?.startDate;
  let d = dayScore(data, today).score >= GREAT ? today : addDays(today, -1);
  let n = 0;
  for (let i = 0; i < 800; i++) {
    if (start && d < start) break;
    if (dayScore(data, d).score < GREAT) break;
    n++;
    d = addDays(d, -1);
  }
  return n;
}
