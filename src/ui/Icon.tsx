// Line icons (24×24, stroke = currentColor). Add new names to PATHS; unknown names fall back to 'dot'.
const PATHS: Record<string, string> = {
  dot: '<circle cx="12" cy="12" r="4"/>',
  today: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plan: '<path d="M4 5h16M4 12h16M4 19h10"/>',
  habits: '<path d="M4 12l5 5L20 6"/>',
  money: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
  progress: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1.5 1 2.5 2 3 4 .5-3 0-5 0-7z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".5"/>',
  note: '<path d="M5 4h14v16H5zM8 9h8M8 13h8M8 17h5"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9a4 4 0 0 1 6 0l-3 3"/>',
  ruler: '<path d="M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  repeat: '<path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/>',
  wallet: '<path d="M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1zM4 7l12-3v3M16 13h2"/>',
  goal: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  // habit icons
  dumbbell: '<path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12"/>',
  walk: '<circle cx="13" cy="4.5" r="1.5"/><path d="M10 21l2-6 3 3v3M9 12l2-4 4 1 2 3M11 8l-2 4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
  posture: '<circle cx="12" cy="4" r="2"/><path d="M12 6v9M8 9h8M10 21l2-6 2 6"/>',
  protein: '<path d="M7 4c-2 3-2 6 0 9l5 7 5-7c2-3 2-6 0-9z"/><path d="M9 9h6"/>',
  steps: '<path d="M7 4c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM17 10c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5z"/>',
  water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  sleep: '<path d="M4 18h16M4 18V8M4 14h16v4M8 11h4"/>',
  leaf: '<path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15zM5 19l7-7"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  // money category icons
  food: '<path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10M16 3c-2 0-3 3-3 6s1 4 3 4v8"/>',
  transport: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M4 11h16M7 19v-3M17 19v-3"/>',
  bills: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
  shopping: '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
  fun: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  health: '<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
  grooming: '<path d="M6 3v18M6 7h4M6 11h4M6 15h4M14 3h4v8l-2 2-2-2z"/>',
  wardrobe: '<path d="M8 3l4 3 4-3 4 4-3 3v11H7V10L4 7z"/>',
  portfolio: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/>',
  other: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
  salary: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  freelance: '<path d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3"/>',
  gig: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
};

export const ICON_NAMES = Object.keys(PATHS);

/** Default 20 px; CSS width/height on a parent rule (e.g. `.nav svg`) still wins over the attribute. */
export function Icon({ name, size = 20, label }: { name: string; size?: number; label?: string }) {
  const d = PATHS[name] ?? PATHS.dot;
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label}
      aria-hidden={label ? undefined : true} dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}
