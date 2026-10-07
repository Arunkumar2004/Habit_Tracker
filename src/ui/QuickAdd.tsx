// Quick add (+): a small button in the top-right of each main tab that opens a sheet of quick entries
// (expense, income, water, protein, note, weight). Entries are registered by the feature areas.
import { useStore } from '../store/store';
import { quickAddItems } from '../store/registry';
import { Icon } from './Icon';

export function openQuickAdd() {
  const { openSheet, closeSheet } = useStore.getState();
  openSheet('Quick add', () => <QuickAddMenu close={closeSheet} />);
}

function QuickAddMenu({ close }: { close: () => void }) {
  const items = quickAddItems();
  const open = useStore((s) => s.openSheet);
  return (
    <div className="grid-3">
      {items.map((it) => (
        <button
          key={it.id} type="button" className="card" style={{ border: 0, display: 'grid', gap: 6, justifyItems: 'center', minHeight: 88 }}
          onClick={() => open(it.label, () => it.render(close))}
        >
          <span style={{ color: 'var(--accent)' }}><Icon name={it.icon} size={26} /></span>
          <span className="small" style={{ fontWeight: 600 }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

export function QuickAddButton() {
  return (
    <button type="button" className="qa-btn" aria-label="Quick add" onClick={openQuickAdd}>
      <Icon name="plus" />
    </button>
  );
}
