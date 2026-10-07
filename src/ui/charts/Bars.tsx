import { useState } from 'react';
import { ChartEmpty, Legend, isNum, useWidth } from './common';
import { compact, labelEvery, linear, niceTicks, textWidth } from './scale';

export interface BarDatum { label: string; value: number; value2?: number }

/** Vertical bars. With value2, draws paired bars (e.g. income vs expense). Tap or hover a bar to see its value. */
export function Bars({ data, height = 160, format, series, colors, label, empty }: {
  data: BarDatum[]; height?: number; format?: (n: number) => string; series?: [string, string];
  /** Bar colours for value and value2 (default var(--c1), var(--c3)). */
  colors?: [string, string];
  /** Accessible summary; defaults to a list of bar values. */
  label?: string;
  empty?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [sel, setSel] = useState<number | null>(null);
  const fmt = format ?? compact;
  const rows = data.filter((d) => isNum(d.value) || isNum(d.value2));
  if (!rows.length) return <ChartEmpty height={height}>{empty}</ChartEmpty>;

  const paired = rows.some((d) => isNum(d.value2));
  const [col1, col2] = colors ?? ['var(--c1)', 'var(--c3)'];
  const vals = rows.flatMap((d) => [d.value, d.value2]).filter(isNum);
  const ticks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals), 3);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];

  const padT = 20;
  const padB = 20;
  const padL = Math.ceil(Math.max(...ticks.map((t) => textWidth(fmt(t))))) + 8;
  const padR = 4;
  const plotW = Math.max(40, w - padL - padR);
  const y = linear(lo, hi, height - padB, padT);
  const band = plotW / rows.length;
  const inner = Math.min(band * 0.7, paired ? 36 : 28);
  const barW = paired ? Math.max(2, (inner - 2) / 2) : Math.max(2, inner);
  const every = labelEvery(rows.length, band, Math.max(...rows.map((d) => textWidth(d.label))));
  const y0 = y(0);

  const bar = (v: number | undefined, x: number, fill: string) => {
    if (!isNum(v)) return null;
    const top = Math.min(y(v), y0);
    const h = Math.max(v === 0 ? 0 : 1, Math.abs(y(v) - y0));
    return <rect className="ch-bar" x={x} y={top} width={barW} height={h} rx={Math.min(4, barW / 2)} fill={fill} />;
  };

  const summary = label ?? `Bar chart: ${rows
    .map((d) => `${d.label} ${isNum(d.value) ? fmt(d.value) : 'none'}${paired ? ` and ${isNum(d.value2) ? fmt(d.value2) : 'none'}` : ''}`)
    .join(', ')}.`;

  const selRow = sel !== null ? rows[sel] : undefined;
  let tip: { x: number; y: number; text: string } | null = null;
  if (selRow && sel !== null) {
    const cx = padL + band * sel + band / 2;
    const parts = [selRow.value, selRow.value2].filter(isNum);
    const text = paired && series
      ? `${isNum(selRow.value) ? fmt(selRow.value) : '–'} / ${isNum(selRow.value2) ? fmt(selRow.value2) : '–'}`
      : parts.map(fmt).join(' / ');
    const tw = textWidth(text, 13);
    const top = Math.min(y0, ...parts.map(y));
    tip = { x: Math.min(Math.max(cx, padL + tw / 2), w - padR - tw / 2), y: Math.max(13, top - 6), text };
  }

  return (
    <div className="ch-wrap" ref={ref}>
      <svg className="ch-svg ch-bars" viewBox={`0 0 ${w} ${height}`} height={height} role="img" aria-label={summary}
        data-sel={sel !== null ? '' : undefined} onMouseLeave={() => setSel(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'ch-zero' : 'ch-grid'} x1={padL} x2={w - padR} y1={Math.round(y(t)) + 0.5} y2={Math.round(y(t)) + 0.5} />
            <text className="ch-axis" x={padL - 6} y={y(t)} dy="0.32em" textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {rows.map((d, i) => {
          const cx = padL + band * i + band / 2;
          const x1 = paired ? cx - barW - 1 : cx - barW / 2;
          return (
            <g key={i} className="ch-col" data-on={sel === i ? '' : undefined}>
              {bar(d.value, x1, col1)}
              {paired && bar(d.value2, cx + 1, col2)}
              {i % every === 0 && (
                <text className="ch-axis" x={cx} y={height - 5} textAnchor="middle">{d.label}</text>
              )}
              <rect className="ch-hit" x={padL + band * i} y={padT - 16} width={band} height={height - padT - padB + 16}
                onMouseEnter={() => setSel(i)} onClick={() => setSel((s) => (s === i ? null : i))}>
                <title>{`${d.label}: ${[d.value, d.value2].filter(isNum).map(fmt).join(' / ')}`}</title>
              </rect>
            </g>
          );
        })}
        {tip && (
          <text className="ch-val ch-val-halo num" x={tip.x} y={tip.y} textAnchor="middle" pointerEvents="none">{tip.text}</text>
        )}
      </svg>
      {paired && series && (
        <Legend items={[{ label: series[0], color: col1 }, { label: series[1], color: col2 }]} />
      )}
    </div>
  );
}
