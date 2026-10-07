// Local-calendar date helpers. All dates are 'YYYY-MM-DD' strings in the device's time zone.

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayISO(): string {
  return toISO(new Date());
}
export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
/** Whole days from a to b (b − a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}
/** 0 = Sunday … 6 = Saturday */
export function weekday(s: string): number {
  return parseISO(s).getDay();
}
/** Monday of the week containing s. */
export function weekStart(s: string): string {
  const wd = weekday(s);
  return addDays(s, wd === 0 ? -6 : 1 - wd);
}
export function monthKey(s: string): string {
  return s.slice(0, 7);
}
export function daysInMonth(s: string): number {
  const d = parseISO(s);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
export function rangeDays(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_SHORT = WD;
/** 'Thu 8 Oct' */
export function fmtShort(s: string): string {
  const d = parseISO(s);
  return `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}
/** '8 Oct 2026' */
export function fmtLong(s: string): string {
  const d = parseISO(s);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtMonth(s: string): string {
  const d = parseISO(s);
  return `${MON[d.getMonth()]} ${d.getFullYear()}`;
}
