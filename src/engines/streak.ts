// OWNER: Today+Habits agent. Streak engine (blueprint 6).
// A habit streak counts scheduled days in a row that are done. Unscheduled days do not break it, and today does not
// break it until the day is over. times_per_week habits break only when a week ends below its count.
import type { Data, Habit } from '../types';
import { addDays, weekStart } from '../lib/date';
import { habitProgress, isDone, isScheduled } from './schedule';
import { dayScore } from './score';

export interface HabitStreak { current: number; best: number }

/** First date worth scanning: plan start, else the earliest day record, never more than ~2 years back. */
function scanStart(data: Data, today: string): string {
  const floor = addDays(today, -730);
  let first = data.profile.me?.startDate;
  if (!first) {
    for (const d of Object.keys(data.days)) if (!first || d < first) first = d;
  }
  if (!first || first > today) return today;
  return first < floor ? floor : first;
}

export function habitStreak(habit: Habit, data: Data, today: string): HabitStreak {
  const from = scanStart(data, today);
  let run = 0;
  let best = 0;

  if (habit.schedule.kind === 'times_per_week') {
    const times = Math.max(1, habit.schedule.times);
    let weekDone = 0;
    for (let d = from; d <= today; d = addDays(d, 1)) {
      if (d === weekStart(d)) weekDone = 0;
      if (isDone(habit, d, data)) {
        weekDone++;
        run++;
        best = Math.max(best, run);
      }
      const isSunday = addDays(d, 1) === weekStart(addDays(d, 1));
      // A finished week below its count breaks the run (a partial first week is judged the same way).
      if (d < today && isSunday && weekDone < times) run = 0;
    }
    // Current week: it breaks only once the count can no longer be reached.
    const ws = weekStart(today);
    let left = 0;
    for (let d = addDays(today, 1); d < addDays(ws, 7); d = addDays(d, 1)) left++;
    const doneThisWeek = countDone(habit, data, ws < from ? from : ws, today);
    const todayDone = isDone(habit, today, data);
    const reachable = doneThisWeek + left + (todayDone ? 0 : 1) >= times;
    return { current: reachable ? run : 0, best };
  }

  for (let d = from; d <= today; d = addDays(d, 1)) {
    if (!isScheduled(habit, d, data)) continue;
    if (isDone(habit, d, data)) {
      run++;
      best = Math.max(best, run);
    } else if (d < today) {
      run = 0;
    }
  }
  return { current: run, best };
}

function countDone(habit: Habit, data: Data, from: string, to: string): number {
  let n = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) if (isDone(habit, d, data)) n++;
  return n;
}

/** First day of a `weeks`-column heatmap ending at `end` (Monday of the first column). */
export function heatmapStart(end: string, weeks: number): string {
  return addDays(weekStart(end), -(weeks - 1) * 7);
}

/**
 * Heatmap values for one habit: date → 0..1 progress on scheduled days (or days done anyway);
 * undefined for days not scheduled, before the plan start, or after `today`.
 */
export function habitHeatmap(habit: Habit, data: Data, end: string, weeks = 12, today = end): Record<string, number | undefined> {
  const out: Record<string, number | undefined> = {};
  const start = data.profile.me?.startDate;
  for (let d = heatmapStart(end, weeks), last = addDays(weekStart(end), 6); d <= last; d = addDays(d, 1)) {
    if (d > today || (start && d < start)) {
      out[d] = undefined;
      continue;
    }
    const p = habitProgress(habit, d, data);
    out[d] = p > 0 || isScheduled(habit, d, data) ? p : undefined;
  }
  return out;
}

/** Heatmap values for the whole day: date → day score (undefined when nothing was due or the day is ahead). */
export function scoreHeatmap(data: Data, end: string, weeks = 12, today = end): Record<string, number | undefined> {
  const out: Record<string, number | undefined> = {};
  for (let d = heatmapStart(end, weeks), last = addDays(weekStart(end), 6); d <= last; d = addDays(d, 1)) {
    if (d > today) {
      out[d] = undefined;
      continue;
    }
    const s = dayScore(data, d);
    out[d] = s.total ? s.score : undefined;
  }
  return out;
}

/** Done / due count for a habit in the Monday-first week containing `date`. */
export function weekCount(habit: Habit, data: Data, date: string): { done: number; due: number } {
  const ws = weekStart(date);
  let done = 0;
  let due = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i);
    if (isDone(habit, d, data)) done++;
    if (habit.schedule.kind !== 'times_per_week' && isScheduled(habit, d, data)) due++;
  }
  if (habit.schedule.kind === 'times_per_week') due = Math.max(1, habit.schedule.times);
  return { done, due };
}
