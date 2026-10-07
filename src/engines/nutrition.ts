// Nutrition engine (blueprint 6). Pure functions.
// Contract (keep names and signatures): `targets(profile)` is used by Today/Habits (protein target) and onboarding.
import type { BodyType, Profile } from '../types';

export const KCAL_PER_KG = 32;
/** Body-type adjustment: skinny +250–300 (mid 275), average 0, more fat −400–500 (mid −450). */
export const BODY_ADJUST: Record<BodyType, number> = { skinny: 275, average: 0, more_fat: -450 };
export const PROTEIN_PER_KG: [number, number] = [1.6, 2.0];
const FALLBACK_WEIGHT = 70;

export interface Targets { kcal: number; proteinMin: number; proteinMax: number; proteinTarget: number }

/** kcal = weight × 32 + body-type adjustment; protein = weight × 1.6–2.0 g (target 1.8 g/kg unless overridden). */
export function targets(profile: Pick<Profile, 'weightKg' | 'bodyType' | 'proteinTargetG'>): Targets {
  const w = profile.weightKg > 0 ? profile.weightKg : FALLBACK_WEIGHT;
  const adj = BODY_ADJUST[profile.bodyType] ?? 0;
  return {
    kcal: Math.round(w * KCAL_PER_KG + adj),
    proteinMin: Math.round(w * PROTEIN_PER_KG[0]),
    proteinMax: Math.round(w * PROTEIN_PER_KG[1]),
    proteinTarget: profile.proteinTargetG && profile.proteinTargetG > 0 ? Math.round(profile.proteinTargetG) : Math.round(w * 1.8),
  };
}

export type WeightGoal = 'gain' | 'hold' | 'lose';
/** Skinny → gain (lean bulk), average → hold (recomp), more fat → lose. */
export function goalFor(bodyType: BodyType): WeightGoal {
  return bodyType === 'skinny' ? 'gain' : bodyType === 'more_fat' ? 'lose' : 'hold';
}

/** Change over 2 weeks (kg) that counts as on track, per goal. */
export const TWO_WEEK_RANGE: Record<WeightGoal, [number, number]> = {
  gain: [0.25, 1.0], // +0.1–0.5 kg a week
  hold: [-0.5, 0.5],
  lose: [-1.0, -0.25], // −0.1–0.5 kg a week
};

export interface KcalAdjustment { delta: -200 | 0 | 200; change: number | null; text: string }

/**
 * Every 2 weeks: compare this week's average weight with the average from 2 weeks before.
 * `weeklyAvgKg` is oldest → newest, one entry per week (use NaN or skip weeks with no weigh-in before calling).
 */
export function kcalAdjustment(weeklyAvgKg: number[], goal: WeightGoal): KcalAdjustment {
  const w = weeklyAvgKg.filter((x) => Number.isFinite(x) && x > 0);
  if (w.length < 3) return { delta: 0, change: null, text: 'Weigh in a few times a week. After 3 weeks the app checks your calories.' };
  const change = Math.round((w[w.length - 1] - w[w.length - 3]) * 100) / 100;
  const [lo, hi] = TWO_WEEK_RANGE[goal];
  const signed = `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)} kg in 2 weeks`;
  if (change < lo) return { delta: 200, change, text: `${signed}. Eat about 200 kcal more a day.` };
  if (change > hi) return { delta: -200, change, text: `${signed}. Eat about 200 kcal less a day.` };
  return { delta: 0, change, text: `${signed}. On track: keep your calories the same.` };
}

/** Average weight for each week that starts on the given dates (oldest first). Weeks with no weigh-in give NaN. */
export function weeklyAverages(entries: { date: string; kg: number }[], weekStarts: string[]): number[] {
  return weekStarts.map((ws, i) => {
    const end = weekStarts[i + 1];
    const inWeek = entries.filter((e) => e.kg > 0 && e.date >= ws && (end ? e.date < end : e.date < addDaysISO(ws, 7)));
    if (!inWeek.length) return NaN;
    return Math.round((inWeek.reduce((n, e) => n + e.kg, 0) / inWeek.length) * 100) / 100;
  });
}

function addDaysISO(s: string, n: number): string {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
