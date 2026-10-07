// OWNER: Progress agent. Exports progressScreens ('default' + sub-screens) and settingsScreens ('settings').
// The first-run flow lives in features/entry.
import { useState } from 'react';
import './progress.css';
import type { Screens } from '../../app/screens';
import { useStore } from '../../store/store';
import { registerQuickAdd } from '../../store/registry';
import { haptic } from '../../ui/kit';
import { todayISO } from '../../lib/date';
import { ProgressHome } from './Overview';
import { SundayCheck } from './Sunday';
import { WeeklyLogScreen } from './WeeklyLog';
import { MeasureScreen } from './Measure';
import { PhotosScreen } from './Photos';
import { ModelCardScreen } from './ModelCard';
import { settingsScreens as settings } from './Settings';


export const progressScreens: Screens = {
  default: ProgressHome,
  sunday: SundayCheck,
  log: WeeklyLogScreen,
  measure: MeasureScreen,
  photos: PhotosScreen,
  card: ModelCardScreen,
};
export const settingsScreens: Screens = settings;

function WeightQuickAdd({ close }: { close: () => void }) {
  const today = todayISO();
  const cur = useStore((s) => s.data.days[today]?.weightKg ?? s.data.profile.me?.weightKg);
  const patchDay = useStore((s) => s.patchDay);
  const showToast = useStore((s) => s.showToast);
  const [v, setV] = useState(cur ? String(cur) : '');
  const n = Number(v.replace(',', '.'));
  const ok = Number.isFinite(n) && n >= 30 && n <= 250;
  const save = () => {
    if (!ok) return;
    patchDay(today, { weightKg: Math.round(n * 10) / 10 });
    haptic(15);
    showToast(`Weight ${Math.round(n * 10) / 10} kg saved`, { undo: true });
    close();
  };
  const step = (d: number) => setV(String(Math.round(((ok ? n : cur ?? 70) + d) * 10) / 10));
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="row">
        <button type="button" className="btn" aria-label="Minus 0.1 kg" onClick={() => step(-0.1)} style={{ minWidth: 56 }}>−</button>
        <div className="pg-unit grow">
          <input
            className="input pg-big num" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)}
            aria-label="Weight in kg" autoFocus style={{ textAlign: 'center' }}
          />
          <span>kg</span>
        </div>
        <button type="button" className="btn" aria-label="Plus 0.1 kg" onClick={() => step(0.1)} style={{ minWidth: 56 }}>+</button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Morning, after the toilet, before food. Saved on today's day.</p>
      <button type="submit" className="btn btn-primary btn-block" disabled={!ok}>Save weight</button>
    </form>
  );
}

registerQuickAdd({ id: 'weight', label: 'Weight', icon: 'scale', order: 50, render: (close) => <WeightQuickAdd close={close} /> });
