// Guided routine (blueprint 2.2 d): step-by-step with a countdown per step. Finishing ticks its habit for today.
import { useState } from 'react';
import type { ScreenProps } from '../../app/screens';
import { ROUTINES, routineSeconds, type RoutineKey } from '../../data/routines';
import { dayInfo } from '../../engines/schedule';
import { todayISO } from '../../lib/date';
import { useStore } from '../../store/store';
import { Icon } from '../../ui/Icon';
import { Empty, ScreenHeader } from '../../ui/kit';
import { Stepper, minutesLabel } from './Stepper';

export function RoutineScreen({ params }: ScreenProps) {
  const routine = ROUTINES[params.routine as RoutineKey];
  const today = todayISO();
  const profile = useStore((s) => s.data.profile.me);
  const habitDone = useStore((s) => (routine?.habit ? s.data.days[today]?.habits[routine.habit] === true : false));
  const habitName = useStore((s) => (routine?.habit ? s.data.habits[routine.habit]?.name : undefined));
  const navigate = useStore((s) => s.navigate);
  const [done, setDone] = useState(false);
  const [unlockAnyway, setUnlockAnyway] = useState(false);

  if (!routine) {
    return (
      <>
        <ScreenHeader title="Routine" back />
        <Empty icon="list" title="Routine not found">
          Pick a routine from the Week view.
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={() => navigate('plan')}>Open Plan</button>
          </div>
        </Empty>
      </>
    );
  }

  const month = dayInfo(profile, today).month;
  const locked = routine.unlockMonth !== undefined && month < routine.unlockMonth && !unlockAnyway;

  const finish = () => {
    setDone(true);
    const st = useStore.getState();
    if (routine.habit) {
      st.setHabit(today, routine.habit, true);
      st.showToast(`${routine.name} done. ${habitName ?? 'Habit'} ticked.`, { undo: true });
    } else {
      st.showToast(`${routine.name} done.`);
    }
  };

  return (
    <div className="pl-screen">
      <ScreenHeader title={routine.name} back />
      <div className="pl-routine-hero card-hi">
        <span className="pl-icon-tile" aria-hidden="true"><Icon name={routine.icon} /></span>
        <div className="grow">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="pill pill-mute num">{minutesLabel(routineSeconds(routine))}</span>
            <span className="pill pill-mute">{routine.steps.length} steps</span>
            {routine.habit && (habitDone ? <span className="pill pill-ok">Done today</span> : <span className="pill pill-warn">Ticks {habitName ?? 'habit'}</span>)}
          </div>
          <p className="small" style={{ margin: '8px 0 0' }}>{routine.intro}</p>
        </div>
      </div>

      {locked ? (
        <div className="card pl-locked">
          <Icon name="lock" />
          <div className="grow">
            <strong>Unlocks in Month {routine.unlockMonth}</strong>
            <p className="small muted" style={{ margin: '4px 0 0' }}>
              You are in Month {month}. Keep building the basics first: each month adds one new thing.
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setUnlockAnyway(true)}>Try it now</button>
        </div>
      ) : (
        <div className="section">
          <Stepper steps={routine.steps} onFinish={finish} startLabel={`Start ${routine.name.toLowerCase()}`} />
        </div>
      )}

      {done && (
        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={() => useStore.getState().back()}>
          Done
        </button>
      )}

      <div className="section">
        <div className="section-head"><span className="label">All steps</span></div>
        <ol className="list pl-step-list">
          {routine.steps.map((s, i) => (
            <li key={i} className="list-item">
              <span className="pl-step-n num" aria-hidden="true">{i + 1}</span>
              <div className="grow">
                <strong className="small">{s.name}</strong>
                <div className="small muted">{s.cue}</div>
              </div>
              <span className="small muted num">{minutesLabel(s.sec)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
