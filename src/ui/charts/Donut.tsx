import { ChartEmpty, isNum, seriesColor } from './common';
import { compact } from './scale';

export interface DonutSlice { label: string; value: number; color?: string }

/** Ring of slices with small gaps, a centre label + value, and a legend list (label, value, share). */
export function Donut({ data, size = 160, centerLabel, centerValue, format, label, empty }: {
  data: DonutSlice[]; size?: number; centerLabel?: string; centerValue?: string;
  /** Formats slice values in the legend (default: compact number). */
  format?: (n: number) => string;
  /** Accessible summary; defaults to a list of slices with shares. */
  label?: string;
  /** Empty-state text. */
  empty?: string;
}) {
  const fmt = format ?? compact;
  const slices = data
    .map((d, i) => ({ ...d, color: d.color ?? seriesColor(i) }))
    .filter((d) => isNum(d.value) && d.value > 0);
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (!slices.length || total <= 0) return <ChartEmpty height={size}>{empty}</ChartEmpty>;

  const stroke = Math.max(10, Math.round(size * 0.14));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = slices.length > 1 ? Math.min(3, c / slices.length / 4) : 0;
  const share = (v: number) => Math.round((v / total) * 100);

  let acc = 0;
  const arcs = slices.map((d) => {
    const len = (d.value / total) * c;
    const dash = Math.max(0.5, len - gap);
    const offset = -acc - gap / 2;
    acc += len;
    return { d, dash, offset };
  });

  const summary = label ?? [
    centerLabel && centerValue ? `${centerLabel} ${centerValue}.` : '',
    slices.map((d) => `${d.label} ${fmt(d.value)} (${share(d.value)}%)`).join(', '),
  ].filter(Boolean).join(' ');

  return (
    <div className="ch-donut">
      <svg className="ch-donut-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={summary}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} opacity={0.5} />
          {arcs.map(({ d, dash, offset }, i) => (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={offset}>
              <title>{`${d.label}: ${fmt(d.value)} (${share(d.value)}%)`}</title>
            </circle>
          ))}
        </g>
        {centerLabel && (
          <text className="ch-donut-label" x={size / 2} y={size / 2 - (centerValue ? 8 : -4)} textAnchor="middle">{centerLabel}</text>
        )}
        {centerValue && (
          <text className="ch-donut-value num" x={size / 2} y={size / 2 + (centerLabel ? 16 : 6)} textAnchor="middle">{centerValue}</text>
        )}
      </svg>
      <ul className="ch-donut-list">
        {slices.map((d, i) => (
          <li key={i}>
            <span className="ch-swatch" style={{ background: d.color }} aria-hidden="true" />
            <span className="ch-name">{d.label}</span>
            <span className="ch-amt num">{fmt(d.value)}</span>
            <span className="ch-share num">{share(d.value)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
