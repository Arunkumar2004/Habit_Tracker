import { describe, expect, it } from 'vitest';
import { dayInfo, habitTarget, isScheduled, monthStartDate, scheduleText, sessionFor } from './schedule';
import { addWorkout, habit, makeData, profile, setDay } from '../features/today/testdata';

// Week used below: Mon 5 Oct 2026 … Sun 11 Oct 2026.
describe('dayInfo', () => {
  it('counts day, week and month from the start date', () => {
    const p = profile({ startDate: '2026-10-01' });
    expect(dayInfo(p, '2026-10-01')).toEqual({ dayN: 1, week: 1, month: 1 });
    expect(dayInfo(p, '2026-10-07')).toEqual({ dayN: 7, week: 1, month: 1 });
    expect(dayInfo(p, '2026-10-08')).toEqual({ dayN: 8, week: 2, month: 1 });
    expect(dayInfo(p, '2026-10-31')).toEqual({ dayN: 31, week: 5, month: 1 });
    expect(dayInfo(p, '2026-11-01')).toEqual({ dayN: 32, week: 5, month: 2 });
    expect(dayInfo(p, '2027-09-30').month).toBe(12);
  });
  it('never goes below day 1 and handles a missing profile', () => {
    expect(dayInfo(profile({ startDate: '2026-10-10' }), '2026-10-01')).toEqual({ dayN: 1, week: 1, month: 1 });
    expect(dayInfo(undefined, '2026-10-01')).toEqual({ dayN: 1, week: 1, month: 1 });
  });
  it('month 2 of a plan started on the 31st begins after the short month', () => {
    const p = profile({ startDate: '2026-01-31' });
    expect(dayInfo(p, '2026-02-28').month).toBe(1);
    expect(dayInfo(p, '2026-03-01').month).toBe(2);
    expect(monthStartDate('2026-01-31', 2)).toBe('2026-03-01');
    expect(monthStartDate('2026-10-01', 3)).toBe('2026-12-01');
  });
});

describe('sessionFor', () => {
  it('follows the week split when nothing is missed', () => {
    const d = makeData();
    expect(sessionFor(d, '2026-10-05')).toMatchObject({ session: 'upper_a', gym: true, shifted: false });
    addWorkout(d, '2026-10-05', 'upper_a');
    expect(sessionFor(d, '2026-10-06')).toMatchObject({ session: 'lower_a', shifted: false });
    expect(sessionFor(d, '2026-10-07')).toMatchObject({ session: 'recovery', gym: false });
    expect(sessionFor(d, '2026-10-10')).toMatchObject({ session: 'cardio_skills', gym: false });
    expect(sessionFor(d, '2026-10-11')).toMatchObject({ session: 'rest', gym: false });
  });
  it('missed Monday: Tuesday gives Upper A (next in order)', () => {
    const d = makeData();
    expect(sessionFor(d, '2026-10-06')).toEqual({ session: 'upper_a', label: 'Upper A', gym: true, shifted: true });
  });
  it('a ticked gym habit counts as that day\'s session', () => {
    const d = makeData();
    setDay(d, '2026-10-05', { gym: true });
    setDay(d, '2026-10-06', { gym: true });
    expect(sessionFor(d, '2026-10-08')).toMatchObject({ session: 'upper_b', shifted: false });
  });
  it('missed Tuesday: Thursday gives Lower A, Friday Upper B', () => {
    const d = makeData();
    addWorkout(d, '2026-10-05', 'upper_a');
    expect(sessionFor(d, '2026-10-08')).toMatchObject({ session: 'lower_a', shifted: true });
    addWorkout(d, '2026-10-08', 'lower_a');
    expect(sessionFor(d, '2026-10-09')).toMatchObject({ session: 'upper_b', shifted: true });
  });
  it('unfinished workouts do not count; last week does not count', () => {
    const d = makeData();
    addWorkout(d, '2026-10-02', 'upper_a');
    addWorkout(d, '2026-10-05', 'upper_a', false);
    expect(sessionFor(d, '2026-10-06').session).toBe('upper_a');
  });
  it('returns the session already finished today', () => {
    const d = makeData();
    addWorkout(d, '2026-10-05', 'upper_a');
    addWorkout(d, '2026-10-06', 'lower_a');
    expect(sessionFor(d, '2026-10-06')).toMatchObject({ session: 'lower_a', gym: true, shifted: false });
  });
  it('all four done before a gym day: recovery', () => {
    const d = makeData();
    for (const [day, s] of [['2026-10-05', 'upper_a'], ['2026-10-06', 'lower_a'], ['2026-10-07', 'upper_b'], ['2026-10-08', 'lower_b']])
      addWorkout(d, day, s);
    expect(sessionFor(d, '2026-10-09')).toMatchObject({ session: 'recovery', gym: false, shifted: true });
  });
});

describe('isScheduled', () => {
  it('daily, weekdays and archived', () => {
    const d = makeData();
    expect(isScheduled(d.habits.skin_am, '2026-10-11', d)).toBe(true);
    expect(isScheduled(d.habits.gym, '2026-10-10', d)).toBe(true); // Sat
    expect(isScheduled(d.habits.gym, '2026-10-11', d)).toBe(false); // Sun
    expect(isScheduled({ ...d.habits.skin_am, archived: true }, '2026-10-08', d)).toBe(false);
  });
  it('is never due before the plan start', () => {
    const d = makeData({ start: '2026-10-07' });
    expect(isScheduled(d.habits.skin_am, '2026-10-06', d)).toBe(false);
    expect(isScheduled(d.habits.skin_am, '2026-10-07', d)).toBe(true);
  });
  it('times_per_week is due until the weekly count is met', () => {
    const d = makeData();
    const h = habit({ id: 'read', schedule: { kind: 'times_per_week', times: 2 } });
    d.habits.read = h;
    setDay(d, '2026-10-05', { read: true });
    expect(isScheduled(h, '2026-10-06', d)).toBe(true);
    setDay(d, '2026-10-06', { read: true });
    expect(isScheduled(h, '2026-10-06', d)).toBe(true); // done today still counts as due
    expect(isScheduled(h, '2026-10-07', d)).toBe(false); // count met
    expect(isScheduled(h, '2026-10-12', d)).toBe(true); // new week
  });
});

describe('habitTarget and scheduleText', () => {
  it('protein target comes from the nutrition engine', () => {
    const d = makeData({ proteinTargetG: 140 });
    expect(habitTarget(d.habits.protein, d)).toBe(140);
    expect(habitTarget(d.habits.water, d)).toBe(3500);
    expect(habitTarget(d.habits.skin_am, d)).toBe(1);
  });
  it('formats schedules', () => {
    expect(scheduleText({ kind: 'daily' })).toBe('Daily');
    expect(scheduleText({ kind: 'weekdays', days: [1, 2, 3, 4, 5, 6] })).toBe('Mon–Sat');
    expect(scheduleText({ kind: 'weekdays', days: [1, 3, 5] })).toBe('Mon, Wed, Fri');
    expect(scheduleText({ kind: 'times_per_week', times: 5 })).toBe('5× per week');
  });
});

describe('sessionFor: plan started mid-week', () => {
  it('does not count days before the start date as missed', async () => {
    const { sessionFor } = await import('./schedule');
    const { emptyData } = await import('../store/storage');
    const data = emptyData();
    // Thursday 8 Oct 2026 is Day 1: Thursday's planned session is Upper B, nothing owed from Mon–Wed.
    data.profile.me = {
      id: 'me', updatedAt: 1, name: 'A', startDate: '2026-10-08', heightCm: 185, weightKg: 72, bodyType: 'average',
      diet: 'veg', currency: 'INR', theme: 'auto', monthlyBudget: 0, onboarded: true,
    };
    const pick = sessionFor(data, '2026-10-08');
    expect(pick.session).toBe('upper_b');
    expect(pick.shifted).toBe(false);
  });
});
