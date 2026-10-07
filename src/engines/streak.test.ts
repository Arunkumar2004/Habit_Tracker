import { describe, expect, it } from 'vitest';
import { habitHeatmap, habitStreak, heatmapStart, scoreHeatmap, weekCount } from './streak';
import { habit, makeData, setDay } from '../features/today/testdata';

describe('habitStreak', () => {
  it('counts scheduled days in a row that are done', () => {
    const d = makeData({ start: '2026-10-01' });
    for (const day of ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07']) setDay(d, day, { posture: true });
    // 1–3 Oct missed, then 4 days in a row
    expect(habitStreak(d.habits.posture, d, '2026-10-07')).toEqual({ current: 4, best: 4 });
  });
  it('today not done yet does not break it; yesterday not done does', () => {
    const d = makeData({ start: '2026-10-05' });
    setDay(d, '2026-10-05', { posture: true });
    setDay(d, '2026-10-06', { posture: true });
    expect(habitStreak(d.habits.posture, d, '2026-10-07')).toEqual({ current: 2, best: 2 });
    expect(habitStreak(d.habits.posture, d, '2026-10-08')).toEqual({ current: 0, best: 2 });
  });
  it('unscheduled days (Sunday for gym) do not break it', () => {
    const d = makeData({ start: '2026-10-05' });
    for (const day of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-12'])
      setDay(d, day, { gym: true });
    // Sun 11 Oct is not a gym day
    expect(habitStreak(d.habits.gym, d, '2026-10-12')).toEqual({ current: 7, best: 7 });
  });
  it('keeps the best streak after a break', () => {
    const d = makeData({ start: '2026-10-01' });
    for (const day of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']) setDay(d, day, { skin_am: true });
    for (const day of ['2026-10-07', '2026-10-08']) setDay(d, day, { skin_am: true });
    expect(habitStreak(d.habits.skin_am, d, '2026-10-08')).toEqual({ current: 2, best: 5 });
  });
  it('counter habits count as done only at target', () => {
    const d = makeData({ start: '2026-10-05' });
    setDay(d, '2026-10-05', { water: 3500 });
    setDay(d, '2026-10-06', { water: 3000 });
    setDay(d, '2026-10-07', { water: 4000 });
    expect(habitStreak(d.habits.water, d, '2026-10-07')).toEqual({ current: 1, best: 1 });
  });
  it('times per week: a missed day does not break it while the week count is met', () => {
    const d = makeData({ start: '2026-09-28' });
    const h = habit({ id: 'read', schedule: { kind: 'times_per_week', times: 3 } });
    d.habits.read = h;
    // Week of 28 Sep: Mon, Wed, Fri = 3 (met)
    for (const day of ['2026-09-28', '2026-09-30', '2026-10-02']) setDay(d, day, { read: true });
    // This week (5 Oct): Mon, Tue done, today Thu 8 Oct → still reachable
    for (const day of ['2026-10-05', '2026-10-06']) setDay(d, day, { read: true });
    expect(habitStreak(h, d, '2026-10-08')).toEqual({ current: 5, best: 5 });
  });
  it('times per week: a week below the count breaks it', () => {
    const d = makeData({ start: '2026-09-28' });
    const h = habit({ id: 'read', schedule: { kind: 'times_per_week', times: 3 } });
    d.habits.read = h;
    setDay(d, '2026-09-28', { read: true }); // only 1 of 3 last week
    setDay(d, '2026-10-05', { read: true });
    expect(habitStreak(h, d, '2026-10-06')).toEqual({ current: 1, best: 1 });
    // Sat 10 Oct with 1 done this week: 1 + Sat + Sun = 3, still reachable; Sun with 1 done is not
    expect(habitStreak(h, d, '2026-10-10').current).toBe(1);
    expect(habitStreak(h, d, '2026-10-11').current).toBe(0);
  });
});

describe('heatmaps', () => {
  it('starts on the Monday 11 weeks before the end week', () => {
    expect(heatmapStart('2026-10-08', 12)).toBe('2026-07-20');
    expect(heatmapStart('2026-10-08', 1)).toBe('2026-10-05');
  });
  it('habit heatmap: progress on due days, undefined when not due, ahead, or before start', () => {
    const d = makeData({ start: '2026-10-05' });
    setDay(d, '2026-10-05', { water: 1750 });
    setDay(d, '2026-10-06', { water: 3500 });
    const v = habitHeatmap(d.habits.water, d, '2026-10-07', 1);
    expect(v['2026-10-05']).toBeCloseTo(0.5);
    expect(v['2026-10-06']).toBe(1);
    expect(v['2026-10-07']).toBe(0);
    expect(v['2026-10-08']).toBeUndefined();
    expect(Object.keys(v)).toHaveLength(7);
    const g = habitHeatmap(d.habits.gym, d, '2026-10-11', 1);
    expect(g['2026-10-11']).toBeUndefined(); // Sunday, not a gym day
    const early = habitHeatmap(d.habits.water, d, '2026-10-07', 2);
    expect(early['2026-10-01']).toBeUndefined();
  });
  it('score heatmap uses the day score', () => {
    const d = makeData({ start: '2026-10-05', habits: ['skin_am', 'skin_pm'] });
    setDay(d, '2026-10-05', { skin_am: true });
    const v = scoreHeatmap(d, '2026-10-06', 1);
    expect(v['2026-10-05']).toBe(0.5);
    expect(v['2026-10-06']).toBe(0);
    expect(v['2026-10-07']).toBeUndefined();
  });
  it('weekCount counts done and due days in the week', () => {
    const d = makeData({ start: '2026-10-01' });
    setDay(d, '2026-10-05', { gym: true });
    setDay(d, '2026-10-06', { gym: true });
    expect(weekCount(d.habits.gym, d, '2026-10-08')).toEqual({ done: 2, due: 6 });
    expect(weekCount(d.habits.walk, d, '2026-10-08')).toEqual({ done: 0, due: 5 });
  });
});
