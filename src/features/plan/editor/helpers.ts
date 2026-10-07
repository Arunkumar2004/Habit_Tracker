// Pure helpers for the plan editor. No store or React imports, so they test in plain Node.
import type { RoadmapStep } from '../../../data/plan';
import type { Exercise, ExUnit } from '../../../data/sessions';
import type { DayMenu, Meal } from '../../../data/food';
import type { CheckGroup, CheckItem } from '../../../data/checklists';

/** Copy of `list` with the item at `index` moved by `delta` (-1 up, +1 down). Out of range: unchanged copy. */
export function moveItem<T>(list: readonly T[], index: number, delta: number): T[] {
  const out = list.slice();
  const to = index + delta;
  if (index < 0 || index >= out.length || to < 0 || to >= out.length) return out;
  const [it] = out.splice(index, 1);
  out.splice(to, 0, it);
  return out;
}

export const moveUp = <T,>(list: readonly T[], index: number) => moveItem(list, index, -1);
export const moveDown = <T,>(list: readonly T[], index: number) => moveItem(list, index, 1);

/** Copy of `list` without the item at `index`. */
export function removeAt<T>(list: readonly T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

/** Steps numbered 1..n in their current order (new objects). */
export function renumberRoadmap(steps: readonly RoadmapStep[]): RoadmapStep[] {
  return steps.map((s, i) => ({ ...s, n: i + 1 }));
}

/** Sum of kcal and protein over the meals (whole numbers). */
export function mealTotals(meals: readonly Pick<Meal, 'kcal' | 'protein'>[]): { kcal: number; protein: number } {
  let kcal = 0;
  let protein = 0;
  for (const m of meals) {
    kcal += Number.isFinite(m.kcal) ? m.kcal : 0;
    protein += Number.isFinite(m.protein) ? m.protein : 0;
  }
  return { kcal: Math.round(kcal), protein: Math.round(protein) };
}

/** Minutes after midnight for '7:30', '13:05', '7 pm', '7:30 AM'; null when it cannot be read. */
export function timeToMinutes(t: string): number | null {
  const m = /^\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\s*$/i.exec(t);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3]?.toLowerCase();
  if (min > 59 || h > 24) return null;
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return h * 60 + min;
}

/** Meals in time order (stable; times that cannot be read keep their place after the timed ones). */
export function sortMeals(meals: readonly Meal[]): Meal[] {
  return meals
    .map((m, i) => ({ m, i, t: timeToMinutes(m.time) }))
    .sort((a, b) => {
      if (a.t === null && b.t === null) return a.i - b.i;
      if (a.t === null) return 1;
      if (b.t === null) return -1;
      return a.t - b.t || a.i - b.i;
    })
    .map((x) => x.m);
}

/** Menu copy with meals in time order and kcal/protein equal to the sum of its meals. */
export function withMenuTotals(menu: DayMenu, meals: readonly Meal[] = menu.meals): DayMenu {
  const sorted = sortMeals(meals);
  return { ...menu, meals: sorted, ...mealTotals(sorted) };
}

/** 'Hung curd (200 g)!' → 'hung_curd_200_g'. Never empty ('item'). */
export function slugify(text: string, max = 40): string {
  const s = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, max)
    .replace(/_+$/g, '');
  return s || 'item';
}

/** `base`, or `base_2`, `base_3`… whichever is not in `taken`. Adds the result to `taken`. */
export function uniqueKey(base: string, taken: Set<string>): string {
  let k = base;
  let n = 2;
  while (taken.has(k)) k = `${base}_${n++}`;
  taken.add(k);
  return k;
}

/** Short random id part: 6 base-36 characters. `rand` is injectable for tests. */
export function shortId(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += Math.floor(rand() * 36).toString(36);
  return s;
}

export const customExerciseId = (name: string, rand?: () => number) => `custom_${slugify(name, 24)}_${shortId(rand)}`;
export const newStepId = (rand?: () => number) => `step_${shortId(rand)}`;
export const newMealId = (rand?: () => number) => `meal_${shortId(rand)}`;
export const newListId = (rand?: () => number) => `list_${shortId(rand)}`;

/** Textarea text → trimmed, non-empty lines. */
export function linesOf(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Checklist items from one line per item. Unchanged lines keep their old key and hint (so ticks survive);
 * new lines get key = slug of the text, unique within the list (`taken`).
 */
export function itemsFromLines(text: string, previous: readonly CheckItem[], taken: Set<string>): CheckItem[] {
  const byText = new Map<string, CheckItem>();
  for (const it of previous) if (!byText.has(it.text)) byText.set(it.text, it);
  return linesOf(text).map((line) => {
    const old = byText.get(line);
    if (old && !taken.has(old.key)) {
      byText.delete(line);
      taken.add(old.key);
      return old.hint ? { key: old.key, text: line, hint: old.hint } : { key: old.key, text: line };
    }
    return { key: uniqueKey(slugify(line), taken), text: line };
  });
}

export interface GroupDraft { title: string; text: string }

/** Group drafts (title + lines) → checklist groups. Empty groups are dropped; keys are unique across the list. */
export function groupsFromDrafts(drafts: readonly GroupDraft[], previous: readonly CheckGroup[]): CheckGroup[] {
  const prevItems = previous.flatMap((g) => g.items);
  const taken = new Set<string>();
  return drafts
    .map((d, i) => ({
      title: d.title.trim() || (drafts.length === 1 ? 'Items' : `Part ${i + 1}`),
      items: itemsFromLines(d.text, prevItems, taken),
    }))
    .filter((g) => g.items.length > 0);
}

export const UNITS: { value: ExUnit; label: string }[] = [
  { value: 'reps', label: 'Reps' },
  { value: 'sec', label: 'Seconds' },
  { value: 'per leg', label: 'Reps per leg' },
  { value: 'min', label: 'Minutes' },
];

export const CUSTOM_HOW: [string, string, string] = [
  'Set up in a steady, comfortable position.',
  'Move slowly and with control through the full range.',
  'Return to the start under control.',
];

/** A new exercise the person typed in (not in the library): 3×8–12 reps, 90 s rest. */
export function customExercise(name: string, rand?: () => number): Exercise {
  const clean = name.trim().replace(/\s+/g, ' ');
  return {
    id: customExerciseId(clean, rand),
    name: clean,
    sets: 3, repLow: 8, repHigh: 12, unit: 'reps', restSec: 90,
    priority: false, kind: 'isolation',
    how: [...CUSTOM_HOW],
    avoid: [],
  };
}

export interface Prescription { sets: number; repLow: number; repHigh: number; unit: ExUnit; restSec: number }

const toInt = (v: string | number, fallback: number) => {
  if (typeof v === 'string' && v.trim() === '') return fallback;
  const n = typeof v === 'number' ? v : Number(v.trim());
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const clampN = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Form values → a valid prescription (sets 1–20, reps 1–999 with low ≤ high, rest 0–900 s). */
export function cleanPrescription(
  v: { sets: string | number; repLow: string | number; repHigh: string | number; unit: ExUnit; restSec: string | number },
  fallback: Prescription,
): Prescription {
  const sets = clampN(toInt(v.sets, fallback.sets), 1, 20);
  let lo = clampN(toInt(v.repLow, fallback.repLow), 1, 999);
  let hi = clampN(toInt(v.repHigh, fallback.repHigh), 1, 999);
  if (v.unit === 'min') lo = hi;
  if (lo > hi) [lo, hi] = [hi, lo];
  const restSec = clampN(toInt(v.restSec, fallback.restSec), 0, 900);
  return { sets, repLow: lo, repHigh: hi, unit: v.unit, restSec };
}

/** Whole number ≥ 0 from a form field (blank or junk → 0). */
export function nonNegInt(v: string | number): number {
  return Math.max(0, toInt(v, 0));
}

/** '90 s', '2 min', '2 min 30 s', 'No rest'. */
export function restLabel(sec: number): string {
  if (!sec) return 'No rest';
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}
