// Model card (blueprint 2.5): height, chest · waist, shoe, hair · eyes, name, latest photo. Save as a PNG.
import { useMemo, useState } from 'react';
import { useStore } from '../../store/store';
import { ScreenHeader, haptic } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { todayISO } from '../../lib/date';
import { num } from '../../lib/format';
import type { Data, Photo } from '../../types';
import { measurementsSorted } from './logic';
import { saveErrorText, useDownloads } from './Settings';

interface CardInfo { name: string; photo?: string; stats: { label: string; value: string }[] }

function cardInfo(data: Data): CardInfo {
  const p = data.profile.me;
  const ms = measurementsSorted(data);
  const lastOf = (k: 'chestCm' | 'waistCm') => [...ms].reverse().find((m) => m[k] !== undefined)?.[k];
  const chest = p?.chestCm ?? lastOf('chestCm');
  const waist = p?.waistCm ?? lastOf('waistCm');
  const photos = Object.values(data.photos).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.updatedAt - a.updatedAt));
  const pref: Photo['pose'][] = ['body_front', 'face_front'];
  const photo = pref.map((pose) => photos.find((x) => x.pose === pose)).find(Boolean) ?? photos[0];
  const cm = (n?: number) => (n ? `${num(n, 1)} cm` : '–');
  return {
    name: p?.name || 'Your name',
    photo: photo?.image,
    stats: [
      { label: 'Height', value: cm(p?.heightCm) },
      { label: 'Chest', value: cm(chest) },
      { label: 'Waist', value: cm(waist) },
      { label: 'Shoe', value: p?.shoeSize || '–' },
      { label: 'Hair', value: p?.hair || '–' },
      { label: 'Eyes', value: p?.eyes || '–' },
    ],
  };
}

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000';
}
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/** Draw the card at 1080×1350 and return a PNG blob. */
async function drawCard(info: CardInfo): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) throw new Error('no canvas');
  const ink = token('--ink');
  const bg = token('--bg');
  const accent = token('--accent');
  const accentInk = token('--accent-ink');
  const font = getComputedStyle(document.body).fontFamily || 'sans-serif';

  g.fillStyle = ink;
  g.fillRect(0, 0, W, H);
  if (info.photo) {
    try {
      const img = await loadImg(info.photo);
      const k = Math.max(W / img.width, H / img.height);
      const w = img.width * k;
      const h = img.height * k;
      g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      const grad = g.createLinearGradient(0, H * 0.35, 0, H * 0.8);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, ink);
      g.globalAlpha = 0.95;
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
      g.fillStyle = ink;
      g.fillRect(0, H * 0.8, W, H * 0.2);
    } catch {
      /* draw without the photo */
    }
  }
  // accent mark
  g.fillStyle = accent;
  g.beginPath();
  g.arc(60, 60, 220, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = accentInk;
  g.font = `700 30px ${font}`;
  g.textBaseline = 'top';
  g.fillText('R U N W A Y   O S', 64, 64);

  // name
  g.fillStyle = bg;
  let size = 112;
  const name = info.name.toUpperCase();
  g.font = `800 ${size}px ${font}`;
  while (g.measureText(name).width > W - 128 && size > 48) {
    size -= 4;
    g.font = `800 ${size}px ${font}`;
  }
  g.textBaseline = 'alphabetic';
  const top = H - 420;
  g.fillText(name, 64, top);
  g.fillStyle = accent;
  g.fillRect(64, top + 32, 120, 8);

  // stats 3 × 2
  const colW = (W - 128) / 3;
  info.stats.forEach((s, i) => {
    const x = 64 + (i % 3) * colW;
    const y = top + 130 + Math.floor(i / 3) * 130;
    g.globalAlpha = 0.65;
    g.fillStyle = bg;
    g.font = `600 26px ${font}`;
    g.fillText(s.label.toUpperCase().split('').join(' '), x, y);
    g.globalAlpha = 1;
    g.font = `700 46px ${font}`;
    let v = s.value;
    while (g.measureText(v).width > colW - 16 && v.length > 2) v = v.slice(0, -2) + '…';
    g.fillText(v, x, y + 58);
  });

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('no image'))), 'image/png'));
}

export function ModelCardScreen() {
  const data = useStore((s) => s.data);
  const navigate = useStore((s) => s.navigate);
  const showToast = useStore((s) => s.showToast);
  const dl = useDownloads();
  const info = useMemo(() => cardInfo(data), [data]);
  const [busy, setBusy] = useState(false);
  const missing = info.stats.filter((s) => s.value === '–').length;

  async function save() {
    if (!dl) return;
    setBusy(true);
    try {
      const blob = await drawCard(info);
      await dl.save({ filename: `model-card-${todayISO()}.png`, data: blob });
      haptic(20);
      showToast('Model card saved');
    } catch (e) {
      const msg = saveErrorText(e);
      if (msg) showToast(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pg-screen">
      <ScreenHeader title="Model card" back />
      <article className="pg-mc" aria-label={`Model card for ${info.name}`}>
        {info.photo ? <img className="pg-mc-photo" src={info.photo} alt="" /> : <div className="pg-mc-mark" />}
        {info.photo && <div className="pg-mc-shade" />}
        <div className="pg-mc-top">
          <span className="pg-mc-brand" style={info.photo ? { color: 'var(--bg)' } : undefined}>Runway OS</span>
        </div>
        <div className="pg-mc-body">
          <div className="pg-mc-name">{info.name}</div>
          <div className="pg-mc-line" />
          <div className="pg-mc-stats num">
            {info.stats.map((s) => (
              <div key={s.label}><span>{s.label}</span><b>{s.value}</b></div>
            ))}
          </div>
        </div>
      </article>

      {dl && (
        <button type="button" className="btn btn-primary btn-block" onClick={save} disabled={busy}>
          <Icon name="download" /> {busy ? 'Making image…' : 'Save image'}
        </button>
      )}
      {(missing > 0 || !info.photo) && (
        <div className="card stack">
          <span className="small muted">
            {missing > 0 ? `${missing} ${missing === 1 ? 'detail is' : 'details are'} missing. ` : ''}
            {!info.photo ? 'Add a body front photo to put it on the card.' : ''}
          </span>
          <div className="grid-2">
            <button type="button" className="btn" onClick={() => navigate('today', 'settings')}>Edit details</button>
            <button type="button" className="btn" onClick={() => navigate('progress', 'photos')}>Add photo</button>
          </div>
        </div>
      )}
    </div>
  );
}
