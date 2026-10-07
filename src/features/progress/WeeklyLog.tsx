// Weekly log (blueprint 2.5): filled in automatically from daily data, newest week first.
import { useMemo } from 'react';
import { useStore } from '../../store/store';
import { Empty, ScreenHeader } from '../../ui/kit';
import { addDays, fmtShort, todayISO } from '../../lib/date';
import { num } from '../../lib/format';
import { AREA_LABEL, weekLog, weekStarts, type WeekLog } from './logic';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pg-stat">
      <span>{label}</span>
      <b className="num">{value}</b>
    </div>
  );
}

function WeekCard({ w, current }: { w: WeekLog; current: boolean }) {
  return (
    <article className="card pg-week">
      <div className="pg-week-head">
        <strong>Week {w.weekNo}</strong>
        <span className="small muted">
          {fmtShort(w.weekStart)} – {fmtShort(addDays(w.weekStart, 6))}
          {current && <span className="pill pill-warn" style={{ marginLeft: 6 }}>Now</span>}
        </span>
      </div>
      <div className="pg-week-grid">
        <Stat label="Weight" value={w.weight !== undefined ? `${num(w.weight, 1)} kg` : '–'} />
        <Stat label="Waist" value={w.waist !== undefined ? `${num(w.waist, 1)} cm` : '–'} />
        <Stat label="Gym" value={`${w.gym}/4`} />
        <Stat label="Sleep" value={w.sleepAvg !== undefined ? `${num(w.sleepAvg, 1)} h` : '–'} />
        <Stat label="Protein" value={`${w.proteinDays}/7`} />
        <Stat label="Cardio" value={w.cardio ? `${w.cardio}×` : '–'} />
        <Stat label="Walk" value={`${w.walks}×`} />
        <Stat label="Lowest" value={w.lowest ? `${AREA_LABEL[w.lowest]} ${w.lowestScore}` : '–'} />
      </div>
      {w.notes && <p className="pg-note"><span className="muted">Fix: </span>{w.notes}</p>}
    </article>
  );
}

export function WeeklyLogScreen() {
  const data = useStore((s) => s.data);
  const today = todayISO();
  const weeks = useMemo(() => weekStarts(data, today).map((ws) => weekLog(data, ws, today)), [data, today]);
  return (
    <div className="pg-screen">
      <ScreenHeader title="Weekly log" back />
      <p className="pg-sub">Filled in from your days, workouts and Sunday checks</p>
      {weeks.length === 0 ? (
        <Empty icon="list" title="No weeks yet">Your first week appears here once your plan starts.</Empty>
      ) : (
        weeks.map((w, i) => <WeekCard key={w.weekStart} w={w} current={i === 0} />)
      )}
    </div>
  );
}
