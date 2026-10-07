// Insights (blueprint 6): simple rules, no AI. Pure functions over the data.
import type { Data, Habit, Workout } from '../types';
import { addDays, diffDays, daysInMonth, monthKey, parseISO, toISO, weekday } from '../lib/date';
import { targets } from './nutrition';
import { backupDueDays } from '../lib/backup';

export type Tone = 'good' | 'warn' | 'info';
export interface Insight { id: string; text: string; tone: Tone }

export const REMEASURE_EVERY = 28;

function proteinTarget(data: Data): number {
  const p = data.profile.me;
  return p ? targets(p).proteinTarget : 130;
}

/** Is a habit done on this day? Counters/numbers count when they reach the target. */
export function habitDone(data: Data, habit: Habit, date: string): boolean {
  const v = data.days[date]?.habits[habit.id];
  if (v === undefined) return false;
  if (typeof v === 'boolean') return v;
  const target = habit.id === 'protein' ? proteinTarget(data) : habit.target;
  return v >= target;
}

/** Protein hit k/n days over the last 7 full days (yesterday back), counting only days since start. */
export function proteinInsight(data: Data, today: string): Insight | null {
  const start = data.profile.me?.startDate ?? today;
  const target = proteinTarget(data);
  let hit = 0;
  let n = 0;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, -i);
    if (d < start) break;
    n++;
    const v = data.days[d]?.habits.protein;
    if (v === true || (typeof v === 'number' && v >= target)) hit++;
  }
  if (n < 3) return null;
  const good = hit / n >= 0.8;
  return {
    id: 'protein',
    text: good ? `Protein hit ${hit}/${n} days last week` : `Protein hit only ${hit}/${n} days last week`,
    tone: good ? 'good' : 'warn',
  };
}

function prevMonthDay(today: string): string {
  const d = parseISO(today);
  const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const lastDay = daysInMonth(toISO(first));
  return toISO(new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), lastDay)));
}

/** Food spend this month so far vs the same days last month (category id 'food'). */
export function foodSpendInsight(data: Data, today: string): Insight | null {
  const thisMonth = monthKey(today);
  const lastEnd = prevMonthDay(today);
  const lastMonth = monthKey(lastEnd);
  let now = 0;
  let before = 0;
  for (const t of Object.values(data.transactions)) {
    if (t.type !== 'expense' || t.category !== 'food') continue;
    if (monthKey(t.date) === thisMonth && t.date <= today) now += t.amount;
    else if (monthKey(t.date) === lastMonth && t.date <= lastEnd) before += t.amount;
  }
  if (before <= 0 || now <= 0) return null;
  const change = Math.round(((now - before) / before) * 100);
  if (Math.abs(change) < 10) return null;
  return {
    id: 'food_spend',
    text: `Food spend ${change > 0 ? '+' : '−'}${Math.abs(change)}% vs last month`,
    tone: change > 0 ? 'warn' : 'good',
  };
}

function scheduledOn(habit: Habit, date: string): boolean {
  if (habit.schedule.kind === 'daily') return true;
  if (habit.schedule.kind === 'weekdays') return habit.schedule.days.includes(weekday(date));
  return false;
}

/** Current streak: scheduled days in a row that are done; unscheduled days do not break it; today may be open. */
export function habitStreak(data: Data, habit: Habit, today: string): number {
  if (habit.schedule.kind === 'times_per_week') return 0;
  const start = data.profile.me?.startDate ?? '0000-01-01';
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = addDays(today, -i);
    if (d < start) break;
    if (!scheduledOn(habit, d)) continue;
    if (habitDone(data, habit, d)) streak++;
    else if (i === 0) continue; // today is still open
    else break;
  }
  return streak;
}

export function bestStreakInsight(data: Data, today: string): Insight | null {
  let best: { name: string; n: number } | null = null;
  const habits = Object.values(data.habits).filter((h) => !h.archived).sort((a, b) => a.order - b.order);
  for (const h of habits) {
    const n = habitStreak(data, h, today);
    if (n >= 3 && (!best || n > best.n)) best = { name: h.name, n };
  }
  return best ? { id: 'streak', text: `Best streak: ${best.name} (${best.n} days)`, tone: 'good' } : null;
}

/** Next re-measure date: 28 days after the last measurement (or after the start date). */
export function nextMeasureDate(data: Data, today: string): string {
  const dates = Object.values(data.measurements).map((m) => m.date).sort();
  const base = dates[dates.length - 1] ?? data.profile.me?.startDate ?? today;
  return addDays(base, REMEASURE_EVERY);
}

export function remeasureInsight(data: Data, today: string): Insight | null {
  if (Object.keys(data.measurements).length === 0) {
    return { id: 'remeasure', text: 'Add your start measurements to track change', tone: 'info' };
  }
  const n = diffDays(today, nextMeasureDate(data, today));
  if (n > 7) return null;
  if (n < 0) return { id: 'remeasure', text: `Re-measure overdue by ${-n} ${-n === 1 ? 'day' : 'days'}`, tone: 'warn' };
  if (n === 0) return { id: 'remeasure', text: 'Re-measure due today: 7 photos + tape', tone: 'warn' };
  return { id: 'remeasure', text: `Re-measure due in ${n} ${n === 1 ? 'day' : 'days'}`, tone: 'info' };
}

/** Estimated one-rep max of the best done set. */
function bestE1rm(w: Workout, ex: string): number {
  let best = 0;
  for (const e of w.exercises) {
    if (e.ex !== ex) continue;
    for (const s of e.sets) if (s.done && s.kg > 0 && s.reps > 0) best = Math.max(best, s.kg * (1 + s.reps / 30));
  }
  return best;
}

/** No exercise beat its earlier best in the last 3 weeks (needs earlier history to compare). */
export function gymProgressInsight(data: Data, today: string): Insight | null {
  const cut = addDays(today, -21);
  const done = Object.values(data.workouts).filter((w) => w.finished && w.date <= today);
  const recent = done.filter((w) => w.date > cut);
  const before = done.filter((w) => w.date <= cut);
  if (recent.length === 0 || before.length === 0) return null;
  const exs = new Set(recent.flatMap((w) => w.exercises.map((e) => e.ex)));
  let compared = 0;
  for (const ex of exs) {
    const old = Math.max(0, ...before.map((w) => bestE1rm(w, ex)));
    const now = Math.max(0, ...recent.map((w) => bestE1rm(w, ex)));
    if (old === 0 || now === 0) continue;
    compared++;
    if (now > old + 0.01) return null;
  }
  if (compared === 0) return null;
  return { id: 'gym_progress', text: 'No gym progress for 3 weeks. Check sleep + protein, then eat a bit more.', tone: 'warn' };
}

export function backupInsight(data: Data, now: number): Insight | null {
  const p = data.profile.me;
  if (!p) return null;
  const days = backupDueDays(p.lastBackupAt, p.startDate, now);
  if (days === null) return null;
  return {
    id: 'backup',
    text: p.lastBackupAt ? `Last backup ${days} days ago. Export a new one in Settings.` : 'No backup yet. Export one in Settings.',
    tone: 'warn',
  };
}

const ORDER: Record<Tone, number> = { warn: 0, info: 1, good: 2 };

/** All insights for the Progress screen, warnings first. */
export function insights(data: Data, today: string, now: number = Date.now()): Insight[] {
  const out = [
    proteinInsight(data, today),
    foodSpendInsight(data, today),
    bestStreakInsight(data, today),
    remeasureInsight(data, today),
    gymProgressInsight(data, today),
    backupInsight(data, now),
  ].filter((x): x is Insight => x !== null);
  return out.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);
}
