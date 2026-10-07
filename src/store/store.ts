// The one app store (blueprint 4.2). The only place where state changes.
import { create } from 'zustand';
import type { ReactNode } from 'react';
import type { CollectionName, Collections, Data, Day } from '../types';
import { storage, emptyData } from './storage';
import { todayISO } from '../lib/date';

export type Tab = 'today' | 'plan' | 'habits' | 'money' | 'progress';
/** `screen` is a sub-screen inside a tab (e.g. 'workout', 'routine', 'settings'); params are strings. */
export interface Route { tab: Tab; screen?: string; params?: Record<string, string> }
export interface Toast { id: number; msg: string; undo?: boolean }
export interface Sheet { title: string; render: () => ReactNode }

type Input<K extends CollectionName> = Omit<Collections[K], 'updatedAt'> & { updatedAt?: number };
interface UndoEntry { col: CollectionName; id: string; prev: Collections[CollectionName] | undefined }

export interface State {
  ready: boolean;
  data: Data;
  route: Route;
  history: Route[];
  toast: Toast | null;
  sheet: Sheet | null;
  undoStack: UndoEntry[];

  /** Create or replace a whole record. */
  put<K extends CollectionName>(col: K, rec: Input<K>, opts?: { silent?: boolean }): void;
  /** Merge fields into an existing record (no-op if missing). */
  patch<K extends CollectionName>(col: K, id: string, patch: Partial<Collections[K]>, opts?: { silent?: boolean }): void;
  /** Soft-delete (tombstone, syncs across devices). */
  remove(col: CollectionName, id: string): void;

  /** Day helpers: the record is created on first write. */
  patchDay(date: string, patch: Partial<Omit<Day, 'id' | 'date' | 'habits'>>): void;
  setHabit(date: string, habitId: string, value: boolean | number): void;
  bumpHabit(date: string, habitId: string, delta: number): void;

  undo(): void;
  navigate(tab: Tab, screen?: string, params?: Record<string, string>): void;
  back(): void;
  showToast(msg: string, opts?: { undo?: boolean }): void;
  hideToast(): void;
  openSheet(title: string, render: () => ReactNode): void;
  closeSheet(): void;
  /** Replace everything (backup import / reset). Writes every record through storage. */
  replaceAll(data: Data): void;
}

let toastSeq = 0;

export const useStore = create<State>()((set, get) => {
  function write<K extends CollectionName>(col: K, rec: Collections[K], silent?: boolean) {
    const prev = get().data[col][rec.id] as Collections[K] | undefined;
    set((s) => ({
      data: { ...s.data, [col]: { ...s.data[col], [rec.id]: rec } },
      undoStack: silent ? s.undoStack : [...s.undoStack.slice(-19), { col, id: rec.id, prev }],
    }));
    storage.save(col, rec as never);
  }

  return {
    ready: false,
    data: emptyData(),
    route: { tab: 'today' },
    history: [],
    toast: null,
    sheet: null,
    undoStack: [],

    put(col, rec, opts) {
      write(col, { ...rec, updatedAt: Date.now() } as Collections[typeof col], opts?.silent);
    },
    patch(col, id, patch, opts) {
      const cur = get().data[col][id];
      if (!cur) return;
      write(col, { ...cur, ...patch, updatedAt: Date.now() } as Collections[typeof col], opts?.silent);
    },
    remove(col, id) {
      const cur = get().data[col][id];
      if (!cur) return;
      const tomb = { ...cur, deleted: true, updatedAt: Date.now() };
      set((s) => {
        const next = { ...s.data[col] };
        delete next[id];
        return { data: { ...s.data, [col]: next }, undoStack: [...s.undoStack.slice(-19), { col, id, prev: cur }] };
      });
      storage.save(col, tomb as never);
    },

    patchDay(date, patch) {
      const cur = get().data.days[date] ?? { id: date, date, habits: {}, updatedAt: 0 };
      write('days', { ...cur, ...patch, updatedAt: Date.now() });
    },
    setHabit(date, habitId, value) {
      const cur = get().data.days[date] ?? { id: date, date, habits: {}, updatedAt: 0 };
      write('days', { ...cur, habits: { ...cur.habits, [habitId]: value }, updatedAt: Date.now() });
    },
    bumpHabit(date, habitId, delta) {
      const cur = get().data.days[date];
      const v = Number(cur?.habits[habitId] ?? 0);
      get().setHabit(date, habitId, Math.max(0, Math.round((v + delta) * 100) / 100));
    },

    undo() {
      const stack = get().undoStack;
      const last = stack[stack.length - 1];
      if (!last) return;
      set({ undoStack: stack.slice(0, -1) });
      if (last.prev) {
        const rec = { ...last.prev, deleted: undefined, updatedAt: Date.now() };
        set((s) => ({ data: { ...s.data, [last.col]: { ...s.data[last.col], [last.id]: rec } } }));
        storage.save(last.col, rec as never);
      } else {
        const cur = get().data[last.col][last.id];
        if (!cur) return;
        set((s) => {
          const next = { ...s.data[last.col] };
          delete next[last.id];
          return { data: { ...s.data, [last.col]: next } };
        });
        storage.save(last.col, { ...cur, deleted: true, updatedAt: Date.now() } as never);
      }
      set({ toast: null });
    },

    navigate(tab, screen, params) {
      set((s) => ({ history: [...s.history.slice(-30), s.route], route: { tab, screen, params } }));
      window.scrollTo({ top: 0 });
    },
    back() {
      const h = get().history;
      const prev = h[h.length - 1];
      set({ route: prev ?? { tab: get().route.tab }, history: h.slice(0, -1) });
    },
    showToast(msg, opts) {
      const id = ++toastSeq;
      set({ toast: { id, msg, undo: opts?.undo } });
      setTimeout(() => {
        if (get().toast?.id === id) set({ toast: null });
      }, 4000);
    },
    hideToast() {
      set({ toast: null });
    },
    openSheet(title, render) {
      set({ sheet: { title, render } });
    },
    closeSheet() {
      set({ sheet: null });
    },
    replaceAll(data) {
      const old = get().data;
      set({ data, undoStack: [] });
      const now = Date.now();
      for (const col of Object.keys(data) as CollectionName[]) {
        // Records missing from the new data are deleted everywhere (tombstones), so they do not come back on reload.
        for (const rec of Object.values(old[col])) {
          if (!data[col][rec.id]) storage.save(col, { ...rec, deleted: true, updatedAt: now } as never);
        }
        for (const rec of Object.values(data[col])) storage.save(col, rec as never);
      }
    },
  };
});

/** Load storage once at startup, then merge remote records as they arrive (newer `updatedAt` wins). */
export async function bootStore(seed: (s: State) => void) {
  const data = await storage.load((col, rec) => {
    const cur = useStore.getState().data[col][rec.id];
    if (cur && cur.updatedAt >= rec.updatedAt) return;
    if (!cur && rec.deleted) return;
    useStore.setState((s) => {
      const next = { ...s.data[col] } as Record<string, unknown>;
      if (rec.deleted) delete next[rec.id];
      else next[rec.id] = rec;
      return { data: { ...s.data, [col]: next } } as Partial<State>;
    });
    void storage.cacheOnly(col, rec);
  });
  useStore.setState({ data, ready: true });
  seed(useStore.getState());
}

// ---------- Selectors ----------
export function list<K extends CollectionName>(data: Data, col: K): Collections[K][] {
  return Object.values(data[col]) as Collections[K][];
}
export function useToday(): string {
  return todayISO();
}
