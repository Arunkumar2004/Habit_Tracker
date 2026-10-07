// Pure derivations for the Progress screens: "Is it working?" signals, weekly log, chart series.
import { REVIEW_AREAS, type Data, type Measurement, type PhotoPose, type ReviewArea } from '../../types';
import { addDays, diffDays, weekStart } from '../../lib/date';
import { GYM_ORDER, ROADMAP } from '../../data/plan';
import { targets } from '../../engines/nutrition';
import { dayInfo } from '../../engines/schedule';

export const AREA_LABEL: Record<ReviewArea, string> = {
  physique: 'Physique', posture: 'Posture', skin: 'Skin', hair_beard: 'Hair + beard', walk: 'Runway walk',
  posing: 'Posing', style: 'Style', sleep: 'Sleep', food: 'Food', confidence: 'Confidence',
};
export { REVIEW_AREAS };

export const POSES: { pose: PhotoPose; label: string; hint: string }[] = [
  { pose: 'body_front', label: 'Body front', hint: 'Stand tall, arms relaxed' },
  { pose: 'body_side', label: 'Body side', hint: 'Turn 90°, look ahead' },
  { pose: 'body_back', label: 'Body back', hint: 'Back to camera, arms down' },
  { pose: 'face_front', label: 'Face front', hint: 'Neutral face, eye level' },
  { pose: 'face_left', label: 'Face left', hint: 'Turn left, chin level' },
  { pose: 'face_right', label: 'Face right', hint: 'Turn right, chin level' },
  { pose: 'hair', label: 'Hair', hint: 'Top and sides in daylight' },
];
export const POSE_LABEL = Object.fromEntries(POSES.map((p) => [p.pose, p.label])) as Record<PhotoPose, string>;

export type MeasureKey = Exclude<keyof Measurement, 'id' | 'updatedAt' | 'deleted' | 'date'>;
export const MEASURE_FIELDS: { key: MeasureKey; label: string; unit: string; lowerIsBetter?: boolean }[] = [
  { key: 'weightKg', label: 'Weight', unit: 'kg' },
  { key: 'waistCm', label: 'Waist', unit: 'cm', lowerIsBetter: true },
  { key: 'chestCm', label: 'Chest', unit: 'cm' },
  { key: 'shouldersCm', label: 'Shoulders', unit: 'cm' },
  { key: 'armCm', label: 'Arm', unit: 'cm' },
  { key: 'thighCm', label: 'Thigh', unit: 'cm' },
  { key: 'bestBench', label: 'Best bench', unit: 'kg' },
  { key: 'bestSquat', label: 'Best squat', unit: 'kg' },
  { key: 'bestPulldown', label: 'Best pulldown', unit: 'kg' },
];

export function measurementsSorted(data: Data): Measurement[] {
  return Object.values(data.measurements).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.updatedAt - b.updatedAt));
}

/** First and latest value of a measurement field. */
export function firstLast(ms: Measurement[], key: MeasureKey): { first?: number; last?: number } {
  const vals = ms.map((m) => m[key]).filter((v): v is number => typeof v === 'number');
  return { first: vals[0], last: vals[vals.length - 1] };
}

// ---------- Is it working? ----------
export type SignalState = 'ok' | 'warn' | 'none';
export interface Signal { id: 'body' | 'face' | 'walk' | 'pro'; label: string; state: SignalState; detail: string }

function countDone(data: Data, habitId: string, from: string, to: string): { done: number; days: number } {
  let done = 0;
  let days = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    days++;
    if (data.days[d]?.habits[habitId] === true) done++;
  }
  return { done, days };
}

export function signals(data: Data, today: string): Signal[] {
  const p = data.profile.me;
  const start = p?.startDate ?? today;
  const ms = measurementsSorted(data);

  // Body: waist same or smaller vs start (and shoulders not smaller).
  const waist = firstLast(ms, 'waistCm');
  const sh = firstLast(ms, 'shouldersCm');
  let body: Signal;
  if (waist.first === undefined || ms.length < 2 || waist.last === undefined) {
    body = { id: 'body', label: 'Body', state: 'none', detail: ms.length ? 'Re-measure to see the trend' : 'Add start measurements' };
  } else {
    const dw = Math.round((waist.last - waist.first) * 10) / 10;
    const shOk = sh.first === undefined || sh.last === undefined || sh.last >= sh.first;
    const ok = dw <= 0 && shOk;
    body = {
      id: 'body', label: 'Body', state: ok ? 'ok' : 'warn',
      detail: dw === 0 ? 'Waist same as start' : `Waist ${dw > 0 ? '+' : '−'}${Math.abs(dw)} cm vs start`,
    };
  }

  // Face: skincare AM + PM over the last 14 days.
  const from = addDays(today, -13) < start ? start : addDays(today, -13);
  const am = countDone(data, 'skin_am', from, today);
  const pm = countDone(data, 'skin_pm', from, today);
  const ratio = am.days ? (am.done + pm.done) / (am.days * 2) : 0;
  const face: Signal = {
    id: 'face', label: 'Face', state: am.days < 3 ? 'none' : ratio >= 0.8 ? 'ok' : 'warn',
    detail: `Skincare ${Math.round(ratio * 100)}% of ${am.days} ${am.days === 1 ? 'day' : 'days'}`,
  };

  // Walk: runway walk practice in the last 7 days (target 5).
  const wFrom = addDays(today, -6) < start ? start : addDays(today, -6);
  const walks = countDone(data, 'walk', wFrom, today);
  const walk: Signal = {
    id: 'walk', label: 'Walk', state: walks.done >= 4 ? 'ok' : walks.days < 3 ? 'none' : 'warn',
    detail: `${walks.done}/5 practice sessions this week`,
  };

  // Pro: roadmap steps unlocked before this month are done.
  const month = dayInfo(p, today).month;
  const unlocked = ROADMAP.filter((s) => s.unlockMonth <= month);
  const current = unlocked.find((s) => data.milestones[s.id]?.status !== 'done') ?? unlocked[unlocked.length - 1] ?? ROADMAP[0];
  const behind = ROADMAP.filter((s) => s.unlockMonth < month && data.milestones[s.id]?.status !== 'done').length;
  const allDone = ROADMAP.every((s) => data.milestones[s.id]?.status === 'done');
  const pro: Signal = {
    id: 'pro', label: 'Pro', state: allDone || behind === 0 ? 'ok' : 'warn',
    detail: allDone ? 'All 8 steps done' : `Step ${current.n} of 8: ${current.title}${behind ? ` · ${behind} behind` : ''}`,
  };
  return [body, face, walk, pro];
}

// ---------- Weekly log ----------
export interface WeekLog {
  weekStart: string;
  weekNo: number;
  weight?: number;
  waist?: number;
  gym: number;
  sleepAvg?: number;
  proteinDays: number;
  proteinOf: number;
  cardio: number;
  walks: number;
  lowest?: ReviewArea;
  lowestScore?: number;
  notes?: string;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
const round1 = (n: number | undefined) => (n === undefined ? undefined : Math.round(n * 10) / 10);

export function weekLog(data: Data, ws: string, today: string): WeekLog {
  const p = data.profile.me;
  const start = p?.startDate ?? ws;
  const end = addDays(ws, 6);
  const days: string[] = [];
  for (let d = ws; d <= end; d = addDays(d, 1)) if (d >= start && d <= today) days.push(d);
  const proteinTarget = p ? targets(p).proteinTarget : 130;

  const weights = days.map((d) => data.days[d]?.weightKg).filter((v): v is number => typeof v === 'number');
  const msWeek = measurementsSorted(data).filter((m) => m.date >= ws && m.date <= end);
  const lastM = msWeek[msWeek.length - 1];
  const weight = round1(avg(weights) ?? lastM?.weightKg);
  const waist = [...msWeek].reverse().find((m) => m.waistCm !== undefined)?.waistCm;

  const workouts = Object.values(data.workouts).filter((w) => w.finished && w.date >= ws && w.date <= end);
  const gymDates = new Set(workouts.filter((w) => (GYM_ORDER as string[]).includes(w.session)).map((w) => w.date));
  const gymTicks = days.filter((d) => data.days[d]?.habits.gym === true).length;
  const gym = Math.min(4, gymDates.size || gymTicks);

  const sleeps = days.map((d) => data.days[d]?.habits.sleep).filter((v): v is number => typeof v === 'number' && v > 0);
  const proteinDays = days.filter((d) => {
    const v = data.days[d]?.habits.protein;
    return v === true || (typeof v === 'number' && v >= proteinTarget);
  }).length;
  const cardio = new Set(workouts.filter((w) => w.session === 'cardio_skills').map((w) => w.date)).size;
  const walks = days.filter((d) => data.days[d]?.habits.walk === true).length;
  const review = data.reviews[ws];

  return {
    weekStart: ws,
    weekNo: Math.max(1, Math.floor(diffDays(weekStart(start), ws) / 7) + 1),
    weight, waist, gym, sleepAvg: round1(avg(sleeps)), proteinDays, proteinOf: days.length, cardio, walks,
    lowest: review?.lowest, lowestScore: review ? review.scores[review.lowest] : undefined, notes: review?.fixOne || undefined,
  };
}

/** Week starts (Mondays) from the start week to this week, newest first. */
export function weekStarts(data: Data, today: string, max = 52): string[] {
  const start = data.profile.me?.startDate ?? today;
  const out: string[] = [];
  for (let w = weekStart(today); w >= weekStart(start) && out.length < max; w = addDays(w, -7)) out.push(w);
  return out;
}

/** Lowest score; ties go to the area listed first. */
export function lowestArea(scores: Record<ReviewArea, number>): ReviewArea {
  let low: ReviewArea = REVIEW_AREAS[0];
  for (const a of REVIEW_AREAS) if (scores[a] < scores[low]) low = a;
  return low;
}

export const LIFTS = {
  bestBench: (ex: string) => ex.includes('bench') && !ex.includes('incline'),
  bestSquat: (ex: string) => ex.includes('squat') && !ex.includes('split'),
  bestPulldown: (ex: string) => ex.includes('pulldown'),
};

/** Best kg logged in workouts for the lift (bench / squat / pulldown). */
export function bestLift(data: Data, lift: keyof typeof LIFTS): number | undefined {
  const match = LIFTS[lift];
  let best = 0;
  for (const w of Object.values(data.workouts)) {
    for (const e of w.exercises) {
      if (!match(e.ex)) continue;
      for (const s of e.sets) if (s.done && s.kg > best) best = s.kg;
    }
  }
  return best || undefined;
}
