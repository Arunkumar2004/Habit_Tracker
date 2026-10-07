// App shell: boot, theme, onboarding gate, tab routing, bottom nav, (+) quick add, sheet and toast hosts.
import { Fragment, useEffect, type ComponentType } from 'react';
import { useStore, type Tab } from '../store/store';
import { quickAddItems } from '../store/registry';
import { Icon } from '../ui/Icon';
import type { Screens, ScreenProps } from './screens';
import { todayScreens, habitsScreens } from '../features/today';
import { planScreens } from '../features/plan';
import { moneyScreens } from '../features/money';
import { progressScreens, settingsScreens, Onboarding } from '../features/progress';

const ROUTES: Record<Tab, Screens> = {
  today: { ...todayScreens, ...settingsScreens },
  plan: planScreens,
  habits: habitsScreens,
  money: moneyScreens,
  progress: progressScreens,
};
const TABS: { tab: Tab; label: string; icon: string }[] = [
  { tab: 'today', label: 'Today', icon: 'today' },
  { tab: 'plan', label: 'Plan', icon: 'plan' },
  { tab: 'habits', label: 'Habits', icon: 'habits' },
  { tab: 'money', label: 'Money', icon: 'money' },
  { tab: 'progress', label: 'Progress', icon: 'progress' },
];

function useTheme() {
  const theme = useStore((s) => s.data.profile.me?.theme ?? 'auto');
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);
}

function SheetHost() {
  const sheet = useStore((s) => s.sheet);
  const close = useStore((s) => s.closeSheet);
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, close]);
  if (!sheet) return null;
  return (
    <>
      <div className="sheet-backdrop" onClick={close} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={sheet.title}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{sheet.title}</h2>
          <button className="icon-btn" type="button" onClick={close} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {sheet.render()}
      </div>
    </>
  );
}

function ToastHost() {
  const toast = useStore((s) => s.toast);
  const undo = useStore((s) => s.undo);
  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id}>
      <span>{toast.msg}</span>
      {toast.undo && <button type="button" onClick={undo}>Undo</button>}
    </div>
  );
}

function openQuickAdd() {
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

export function App() {
  useTheme();
  const ready = useStore((s) => s.ready);
  const onboarded = useStore((s) => s.data.profile.me?.onboarded ?? false);
  const route = useStore((s) => s.route);
  const navigate = useStore((s) => s.navigate);

  if (!ready) return <div className="app" aria-busy="true" />;
  if (!onboarded) return <div className="app"><Onboarding /></div>;

  const screens = ROUTES[route.tab];
  const Screen: ComponentType<ScreenProps> = screens[route.screen ?? 'default'] ?? screens.default;
  return (
    <>
      <main className="app">
        <Screen params={route.params ?? {}} />
      </main>
      <nav className="nav" aria-label="Main">
        <div className="nav-inner">
          {TABS.map((t, i) => (
            <Fragment key={t.tab}>
              {i === 2 && (
                <div className="nav-fab">
                  <button className="fab" type="button" aria-label="Quick add" onClick={openQuickAdd}>
                    <Icon name="plus" />
                  </button>
                </div>
              )}
              <button
                type="button" aria-current={route.tab === t.tab && !route.screen ? 'page' : undefined}
                onClick={() => navigate(t.tab)}
                style={route.tab === t.tab ? { color: 'var(--accent)' } : undefined}
              >
                <Icon name={t.icon} />
                {t.label}
              </button>
            </Fragment>
          ))}
        </div>
      </nav>
      <SheetHost />
      <ToastHost />
    </>
  );
}
