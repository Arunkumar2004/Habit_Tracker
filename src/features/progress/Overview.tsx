// Progress home: "Is it working?" signals, insights, entry cards, charts (blueprint 2.5).
import { useMemo } from 'react';
import { useStore } from '../../store/store';
import { ScreenHeader } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { Bars, Line, Radar, type LineSeries } from '../../ui/charts';
import { insights, nextMeasureDate } from '../../engines/insights';
import { dayScore } from '../../engines/score';
import { dayInfo } from '../../engines/schedule';
import { addDays, diffDays, fmtShort, todayISO, weekStart, weekday } from '../../lib/date';
import { num } from '../../lib/format';
import type { Data, ReviewArea } from '../../types';
import { AREA_LABEL, REVIEW_AREAS, measurementsSorted, signals, type SignalState } from './logic';

const SIGNAL_ICON: Record<SignalState, string> = { ok: 'check', warn: 'info', none: 'dot' };
const TONE_ICON = { good: 'check', warn: 'bulb', info: 'info' } as const;

function weightWaist(data: Data): LineSeries[] {
  const weight = new Map<string, number>();
  const waist: { x: string; y: number }[] = [];
  for (const m of measurementsSorted(data)) {
    if (m.weightKg) weight.set(m.date, m.weightKg);
    if (m.waistCm) waist.push({ x: m.date, y: m.waistCm });
  }
  for (const d of Object.values(data.days)) if (d.weightKg) weight.set(d.date, d.weightKg);
  return [
    { name: 'Weight (kg)', points: [...weight].sort(([a], [b]) => (a < b ? -1 : 1)).map(([x, y]) => ({ x, y })) },
    { name: 'Waist (cm)', points: waist, color: 'var(--c3)' },
  ];
}

function strength(data: Data): LineSeries[] {
  const ms = measurementsSorted(data);
  const pick = (k: 'bestBench' | 'bestSquat' | 'bestPulldown') =>
    ms.filter((m) => typeof m[k] === 'number' && m[k]! > 0).map((m) => ({ x: m.date, y: m[k]! }));
  return [
    { name: 'Bench', points: pick('bestBench') },
    { name: 'Squat', points: pick('bestSquat'), color: 'var(--c2)' },
    { name: 'Pulldown', points: pick('bestPulldown'), color: 'var(--c3)' },
  ];
}

function consistency(data: Data, today: string) {
  const start = data.profile.me?.startDate ?? today;
  const out: { label: string; value: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const ws = addDays(weekStart(today), -7 * i);
    if (addDays(ws, 6) < start) continue;
    const scores: number[] = [];
    for (let d = ws; d <= addDays(ws, 6) && d <= today; d = addDays(d, 1)) {
      if (d < start) continue;
      const s = dayScore(data, d);
      if (s.total > 0) scores.push(s.score);
    }
    if (!scores.length) continue;
    const [, m, dd] = ws.split('-');
    out.push({ label: `${Number(dd)}/${Number(m)}`, value: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) });
  }
  return out;
}

function ProgressHome() {
  const data = useStore((s) => s.data);
  const navigate = useStore((s) => s.navigate);
  const today = todayISO();
  const p = data.profile.me;
  const info = dayInfo(p, today);

  const sig = useMemo(() => signals(data, today), [data, today]);
  const tips = useMemo(() => insights(data, today), [data, today]);
  const ww = useMemo(() => weightWaist(data), [data]);
  const str = useMemo(() => strength(data), [data]);
  const cons = useMemo(() => consistency(data, today), [data, today]);
  const latestReview = useMemo(
    () => Object.values(data.reviews).sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))[0],
    [data.reviews],
  );

  const thisWeek = weekStart(today);
  const reviewDone = !!data.reviews[thisWeek];
  const isSunday = weekday(today) === 0;
  const measureIn = diffDays(today, nextMeasureDate(data, today));
  const photoCount = Object.keys(data.photos).length;
  const msCount = Object.keys(data.measurements).length;

  const entries = [
    { screen: 'sunday', icon: 'star', title: 'Sunday check', sub: reviewDone ? 'Done this week' : '15 min · rate 10 areas' },
    { screen: 'log', icon: 'list', title: 'Weekly log', sub: `Week ${info.week} of 52` },
    { screen: 'measure', icon: 'ruler', title: 'Measurements', sub: msCount ? (measureIn > 0 ? `Next in ${measureIn} days` : 'Due now') : 'Add start numbers' },
    { screen: 'photos', icon: 'camera', title: 'Photos', sub: photoCount ? `${photoCount} photos · compare` : '7 standard poses' },
    { screen: 'card', icon: 'portfolio', title: 'Model card', sub: 'Your stats as an image' },
  ];

  return (
    <div className="pg-screen">
      <ScreenHeader title="Progress" />
      <p className="pg-sub">Day {info.dayN} · Week {info.week} of 52 · Month {info.month}</p>

      <section className="pg-hero" aria-label="Is it working?">
        <span className="label">Is it working?</span>
        <h2>{sig.filter((s) => s.state === 'ok').length} of 4 on track</h2>
        <div className="pg-signals">
          {sig.map((s) => (
            <div key={s.id} className="pg-signal" data-state={s.state} title={s.detail}>
              <span className="pg-signal-dot"><Icon name={SIGNAL_ICON[s.state]} /></span>
              <strong>{s.label}</strong>
            </div>
          ))}
        </div>
        <div className="stack" style={{ gap: 4 }}>
          {sig.map((s) => (
            <span key={s.id} className="pg-signal-detail"><b>{s.label}:</b> {s.detail}</span>
          ))}
        </div>
      </section>

      {!reviewDone && (isSunday || weekday(today) === 1) && (
        <button type="button" className="card-hi row" style={{ border: 0, textAlign: 'left', width: '100%' }} onClick={() => navigate('progress', 'sunday')}>
          <span style={{ color: 'var(--accent)' }}><Icon name="star" size={24} /></span>
          <span className="grow">
            <strong style={{ display: 'block' }}>Sunday check: 15 min</strong>
            <span className="small muted">Rate 10 areas and pick next week's focus</span>
          </span>
          <Icon name="chevron" size={20} />
        </button>
      )}

      {tips.length > 0 && (
        <section className="stack" aria-label="Insights">
          <h2 className="label">Insights</h2>
          <div className="pg-insights">
            {tips.map((t) => (
              <div key={t.id} className="card pg-insight" data-tone={t.tone}>
                <span className="pg-insight-icon"><Icon name={TONE_ICON[t.tone]} /></span>
                <p>{t.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="pg-entries" aria-label="Progress tools">
        {entries.map((e) => (
          <button key={e.screen} type="button" className="pg-entry" onClick={() => navigate('progress', e.screen)}>
            <span className="pg-entry-icon"><Icon name={e.icon} /></span>
            <span><strong>{e.title}</strong><span>{e.sub}</span></span>
          </button>
        ))}
        <button type="button" className="pg-entry" onClick={() => navigate('progress', 'photos', { view: 'compare' })}>
          <span className="pg-entry-icon"><Icon name="repeat" /></span>
          <span><strong>Compare</strong><span>Month 0 vs now</span></span>
        </button>
      </section>

      <section className="card pg-chart-card">
        <h3>Weight and waist</h3>
        <Line series={ww} format={(n) => num(n, 1)} label="Weight and waist trend" empty="Log your weight (+ button) or add a measurement to see the trend." />
      </section>
      <section className="card pg-chart-card">
        <h3>Strength (best kg)</h3>
        <Line series={str} format={(n) => num(n, 1)} label="Strength trend" empty="Best bench, squat and pulldown appear here after your first measurement." />
      </section>
      <section className="card pg-chart-card">
        <h3>Habit consistency</h3>
        <Bars data={cons} format={(n) => `${Math.round(n)}%`} label="Weekly average day score" empty="Tick habits on Today to build this chart." />
        <span className="small muted">Weekly average of your day score</span>
      </section>
      <section className="card pg-chart-card">
        <div className="pg-kv">
          <h3>Sunday scores</h3>
          {latestReview && <span className="small muted">{fmtShort(addDays(latestReview.weekStart, 6))}</span>}
        </div>
        {latestReview ? (
          <>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <Radar axes={REVIEW_AREAS.map((a: ReviewArea) => ({ label: AREA_LABEL[a], value: latestReview.scores[a] }))} max={10} label="Latest Sunday scores" />
            </div>
            <span className="small">Focus: <b>{AREA_LABEL[latestReview.lowest]}</b>{latestReview.fixOne ? ` · ${latestReview.fixOne}` : ''}</span>
          </>
        ) : (
          <button type="button" className="btn btn-block" onClick={() => navigate('progress', 'sunday')}>Do your first Sunday check</button>
        )}
      </section>
    </div>
  );
}

export { ProgressHome };
