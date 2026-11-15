import { TRAINING_KINDS, type TrainingKind } from './patientLogs';

/**
 * "Vandaag heb ik 5 min gefietst, 3 sets chest press 10x 40 kg, 3x row en biceps curl": a workout
 * typed in plain words, read without any outside service. Cardio becomes a training with minutes;
 * strength exercises are matched to the library and become sets in the strength log. The result is
 * only a proposal: the patient checks and adjusts it before anything is saved.
 */
export type LibraryEntry = { id: string; nameNl: string; nameEn: string };
export type ParsedCardio = { kind: TrainingKind; minutes: number | null; label: string };
export type ParsedStrength = {
  /** What was typed for this exercise. */
  text: string;
  /** Best match first; empty when nothing in the library fits. */
  candidates: LibraryEntry[];
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
};
export type ParsedWorkout = { cardio: ParsedCardio[]; strength: ParsedStrength[]; unknown: string[] };

const norm = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, "'")
    .replace(/[^a-z0-9.,'\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Words for cardio, by kind (stems: "gefietst", "fietsen" and "fiets" all start with one of them). */
const CARDIO: [TrainingKind, string[]][] = [
  ['cycle', ['fiets', 'gefietst', 'spinning', 'spinnen', 'hometrainer', 'cycl', 'bike', 'biking']],
  ['walk', ['wandel', 'gewandeld', 'loop', 'gelopen', 'lopen', 'walk', 'loopband']],
  ['swim', ['zwem', 'gezwommen', 'swim']],
  ['other', ['hardlo', 'gerend', 'rennen', 'jog', 'run', 'roeimachine', 'crosstrainer', 'stepper', 'traplopen']],
];
/** Words that carry nothing: left out before matching. */
const FILLER = new Set(['vandaag', 'gisteren', 'heb', 'ik', 'gedaan', 'ook', 'nog', 'en', 'met', 'de', 'het', 'een', 'op', 'van', 'daarna', 'toen', 'en', 'i', 'did', 'and', 'then', 'today', 'with', 'the', 'a', 'of']);
/** Common names and Dutch words for library exercises. Applied to the typed text before matching. */
const ALIASES: [RegExp, string][] = [
  [/\bbiceps ?curls?\b/g, 'dumbbell curl'],
  [/\bbicep ?curls?\b/g, 'dumbbell curl'],
  [/\bborstpers\b/g, 'chest press'],
  [/\bbankdrukken\b/g, 'bench press'],
  [/\broeien\b/g, 'row'],
  [/\brows\b/g, 'row'],
  [/\bbeenpers\b/g, 'leg press'],
  [/\bhamstring ?curls?\b/g, 'leg curl'],
  [/\bkuitheffen\b/g, 'kuitheffen'],
  [/\bcalf raises?\b/g, 'kuitheffen'],
  [/\boptrekken\b/g, 'pull up'],
  [/\bpull ?ups?\b/g, 'pull up'],
  [/\bchin ?ups?\b/g, 'chin up'],
  [/\bpush ?ups?\b/g, 'opdrukken'],
  [/\bschouderdrukken\b/g, 'schouderdrukken'],
  [/\bshoulder press\b/g, 'schouderdrukken'],
  [/\bsquats\b/g, 'squat'],
  [/\blunges?\b/g, 'uitvalspas'],
  [/\bdeadlifts?\b/g, 'deadlift'],
  [/\bpulldowns?\b/g, 'pulldown'],
  [/\blat ?pull ?downs?\b/g, 'lat pulldown'],
  [/\btriceps ?(extensions?|strekken)\b/g, 'triceps extension'],
  [/\bplanken\b/g, 'plank'],
];

const words = (s: string) => norm(s).split(' ').filter(Boolean);
/** Words that say how, not what: on their own they name no exercise ("dumbbell" fits dozens). */
const GENERIC = new Set(['dumbbell', 'dumbbells', 'barbell', 'kabel', 'cable', 'machine', 'band', 'bank', 'staand', 'zittend', 'liggend', 'eenarmige', 'eenbenige', 'met', 'op']);
const NUM = /^\d+(?:[.,]\d+)?$/;

/** Library entries whose name contains every word (as the start of one of its words), best first. */
export function matchExercise(phrase: string, library: LibraryEntry[]): LibraryEntry[] {
  const want = words(phrase);
  if (!want.length) return [];
  const scored: { e: LibraryEntry; extra: number }[] = [];
  for (const e of library) {
    for (const name of [e.nameNl, e.nameEn]) {
      const have = words(name);
      if (want.every((w) => have.some((h) => h.startsWith(w) || (w.length >= 5 && h.startsWith(w.slice(0, -1)))))) {
        scored.push({ e, extra: have.length - want.length });
        break;
      }
    }
  }
  scored.sort((a, b) => a.extra - b.extra || a.e.nameNl.length - b.e.nameNl.length);
  const seen = new Set<string>();
  return scored.filter((x) => !seen.has(x.e.id) && seen.add(x.e.id)).map((x) => x.e);
}

export function parseWorkoutText(text: string, library: LibraryEntry[]): ParsedWorkout {
  let s = ` ${norm(text)} `;
  // A known name is a whole exercise: mark where it starts and ends ("row biceps curl" is two).
  for (const [re, to] of ALIASES) s = s.replace(re, ` | ${to} | `);
  s = s.replace(/[,;\n]+/g, ' | ');
  // "5'min", "5 min.", "5 minuten", "1 uur", "half uur".
  s = s.replace(/(\d+)\s*'\s*(?=m)/g, '$1 ').replace(/\bhalf uur\b/g, '30 min').replace(/\bkwartier\b/g, '15 min');
  // "3x10" and "3 x 10": sets and reps.
  s = s.replace(/(\d+)\s*x\s*(\d+)\b(?!\s*(?:kg|kilo))/g, '$1 sets $2 reps');
  // "100kg", "20min": the unit as its own word.
  s = s.replace(/(\d)(kg|kilos?|min|minuten|uur|sets?|reps?)\b/g, '$1 $2');
  // "3x row": three sets of the row that follows.
  s = s.replace(/(\d)x\b/g, '$1 x');
  const tokens = s.split(/[\s+/]+|\.(?!\d)/).filter(Boolean);

  const out: ParsedWorkout = { cardio: [], strength: [], unknown: [] };
  // Numbers waiting for the exercise they belong to (they may come before or after the name).
  let pend: { sets: number | null; reps: number | null; weightKg: number | null; minutes: number | null } = { sets: null, reps: null, weightKg: null, minutes: null };
  const empty = () => ({ sets: null, reps: null, weightKg: null, minutes: null });
  let last: ParsedStrength | ParsedCardio | null = null;
  const give = (target: ParsedStrength | ParsedCardio) => {
    if ('kind' in target) {
      if (pend.minutes !== null && target.minutes === null) target.minutes = pend.minutes;
    } else {
      if (pend.sets !== null && target.sets === null) target.sets = pend.sets;
      if (pend.reps !== null && target.reps === null) target.reps = pend.reps;
      if (pend.weightKg !== null && target.weightKg === null) target.weightKg = pend.weightKg;
    }
    pend = empty();
  };

  // Words that match nothing in the library. Next to a number ("3 sets chest press") or two words or
  // more ("biceps curl") they are an exercise of the patient's own; a lone word stays unknown.
  let run: string[] = [];
  const flush = (numberNext: boolean) => {
    if (!run.length) return;
    const ownName = run.join(' ');
    if (numberNext || run.length >= 2 || pend.sets !== null || pend.reps !== null) {
      const st: ParsedStrength = { text: ownName, candidates: [], sets: null, reps: null, weightKg: null };
      give(st);
      out.strength.push(st);
      last = st;
    } else out.unknown.push(...run);
    run = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    const next = tokens[i + 1] ?? '';
    if (tk === '|') {
      flush(false);
      continue;
    }
    if (NUM.test(tk)) flush(true);
    else if (FILLER.has(tk)) flush(false);
    if (NUM.test(tk)) {
      const n = Number(tk.replace(',', '.'));
      // A number after an exercise without its own value yet belongs to that exercise; else it waits.
      const into = <K extends keyof typeof pend>(k: K, v: number) => {
        const target = last && !('kind' in last) && k !== 'minutes' && (last as ParsedStrength)[k as 'sets'] === null ? last : null;
        if (target) (target as ParsedStrength)[k as 'sets'] = v;
        else if (last && 'kind' in last && k === 'minutes' && last.minutes === null) last.minutes = v;
        else pend[k] = v as never;
      };
      if (/^(min|minuten|minuut|minutes|mins?|m)$/.test(next)) { into('minutes', Math.round(n)); i++; continue; }
      if (/^(uur|u|hour|hours|h)$/.test(next)) { into('minutes', Math.round(n * 60)); i++; continue; }
      if (/^(kg|kilo|kilos)$/.test(next)) { into('weightKg', n); i++; continue; }
      if (/^(x|keer)$/.test(next)) {
        // "10x 40 kg" after an exercise: its reps. "3x row": sets of the next exercise.
        const strength = last && !('kind' in last) ? last : null;
        if (strength && strength.reps === null && NUM.test(tokens[i + 2] ?? '')) strength.reps = Math.round(n);
        else pend.sets = Math.round(n);
        i++;
        continue;
      }
      if (/^(sets?|series|serie|rondes?)$/.test(next)) { into('sets', Math.round(n)); i++; continue; }
      if (/^(reps?|herhalingen|herhaling|keer)$/.test(next)) { into('reps', Math.round(n)); i++; continue; }
      // A bare number: reps when the exercise already has its sets, else sets.
      if (last && !('kind' in last) && last.sets !== null && last.reps === null) last.reps = Math.round(n);
      else pend.sets = Math.round(n);
      continue;
    }
    if (FILLER.has(tk)) continue;
    const cardio = CARDIO.find(([, stems]) => stems.some((st) => tk.startsWith(st)));
    if (cardio) flush(false);
    if (cardio) {
      const kind = cardio[0];
      const c: ParsedCardio = { kind, minutes: null, label: TRAINING_KINDS.find((k) => k.key === kind)!.nl };
      give(c);
      out.cardio.push(c);
      last = c;
      continue;
    }
    // The longest run of words (up to four) that names a library exercise.
    let hit: { len: number; candidates: LibraryEntry[] } | null = null;
    for (let len = Math.min(4, tokens.length - i); len >= 1; len--) {
      const win = tokens.slice(i, i + len);
      if (win.some((w) => w === '|' || NUM.test(w) || FILLER.has(w))) continue;
      if (win.every((w) => GENERIC.has(w))) continue;
      const candidates = matchExercise(win.join(' '), library);
      if (candidates.length) {
        hit = { len, candidates };
        break;
      }
    }
    if (hit) {
      flush(false);
      const st: ParsedStrength = { text: tokens.slice(i, i + hit.len).join(' '), candidates: hit.candidates.slice(0, 6), sets: null, reps: null, weightKg: null };
      give(st);
      out.strength.push(st);
      last = st;
      i += hit.len - 1;
      continue;
    }
    if (/^(sets?|reps?|kg|min|minuten|x)$/.test(tk)) continue;
    run.push(tk);
  }
  flush(false);
  return out;
}
