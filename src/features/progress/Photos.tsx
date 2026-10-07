// Progress photos (blueprint 2.5): 7 standard poses, gallery by date, side-by-side compare with a slider.
import { useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from 'react';
import { useStore } from '../../store/store';
import { Empty, Field, ScreenHeader, Segmented, haptic } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import type { ScreenProps } from '../../app/screens';
import { compressImage } from '../../lib/image';
import { fmtLong, fmtShort, todayISO } from '../../lib/date';
import { uid } from '../../lib/format';
import type { Photo, PhotoPose } from '../../types';
import { POSES, POSE_LABEL } from './logic';

type View = 'poses' | 'gallery' | 'compare';

function usePhotos(): Photo[] {
  const photos = useStore((s) => s.data.photos);
  return useMemo(() => Object.values(photos).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.updatedAt - b.updatedAt)), [photos]);
}

function PosesView({ photos }: { photos: Photo[] }) {
  const put = useStore((s) => s.put);
  const showToast = useStore((s) => s.showToast);
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState<PhotoPose | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const poseRef = useRef<PhotoPose>('body_front');

  const latest = useMemo(() => {
    const m = {} as Partial<Record<PhotoPose, Photo>>;
    for (const p of photos) m[p.pose] = p;
    return m;
  }, [photos]);
  const onDate = useMemo(() => new Set(photos.filter((p) => p.date === date).map((p) => p.pose)), [photos, date]);

  function pick(pose: PhotoPose) {
    poseRef.current = pose;
    setError('');
    fileRef.current?.click();
  }
  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const pose = poseRef.current;
    setBusy(pose);
    try {
      const image = await compressImage(f);
      const same = photos.find((p) => p.date === date && p.pose === pose);
      put('photos', { id: same?.id ?? uid('ph'), date, pose, image });
      haptic(20);
      showToast(`${POSE_LABEL[pose]} photo saved`, { undo: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This photo could not be saved.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <Field label="Photo date">
        <input className="input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
      </Field>
      <p className="small muted" style={{ margin: 0 }}>
        {onDate.size}/7 poses on {fmtShort(date)}. Same light, same spot, same time of day each time.
      </p>
      {error && <p className="small" role="alert" style={{ margin: 0, color: 'var(--danger)' }}>{error}</p>}
      <input ref={fileRef} className="pg-file" type="file" accept="image/*" onChange={onFile} aria-label="Choose photo" tabIndex={-1} />
      <div className="pg-poses">
        {POSES.map(({ pose, label, hint }) => {
          const ph = latest[pose];
          const done = onDate.has(pose);
          return (
            <button key={pose} type="button" className="pg-pose" onClick={() => pick(pose)} aria-label={`Add ${label} photo`} disabled={busy !== null}>
              {ph ? (
                <img src={ph.image} alt="" />
              ) : (
                <span className="pg-pose-empty">
                  <Icon name="camera" />
                  <span className="small muted">{hint}</span>
                </span>
              )}
              <span className="pg-pose-label">
                <span>{busy === pose ? 'Saving…' : label}</span>
                {done ? <span style={{ color: 'var(--success)' }}><Icon name="check" size={16} /></span> : <Icon name="plus" size={16} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PhotoSheet({ photo, close }: { photo: Photo; close: () => void }) {
  const remove = useStore((s) => s.remove);
  const showToast = useStore((s) => s.showToast);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="stack">
      <img className="pg-full" src={photo.image} alt={`${POSE_LABEL[photo.pose]}, ${fmtLong(photo.date)}`} />
      <div className="pg-kv"><strong>{POSE_LABEL[photo.pose]}</strong><span className="small muted">{fmtLong(photo.date)}</span></div>
      {confirm ? (
        <div className="grid-2">
          <button type="button" className="btn" onClick={() => setConfirm(false)}>Keep</button>
          <button
            type="button" className="btn btn-danger"
            onClick={() => {
              remove('photos', photo.id);
              showToast('Photo deleted', { undo: true });
              close();
            }}
          >
            Delete photo
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-danger btn-block" onClick={() => setConfirm(true)}><Icon name="trash" /> Delete</button>
      )}
    </div>
  );
}

function GalleryView({ photos }: { photos: Photo[] }) {
  const openSheet = useStore((s) => s.openSheet);
  const closeSheet = useStore((s) => s.closeSheet);
  const byDate = useMemo(() => {
    const m = new Map<string, Photo[]>();
    for (const p of [...photos].reverse()) m.set(p.date, [...(m.get(p.date) ?? []), p]);
    for (const list of m.values()) list.sort((a, b) => POSES.findIndex((x) => x.pose === a.pose) - POSES.findIndex((x) => x.pose === b.pose));
    return [...m];
  }, [photos]);
  if (!photos.length) return <Empty icon="camera" title="No photos yet">Add the 7 standard poses under Poses. They appear here by date.</Empty>;
  return (
    <div className="stack">
      {byDate.map(([date, list]) => (
        <section key={date} className="stack" style={{ gap: 'var(--s2)' }}>
          <div className="pg-kv"><strong>{fmtLong(date)}</strong><span className="small muted">{list.length}/7</span></div>
          <div className="pg-gallery">
            {list.map((p) => (
              <button
                key={p.id} type="button" className="pg-thumb" aria-label={`${POSE_LABEL[p.pose]}, ${fmtShort(p.date)}`}
                onClick={() => openSheet(POSE_LABEL[p.pose], () => <PhotoSheet photo={p} close={closeSheet} />)}
              >
                <img src={p.image} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Slider({ before, after, labelA, labelB }: { before: string; after: string; labelA: string; labelB: string }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const setFrom = (e: PointerEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPos(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
  };
  return (
    <div className="stack" style={{ gap: 'var(--s2)' }}>
      <div
        ref={ref} className="pg-compare"
        onPointerDown={(e) => {
          drag.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setFrom(e);
        }}
        onPointerMove={(e) => drag.current && setFrom(e)}
        onPointerUp={() => (drag.current = false)}
        onPointerCancel={() => (drag.current = false)}
      >
        <img src={before} alt={`Before: ${labelA}`} />
        <img src={after} alt={`After: ${labelB}`} style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />
        <div className="pg-compare-handle" style={{ left: `${pos}%` }} />
        <span className="pg-compare-tag" style={{ left: 10 }}>{labelA}</span>
        <span className="pg-compare-tag" style={{ right: 10 }}>{labelB}</span>
      </div>
      <input
        className="pg-range" type="range" min={0} max={100} value={Math.round(pos)} onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare slider: left shows the earlier photo, right the later one"
      />
    </div>
  );
}

function CompareView({ photos }: { photos: Photo[] }) {
  const posesWithTwo = POSES.filter(({ pose }) => new Set(photos.filter((p) => p.pose === pose).map((p) => p.date)).size >= 2);
  const [pose, setPose] = useState<PhotoPose>(posesWithTwo[0]?.pose ?? 'body_front');
  const list = useMemo(() => {
    const m = new Map<string, Photo>();
    for (const p of photos) if (p.pose === pose) m.set(p.date, p); // latest per date
    return [...m.values()];
  }, [photos, pose]);
  const [a, setA] = useState<string>('');
  const [b, setB] = useState<string>('');
  const pa = list.find((p) => p.date === a) ?? list[0];
  const pb = list.find((p) => p.date === b) ?? list[list.length - 1];

  if (!posesWithTwo.length) {
    return <Empty icon="repeat" title="Nothing to compare yet">Take the same pose on two dates (for example Month 0 and Month 3) to compare them here.</Empty>;
  }
  return (
    <div className="stack">
      <div className="chips" role="group" aria-label="Pose">
        {posesWithTwo.map((p) => (
          <button key={p.pose} type="button" className="chip" aria-pressed={p.pose === pose} onClick={() => { setPose(p.pose); setA(''); setB(''); }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid-2">
        <Field label="Before">
          <select className="input" value={pa?.date ?? ''} onChange={(e) => setA(e.target.value)}>
            {list.map((p) => <option key={p.id} value={p.date}>{fmtShort(p.date)}</option>)}
          </select>
        </Field>
        <Field label="After">
          <select className="input" value={pb?.date ?? ''} onChange={(e) => setB(e.target.value)}>
            {list.map((p) => <option key={p.id} value={p.date}>{fmtShort(p.date)}</option>)}
          </select>
        </Field>
      </div>
      {pa && pb && <Slider before={pa.image} after={pb.image} labelA={fmtShort(pa.date)} labelB={fmtShort(pb.date)} />}
      <p className="small muted" style={{ margin: 0 }}>Drag across the photo. Look for wider shoulders and a waist the same or smaller.</p>
    </div>
  );
}

export function PhotosScreen({ params }: ScreenProps) {
  const photos = usePhotos();
  const [view, setView] = useState<View>((params.view as View) || 'poses');
  return (
    <div className="pg-screen">
      <ScreenHeader title="Photos" back />
      <Segmented<View>
        label="Photo view" value={view} onChange={setView}
        options={[{ value: 'poses', label: 'Poses' }, { value: 'gallery', label: 'Gallery' }, { value: 'compare', label: 'Compare' }]}
      />
      {view === 'poses' && <PosesView photos={photos} />}
      {view === 'gallery' && <GalleryView photos={photos} />}
      {view === 'compare' && <CompareView photos={photos} />}
    </div>
  );
}
