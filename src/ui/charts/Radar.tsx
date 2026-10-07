import { ChartEmpty, isNum } from './common';
import { textWidth } from './scale';

export interface RadarAxis { label: string; value: number }

/** Radar for 1..max scores (Sunday check). Rings at 2/4/6/8/10 of max; labels sit outside the rings. */
export function Radar({ axes, max = 10, size = 240, label, empty }: {
  axes: RadarAxis[]; max?: number; size?: number; label?: string; empty?: string;
}) {
  if (axes.length < 3) {
    return <ChartEmpty height={size / 2}>{empty ?? 'Score at least three areas to see the radar.'}</ChartEmpty>;
  }
  const top = max > 0 ? max : 10;
  const n = axes.length;
  const labelPx = 13;
  const maxLabel = Math.max(...axes.map((a) => textWidth(a.label, labelPx)));
  const r = Math.max(40, size / 2 - 22);
  const padX = Math.ceil(maxLabel) + 14;
  const padY = 42; // two text lines (label + score) above the top axis and below the bottom one
  const W = 2 * (r + padX);
  const H = 2 * (r + padY);
  const cx = W / 2;
  const cy = H / 2;
  const ang = (i: number) => -Math.PI / 2 + (i / n) * 2 * Math.PI;
  const pt = (i: number, v: number) => {
    const k = Math.max(0, Math.min(1, v / top)) * r;
    return [cx + Math.cos(ang(i)) * k, cy + Math.sin(ang(i)) * k] as const;
  };
  const rings = [0.2, 0.4, 0.6, 0.8, 1];
  const poly = (f: (i: number) => readonly [number, number]) =>
    axes.map((_, i) => f(i).map((c) => c.toFixed(1)).join(',')).join(' ');
  const shape = poly((i) => pt(i, isNum(axes[i].value) ? axes[i].value : 0));
  const fmtV = (v: number) => (isNum(v) ? String(Math.round(v * 10) / 10) : '–');

  const summary = label ?? `Radar out of ${top}: ${axes.map((a) => `${a.label} ${fmtV(a.value)}`).join(', ')}.`;

  return (
    <svg className="ch-radar-svg" viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`} style={{ maxWidth: W }} role="img" aria-label={summary}>
      {rings.map((f) => (
        <polygon key={f} className="ch-ring" points={poly((i) => pt(i, f * top))} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, top);
        return <line key={i} className="ch-spoke" x1={cx} y1={cy} x2={x} y2={y} />;
      })}
      <polygon points={shape} fill="var(--accent)" fillOpacity={0.2} stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
      {axes.map((a, i) => {
        const [x, y] = pt(i, isNum(a.value) ? a.value : 0);
        return <circle key={i} cx={x} cy={y} r={3} fill="var(--accent)" />;
      })}
      {axes.map((a, i) => {
        const c = Math.cos(ang(i));
        const s = Math.sin(ang(i));
        const lx = cx + c * (r + 10);
        const ly = cy + s * (r + 10);
        const anchor = Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end';
        // Above the top, below the bottom, centred vertically at the sides.
        const dy = s < -0.5 ? -14 : s > 0.5 ? 12 : -2;
        return (
          <text key={i} x={lx} y={ly + dy} textAnchor={anchor}>
            <tspan className="ch-radar-label">{a.label}</tspan>
            <tspan className="ch-radar-num num" x={lx} dy="1.15em">{fmtV(a.value)}</tspan>
          </text>
        );
      })}
    </svg>
  );
}
