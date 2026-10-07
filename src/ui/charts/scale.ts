// Small pure helpers shared by the charts: nice axis ticks, linear scales, label thinning.

/** A "nice" step (1, 2, 2.5 or 5 × 10^k) that splits `range` into about `count` intervals. */
export function niceStep(range: number, count = 4): number {
  if (!(range > 0) || !Number.isFinite(range)) return 1;
  const raw = range / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return f * mag;
}

/** Decimal places needed to print multiples of `step` exactly. */
function decimals(step: number): number {
  const s = String(step);
  if (s.includes('e-')) return Number(s.split('e-')[1]);
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : s.length - dot - 1;
}

/**
 * Nice ticks covering [min, max]: evenly spaced, starting and ending on a multiple of the step.
 * Equal or empty ranges are widened (towards 0 first) so there are always at least two ticks.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min > max) [min, max] = [max, min];
  if (min === max) {
    if (min > 0) min = 0;
    else if (max < 0) max = 0;
    else max = 1;
  }
  const step = niceStep(max - min, count);
  const d = decimals(step);
  const lo = Math.floor(min / step + 1e-9) * step;
  const hi = Math.ceil(max / step - 1e-9) * step;
  const out: number[] = [];
  for (let v = lo, i = 0; v <= hi + step / 2 && i < 100; v += step, i++) {
    const r = Number((lo + i * step).toFixed(d));
    out.push(Object.is(r, -0) ? 0 : r);
  }
  return out;
}

/** Linear map from [d0, d1] to [r0, r1]. A zero-width domain maps to the middle of the range. */
export function linear(d0: number, d1: number, r0: number, r1: number) {
  const span = d1 - d0;
  return (v: number) => (span === 0 ? (r0 + r1) / 2 : r0 + ((v - d0) / span) * (r1 - r0));
}

/** Show every n-th label so labels of about `labelPx` width fit in slots `slotPx` wide. */
export function labelEvery(count: number, slotPx: number, labelPx: number): number {
  if (count <= 1 || slotPx <= 0) return 1;
  return Math.max(1, Math.ceil((labelPx + 6) / slotPx));
}

/** Rough text width for an SVG label at `fontPx` (Poppins averages about 0.58 em per character). */
export function textWidth(s: string, fontPx = 11): number {
  return s.length * fontPx * 0.58;
}

/** Compact default number format: 1234 → 1.2k, 1500000 → 15L (Indian lakh), 0.5 → 0.5. */
export function compact(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1e7) return `${sign}${trim(a / 1e7)}Cr`;
  if (a >= 1e5) return `${sign}${trim(a / 1e5)}L`;
  if (a >= 1e3) return `${sign}${trim(a / 1e3)}k`;
  return `${sign}${trim(a)}`;
}
function trim(n: number): string {
  return String(Number(n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)));
}
