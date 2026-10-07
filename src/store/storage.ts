// Storage adapter (blueprint 4.1). Screens never touch this directly; the store calls it.
//  - IndexedDB: on-device cache, loaded at boot, works offline.
//  - Online DB: the private claude.ai page's `db` capability, under data/users/<id>/ (private to the viewer).
//    Doc id = `${collection}:${recordId}`. Last writer wins by `updatedAt`. Deletes are tombstones.
//  - JSON backup: exportAll / importAll.
import { COLLECTIONS, type CollectionName, type Data, type Base } from '../types';

type AnyRec = Base & Record<string, unknown>;
export type RemoteListener = (col: CollectionName, rec: AnyRec) => void;

export function emptyData(): Data {
  const d = {} as Data;
  for (const c of COLLECTIONS) (d as Record<string, unknown>)[c] = {};
  return d;
}

// ---------- IndexedDB ----------
const DB_NAME = 'runway-os';
const STORE = 'records';
let idbP: Promise<IDBDatabase | null> | null = null;

function idb(): Promise<IDBDatabase | null> {
  if (idbP) return idbP;
  idbP = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return idbP;
}

async function idbLoadAll(): Promise<Data> {
  const data = emptyData();
  const db = await idb();
  if (!db) return data;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return resolve(data);
        const key = String(cur.key);
        const col = key.slice(0, key.indexOf('/')) as CollectionName;
        const rec = cur.value as AnyRec;
        if (col in data && !rec.deleted) (data[col] as unknown as Record<string, AnyRec>)[rec.id] = rec;
        cur.continue();
      };
      req.onerror = () => resolve(data);
    } catch {
      resolve(data);
    }
  });
}

async function idbPut(col: CollectionName, rec: AnyRec) {
  const db = await idb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(rec, `${col}/${rec.id}`);
  } catch {
    /* cache only; the online copy still saves */
  }
}

async function idbClear() {
  const db = await idb();
  if (!db) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
  } catch {
    /* ignore */
  }
}

// ---------- Online DB (claude.ai `db` capability) ----------
interface DocSnap { id: string; exists: boolean; data(): Record<string, unknown> | undefined }
interface QuerySnap { docs: DocSnap[] }
interface DocRef { set(d: Record<string, unknown>): Promise<void> }
interface CollRef {
  doc(id: string): DocRef;
  onSnapshot(next: (s: QuerySnap) => void, err?: (e: { code: string }) => void): () => void;
}
interface ClaudeDB { collection(path: string): CollRef }
interface ClaudeUser { id(): Promise<string | null> }
declare global {
  interface Window { claude?: { use(name: string): Promise<unknown> } }
}

let coll: CollRef | null = null;
let online: 'off' | 'connecting' | 'on' | 'error' = 'off';
const statusListeners = new Set<(s: typeof online) => void>();
function setOnline(s: typeof online) {
  online = s;
  statusListeners.forEach((f) => f(s));
}
export function onlineStatus() {
  return online;
}
export function subscribeStatus(f: (s: typeof online) => void) {
  statusListeners.add(f);
  return () => statusListeners.delete(f);
}

const pending = new Map<string, { col: CollectionName; rec: AnyRec }>();
const inFlight = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 300);
}

async function flush() {
  flushTimer = null;
  if (!coll) return;
  for (const [key, item] of [...pending]) {
    if (inFlight.has(key)) continue; // one write at a time per document
    pending.delete(key);
    inFlight.add(key);
    const docId = `${item.col}:${item.rec.id}`;
    const write = () => coll!.doc(docId).set({ col: item.col, rec: item.rec });
    write()
      .catch(async (e: { code?: string }) => {
        if (e?.code === 'unavailable') {
          await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
          return write();
        }
        throw e;
      })
      .catch(() => setOnline('error'))
      .finally(() => {
        inFlight.delete(key);
        if (pending.has(key)) scheduleFlush();
      });
  }
}

async function connectOnline(onRemote: RemoteListener) {
  const c = window.claude;
  if (!c?.use) return;
  setOnline('connecting');
  try {
    const [db, user] = (await Promise.all([c.use('db'), c.use('user')])) as [ClaudeDB | null, ClaudeUser | null];
    const uid = db && user ? await user.id() : null;
    if (!db || !uid) return setOnline('off');
    coll = db.collection(`data/users/${uid}`);
    coll.onSnapshot(
      (snap) => {
        setOnline('on');
        for (const d of snap.docs) {
          const body = d.data() as { col?: CollectionName; rec?: AnyRec } | undefined;
          if (body?.col && body.rec && COLLECTIONS.includes(body.col)) onRemote(body.col, body.rec);
        }
      },
      () => setOnline('error'),
    );
    scheduleFlush();
  } catch {
    setOnline('error');
  }
}

// ---------- Public adapter ----------
export const storage = {
  /** Load the on-device cache, then connect online; remote records arrive through onRemote. */
  async load(onRemote: RemoteListener): Promise<Data> {
    const data = await idbLoadAll();
    void connectOnline(onRemote);
    return data;
  },
  save(col: CollectionName, rec: AnyRec) {
    void idbPut(col, rec);
    pending.set(`${col}:${rec.id}`, { col, rec });
    if (coll) scheduleFlush();
  },
  async cacheOnly(col: CollectionName, rec: AnyRec) {
    await idbPut(col, rec);
  },
  async clearLocal() {
    await idbClear();
  },
};
