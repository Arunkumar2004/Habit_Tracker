// OWNER: Today+Habits agent. Contract (keep names and signatures): used by Plan, Money, Progress.
// Schedule engine (blueprint 6): day / week / month numbers, today's session, and which habits are due.
// Pure functions: no store, no clock (the caller passes the date).
import type { Data, Day, Habit, Profile } from '../types';
import type { SessionKey } from '../data/plan';
import { planOf, type ResolvedPlan } from '../plan/resolve';
import { addDays, diffDays, parseISO, toISO, weekStart, weekday } from '../lib/date';
import { targets } from './nutrition';

export interface DayInfo { dayN: number; week: number; month: number }

/** Calendar months from `start` to `date` (whole months completed). */
function monthsBetween(start: string, date: string): number {
  const a = parseISO(start);
  const b = parseISO(date);
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return m;
}

/** The date month `n` (1-based) of the plan starts on. Month 1 starts on the start date. */
export function monthStartDate(startDate: string, n: number): string {
  const a = parseISO(startDate);
  const target = new Date(a.getFullYear(), a.getMonth() + (n - 1), 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(a.getDate(), last));
  // A start on the 31st: month 2 begins on the 1st of the month after a short month.
  if (a.getDate() > last) target.setDate(last + 1);
  return toISO(target);
}

/** Day N = days since start + 1; week = ceil(N/7) of 52; month from start date (1-based). Never below 1. */
export function dayInfo(profile: Profile | undefined, date: string): DayInfo {
  if (!profile?.startDate) return { dayN: 1, week: 1, month: 1 };
  const n = Math.max(1, diffDays(profile.startDate, date) + 1);
  const month = Math.max(1, monthsBetween(profile.startDate, date) + 1);
  return { dayN: n, week: Math.ceil(n / 7), month };
}

export interface SessionPick { session: SessionKey; label: string; gym: boolean; shifted: boolean }

/** Display label of a session in the person's plan (week entry first, then the session itself, then the key). */
function labelOf(plan: ResolvedPlan, k: SessionKey): string {
  return plan.week.find((w) => w.session === k)?.label ?? plan.sessions[k]?.label ?? k;
}
const isGymKey = (plan: ResolvedPlan, k: string): k is SessionKey => (plan.gymOrder as string[]).includes(k);

/** Index into the plan week (0 = Monday … 6 = Sunday). */
export function splitIndex(date: string): number {
  return (weekday(date) + 6) % 7;
}

/** Finished gym workouts on a date (session keys, in the order they were saved). */
function finishedGym(data: Data, date: string, plan: ResolvedPlan = planOf(data)): SessionKey[] {
  return Object.values(data.workouts)
    .filter((w) => w.date === date && w.finished && isGymKey(plan, w.session))
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .map((w) => w.session as SessionKey);
}

/** Gym sessions already done this week, before `date`, in the order they happened. */
export function gymDoneThisWeek(data: Data, date: string): SessionKey[] {
  const plan = planOf(data);
  const done: SessionKey[] = [];
  const start = data.profile.me?.startDate;
  for (let d = weekStart(date); d < date; d = addDays(d, 1)) {
    // Days before the plan started owe nothing: their planned session counts as taken care of.
    if (start && d < start) {
      const planned = plan.week[splitIndex(d)];
      if (planned.gym && !done.includes(planned.session)) done.push(planned.session);
      continue;
    }
    const fin = finishedGym(data, d, plan);
    if (fin.length) {
      for (const s of fin) if (!done.includes(s)) done.push(s);
      continue;
    }
    // A ticked gym habit on a planned gym day counts as that day's session (the next one in order).
    const planned = plan.week[splitIndex(d)];
    if (planned.gym && data.days[d]?.habits.gym === true) {
      const next = plan.gymOrder.find((s) => !done.includes(s));
      if (next) done.push(next);
    }
  }
  return done;
}

/**
 * Today's session from the person's week plan. On a gym day, the next gym session in the plan's gym order that is not done yet this week
 * (missed Monday → Tuesday is Upper A; shifted = true). A gym session already finished today is returned as is.
 */
export function sessionFor(data: Data, date: string): SessionPick {
  const plan = planOf(data);
  const planned = plan.week[splitIndex(date)];
  const today = finishedGym(data, date, plan);
  if (today.length) {
    const s = today[0];
    return { session: s, label: labelOf(plan, s), gym: true, shifted: s !== planned.session };
  }
  if (!planned.gym) return { session: planned.session, label: planned.label, gym: false, shifted: false };
  const done = gymDoneThisWeek(data, date);
  const next = plan.gymOrder.find((s) => !done.includes(s));
  if (!next) return { session: 'recovery', label: plan.sessions.recovery?.label ?? 'Recovery', gym: false, shifted: true };
  return { session: next, label: labelOf(plan, next), gym: true, shifted: next !== planned.session };
}

// ---------- Habit values ----------

/** The target a habit is measured against. Protein uses the nutrition engine, not habit.target. */
export function habitTarget(habit: Habit, data: Data): number {
  if (habit.type === 'check') return 1;
  if (habit.id === 'protein' && data.profile.me) return targets(data.profile.me).proteinTarget;
  return habit.target > 0 ? habit.target : 1;
}

/** Raw stored value: check → 1 / 0, counter / number → the number. */
export function habitRaw(habit: Habit, day: Day | undefined): number {
  const v = day?.habits[habit.id];
  if (habit.type === 'check') return v === true || (typeof v === 'number' && v > 0) ? 1 : 0;
  return typeof v === 'number' ? v : 0;
}

/** Progress 0..1 on a date: checks are 0 or 1; counters and numbers give part credit, capped at 1. */
export function habitProgress(habit: Habit, date: string, data: Data): number {
  const raw = habitRaw(habit, data.days[date]);
  if (habit.type === 'check') return raw;
  return Math.min(1, Math.max(0, raw / habitTarget(habit, data)));
}

export function isDone(habit: Habit, date: string, data: Data): boolean {
  return habitProgress(habit, date, data) >= 1;
}

/** Days done this week strictly before `date` (Monday-first week). */
export function doneBeforeInWeek(habit: Habit, date: string, data: Data): number {
  let n = 0;
  for (let d = weekStart(date); d < date; d = addDays(d, 1)) if (isDone(habit, d, data)) n++;
  return n;
}

/**
 * Is this habit due on this date? Archived habits and days before the plan start are never due.
 * times_per_week habits are "due" every day until the weekly count is met (a day done counts as due).
 */
export function isScheduled(habit: Habit, date: string, data: Data): boolean {
  if (habit.archived) return false;
  const start = data.profile.me?.startDate;
  if (start && date < start) return false;
  const s = habit.schedule;
  switch (s.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return s.days.includes(weekday(date));
    case 'times_per_week':
      return doneBeforeInWeek(habit, date, data) < Math.max(1, s.times);
    default:
      return true;
  }
}

/** Active habits sorted by order. */
export function activeHabits(data: Data): Habit[] {
  return Object.values(data.habits)
    .filter((h) => !h.archived)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** Short schedule text: 'Daily', 'Mon–Sat', 'Mon, Wed, Fri', '5× per week'. */
export function scheduleText(s: Habit['schedule']): string {
  if (s.kind === 'daily') return 'Daily';
  if (s.kind === 'times_per_week') return `${s.times}× per week`;
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const order = [1, 2, 3, 4, 5, 6, 0].filter((d) => s.days.includes(d));
  if (order.length === 7) return 'Daily';
  if (order.length === 0) return 'No days';
  if (order.length >= 3) {
    // contiguous run in Monday-first order → 'Mon–Sat'
    const idx = order.map((d) => (d + 6) % 7);
    const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    if (contiguous) return `${names[order[0]]}–${names[order[order.length - 1]]}`;
  }
  return order.map((d) => names[d]).join(', ');
}
