// Plan content (blueprint 2.2 and 5.3): read-only. Kept separate from the user's data.
// The Plan area fills sessions, routines, food and checklists in their own files (data/sessions.ts etc.).
import type { Habit } from '../types';

export interface RoadmapStep { id: string; n: number; when: string; title: string; detail: string; doneWhen: string; unlockMonth: number }
export const ROADMAP: RoadmapStep[] = [
  { id: 'm1', n: 1, when: 'Day 1–3', title: 'Baseline', detail: 'Measure your body and take the 7 photos.', doneWhen: 'You have start numbers + photos', unlockMonth: 1 },
  { id: 'm2', n: 2, when: 'Month 1', title: 'Build habits', detail: 'Gym 4×/week, skincare AM+PM, posture, walk.', doneWhen: 'Week plan done 4 weeks in a row', unlockMonth: 1 },
  { id: 'm3', n: 3, when: 'Month 2', title: 'Grooming', detail: 'Test 3 haircuts + 3 beard styles, film your walk.', doneWhen: 'You know your best hair + beard', unlockMonth: 2 },
  { id: 'm4', n: 4, when: 'Month 3', title: 'First check', detail: 'Compare Month 0 vs Month 3 photos.', doneWhen: 'Shoulders wider, waist same or smaller', unlockMonth: 3 },
  { id: 'm5', n: 5, when: 'Month 4', title: 'Pose + style', detail: '8 poses, 5 faces, 8 basic clothes, list agencies.', doneWhen: 'You can pose without looking stiff', unlockMonth: 4 },
  { id: 'm6', n: 6, when: 'Month 5', title: 'Digitals', detail: 'Shoot 6 digitals, pick 6–12 for portfolio.', doneWhen: 'Digitals + small portfolio ready', unlockMonth: 5 },
  { id: 'm7', n: 7, when: 'Month 6', title: 'Apply', detail: 'Apply to real agencies + open castings.', doneWhen: 'You applied to agencies', unlockMonth: 6 },
  { id: 'm8', n: 8, when: 'Month 7–12', title: 'Experience', detail: 'Shows, test shoots, castings.', doneWhen: 'You get real feedback and work', unlockMonth: 7 },
];

export type SessionKey = 'upper_a' | 'lower_a' | 'upper_b' | 'lower_b' | 'recovery' | 'cardio_skills' | 'rest';
/** Index 0 = Monday … 6 = Sunday (blueprint 2.2 b). */
export const WEEK_SPLIT: { day: string; session: SessionKey; label: string; gym: boolean }[] = [
  { day: 'Mon', session: 'upper_a', label: 'Upper A', gym: true },
  { day: 'Tue', session: 'lower_a', label: 'Lower A + Core', gym: true },
  { day: 'Wed', session: 'recovery', label: 'Recovery', gym: false },
  { day: 'Thu', session: 'upper_b', label: 'Upper B', gym: true },
  { day: 'Fri', session: 'lower_b', label: 'Lower B + Core', gym: true },
  { day: 'Sat', session: 'cardio_skills', label: 'Cardio + Skills', gym: false },
  { day: 'Sun', session: 'rest', label: 'Rest + Sunday check', gym: false },
];
/** Gym sessions in order, for "missed a day → next session in order". */
export const GYM_ORDER: SessionKey[] = ['upper_a', 'lower_a', 'upper_b', 'lower_b'];

type HabitSeed = Omit<Habit, 'updatedAt'>;
const mk = (h: Partial<HabitSeed> & Pick<HabitSeed, 'id' | 'name' | 'icon' | 'type' | 'target' | 'order'>): HabitSeed => ({
  group: 'model', schedule: { kind: 'daily' }, archived: false, builtin: true, ...h,
});
/** Pre-loaded habits (blueprint 2.3). Ids are fixed; other areas refer to them. */
export const DEFAULT_HABITS: HabitSeed[] = [
  mk({ id: 'gym', name: 'Gym or cardio', icon: 'dumbbell', type: 'check', target: 1, order: 1, schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5, 6] } }),
  mk({ id: 'walk', name: 'Runway walk', icon: 'walk', type: 'check', target: 1, unit: 'min', order: 2, schedule: { kind: 'times_per_week', times: 5 } }),
  mk({ id: 'skin_am', name: 'Skincare AM', icon: 'sun', type: 'check', target: 1, order: 3 }),
  mk({ id: 'skin_pm', name: 'Skincare PM', icon: 'moon', type: 'check', target: 1, order: 4 }),
  mk({ id: 'posture', name: 'Posture drills', icon: 'posture', type: 'check', target: 1, order: 5 }),
  mk({ id: 'protein', name: 'Protein', icon: 'protein', type: 'counter', target: 130, unit: 'g', step: 10, order: 6 }),
  mk({ id: 'steps', name: 'Steps', icon: 'steps', type: 'counter', target: 10000, unit: 'steps', step: 1000, order: 7 }),
  mk({ id: 'water', name: 'Water', icon: 'water', type: 'counter', target: 3500, unit: 'ml', step: 250, order: 8 }),
  mk({ id: 'sleep', name: 'Sleep', icon: 'sleep', type: 'number', target: 8, unit: 'h', order: 9 }),
  mk({ id: 'no_junk', name: 'No junk / sweets', icon: 'leaf', type: 'check', target: 1, order: 10 }),
];

export const PLAN_RULE = 'Keep everything you started. Each month ADD one new thing.';
