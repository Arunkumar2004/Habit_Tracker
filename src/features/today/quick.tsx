// Quick add entries (the (+) button): water, protein, note.
import { useState } from 'react';
import { useStore } from '../../store/store';
import { registerQuickAdd } from '../../store/registry';
import { haptic } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { todayISO } from '../../lib/date';
import { habitTarget } from '../../engines/schedule';
import { fmtPair, fmtValue, valueOf } from './shared';

function QuickCounter({ habitId, amounts, close }: { habitId: string; amounts: number[]; close: () => void }) {
  const data = useStore((s) => s.data);
  const habit = data.habits[habitId];
  const today = todayISO();
  if (!habit) return <p className="muted small">This habit is archived or missing. Restore it in Habits.</p>;
  const v = valueOf(data, habit, today);
  const target = habitTarget(habit, data);
  return (
    <div className="stack">
      <p className="muted small td-sheet-note num">Today: {fmtPair(habit, v, target)}</p>
      <div className={`grid-${amounts.length === 2 ? 2 : 3}`}>
        {amounts.map((a) => (
          <button
            key={a} type="button" className="btn btn-primary td-quick-btn num"
            onClick={() => {
              const s = useStore.getState();
              s.bumpHabit(today, habit.id, a);
              haptic(12);
              s.showToast(`${habit.name} +${fmtValue(habit, a)}`, { undo: true });
              close();
            }}
          >
            <Icon name="plus" /> {fmtValue(habit, a)}
          </button>
        ))}
      </div>
    </div>
  );
}

function NoteForm({ close }: { close: () => void }) {
  const today = todayISO();
  const cur = useStore((s) => s.data.days[today]?.note ?? '');
  const [text, setText] = useState(cur);
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        const s = useStore.getState();
        s.patchDay(today, { note: text.trim() || undefined });
        haptic(10);
        s.showToast(text.trim() ? 'Note saved' : 'Note cleared', { undo: true });
        close();
      }}
    >
      <textarea
        className="input td-note-input" rows={4} autoFocus value={text} maxLength={500}
        onChange={(e) => setText(e.target.value)} placeholder="Lateral raise felt strong" aria-label="Note for today"
      />
      <button type="submit" className="btn btn-primary btn-block" disabled={text.trim() === cur.trim()}>
        <Icon name="check" /> Save note
      </button>
    </form>
  );
}

export function openNoteSheet() {
  const { openSheet, closeSheet } = useStore.getState();
  openSheet('Note for today', () => <NoteForm close={closeSheet} />);
}

registerQuickAdd({ id: 'water', label: 'Water', icon: 'water', order: 20, render: (close) => <QuickCounter habitId="water" amounts={[250, 500]} close={close} /> });
registerQuickAdd({ id: 'protein', label: 'Protein', icon: 'protein', order: 21, render: (close) => <QuickCounter habitId="protein" amounts={[10, 20, 30]} close={close} /> });
registerQuickAdd({ id: 'note', label: 'Note', icon: 'note', order: 40, render: (close) => <NoteForm close={close} /> });
