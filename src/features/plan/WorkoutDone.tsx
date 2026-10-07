// End-of-workout summary: time, sets, volume and any personal bests beaten.
import type { PbBeaten } from '../../engines/progression';
import { num } from '../../lib/format';
import { Icon } from '../../ui/Icon';

export function WorkoutDone({ label, minutes, sets, volume, beaten, onPlan, onToday }: {
  label: string; minutes: number; sets: number; volume: number; beaten: PbBeaten[];
  onPlan: () => void; onToday: () => void;
}) {
  return (
    <div className="pl-done">
      <div className="pl-done-hero">
        <span className="pl-done-badge big" aria-hidden="true"><Icon name="check" size={36} /></span>
        <span className="label">Workout saved</span>
        <h2>{label} done</h2>
        <p className="muted small">Gym is ticked for today. Rest, eat your protein, sleep well.</p>
      </div>
      <div className="grid-3">
        <div className="card pl-stat"><span className="num">{minutes}</span><small>minutes</small></div>
        <div className="card pl-stat"><span className="num">{sets}</span><small>sets</small></div>
        <div className="card pl-stat"><span className="num">{num(volume)}</span><small>kg moved</small></div>
      </div>
      {beaten.length > 0 && (
        <div className="section">
          <div className="section-head"><span className="label">New personal bests</span></div>
          <div className="list">
            {beaten.map((b) => (
              <div key={b.lift} className="list-item">
                <span className="pl-pb-star" aria-hidden="true"><Icon name="star" /></span>
                <strong className="grow">{b.label}</strong>
                <span className="num">
                  <strong>{num(b.kg, 2)} kg</strong>
                  {b.prev > 0 && <span className="muted small"> (was {num(b.prev, 2)})</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="stack" style={{ marginTop: 24 }}>
        <button type="button" className="btn btn-primary btn-block" onClick={onToday}>Back to Today</button>
        <button type="button" className="btn btn-block" onClick={onPlan}>See the week</button>
      </div>
    </div>
  );
}
