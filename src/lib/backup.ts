// JSON backup (blueprint 10): pure serialise / validate / parse. No storage or DOM access here.
import { COLLECTIONS, type CollectionName, type Data } from '../types';

export const BACKUP_APP = 'runway-os';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string; // ISO 8601
  data: Data;
}

export type Counts = Record<CollectionName, number>;
export type ParseResult =
  | { ok: true; data: Data; counts: Counts; total: number; exportedAt: string; version: number }
  | { ok: false; error: string };

function blankData(): Data {
  const d = {} as Data;
  for (const c of COLLECTIONS) (d as Record<string, unknown>)[c] = {};
  return d;
}

/** Live records only (tombstones are never exported). */
function liveCopy(data: Data): Data {
  const out = blankData();
  for (const c of COLLECTIONS) {
    const src = (data[c] ?? {}) as Record<string, { deleted?: boolean }>;
    const dst = out[c] as Record<string, unknown>;
    for (const [id, rec] of Object.entries(src)) if (rec && !rec.deleted) dst[id] = rec;
  }
  return out;
}

export function countRecords(data: Data): Counts {
  const counts = {} as Counts;
  for (const c of COLLECTIONS) counts[c] = Object.keys(data[c] ?? {}).length;
  return counts;
}

/** The whole backup file as a JSON string. */
export function serialiseBackup(data: Data, now: Date = new Date()): string {
  const file: BackupFile = { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data: liveCopy(data) };
  return JSON.stringify(file);
}

/** 'runway-os-backup-2026-10-07.json' (local date). */
export function backupFilename(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `runway-os-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Check the shape and version of a backup and return clean data. Unknown collections are ignored. */
export function validateBackup(raw: unknown): ParseResult {
  if (!isObj(raw)) return { ok: false, error: 'This file is not a Runway OS backup.' };
  if (raw.app !== BACKUP_APP) return { ok: false, error: 'This file is not a Runway OS backup.' };
  const version = raw.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'The backup has no valid version number.' };
  }
  if (version > BACKUP_VERSION) {
    return { ok: false, error: `This backup is from a newer app version (${version}). Update the app first.` };
  }
  if (!isObj(raw.data)) return { ok: false, error: 'The backup has no data.' };
  const exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : '';

  const data = blankData();
  for (const c of COLLECTIONS) {
    const col = raw.data[c];
    if (col === undefined) continue;
    if (!isObj(col)) return { ok: false, error: `The "${c}" list in the backup is damaged.` };
    const dst = data[c] as Record<string, unknown>;
    for (const [key, rec] of Object.entries(col)) {
      if (!isObj(rec) || typeof rec.id !== 'string' || rec.id !== key || typeof rec.updatedAt !== 'number') {
        return { ok: false, error: `A record in "${c}" is damaged (${key}).` };
      }
      if (rec.deleted) continue;
      dst[key] = rec;
    }
  }
  if (Object.keys(data.profile).length > 0 && !data.profile.me) {
    return { ok: false, error: 'The backup profile is damaged.' };
  }
  const counts = countRecords(data);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { ok: true, data, counts, total, exportedAt, version };
}

/** Parse a backup file's text. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  return validateBackup(raw);
}

/** Backup is due when there has never been one (after a week of use) or the last is 30+ days old. */
export function backupDueDays(lastBackupAt: number | undefined, startDate: string | undefined, now: number): number | null {
  const day = 86_400_000;
  if (lastBackupAt) {
    const age = Math.floor((now - lastBackupAt) / day);
    return age >= 30 ? age : null;
  }
  if (!startDate) return null;
  const [y, m, d] = startDate.split('-').map(Number);
  const used = Math.floor((now - new Date(y, m - 1, d).getTime()) / day);
  return used >= 7 ? used : null;
}
