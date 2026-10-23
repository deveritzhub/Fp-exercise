import type { Locale } from '@shared/taxonomy';

const loc = (l: Locale) => (l === 'nl' ? 'nl-NL' : 'en-GB');

export const fmtDate = (d: string | Date | null | undefined, l: Locale, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Intl.DateTimeFormat(loc(l), opts).format(typeof d === 'string' && d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d)) : '—';

/** "23 okt. 14:05"; the year is added when it is not this year, so a date is never ambiguous. */
export const fmtDateTime = (d: string | Date | null | undefined, l: Locale) =>
  fmtDate(d, l, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...(d && new Date(d).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });

export function fmtRelative(d: string | Date | null | undefined, l: Locale) {
  if (!d) return l === 'nl' ? 'nog niet' : 'never';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(loc(l), { numeric: 'auto' });
  if (diff < 60) return rtf.format(0, 'minute');
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  if (diff < 86400 * 30) return rtf.format(-Math.round(diff / 86400), 'day');
  return fmtDate(d, l);
}

export const pct = (r: number | null | undefined) => (r === null || r === undefined ? '—' : `${Math.round(r * 100)}%`);

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const greeting = (l: Locale) => {
  const h = new Date().getHours();
  if (l === 'nl') return h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond';
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

/** Human prescription summary: "3 × 10", "3 × 30 s", with optional hold. */
export function dose(i: { sets?: number | null; reps?: number | null; holdS?: number | null }, l: Locale) {
  const parts: string[] = [];
  if (i.sets && i.reps) parts.push(`${i.sets} × ${i.reps}`);
  else if (i.sets && i.holdS) parts.push(`${i.sets} × ${i.holdS} s`);
  else if (i.reps) parts.push(`${i.reps} ${l === 'nl' ? 'herh.' : 'reps'}`);
  else if (i.sets) parts.push(`${i.sets} ${l === 'nl' ? 'sets' : 'sets'}`);
  if (i.reps && i.holdS) parts.push(`${l === 'nl' ? 'vasthouden' : 'hold'} ${i.holdS} s`);
  return parts.join(' · ');
}
