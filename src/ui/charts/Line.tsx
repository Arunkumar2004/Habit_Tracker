import { ChartEmpty, Legend, isNum, seriesColor, useWidth } from './common';
import { compact, labelEvery, linear, niceTicks, textWidth } from './scale';
import { parseISO } from '../../lib/date';

export interface LinePoint { x: string; y: number }
export interface LineSeries { name: string; points: LinePoint[]; color?: string }

const ISO = /^\d{4}-\d{2}(-\d{2})?$/;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '2026-10-08' → '8 Oct', '2026-10' → 'Oct'; other labels unchanged. */
function shortX(x: string): string {
  if (!ISO.test(x)) return x;
  if (x.length === 7) return MON[Number(x.slice(5, 7)) - 1] ?? x;
  const d = parseISO(x);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

/** Line chart over string x labels (dates). Gaps where a series has no point; area under the first series. */
export function Line({ series, height = 180, format, formatX, label, empty }: {
  series: LineSeries[]; height?: number; format?: (n: number) => string;
  /** Formats x labels (default: ISO dates as '8 Oct', months as 'Oct'). */
  formatX?: (x: string) => string;
  label?: string;
  empty?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const fmt = format ?? compact;
  const fx = formatX ?? shortX;

  // X domain: union of labels in order of first appearance; sorted when they are all ISO dates.
  const seen = new Set<string>();
  for (const s of series) for (const p of s.points) if (isNum(p.y)) seen.add(p.x);
  let xs = [...seen];
  if (xs.length && xs.every((x) => ISO.test(x))) xs = xs.sort();
  if (!xs.length) return <ChartEmpty height={height}>{empty}</ChartEmpty>;

  const lines = series.map((s, i) => {
    const byX = new Map<string, number>();
    for (const p of s.points) if (isNum(p.y)) byX.set(p.x, p.y);
    return { name: s.name, color: s.color ?? seriesColor(i), vals: xs.map((x) => byX.get(x)) };
  });
  const all = lines.flatMap((l) => l.vals).filter(isNum);
  const ticks = niceTicks(Math.min(...all), Math.max(...all), 4);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];

  const padT = 22;
  const padB = 20;
  const padL = Math.ceil(Math.max(...ticks.map((t) => textWidth(fmt(t))))) + 8;
  const lastText = (() => {
    const v = lines[0]?.vals.filter(isNum).at(-1);
    return isNum(v) ? fmt(v) : '';
  })();
  const firstLabelW = textWidth(fx(xs[0]));
  const lastLabelW = textWidth(fx(xs[xs.length - 1]));
  const padR = Math.max(8, Math.ceil(lastLabelW / 2) + 2);
  const left = Math.max(padL, Math.ceil(firstLabelW / 2) + 2);
  const plotW = Math.max(40, w - left - padR);
  const x = xs.length === 1 ? () => left + plotW / 2 : (i: number) => left + (i / (xs.length - 1)) * plotW;
  const y = linear(lo, hi, height - padB, padT);
  const every = labelEvery(xs.length, xs.length > 1 ? plotW / (xs.length - 1) : plotW,
    Math.max(...xs.map((v) => textWidth(fx(v)))));

  /** Contiguous runs of defined points. */
  const runs = (vals: (number | undefined)[]) => {
    const out: { i: number; v: number }[][] = [];
    let cur: { i: number; v: number }[] = [];
    vals.forEach((v, i) => {
      if (isNum(v)) cur.push({ i, v });
      else if (cur.length) { out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur);
    return out;
  };
  const path = (run: { i: number; v: number }[]) =>
    run.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const base = height - padB; // area fills down to the bottom of the plot
  /** Regular labels every n-th point, plus the last one; drop a regular label that would crowd the last. */
  const showX = (i: number) => i === xs.length - 1 || (i % every === 0 && xs.length - 1 - i >= every);

  const summary = label ?? `Line chart from ${fx(xs[0])} to ${fx(xs[xs.length - 1])}. ${lines
    .map((l) => {
      const d = l.vals.filter(isNum);
      return d.length ? `${l.name}: ${fmt(d[0])} to ${fmt(d[d.length - 1])}` : `${l.name}: no data`;
    })
    .join('; ')}.`;

  // Last point of the first series carries its value label, kept inside the viewBox.
  const first = lines[0];
  const lastIdx = first ? first.vals.reduce<number>((acc, v, i) => (isNum(v) ? i : acc), -1) : -1;
  let valTag: { x: number; y: number; anchor: 'start' | 'middle' | 'end' } | null = null;
  if (first && lastIdx >= 0) {
    const px = x(lastIdx);
    const py = y(first.vals[lastIdx] as number);
    const tw = textWidth(lastText, 13);
    const anchor = px + tw / 2 > w - 2 ? 'end' : px - tw / 2 < 2 ? 'start' : 'middle';
    valTag = { x: anchor === 'end' ? Math.min(px + 4, w - 2) : px, y: py - 10 < 12 ? py + 20 : py - 10, anchor };
  }

  return (
    <div className="ch-wrap" ref={ref}>
      <svg className="ch-svg" viewBox={`0 0 ${w} ${height}`} height={height} role="img" aria-label={summary}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="ch-grid" x1={left} x2={w - padR} y1={Math.round(y(t)) + 0.5} y2={Math.round(y(t)) + 0.5} />
            <text className="ch-axis" x={left - 6} y={y(t)} dy="0.32em" textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {xs.map((v, i) => showX(i) ? (
          <text key={v} className="ch-axis" x={x(i)} y={height - 5} textAnchor="middle">{fx(v)}</text>
        ) : null)}
        {first && runs(first.vals).filter((r) => r.length > 1).map((r, k) => (
          <path key={`a${k}`} d={`${path(r)}L${x(r[r.length - 1].i).toFixed(1)},${base.toFixed(1)}L${x(r[0].i).toFixed(1)},${base.toFixed(1)}Z`}
            fill={first.color} opacity={0.12} />
        ))}
        {lines.map((l, li) => {
          const rs = runs(l.vals);
          const lastI = rs.length ? rs[rs.length - 1][rs[rs.length - 1].length - 1] : null;
          return (
            <g key={li}>
              {rs.map((r, k) => r.length > 1
                ? <path key={k} d={path(r)} fill="none" stroke={l.color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
                : <circle key={k} cx={x(r[0].i)} cy={y(r[0].v)} r={2.5} fill={l.color} />)}
              {lastI && (
                <circle cx={x(lastI.i)} cy={y(lastI.v)} r={li === 0 ? 5 : 4} fill={l.color} stroke="var(--surface)" strokeWidth={2} />
              )}
            </g>
          );
        })}
        {valTag && lastText && (
          <text className="ch-val ch-val-halo num" x={valTag.x} y={valTag.y} textAnchor={valTag.anchor}>{lastText}</text>
        )}
      </svg>
      {lines.length > 1 && (
        <Legend items={lines.map((l) => {
          const v = l.vals.filter(isNum).at(-1);
          return { label: l.name, color: l.color, value: isNum(v) ? fmt(v) : undefined };
        })} />
      )}
    </div>
  );
}
