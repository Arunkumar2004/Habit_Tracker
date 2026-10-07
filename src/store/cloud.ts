// Cloud sync with Supabase (supabase/schema.sql), signed in with email + password. Offline first: every change is saved on the phone at once
// (IndexedDB) and copied to the user's own rows in Supabase when online. Row Level Security keeps each
// user's data separate.
//
// Rules:
//  - Newest `updatedAt` wins, on the device and in the database (a trigger rejects older writes).
//  - First sync of a device into an account: the account wins; local records the account does not have are added.
//  - A phone holds one user's data at a time: signing out clears it from the phone (after a final push), and a
//    different user signing in starts from their own account.
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { COLLECTIONS, type Base, type CollectionName } from '../types';
import { setSyncTarget, storage, type RemoteListener } from './storage';
import { useStore, wipeLocal } from './store';

/** Resolves once the store has loaded this device's data (remote records must not land before that). */
function whenReady(): Promise<void> {
  if (useStore.getState().ready) return Promise.resolve();
  return new Promise((resolve) => {
    const off = useStore.subscribe((s) => {
      if (s.ready) {
        off();
        resolve();
      }
    });
  });
}

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Cloud sync exists only in the self-hosted app (not inside the claude.ai page, whose frame blocks it). */
export const cloudConfigured =
  !!URL && !!KEY && import.meta.env.MODE !== 'artifact' && typeof window !== 'undefined' && !window.claude;

type AnyRec = Base & Record<string, unknown>;
interface Row { col: string; id: string; rec: AnyRec; updated_at: number; deleted: boolean }

export type CloudStatus = 'off' | 'signed_out' | 'syncing' | 'synced' | 'offline' | 'error';
export interface CloudState {
  configured: boolean; status: CloudStatus; email: string | null; lastSyncAt: number | null; error: string | null;
  /** True after opening a password-reset link: the app asks for a new password. */
  recovery: boolean;
}

let state: CloudState = {
  configured: cloudConfigured, status: cloudConfigured ? 'signed_out' : 'off', email: null, lastSyncAt: null, error: null, recovery: false,
};
const listeners = new Set<(s: CloudState) => void>();
function set(patch: Partial<CloudState>) {
  state = { ...state, ...patch };
  listeners.forEach((f) => f(state));
}
export function cloudState(): CloudState {
  return state;
}
export function subscribeCloud(f: (s: CloudState) => void) {
  listeners.add(f);
  return () => void listeners.delete(f);
}

// ---------- small persisted markers (per device) ----------
const LS = {
  owner: 'runway-os:owner', // user id whose data is on this device
  dirty: 'runway-os:dirty', // record keys changed locally and not yet pushed
  pulled: (uid: string) => `runway-os:pulled:${uid}`, // highest updated_at pulled for this user
};
function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* private mode: sync still works for this visit */
  }
}

const dirty = new Set<string>(JSON.parse(lsGet(LS.dirty) ?? '[]') as string[]);
function saveDirty() {
  lsSet(LS.dirty, JSON.stringify([...dirty]));
}

// ---------- client ----------
let sb: SupabaseClient | null = null;
function client(): SupabaseClient | null {
  if (!cloudConfigured) return null;
  sb ??= createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return sb;
}

let session: Session | null = null;
let onRemote: RemoteListener | null = null;
let running: Promise<void> | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function errText(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

// ---------- pull / push ----------
async function pullSince(uid: string, since: number, force: boolean): Promise<Set<string>> {
  const seen = new Set<string>();
  const page = 500;
  let max = since;
  for (let from = 0; ; from += page) {
    const { data, error } = await client()!
      .from('records')
      .select('col,id,rec,updated_at,deleted')
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })
      .range(from, from + page - 1);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    for (const r of rows) {
      if (!COLLECTIONS.includes(r.col as CollectionName)) continue;
      seen.add(`${r.col}/${r.id}`);
      onRemote?.(r.col as CollectionName, { ...r.rec, id: r.id, updatedAt: r.updated_at, deleted: r.deleted || undefined }, force);
      if (r.updated_at > max) max = r.updated_at;
    }
    if (rows.length < page) break;
  }
  lsSet(LS.pulled(uid), String(max));
  return seen;
}

async function push(uid: string, keys: string[]) {
  const rows: (Row & { user_id: string })[] = [];
  for (const key of keys) {
    const i = key.indexOf('/');
    const col = key.slice(0, i) as CollectionName;
    const rec = await storage.get(col, key.slice(i + 1));
    if (!rec || !COLLECTIONS.includes(col)) continue;
    rows.push({ user_id: uid, col, id: rec.id, rec, updated_at: rec.updatedAt, deleted: !!rec.deleted });
  }
  // Send in chunks of about 1 MB (progress photos are large).
  let chunk: typeof rows = [];
  let size = 0;
  const send = async () => {
    if (!chunk.length) return;
    const { error } = await client()!.from('records').upsert(chunk, { onConflict: 'user_id,col,id' });
    if (error) throw error;
    for (const r of chunk) dirty.delete(`${r.col}/${r.id}`);
    saveDirty();
    chunk = [];
    size = 0;
  };
  for (const r of rows) {
    const n = JSON.stringify(r.rec).length;
    if (chunk.length && (size + n > 1_000_000 || chunk.length >= 200)) await send();
    chunk.push(r);
    size += n;
  }
  await send();
}

/** One full sync round: pull what changed, then push what changed here. */
async function syncOnce() {
  const uid = session?.user.id;
  if (!uid || !client()) return;
  if (isOffline()) return set({ status: 'offline' });
  await whenReady();
  set({ status: 'syncing', error: null });
  try {
    const owner = lsGet(LS.owner);
    if (owner && owner !== uid) {
      // Someone else's data is on this phone: start clean from this user's account.
      await wipeLocal();
      dirty.clear();
      saveDirty();
    }
    const pulledRaw = lsGet(LS.pulled(uid));
    if (!pulledRaw || owner !== uid) {
      // First sync of this device into the account: the account wins, local-only records are added.
      const seen = await pullSince(uid, 0, true);
      const local = (await storage.keys()).filter((k) => !seen.has(k));
      lsSet(LS.owner, uid);
      await push(uid, local);
    } else {
      await pullSince(uid, Number(pulledRaw) || 0, false);
      await push(uid, [...dirty]);
    }
    set({ status: 'synced', lastSyncAt: Date.now() });
  } catch (e) {
    set({ status: isOffline() ? 'offline' : 'error', error: errText(e) });
  }
}

/** Run a sync now (coalesces with one already running). */
export function syncNow(): Promise<void> {
  if (!running) running = syncOnce().finally(() => (running = null));
  return running;
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const uid = session?.user.id;
    if (!uid || lsGet(LS.owner) !== uid || isOffline()) return;
    void push(uid, [...dirty])
      .then(() => set({ status: 'synced', lastSyncAt: Date.now(), error: null }))
      .catch((e) => set({ status: isOffline() ? 'offline' : 'error', error: errText(e) }));
  }, 1500);
}

// ---------- sign in / out (email + password) ----------
function need(): SupabaseClient {
  const c = client();
  if (!c) throw new Error('Sync is not set up in this version of the app.');
  return c;
}

/** Create an account. Returns 'signed_in', or 'confirm' when Supabase first wants the email confirmed. */
export async function signUp(email: string, password: string): Promise<'signed_in' | 'confirm'> {
  const { data, error } = await need().auth.signUp({
    email: email.trim(), password, options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
  // An already-registered email comes back with no identities (Supabase hides whether it exists).
  if (data.user && data.user.identities?.length === 0) throw new Error('This email already has an account. Sign in instead.');
  return data.session ? 'signed_in' : 'confirm';
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await need().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/** Email a link that opens the app to set a new password. */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await need().auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
  if (error) throw error;
}

/** Set a new password (after opening the reset link). */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await need().auth.updateUser({ password });
  if (error) throw error;
  set({ recovery: false });
}

/** Push anything left, sign out, and clear this user's data from the phone. */
export async function signOut(): Promise<void> {
  const c = client();
  if (!c) return;
  const uid = session?.user.id;
  if (uid && dirty.size && !isOffline()) {
    try {
      await push(uid, [...dirty]);
    } catch {
      /* signing out anyway; unsynced changes stay only on this phone until cleared below */
    }
  }
  await c.auth.signOut();
  await wipeLocal();
  dirty.clear();
  saveDirty();
  lsSet(LS.owner, null);
}

// ---------- wiring ----------
if (cloudConfigured) {
  setSyncTarget({
    start(listener) {
      onRemote = listener;
      const c = client()!;
      c.auth.onAuthStateChange((event, s) => {
        session = s;
        if (!s) set({ email: null, status: 'signed_out' });
        else set({ email: s.user.email ?? null, status: state.status === 'signed_out' ? 'syncing' : state.status });
        if (event === 'PASSWORD_RECOVERY') set({ recovery: true });
        if (s && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) void syncNow();
      });
      const kick = () => {
        if (document.visibilityState === 'visible' && session) void syncNow();
      };
      document.addEventListener('visibilitychange', kick);
      window.addEventListener('online', kick);
      window.addEventListener('offline', () => session && set({ status: 'offline' }));
      setInterval(kick, 60_000);
    },
    changed(col, id) {
      dirty.add(`${col}/${id}`);
      saveDirty();
      if (session) schedulePush();
    },
  });
}
