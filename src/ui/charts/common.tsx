// Shared chart plumbing: container width measurement, series colours, empty state.
import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

// useLayoutEffect in the browser (measure before paint); useEffect where there is no DOM (tests, server render).
const useIsoLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** Series colour n (0-based), cycling through the 8 chart tokens. */
export const seriesColor = (i: number) => `var(--c${(i % 8) + 1})`;

/**
 * Measures the width of a wrapper element so charts draw in real pixels (viewBox = measured width,
 * width 100%). Text stays at its true size and x labels can be thinned on narrow screens.
 */
export function useWidth<T extends HTMLElement>(fallback = 320) {
  const [el, setEl] = useState<T | null>(null);
  const [w, setW] = useState(fallback);
  // Callback ref: re-measures when the element mounts later (e.g. after an empty state).
  const ref = useCallback((node: T | null) => setEl(node), []);
  useIsoLayoutEffect(() => {
    if (!el) return;
    const read = () => {
      const next = Math.round(el.getBoundingClientRect().width);
      if (next > 0) setW((prev) => (prev !== next ? next : prev));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [ref, w] as const;
}

export function ChartEmpty({ height, children }: { height?: number; children?: ReactNode }) {
  return (
    <div className="ch-empty" style={height ? { minHeight: height } : undefined} role="note">
      {children ?? 'No data yet. It will appear here once you log something.'}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="ch-legend">
      {items.map((it, i) => (
        <li key={i}>
          <span className="ch-swatch" style={{ background: it.color }} aria-hidden="true" />
          <span>{it.label}</span>
          {it.value !== undefined && <span className="ch-legend-val num">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
