import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './app/App';
import { bootStore } from './store/store';
import { runSeeders } from './store/registry';
import { DEFAULT_HABITS } from './data/plan';

// Built-in habits are seeded once; feature areas register their own seeders (categories, accounts…).
void bootStore((s) => {
  for (const h of DEFAULT_HABITS) if (!s.data.habits[h.id]) s.put('habits', h, { silent: true });
  runSeeders(s);
});

createRoot(document.getElementById('root')!).render(<App />);

// Offline support for the self-hosted app only (the claude.ai page cannot run a service worker).
if (import.meta.env.PROD && import.meta.env.MODE !== 'artifact' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* the app still works online without it */
    });
  });
}
