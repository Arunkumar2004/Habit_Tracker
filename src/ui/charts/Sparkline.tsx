import { isNum } from './common';
import { linear } from './scale';

/** Tiny inline trend line with the last point emphasised. */
export function Sparkline({ values, width = 80, height = 24, color = 'var(--accent)', label }: {
  values: number[]; width?: number; height?: number; color?: string; label?: string;
}) {
  const vals = values.filter(isNum);
  const summary = label ?? (vals.length
    ? `Trend of ${vals.length} values, from ${round(vals[0])} to ${round(vals[vals.length - 1])}`
    : 'No trend yet');
  if (!vals.length) {
    return (
      <svg className="ch-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary}>
        <line x1={2} x2={width - 2} y1={height / 2} y2={height / 2} stroke="var(--line)" strokeWidth={2} strokeDasharray="3 3" />
      </svg>
    );
  }
  const pad = 4; // room for the end dot
  const x = vals.length === 1 ? () => width - pad : linear(0, vals.length - 1, pad, width - pad);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const y = linear(lo, hi, height - pad, pad);
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const li = vals.length - 1;
  return (
    <svg className="ch-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary}>
      {vals.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />}
      <circle cx={x(li)} cy={y(vals[li])} r={2.75} fill={color} stroke="var(--surface)" strokeWidth={1.25} />
    </svg>
  );
}

const round = (n: number) => String(Math.round(n * 10) / 10);
