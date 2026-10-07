// Small extension points so feature areas plug in without editing shared files.
import type { ReactNode } from 'react';
import type { State } from './store';

/** Seeders run once after storage has loaded (e.g. create default categories when none exist). Must be idempotent. */
const seeders: Array<(s: State) => void> = [];
export function registerSeeder(fn: (s: State) => void) {
  seeders.push(fn);
}
export function runSeeders(s: State) {
  for (const fn of seeders) fn(s);
}

/** Entries in the (+) quick-add sheet. `render` draws the form inside the sheet; call close() when saved. */
export interface QuickAddItem {
  id: string;
  label: string;
  icon: string;
  order: number;
  render: (close: () => void) => ReactNode;
}
const quick: QuickAddItem[] = [];
export function registerQuickAdd(item: QuickAddItem) {
  if (!quick.some((q) => q.id === item.id)) quick.push(item);
}
export function quickAddItems(): QuickAddItem[] {
  return [...quick].sort((a, b) => a.order - b.order);
}
