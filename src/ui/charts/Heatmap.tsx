import { ChartEmpty, isNum, useWidth } from './common';
import { addDays, fmtShort, parseISO, weekStart } from '../../lib/date';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROWS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

/** Opacity step for a 0..1 value: 0 is an empty cell, then four accent steps. */
export function heatStep(v: number): 0 | 1 | 2 | 3 | 4 {
  if (!(v > 0)) return 0;
  if (v <= 0.25) return 1;
  if (v <= 0.5) return 2;
  if (v < 1) return 3;
  return 4;
}
const OPACITY = [0, 0.28, 0.5, 0.75, 1];

/** GitHub-style heatmap. values: date → 0..1 (undefined = not scheduled). weeks columns ending at `end`. */
export function Heatmap({ values, end, weeks = 12, label, empty }: {
  values: Record<string, number | undefined>; end: string; weeks?: number; label?: string; empty?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const nWeeks = Math.max(1, Math.round(weeks));
  const start = addDays(weekStart(end), -(nWeeks - 1) * 7);
  const scheduled = Object.entries(values).filter(([d, v]) => d >= start && d <= end && isNum(v));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return <ChartEmpty>{empty}</ChartEmpty>;

  const padL = 30;
  const padT = 16;
  const gap = 3;
  const cell = Math.max(8, Math.min(26, Math.floor((w - padL) / nWeeks) - gap));
  const step = cell + gap;
  const W = padL + nWeeks * step - gap;
  const H = padT + 7 * step - gap;

  const cols: { date: string; v: number | undefined }[][] = [];
  for (let c = 0; c < nWeeks; c++) {
    const col: { date: string; v: number | undefined }[] = [];
    for (let r = 0; r < 7; r++) {
      const date = addDays(start, c * 7 + r);
      if (date > end) break;
      col.push({ date, v: values[date] });
    }
    cols.push(col);
  }

  // Month labels on the first column that contains the 1st of a month (or the first column), spaced apart.
  const months: { c: number; text: string }[] = [];
  cols.forEach((col, c) => {
    const first = c === 0 ? col[0] : col.find((d) => d.date.endsWith('-01'));
    if (!first) return;
    const m = parseISO(first.date).getMonth();
    const prev = months[months.length - 1];
    if (prev && (c - prev.c) * step < 30) {
      if (c > 0 && prev.c === 0) months[months.length - 1] = { c, text: MON[m] }; // a real month start wins over column 0
      return;
    }
    months.push({ c, text: MON[m] });
  });

  const done = scheduled.filter(([, v]) => (v as number) >= 1).length;
  const avg = scheduled.length ? Math.round((scheduled.reduce((s, [, v]) => s + (v as number), 0) / scheduled.length) * 100) : 0;
  const summary = label ?? (scheduled.length
    ? `Last ${nWeeks} weeks to ${fmtShort(end)}: ${scheduled.length} scheduled days, ${done} fully done, average ${avg}%.`
    : `Last ${nWeeks} weeks to ${fmtShort(end)}: nothing scheduled yet.`);

  const legendCell = (k: number) => (
    <svg width={10} height={10} aria-hidden="true" key={k}>
      {k === 0
        ? <rect className="ch-cell-empty" width={10} height={10} rx={2} />
        : <rect width={10} height={10} rx={2} fill="var(--accent)" fillOpacity={OPACITY[k]} />}
    </svg>
  );

  return (
    <div className="ch-wrap" ref={ref}>
      <svg className="ch-svg" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W }} role="img" aria-label={summary}>
        {months.map((m) => (
          <text key={m.c} className="ch-axis" x={padL + m.c * step} y={11}>{m.text}</text>
        ))}
        {ROWS.map((t, r) => t && (
          <text key={r} className="ch-axis" x={0} y={padT + r * step + cell / 2} dy="0.32em">{t}</text>
        ))}
        {cols.map((col, c) => col.map((d, r) => {
          const x = padL + c * step;
          const y = padT + r * step;
          const v = d.v;
          const title = `${fmtShort(d.date)}: ${isNum(v) ? `${Math.round(v * 100)}%` : 'not scheduled'}`;
          if (!isNum(v)) {
            return <rect key={d.date} className="ch-cell-off" x={x + 0.5} y={y + 0.5} width={cell - 1} height={cell - 1} rx={3}><title>{title}</title></rect>;
          }
          const k = heatStep(v);
          return k === 0
            ? <rect key={d.date} className="ch-cell-empty" x={x} y={y} width={cell} height={cell} rx={3}><title>{title}</title></rect>
            : <rect key={d.date} x={x} y={y} width={cell} height={cell} rx={3} fill="var(--accent)" fillOpacity={OPACITY[k]}><title>{title}</title></rect>;
        }))}
      </svg>
      <div className="ch-heat-legend" aria-hidden="true">
        <span className="ch-steps">Less {[0, 1, 2, 3, 4].map(legendCell)} More</span>
        <span className="ch-steps">
          <svg width={10} height={10}><rect className="ch-cell-off" x={0.5} y={0.5} width={9} height={9} rx={2} /></svg>
          Not scheduled
        </span>
      </div>
    </div>
  );
}
