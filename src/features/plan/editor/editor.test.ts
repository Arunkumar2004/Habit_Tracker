import { describe, expect, it } from 'vitest';
import type { RoadmapStep } from '../../../data/plan';
import type { DayMenu, Meal } from '../../../data/food';
import {
  cleanPrescription, customExercise, customExerciseId, groupsFromDrafts, itemsFromLines, linesOf, mealTotals,
  moveDown, moveItem, moveUp, newListId, newMealId, newStepId, nonNegInt, removeAt, renumberRoadmap, restLabel,
  shortId, slugify, sortMeals, timeToMinutes, uniqueKey, withMenuTotals,
} from './helpers';

const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe('move helpers', () => {
  const list = ['a', 'b', 'c', 'd'];
  it('moves up and down', () => {
    expect(moveUp(list, 2)).toEqual(['a', 'c', 'b', 'd']);
    expect(moveDown(list, 0)).toEqual(['b', 'a', 'c', 'd']);
    expect(moveItem(list, 3, -3)).toEqual(['d', 'a', 'b', 'c']);
  });
  it('leaves edges and bad indexes alone', () => {
    expect(moveUp(list, 0)).toEqual(list);
    expect(moveDown(list, 3)).toEqual(list);
    expect(moveUp(list, 9)).toEqual(list);
    expect(moveDown(list, -1)).toEqual(list);
  });
  it('never mutates the input', () => {
    const frozen = Object.freeze(['x', 'y']);
    expect(moveDown(frozen, 0)).toEqual(['y', 'x']);
    expect(frozen).toEqual(['x', 'y']);
  });
  it('removes by index', () => {
    expect(removeAt(list, 1)).toEqual(['a', 'c', 'd']);
    expect(removeAt(list, 7)).toEqual(list);
  });
});

describe('renumberRoadmap', () => {
  const step = (id: string, n: number): RoadmapStep => ({ id, n, when: '', title: id, detail: '', doneWhen: '', unlockMonth: 1 });
  it('numbers steps 1..n in order without touching the input', () => {
    const input = [step('c', 3), step('a', 1), step('x', 9)];
    const out = renumberRoadmap(input);
    expect(out.map((s) => [s.id, s.n])).toEqual([['c', 1], ['a', 2], ['x', 3]]);
    expect(input[0].n).toBe(3);
    expect(out[0]).not.toBe(input[0]);
  });
  it('works after a move and a removal', () => {
    const moved = renumberRoadmap(moveUp(removeAt([step('a', 1), step('b', 2), step('c', 3)], 0), 1));
    expect(moved.map((s) => `${s.n}${s.id}`)).toEqual(['1c', '2b']);
  });
});

describe('meal totals', () => {
  const meal = (id: string, time: string, kcal: number, protein: number): Meal => ({ id, time, name: id, items: [], kcal, protein });
  it('sums kcal and protein', () => {
    expect(mealTotals([meal('a', '7:30', 540, 22), meal('b', '13:30', 600, 22.4)])).toEqual({ kcal: 1140, protein: 44 });
    expect(mealTotals([])).toEqual({ kcal: 0, protein: 0 });
    expect(mealTotals([meal('a', '', Number.NaN, 5)])).toEqual({ kcal: 0, protein: 5 });
  });
  it('reads meal times', () => {
    expect(timeToMinutes('7:30')).toBe(450);
    expect(timeToMinutes('13:05')).toBe(785);
    expect(timeToMinutes('7 pm')).toBe(19 * 60);
    expect(timeToMinutes('12:15 AM')).toBe(15);
    expect(timeToMinutes('later')).toBeNull();
    expect(timeToMinutes('7:75')).toBeNull();
  });
  it('sorts by time, untimed last, stable', () => {
    const out = sortMeals([meal('dinner', '20:30', 0, 0), meal('x', 'any', 0, 0), meal('bfast', '7:30', 0, 0), meal('snack', '7:30', 0, 0)]);
    expect(out.map((m) => m.id)).toEqual(['bfast', 'snack', 'dinner', 'x']);
  });
  it('keeps the menu totals equal to its meals', () => {
    const menu: DayMenu = { diet: 'veg', label: 'Veg day', kcal: 9999, protein: 999, meals: [meal('b', '13:00', 600, 30), meal('a', '8:00', 400, 20)] };
    const out = withMenuTotals(menu);
    expect(out).toMatchObject({ kcal: 1000, protein: 50 });
    expect(out.meals.map((m) => m.id)).toEqual(['a', 'b']);
    expect(menu.kcal).toBe(9999);
    expect(withMenuTotals(menu, [meal('c', '9:00', 250, 18)])).toMatchObject({ kcal: 250, protein: 18 });
  });
});

describe('slug and id helpers', () => {
  it('slugifies text', () => {
    expect(slugify('Hung curd (200 g)!')).toBe('hung_curd_200_g');
    expect(slugify('  Café  crème ')).toBe('cafe_creme');
    expect(slugify('***')).toBe('item');
    expect(slugify('a'.repeat(60)).length).toBe(40);
  });
  it('makes keys unique', () => {
    const taken = new Set(['walk']);
    expect(uniqueKey('walk', taken)).toBe('walk_2');
    expect(uniqueKey('walk', taken)).toBe('walk_3');
    expect(uniqueKey('pose', taken)).toBe('pose');
    expect(taken.has('walk_3')).toBe(true);
  });
  it('builds ids with a short random part', () => {
    const r = seq([0, 0.5, 0.99]);
    expect(shortId(r)).toMatch(/^[0-9a-z]{6}$/);
    expect(shortId(seq([0]))).toBe('000000');
    expect(customExerciseId('Cable fly', seq([0]))).toBe('custom_cable_fly_000000');
    expect(newStepId(seq([0]))).toBe('step_000000');
    expect(newMealId()).toMatch(/^meal_[0-9a-z]{6}$/);
    expect(newListId()).toMatch(/^list_[0-9a-z]{6}$/);
    expect(customExerciseId('Face pull')).not.toBe(customExerciseId('Face pull'));
  });
  it('creates a custom exercise with sensible defaults', () => {
    const e = customExercise('  Cable   fly ', seq([0]));
    expect(e).toMatchObject({ id: 'custom_cable_fly_000000', name: 'Cable fly', sets: 3, repLow: 8, repHigh: 12, unit: 'reps', restSec: 90, kind: 'isolation', priority: false, avoid: [] });
    expect(e.how).toHaveLength(3);
  });
});

describe('form cleaning', () => {
  const fb = { sets: 3, repLow: 8, repHigh: 12, unit: 'reps' as const, restSec: 90 };
  it('clamps and orders the prescription', () => {
    expect(cleanPrescription({ sets: '4', repLow: '12', repHigh: '6', unit: 'reps', restSec: '120' }, fb)).toEqual({ sets: 4, repLow: 6, repHigh: 12, unit: 'reps', restSec: 120 });
    expect(cleanPrescription({ sets: '0', repLow: 'x', repHigh: '', unit: 'sec', restSec: '-5' }, fb)).toEqual({ sets: 1, repLow: 8, repHigh: 12, unit: 'sec', restSec: 0 });
    expect(cleanPrescription({ sets: 1, repLow: 3, repHigh: 10, unit: 'min', restSec: 0 }, fb)).toMatchObject({ repLow: 10, repHigh: 10 });
  });
  it('reads numbers and labels rest', () => {
    expect(nonNegInt('42')).toBe(42);
    expect(nonNegInt('-3')).toBe(0);
    expect(nonNegInt('abc')).toBe(0);
    expect(restLabel(0)).toBe('No rest');
    expect(restLabel(45)).toBe('45 s');
    expect(restLabel(120)).toBe('2 min');
    expect(restLabel(150)).toBe('2 min 30 s');
  });
});

describe('checklist lines', () => {
  it('splits lines and drops blanks', () => {
    expect(linesOf(' a \r\n\n b\n  ')).toEqual(['a', 'b']);
  });
  it('keeps old keys and hints for unchanged lines, slugs new ones', () => {
    const prev = [{ key: 'b_waist', text: 'Waist same', hint: 'Tape at the navel' }, { key: 'b_pose', text: 'Pose' }];
    const out = itemsFromLines('Waist same\nNew line\nNew line', prev, new Set());
    expect(out).toEqual([
      { key: 'b_waist', text: 'Waist same', hint: 'Tape at the navel' },
      { key: 'new_line', text: 'New line' },
      { key: 'new_line_2', text: 'New line' },
    ]);
  });
  it('builds groups with unique keys across the list and drops empty groups', () => {
    const out = groupsFromDrafts(
      [{ title: 'Body', text: 'Sleep 8 h' }, { title: '', text: 'Sleep 8 h' }, { title: 'Empty', text: '  ' }],
      [],
    );
    expect(out).toEqual([
      { title: 'Body', items: [{ key: 'sleep_8_h', text: 'Sleep 8 h' }] },
      { title: 'Part 2', items: [{ key: 'sleep_8_h_2', text: 'Sleep 8 h' }] },
    ]);
  });
});
