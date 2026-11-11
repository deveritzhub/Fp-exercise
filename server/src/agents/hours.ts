/**
 * Practice hours for the phone assistant, e.g. PRACTICE_HOURS="ma-vr 08:00-18:00; za 09:00-12:00".
 * Days: ma di wo do vr za zo (ranges like ma-vr allowed). Times are local (practice time zone).
 */
const DAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

export interface HoursRule {
  days: number[]; // 0 = Sunday
  from: number; // minutes since midnight
  to: number;
}

const minutes = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`Invalid time "${hhmm}"`);
  const v = Number(m[1]) * 60 + Number(m[2]);
  if (Number(m[2]) > 59 || v > 24 * 60) throw new Error(`Invalid time "${hhmm}"`);
  return v;
};

function dayList(spec: string): number[] {
  const out = new Set<number>();
  for (const part of spec.split(',')) {
    const [a, b] = part.trim().toLowerCase().split('-');
    const start = DAYS.indexOf(a);
    const end = b === undefined ? start : DAYS.indexOf(b);
    if (start < 0 || end < 0) throw new Error(`Invalid day "${part.trim()}"`);
    // ma-vr walks forward through the week (wraps around for e.g. za-ma).
    for (let d = start; ; d = (d + 1) % 7) {
      out.add(d);
      if (d === end) break;
    }
  }
  return [...out];
}

export function parseHours(spec: string): HoursRule[] {
  return spec
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((rule) => {
      const m = /^(\S+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(rule);
      if (!m) throw new Error(`Invalid PRACTICE_HOURS rule "${rule}" (example: "ma-vr 08:00-18:00")`);
      return { days: dayList(m[1]), from: minutes(m[2]), to: minutes(m[3]) };
    });
}

/** Weekday (0 = Sunday) and minutes since midnight of `date` in `timeZone`. */
function localTime(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minute: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** null when no hours are configured (then the assistant behaves the same all day). */
export function isOpen(rules: HoursRule[], date: Date, timeZone: string): boolean | null {
  if (rules.length === 0) return null;
  const { day, minute } = localTime(date, timeZone);
  return rules.some((r) => r.days.includes(day) && minute >= r.from && minute < r.to);
}
