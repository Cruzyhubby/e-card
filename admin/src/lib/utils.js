export const cn = (...classes) => classes.filter(Boolean).join(' ');

export const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value) || 0);

export const percent = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);

export const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export const todayISO = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

export const formatDate = (value, options = {}) => {
  const date = parseDateOnly(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: options.weekday ?? 'short',
    day: 'numeric',
    month: 'short',
    year: options.year ?? 'numeric',
  }).format(date);
};

export const formatDateShort = (value) => {
  const date = parseDateOnly(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date);
};

export const formatTime = (value) => {
  if (!value) return '—';
  const [hour, minute] = String(value).split(':').map(Number);
  if (Number.isNaN(hour)) return value;
  const date = new Date();
  date.setHours(hour, minute || 0, 0, 0);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

export const timeAgo = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) return '—';
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return 'yesterday';
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDateTime(value);
};

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'G';

const AVATAR_PALETTES = [
  'from-violet-500/80 to-indigo-600/80',
  'from-rose-500/80 to-fuchsia-600/80',
  'from-amber-400/80 to-orange-600/80',
  'from-emerald-400/80 to-teal-600/80',
  'from-sky-400/80 to-blue-600/80',
  'from-purple-400/80 to-rose-500/80',
];

export const avatarGradient = (name = '') => {
  const hash = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
};

export const fillTemplate = (template, guest, event, extra = {}) => {
  const table = guest?.table_number ?? extra.table_number ?? '—';
  const token = guest?.qr_token ?? '';
  const link = guest?.invitation_url || `${window.location.origin}/#/i/${token}`;
  return String(template || '')
    .replaceAll('{guest_name}', guest?.name ?? 'Guest')
    .replaceAll('{table_number}', String(table))
    .replaceAll('{event_title}', event?.title ?? 'our event')
    .replaceAll('{qr_link}', guest ? link : `${window.location.origin}/#/i/{token}`);
};

export const downloadFile = (filename, content, type = 'text/plain') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadBlob = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const auditTone = (action = '') => {
  const value = String(action);
  if (/(failed|denied|suspended|revoked|deleted)/.test(value)) return 'rose';
  if (/(created|issued|activated|login$)/.test(value)) return 'emerald';
  if (/(updated|rotated)/.test(value)) return 'amber';
  if (/login_failed/.test(value)) return 'rose';
  if (/login/.test(value)) return 'sky';
  return 'violet';
};

export const toTitleCase = (value = '') =>
  value.replace(/\b\w/g, (char) => char.toUpperCase()).replaceAll('-', ' ');

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const uid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const hexToHsl = (hex) => {
  const clean = String(hex || '#000000').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean.padEnd(6, '0').slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / delta + 2) * 60;
    else h = ((r - g) / delta + 4) * 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
};

export const hslToHex = (h, s, l) => {
  const saturation = Math.min(Math.max(s, 0), 100) / 100;
  const lightness = Math.min(Math.max(l, 0), 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hue = ((h % 360) + 360) % 360 / 60;
  const second = chroma * (1 - Math.abs((hue % 2) - 1));
  let rgb = [0, 0, 0];
  if (hue >= 0 && hue < 1) rgb = [chroma, second, 0];
  else if (hue >= 1 && hue < 2) rgb = [second, chroma, 0];
  else if (hue >= 2 && hue < 3) rgb = [0, chroma, second];
  else if (hue >= 3 && hue < 4) rgb = [0, second, chroma];
  else if (hue >= 4 && hue < 5) rgb = [second, 0, chroma];
  else rgb = [chroma, 0, second];
  const m = lightness - chroma / 2;
  return `#${rgb
    .map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
};

export const fakeQrMatrix = (seed = '', size = 25) => {
  let hash = 2166136261;
  const input = seed || 'eclat';
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const matrix = [];
  for (let row = 0; row < size; row += 1) {
    matrix[row] = [];
    for (let col = 0; col < size; col += 1) {
      hash ^= hash << 13;
      hash ^= hash >>> 17;
      hash ^= hash << 5;
      matrix[row][col] = (Math.abs(hash) % 100) < 47;
    }
  }

  const drawFinder = (startRow, startCol) => {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        if (matrix[startRow + row] === undefined || matrix[startRow + row][startCol + col] === undefined) continue;
        const border = row === 0 || row === 6 || col === 0 || col === 6;
        const center = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        matrix[startRow + row][startCol + col] = border || center;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  return matrix;
};
