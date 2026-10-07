import { describe, expect, it } from 'vitest';
import { backupDueDays, backupFilename, countRecords, parseBackup, serialiseBackup, validateBackup, BACKUP_VERSION } from './backup';
import { emptyData } from '../store/storage';
import type { Data } from '../types';

function sample(): Data {
  const d = emptyData();
  d.profile.me = {
    id: 'me', updatedAt: 1, name: 'Arun', startDate: '2026-10-01', heightCm: 185, weightKg: 72, bodyType: 'average',
    diet: 'non_veg', currency: 'INR', theme: 'auto', monthlyBudget: 20000, onboarded: true, shoeSize: '10 UK',
  };
  d.days['2026-10-05'] = { id: '2026-10-05', date: '2026-10-05', updatedAt: 2, habits: { gym: true, water: 2500 }, weightKg: 72.4 };
  d.measurements.ms_1 = { id: 'ms_1', updatedAt: 3, date: '2026-10-01', waistCm: 82, bestBench: 50 };
  d.photos.ph_1 = { id: 'ph_1', updatedAt: 4, date: '2026-10-01', pose: 'body_front', image: 'data:image/jpeg;base64,AAAA' };
  d.reviews['2026-09-28'] = {
    id: '2026-09-28', updatedAt: 5, weekStart: '2026-09-28', weekNo: 1, lowest: 'posture', fixOne: 'Wall hold daily',
    scores: { physique: 5, posture: 3, skin: 6, hair_beard: 6, walk: 4, posing: 4, style: 5, sleep: 7, food: 6, confidence: 5 },
  };
  d.transactions.tx_1 = { id: 'tx_1', updatedAt: 6, type: 'expense', amount: 450, category: 'food', account: 'upi', date: '2026-10-05', career: false };
  return d;
}

describe('backup', () => {
  it('round-trips export → reset → import to exactly the same data', () => {
    const original = sample();
    const json = serialiseBackup(original, new Date('2026-10-07T10:00:00Z'));
    // reset: the app now holds nothing
    let app: Data = emptyData();
    expect(countRecords(app).profile).toBe(0);
    // import
    const res = parseBackup(json);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    app = res.data;
    expect(app).toEqual(original);
    expect(res.total).toBe(6);
    expect(res.counts.photos).toBe(1);
    expect(res.version).toBe(BACKUP_VERSION);
    expect(res.exportedAt).toBe('2026-10-07T10:00:00.000Z');
  });

  it('writes app, version and exportedAt, and drops tombstones', () => {
    const d = sample();
    d.goals.g1 = { id: 'g1', updatedAt: 9, name: 'Shoot', target: 15000, saved: 0, deleted: true };
    const file = JSON.parse(serialiseBackup(d, new Date('2026-10-07T00:00:00Z')));
    expect(file.app).toBe('runway-os');
    expect(file.version).toBe(1);
    expect(file.exportedAt).toBe('2026-10-07T00:00:00.000Z');
    expect(file.data.goals).toEqual({});
  });

  it('rejects files that are not a backup', () => {
    expect(parseBackup('not json').ok).toBe(false);
    expect(parseBackup('[]').ok).toBe(false);
    expect(validateBackup({ app: 'other', version: 1, data: {} }).ok).toBe(false);
    expect(validateBackup({ app: 'runway-os', data: {} }).ok).toBe(false);
    expect(validateBackup({ app: 'runway-os', version: 1 }).ok).toBe(false);
  });

  it('rejects a newer version', () => {
    const res = validateBackup({ app: 'runway-os', version: BACKUP_VERSION + 1, exportedAt: '', data: {} });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/newer/);
  });

  it('rejects damaged records', () => {
    expect(validateBackup({ app: 'runway-os', version: 1, data: { days: [] } }).ok).toBe(false);
    expect(validateBackup({ app: 'runway-os', version: 1, data: { days: { a: { id: 'b', updatedAt: 1 } } } }).ok).toBe(false);
    expect(validateBackup({ app: 'runway-os', version: 1, data: { days: { a: { id: 'a' } } } }).ok).toBe(false);
    expect(validateBackup({ app: 'runway-os', version: 1, data: { profile: { x: { id: 'x', updatedAt: 1 } } } }).ok).toBe(false);
  });

  it('fills missing collections and ignores unknown ones', () => {
    const res = validateBackup({ app: 'runway-os', version: 1, exportedAt: 'x', data: { extra: { a: 1 }, days: {} } });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual(emptyData());
      expect(res.total).toBe(0);
    }
  });

  it('names the file by local date', () => {
    expect(backupFilename(new Date(2026, 9, 7, 23, 30))).toBe('runway-os-backup-2026-10-07.json');
  });

  it('reminds monthly', () => {
    const now = new Date(2026, 9, 31, 12).getTime();
    const day = 86_400_000;
    expect(backupDueDays(now - 10 * day, '2026-01-01', now)).toBeNull();
    expect(backupDueDays(now - 30 * day, '2026-01-01', now)).toBe(30);
    expect(backupDueDays(undefined, '2026-10-28', now)).toBeNull();
    expect(backupDueDays(undefined, '2026-10-20', now)).toBe(11);
    expect(backupDueDays(undefined, undefined, now)).toBeNull();
  });
});
