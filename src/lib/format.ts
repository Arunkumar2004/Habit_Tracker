const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** ₹1,23,456 */
export function rupees(n: number): string {
  return `${n < 0 ? '−' : ''}₹${inr.format(Math.abs(Math.round(n)))}`;
}
export function num(n: number, digits = 0): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
