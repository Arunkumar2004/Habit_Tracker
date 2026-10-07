// Sunday check (blueprint 2.5): rate 10 areas 1–10; the lowest is next week's focus; one thing to fix.
import { useMemo, useState } from 'react';
import { useStore } from '../../store/store';
import { ScreenHeader, haptic } from '../../ui/kit';
import { dayInfo } from '../../engines/schedule';
import { addDays, fmtShort, todayISO, weekStart } from '../../lib/date';
import type { ReviewArea } from '../../types';
import { AREA_LABEL, REVIEW_AREAS, lowestArea } from './logic';

const HINT: Record<ReviewArea, string> = {
  physique: 'Shoulders, waist, shape in the mirror',
  posture: 'Tall stance, chin level, shoulders back',
  skin: 'Clear, even, cared for AM + PM',
  hair_beard: 'Cut, shape, neat lines',
  walk: 'Straight line, steady pace, clean turn',
  posing: 'Relaxed, not stiff, knows angles',
  style: 'Fit, colours, clean basics',
  sleep: '7–9 h, same time each night',
  food: 'Protein hit, few sweets',
  confidence: 'Eye contact, calm, ready to be seen',
};

export function SundayCheck() {
  const today = todayISO();
  const ws = weekStart(today);
  const existing = useStore((s) => s.data.reviews[ws]);
  const profile = useStore((s) => s.data.profile.me);
  const put = useStore((s) => s.put);
  const showToast = useStore((s) => s.showToast);
  const back = useStore((s) => s.back);

  const [scores, setScores] = useState<Partial<Record<ReviewArea, number>>>(() => existing?.scores ?? {});
  const [fixOne, setFixOne] = useState(existing?.fixOne ?? '');
  const rated = REVIEW_AREAS.filter((a) => scores[a] !== undefined).length;
  const complete = rated === REVIEW_AREAS.length;
  const lowest = useMemo(() => (complete ? lowestArea(scores as Record<ReviewArea, number>) : null), [complete, scores]);

  function rate(a: ReviewArea, v: number) {
    haptic();
    setScores((s) => ({ ...s, [a]: v }));
  }
  function save() {
    if (!complete || !lowest) return;
    put('reviews', {
      id: ws, weekStart: ws, weekNo: dayInfo(profile, today).week,
      scores: scores as Record<ReviewArea, number>, lowest, fixOne: fixOne.trim(),
    });
    haptic(20);
    showToast(`Saved. Next week's focus: ${AREA_LABEL[lowest]}`, { undo: true });
    back();
  }

  return (
    <div className="pg-screen">
      <ScreenHeader title="Sunday check" back />
      <p className="pg-sub">Week of {fmtShort(ws)} – {fmtShort(addDays(ws, 6))} · be honest, 1 is weak, 10 is ready</p>

      {REVIEW_AREAS.map((a) => {
        const v = scores[a];
        return (
          <div key={a} className="card pg-area" data-low={lowest === a} role="group" aria-label={`${AREA_LABEL[a]} score`}>
            <div className="pg-area-head">
              <span>
                <strong>{AREA_LABEL[a]}</strong>
                <span className="small muted" style={{ display: 'block' }}>{HINT[a]}</span>
              </span>
              <b className="num" aria-live="polite">{v ?? '–'}</b>
            </div>
            <div className="pg-rate">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n} type="button" className="num" aria-pressed={v === n} data-fill={v !== undefined && n < v}
                  aria-label={`${AREA_LABEL[a]} ${n} of 10`} onClick={() => rate(a, n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div className="card-hi pg-focus">
        <span className="label">Next week's focus</span>
        <h3>{lowest ? AREA_LABEL[lowest] : `Rate all 10 areas (${rated}/10)`}</h3>
        <label className="field">
          <span>One thing you will fix</span>
          <input
            className="input" value={fixOne} maxLength={120} onChange={(e) => setFixOne(e.target.value)}
            placeholder={lowest ? `e.g. ${lowest === 'posture' ? 'Wall hold every morning' : 'One small daily action'}` : 'One small daily action'}
          />
        </label>
      </div>

      <div className="pg-sticky">
        <button type="button" className="btn btn-primary btn-block" style={{ minHeight: 52 }} disabled={!complete} onClick={save}>
          {complete ? (existing ? 'Update Sunday check' : 'Save Sunday check') : `${10 - rated} left to rate`}
        </button>
      </div>
    </div>
  );
}
