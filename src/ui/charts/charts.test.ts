import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Bars } from './Bars';
import { Donut } from './Donut';
import { Heatmap, heatStep } from './Heatmap';
import { Line } from './Line';
import { Radar } from './Radar';
import { Sparkline } from './Sparkline';

const html = (el: ReturnType<typeof h>) => renderToStaticMarkup(el);
const clean = (s: string) => {
  expect(s).not.toMatch(/NaN|Infinity|undefined/);
  return s;
};

describe('charts render', () => {
  it('Donut: slices, centre text, legend with shares', () => {
    const s = clean(html(h(Donut, {
      data: [{ label: 'Food', value: 3000 }, { label: 'Travel', value: 1000 }, { label: 'Zero', value: 0 }],
      centerLabel: 'Spent', centerValue: '₹4,000',
    })));
    expect(s).toContain('role="img"');
    expect(s).toContain('Food');
    expect(s).toContain('75%');
    expect(s).toContain('25%');
    expect(s).not.toContain('Zero');
    expect(html(h(Donut, { data: [] }))).toContain('ch-empty');
  });

  it('Bars: single and paired with legend', () => {
    const one = clean(html(h(Bars, { data: [{ label: 'Mon', value: 5 }, { label: 'Tue', value: 12 }] })));
    expect(one).toContain('aria-label="Bar chart: Mon 5, Tue 12."');
    const two = clean(html(h(Bars, {
      data: [{ label: 'Sep', value: 50_000, value2: 32_000 }, { label: 'Oct', value: 52_000, value2: -1_000 }],
      series: ['Income', 'Expense'],
    })));
    expect(two).toContain('Income');
    expect(two).toContain('Expense');
    expect(two).toContain('ch-zero');
    expect(html(h(Bars, { data: [] }))).toContain('ch-empty');
  });

  it('Line: dates sorted, gaps, last value shown', () => {
    const s = clean(html(h(Line, {
      series: [
        { name: 'Weight', points: [{ x: '2026-10-03', y: 72.4 }, { x: '2026-10-01', y: 73 }, { x: '2026-10-05', y: 72.1 }] },
        { name: 'Goal', points: [{ x: '2026-10-01', y: 70 }, { x: '2026-10-05', y: 70 }] },
      ],
      format: (n: number) => `${n} kg`,
    })));
    expect(s).toContain('from 1 Oct to 5 Oct');
    expect(s).toContain('Weight: 73 kg to 72.1 kg');
    expect(s).toContain('>72.1 kg<');
    expect(html(h(Line, { series: [] }))).toContain('ch-empty');
    expect(html(h(Line, { series: [{ name: 'a', points: [{ x: 'x', y: NaN }] }] }))).toContain('ch-empty');
  });

  it('Radar: needs three axes', () => {
    const s = clean(html(h(Radar, { axes: ['Energy', 'Skin', 'Posture', 'Sleep', 'Mood'].map((label, i) => ({ label, value: i * 2 + 1 })) })));
    expect(s).toContain('Radar out of 10: Energy 1, Skin 3');
    expect((s.match(/ch-ring/g) ?? []).length).toBe(5);
    expect(html(h(Radar, { axes: [{ label: 'A', value: 1 }] }))).toContain('ch-empty');
  });

  it('Heatmap: weeks x 7 cells up to end, not-scheduled cells dashed', () => {
    // 2026-10-07 is a Wednesday: the last column holds Mon..Wed only.
    const s = clean(html(h(Heatmap, { values: { '2026-10-05': 1, '2026-10-06': 0.4, '2026-10-07': 0 }, end: '2026-10-07', weeks: 4 })));
    expect((s.match(/<rect/g) ?? []).length - 6).toBe(3 * 7 + 3); // minus the 6 legend swatches
    expect(s).toContain('3 scheduled days, 1 fully done, average 47%');
    expect(s).toContain('ch-cell-off');
    expect(heatStep(0)).toBe(0);
    expect(heatStep(0.25)).toBe(1);
    expect(heatStep(0.5)).toBe(2);
    expect(heatStep(0.99)).toBe(3);
    expect(heatStep(1)).toBe(4);
  });

  it('Sparkline: path and last point, or a flat placeholder', () => {
    const s = clean(html(h(Sparkline, { values: [1, 3, 2, 5] })));
    expect(s).toContain('<path');
    expect(s).toContain('from 1 to 5');
    expect(clean(html(h(Sparkline, { values: [] })))).toContain('No trend yet');
    expect(clean(html(h(Sparkline, { values: [4] })))).toContain('<circle');
  });
});
