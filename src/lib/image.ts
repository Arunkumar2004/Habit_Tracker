// Progress photo compression: resize to max 1080 px on the long edge, JPEG, step quality down until the
// data URL is at most 150 KB. The size-picking logic is pure (tested); compressImage() uses the canvas.

export const MAX_EDGE = 1080;
export const MAX_BYTES = 150 * 1024;
export const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45, 0.4];
const MIN_EDGE = 320;

/** Scale (w, h) so the long edge is at most `max`, keeping the aspect ratio. Never scales up. */
export function fitSize(w: number, h: number, max = MAX_EDGE): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: 0, height: 0 };
  const long = Math.max(w, h);
  if (long <= max) return { width: Math.round(w), height: Math.round(h) };
  const k = max / long;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

/**
 * Try each quality at the fitted size; if even the lowest is too big, shrink the size by 20% and try again.
 * `encode` returns a data URL. Returns the first data URL within `maxBytes`, or the smallest one tried.
 */
export function pickEncoding(
  w: number, h: number, encode: (width: number, height: number, quality: number) => string,
  opts: { maxEdge?: number; maxBytes?: number } = {},
): { dataUrl: string; width: number; height: number; quality: number } {
  const maxBytes = opts.maxBytes ?? MAX_BYTES;
  let { width, height } = fitSize(w, h, opts.maxEdge ?? MAX_EDGE);
  let best: { dataUrl: string; width: number; height: number; quality: number } | null = null;
  for (;;) {
    for (const quality of QUALITIES) {
      const dataUrl = encode(width, height, quality);
      if (!best || dataUrl.length < best.dataUrl.length) best = { dataUrl, width, height, quality };
      if (dataUrl.length <= maxBytes) return { dataUrl, width, height, quality };
    }
    if (Math.max(width, height) <= MIN_EDGE) return best!;
    ({ width, height } = fitSize(width, height, Math.round(Math.max(width, height) * 0.8)));
  }
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be read.'));
    };
    img.src = url;
  });
}

/** Resize and compress a picked photo into a JPEG data URL (≤ 150 KB). */
export async function compressImage(file: Blob): Promise<string> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This phone cannot resize images.');
  const { dataUrl } = pickEncoding(img.naturalWidth, img.naturalHeight, (width, height, quality) => {
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#ffffff'; // JPEG has no transparency; flatten onto white
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  });
  return dataUrl;
}
