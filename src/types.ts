// Data model (blueprint section 5). Every stored record has `id` and `updatedAt` (ms since epoch).
// Dates are local calendar dates as 'YYYY-MM-DD'. Money is whole rupees (number, may have paise as decimals).

export interface Base {
  id: string;
  updatedAt: number;
  deleted?: boolean; // tombstone, so deletes sync across devices
}

export type BodyType = 'skinny' | 'average' | 'more_fat';
export type Diet = 'veg' | 'non_veg';
export type ThemePref = 'auto' | 'light' | 'dark';

export interface Profile extends Base {
  id: 'me';
  name: string;
  startDate: string;
  heightCm: number;
  weightKg: number;
  bodyType: BodyType;
  diet: Diet;
  currency: 'INR';
  theme: ThemePref;
  monthlyBudget: number;
  proteinTargetG?: number; // override; else computed by nutrition engine
  onboarded: boolean;
  lastBackupAt?: number;
  // Model card extras
  chestCm?: number;
  waistCm?: number;
  shoeSize?: string;
  hair?: string;
  eyes?: string;
}

export type HabitType = 'check' | 'counter' | 'number';
export type HabitGroup = 'model' | 'personal';
export type Schedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] } // 0 = Sunday … 6 = Saturday
  | { kind: 'times_per_week'; times: number };

export interface Habit extends Base {
  name: string;
  icon: string; // key into ui/Icon
  group: HabitGroup;
  type: HabitType;
  target: number; // check: 1; counter/number: target value in `unit`
  unit?: string; // 'ml', 'g', 'steps', 'h', 'min'
  step?: number; // counter + button increment (e.g. 250 ml, 10 g)
  schedule: Schedule;
  order: number;
  archived: boolean;
  builtin?: boolean;
}

/** One calendar day. `habits` holds check habits (boolean) and counter/number habits (number). */
export interface Day extends Base {
  id: string; // = date
  date: string;
  habits: Record<string, boolean | number>;
  mood?: number; // 1..5
  note?: string;
  weightKg?: number;
}

export interface WorkoutSet { kg: number; reps: number; done: boolean }
export interface WorkoutExercise { ex: string; sets: WorkoutSet[] }
export interface Workout extends Base {
  date: string;
  session: string; // key into plan sessions, e.g. 'upper_b'
  minutes: number;
  exercises: WorkoutExercise[];
  finished: boolean;
  notes?: string;
}

export interface Measurement extends Base {
  date: string;
  weightKg?: number; waistCm?: number; chestCm?: number; shouldersCm?: number;
  armCm?: number; thighCm?: number;
  bestBench?: number; bestSquat?: number; bestPulldown?: number;
}

export type PhotoPose = 'body_front' | 'body_side' | 'body_back' | 'face_front' | 'face_left' | 'face_right' | 'hair';
export interface Photo extends Base { date: string; pose: PhotoPose; image: string /* data: URL, ≤ ~150 KB */ }

export const REVIEW_AREAS = [
  'physique', 'posture', 'skin', 'hair_beard', 'walk', 'posing', 'style', 'sleep', 'food', 'confidence',
] as const;
export type ReviewArea = (typeof REVIEW_AREAS)[number];
export interface Review extends Base {
  id: string; // = weekStart date
  weekStart: string; // Monday
  weekNo: number;
  scores: Record<ReviewArea, number>; // 1..10
  lowest: ReviewArea;
  fixOne: string;
}

export interface Milestone extends Base { id: string; status: 'locked' | 'active' | 'done'; doneAt?: string; note?: string }
export interface Checklist extends Base { items: Record<string, boolean> }

export type TxType = 'expense' | 'income' | 'transfer';
export interface Transaction extends Base {
  type: TxType;
  amount: number;
  category: string; // category id ('' for transfer)
  account: string; // account id
  toAccount?: string; // transfer target
  date: string;
  note?: string;
  career: boolean;
  recurringId?: string;
}
export interface Category extends Base {
  name: string; icon: string; color: string; kind: 'expense' | 'income';
  monthlyBudget: number; career: boolean; order: number;
}
export interface Account extends Base { name: string; kind: 'cash' | 'bank' | 'upi' | 'card'; openingBalance: number }
export interface Recurring extends Base {
  template: Omit<Transaction, keyof Base | 'date' | 'recurringId'>;
  frequency: 'monthly' | 'weekly' | 'yearly';
  nextDate: string;
  active: boolean;
}
export interface Goal extends Base { name: string; target: number; saved: number; deadline?: string }

/**
 * The person's own, editable plan (one record, id 'me'). Copied from a template at setup, then edited in
 * Plan → Edit plan. Missing record = the Runway model template. Shapes come from the plan content files.
 */
export interface PlanDoc extends Base {
  id: 'me';
  template: PlanTemplateId;
  /** Shown in the Plan tab, e.g. 'Runway model'. */
  name: string;
  roadmap: import('./data/plan').RoadmapStep[];
  /** Session for each weekday, Monday first (7 entries). */
  week: import('./data/plan').SessionKey[];
  sessions: Record<import('./data/plan').SessionKey, import('./data/sessions').SessionDef>;
  menus: Record<Diet, import('./data/food').DayMenu>;
  checklists: import('./data/checklists').ChecklistDef[];
  /** One-line rule shown on the roadmap. */
  rule: string;
}
export type PlanTemplateId = 'runway' | 'fitness' | 'fatloss';

export interface Collections {
  plans: PlanDoc;
  profile: Profile;
  habits: Habit;
  days: Day;
  workouts: Workout;
  measurements: Measurement;
  photos: Photo;
  reviews: Review;
  milestones: Milestone;
  checklists: Checklist;
  transactions: Transaction;
  categories: Category;
  accounts: Account;
  recurring: Recurring;
  goals: Goal;
}
export type CollectionName = keyof Collections;
export const COLLECTIONS: CollectionName[] = [
  'plans', 'profile', 'habits', 'days', 'workouts', 'measurements', 'photos', 'reviews',
  'milestones', 'checklists', 'transactions', 'categories', 'accounts', 'recurring', 'goals',
];
export type Data = { [K in CollectionName]: Record<string, Collections[K]> };
