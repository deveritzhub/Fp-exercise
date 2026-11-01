import type { Tx } from '../db';
import { strengthCap, type StrengthCap } from '../../../shared/strengthStandards';
import { gymKey, setEstimate } from '../../../shared/gymLog';
import { isoWeekday, parseDate } from '../../../shared/adherence';
import {
  SKILLS, addDays, computeSkillXp, epley1Rm, friendSkillCard, painDropEvents, plannedRestDates, skillLevel, skillLock, skillXpForLevel, skillsForExercise,
  type FriendSkillCard, type LoggedExercise, type RecoveryEvent, type RmMeasurement, type SkillKey, type SkillLockCode, type SkillLockContext,
} from '../../../shared/hero';

export type SkillView = {
  key: SkillKey;
  level: number;
  xp: number;
  from: number;
  to: number;
  progress: number;
  locked: boolean;
  reason: SkillLockCode | null;
  phase: number | null;
  /** Strength only: the level ceiling from the best compound lift relative to body weight. */
  ceiling?: StrengthCap & { capped: boolean };
};

export type StrengthEstimate = {
  exerciseId: string;
  nameNl: string;
  nameEn: string;
  startKg: number | null;
  latestKg: number | null;
  progressPct: number | null;
  history: { date: string; kg: number }[];
};

export type SkillSnapshot = {
  skills: SkillView[];
  totalLevel: number;
  disciplineStreak: number;
  accountKind: 'physio' | 'coach' | 'personal';
  strengthEstimates: StrengthEstimate[];
  /** Levels used for gear. A locked skill counts as 0 so its item stays locked. */
  gearLevels: Partial<Record<SkillKey, number>>;
  friendSkills: Record<SkillKey, FriendSkillCard>;
};

type Week = { weekStart: string; planned: number; completed: number };

const round1 = (n: number) => Math.round(n * 10) / 10;
const sprint = (nl: string, en: string) => /sprint|spurt/i.test(`${nl} ${en}`);

function skillsOf(categories: string[] | null, movement: string | null, nameNl: string, nameEn: string): SkillKey[] {
  const out = skillsForExercise(categories ?? [], movement);
  if (sprint(nameNl, nameEn) && !out.includes('power')) out.push('power');
  return out;
}

function holdSeconds(prescribedSets: number | null, hold: number | null, setsDone: number | null) {
  const holdS = Number(hold ?? 0);
  if (!holdS) return { prescribed: 0, done: 0 };
  const sets = prescribedSets ?? 1;
  const doneSets = setsDone === null || setsDone === undefined ? sets : Math.min(Number(setsDone), sets);
  return { prescribed: sets * holdS, done: Math.max(0, doneSets) * holdS };
}

/** Union-find so a progression and its easier variant share one family. */
function families(ids: string[], links: { a: string; b: string }[]) {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  const unite = (a: string, b: string) => {
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent.set(pa < pb ? pb : pa, pa < pb ? pa : pb);
  };
  for (const l of links) unite(l.a, l.b);
  const out = new Map<string, string>();
  for (const id of parent.keys()) out.set(id, find(id));
  return out;
}

/**
 * Skill levels from the logs that already exist. Nothing is written.
 * `weekly` is the adherence buckets the hero already computed (oldest week first).
 */
export async function loadSkillSnapshot(tx: Tx, patientId: string, weekly: Week[], extraXp: Partial<Record<SkillKey, number>> = {}): Promise<SkillSnapshot> {
  const who = (
    await tx.query(
      `SELECT pr.kind, pt.strength_cleared_at IS NOT NULL AS cleared,
              to_char(timezone('Europe/Amsterdam', now()), 'YYYY-MM-DD') AS today
         FROM patients pt JOIN practices pr ON pr.id = pt.practice_id WHERE pt.id = $1`,
      [patientId],
    )
  ).rows[0] as { kind: 'physio' | 'coach' | 'personal'; cleared: boolean; today: string };
  const today = who?.today ?? new Date().toISOString().slice(0, 10);
  const accountKind = who?.kind ?? 'physio';

  const logs = (
    await tx.query(
      `SELECT l.session_id, l.exercise_id, l.sets_done, l.pain AS log_pain,
              to_char(timezone('Europe/Amsterdam', coalesce(w.completed_at, l.created_at)), 'YYYY-MM-DD') AS day,
              w.pain AS session_pain, e.training_categories, e.movement_category, e.difficulty, e.name_nl, e.name_en,
              i.sets AS prescribed_sets, i.hold_s, i.days, p.start_date::text AS start_date, p.end_date::text AS end_date
         FROM exercise_logs l
         JOIN workout_sessions w ON w.id = l.session_id
         JOIN exercises e ON e.id = l.exercise_id
         LEFT JOIN program_items i ON i.id = l.program_item_id
         LEFT JOIN programs p ON p.id = w.program_id
        WHERE l.patient_id = $1 AND l.completed AND w.completed_at IS NOT NULL`,
      [patientId],
    )
  ).rows;

  const sets = (
    await tx.query(
      `SELECT s.exercise_id, s.session_id, s.weight_kg, s.reps, s.pain,
              to_char(timezone('Europe/Amsterdam', coalesce(w.completed_at, s.created_at)), 'YYYY-MM-DD') AS day,
              w.pain AS session_pain, e.name_nl, e.name_en
         FROM strength_sets s
         JOIN workout_sessions w ON w.id = s.session_id
         JOIN exercises e ON e.id = s.exercise_id
        WHERE s.patient_id = $1`,
      [patientId],
    )
  ).rows;

  const tests = (
    await tx.query(
      `SELECT t.id, t.exercise_id, t.weight_kg, e.name_nl, e.name_en,
              to_char(timezone('Europe/Amsterdam', t.created_at), 'YYYY-MM-DD') AS day
         FROM one_rm_tests t JOIN exercises e ON e.id = t.exercise_id
        WHERE t.patient_id = $1 AND t.screening_ok AND t.weight_kg > 0`,
      [patientId],
    )
  ).rows;

  // Krachtlog (any place) and the body weight for the Strength ceiling.
  const gym = (
    await tx.query(
      `SELECT exercise_name, weight_kg, reps, to_char(day, 'YYYY-MM-DD') AS day FROM gym_sets WHERE patient_id = $1`,
      [patientId],
    )
  ).rows;
  const body = (
    await tx.query(
      `SELECT (SELECT kg FROM weight_logs WHERE patient_id = $1 ORDER BY day DESC LIMIT 1) AS logged,
              (SELECT weight_kg FROM patient_body_metrics WHERE patient_id = $1) AS metric,
              (SELECT frame FROM patient_heroes WHERE patient_id = $1) AS frame`,
      [patientId],
    )
  ).rows[0];

  const sessions = (
    await tx.query(
      `SELECT id, program_id, pain, to_char(timezone('Europe/Amsterdam', completed_at), 'YYYY-MM-DD') AS day
         FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL`,
      [patientId],
    )
  ).rows as { id: string; program_id: string; pain: number | null; day: string }[];

  const programs = (
    await tx.query(
      `SELECT p.id, p.status, p.phase_no, p.series_key, p.start_date::text AS start_date, p.end_date::text AS end_date,
              i.days, e.training_categories, e.movement_category, e.name_nl, e.name_en
         FROM programs p
         JOIN program_items i ON i.program_id = p.id
         JOIN exercises e ON e.id = i.exercise_id
        WHERE p.patient_id = $1 AND NOT p.is_template AND p.status IN ('active', 'completed')`,
      [patientId],
    )
  ).rows;

  const checkins = (await tx.query('SELECT day::text AS day FROM daily_checkins WHERE patient_id = $1', [patientId])).rows as { day: string }[];
  const painPoints = (
    await tx.query(
      `SELECT area, score, to_char(timezone('Europe/Amsterdam', recorded_at), 'YYYY-MM-DD"T"HH24:MI:SS') AS at
         FROM pain_map_entries WHERE patient_id = $1 AND area <> 'none'
       UNION ALL
       SELECT area, score, day::text || 'T12:00:00' FROM daily_checkins WHERE patient_id = $1`,
      [patientId],
    )
  ).rows as { area: string; score: number; at: string }[];
  const flags = (
    await tx.query(
      `SELECT to_char(timezone('Europe/Amsterdam', created_at), 'YYYY-MM-DD') AS day FROM red_flag_reports WHERE patient_id = $1`,
      [patientId],
    )
  ).rows as { day: string }[];
  const criteria = (await tx.query('SELECT to_char(day, \'YYYY-MM-DD\') AS day, kind FROM app.hero_criterion_events($1)', [patientId])).rows as {
    day: string;
    kind: 'jump' | 'return_to_sport';
  }[];

  const exerciseIds = [...new Set([...logs.map((r) => r.exercise_id as string), ...sets.map((r) => r.exercise_id as string), ...tests.map((r) => r.exercise_id as string)])];
  const links = exerciseIds.length
    ? (
        await tx.query(
          `SELECT exercise_id, related_id FROM exercise_relations
            WHERE kind IN ('progression', 'regression') AND (exercise_id = ANY($1) OR related_id = ANY($1))`,
          [exerciseIds],
        )
      ).rows
    : [];
  const familyOf = families(exerciseIds, links.map((r) => ({ a: r.exercise_id as string, b: r.related_id as string })));

  const names = new Map<string, { nl: string; en: string }>();
  for (const r of [...logs, ...sets, ...tests]) names.set(r.exercise_id, { nl: r.name_nl ?? '', en: r.name_en ?? '' });

  const setCount = new Map<string, number>();
  const dayPain = new Map<string, number>();
  const notePain = (day: string, pain: number | null) => {
    if (pain === null || pain === undefined) return;
    dayPain.set(day, Math.max(dayPain.get(day) ?? 0, Number(pain)));
  };
  for (const s of sets) {
    notePain(s.day, s.pain === null ? null : Number(s.pain));
    notePain(s.day, s.session_pain === null ? null : Number(s.session_pain));
    const kg = s.weight_kg === null ? null : Number(s.weight_kg);
    const reps = s.reps === null ? null : Number(s.reps);
    if (kg !== null && kg > 0 && reps !== null && reps > 0) {
      const key = `${s.session_id}|${s.exercise_id}`;
      setCount.set(key, (setCount.get(key) ?? 0) + 1);
    }
  }
  for (const l of logs) {
    notePain(l.day, l.log_pain === null ? null : Number(l.log_pain));
    notePain(l.day, l.session_pain === null ? null : Number(l.session_pain));
  }
  for (const s of sessions) notePain(s.day, s.pain === null ? null : Number(s.pain));

  const previousPain = new Map<string, number | null>();
  let lastPain: number | null = null;
  for (const s of [...sessions].sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id))) {
    previousPain.set(s.id, lastPain);
    if (s.pain !== null) lastPain = Number(s.pain);
  }

  const plannedOn = (day: string, days: number[] | null, start: string | null, end: string | null) => {
    if (!days || !start || day < start || (end && day > end)) return false;
    return days.map(Number).includes(isoWeekday(parseDate(day)));
  };

  const exercises: LoggedExercise[] = logs.map((l) => {
    const skills = skillsOf(l.training_categories, l.movement_category, l.name_nl ?? '', l.name_en ?? '');
    const planned = plannedOn(l.day, l.days, l.start_date, l.end_date);
    const prescribedSets = l.prescribed_sets === null ? null : Number(l.prescribed_sets);
    const hold = holdSeconds(prescribedSets, l.hold_s === null ? null : Number(l.hold_s), l.sets_done === null ? null : Number(l.sets_done));
    const balance = skills.includes('balance');
    return {
      date: l.day,
      exerciseId: l.exercise_id,
      familyId: familyOf.get(l.exercise_id) ?? l.exercise_id,
      difficulty: Number(l.difficulty ?? 1),
      skills,
      planned,
      prescribedSets,
      loggedSets: setCount.get(`${l.session_id}|${l.exercise_id}`) ?? 0,
      prescribedHoldS: skills.includes('mobility') ? hold.prescribed : 0,
      doneHoldS: skills.includes('mobility') ? hold.done : 0,
      prescribedBalanceS: balance ? hold.prescribed : 0,
      doneBalanceS: balance ? hold.done : 0,
      pain: l.log_pain === null ? (l.session_pain === null ? null : Number(l.session_pain)) : Number(l.log_pain),
      previousPain: previousPain.get(l.session_id) ?? null,
    };
  });

  const measurements: RmMeasurement[] = [];
  const best = new Map<string, RmMeasurement>();
  for (const s of sets) {
    const est = epley1Rm(s.weight_kg === null ? null : Number(s.weight_kg), s.reps === null ? null : Number(s.reps));
    if (est === null) continue;
    const key = `${s.session_id}|${s.exercise_id}`;
    const setPain = s.pain === null ? null : Number(s.pain);
    const sessPain = s.session_pain === null ? null : Number(s.session_pain);
    const pain = setPain === null ? sessPain : sessPain === null ? setPain : Math.max(setPain, sessPain);
    const cur = best.get(key);
    if (!cur || est > cur.estimateKg) {
      best.set(key, { exerciseId: s.exercise_id, sessionId: s.session_id, date: s.day, estimateKg: est, pain });
    }
  }
  measurements.push(...best.values());
  for (const t of tests) {
    const pain = dayPain.get(t.day);
    measurements.push({
      exerciseId: t.exercise_id,
      sessionId: `test:${t.id}`,
      date: t.day,
      estimateKg: Number(t.weight_kg),
      pain: pain === undefined ? null : pain,
    });
  }

  // Krachtlog: best estimate per exercise per day. New records there also earn Strength XP.
  const gymBest = new Map<string, RmMeasurement>();
  for (const g of gym) {
    const est = setEstimate(Number(g.weight_kg), Number(g.reps));
    if (est === null) continue;
    const id = `gym:${gymKey(g.exercise_name)}`;
    names.set(id, { nl: g.exercise_name, en: g.exercise_name });
    const key = `${g.day}|${id}`;
    const pain = dayPain.get(g.day);
    if (!gymBest.has(key) || est > gymBest.get(key)!.estimateKg) gymBest.set(key, { exerciseId: id, sessionId: `gym:${g.day}`, date: g.day, estimateKg: est, pain: pain === undefined ? null : pain });
  }
  measurements.push(...gymBest.values());

  const trained = new Set(sessions.map((s) => s.day));
  const restPrograms = new Map<string, { start: string | null; end: string | null; weekdays: number[] }>();
  for (const p of programs) {
    const row = restPrograms.get(p.id) ?? { start: p.start_date, end: p.end_date, weekdays: [] as number[] };
    for (const d of (p.days ?? []) as number[]) if (!row.weekdays.includes(Number(d))) row.weekdays.push(Number(d));
    restPrograms.set(p.id, row);
  }
  const recovery: RecoveryEvent[] = [
    ...checkins.map((c) => ({ date: c.day, kind: 'checkin' as const })),
    ...sessions.filter((s) => s.pain !== null).map((s) => ({ date: s.day, kind: 'pain_after_session' as const })),
    ...plannedRestDates([...restPrograms.values()], trained, today).map((date) => ({ date, kind: 'rest_day' as const })),
    ...flags.map((f) => ({ date: f.day, kind: 'red_flag' as const })),
    ...painDropEvents(painPoints),
  ];

  const active = programs.filter((p) => p.status === 'active');
  const activeSkills = [...new Set(active.flatMap((p) => skillsOf(p.training_categories, p.movement_category, p.name_nl ?? '', p.name_en ?? '')))] as SkillKey[];
  const phaseRow = active.find((p) => p.series_key && p.phase_no) ?? active.find((p) => p.phase_no);
  const laterPhase: SkillLockContext['laterPhase'] = {};
  const seriesKeys = [...new Set(active.map((p) => p.series_key).filter(Boolean))] as string[];
  for (const series of seriesKeys) {
    const phases = (await tx.query('SELECT phase_no, training_categories, movement_category FROM app.series_phase_exercises($1)', [series])).rows;
    const current = Number(phaseRow?.phase_no ?? 0);
    for (const ph of phases) {
      if (Number(ph.phase_no) <= current) continue;
      for (const skill of skillsOf(ph.training_categories, ph.movement_category, '', '')) {
        const prev = laterPhase[skill];
        if (prev === undefined || Number(ph.phase_no) < prev) laterPhase[skill] = Number(ph.phase_no);
      }
    }
  }
  const ctx: SkillLockContext = {
    active: activeSkills,
    laterPhase,
    phaseNo: phaseRow?.phase_no === null || phaseRow?.phase_no === undefined ? null : Number(phaseRow.phase_no),
    strengthCleared: !!who?.cleared,
    powerInProgram: activeSkills.includes('power'),
    sportPhase: activeSkills.includes('sport'),
    selfTrained: (Object.keys(extraXp) as SkillKey[]).filter((k) => (extraXp[k] ?? 0) > 0),
  };

  const plannedSession = new Set(exercises.filter((e) => e.planned).map((e) => `${e.date}`));
  const programDays = new Map<string, { start: string | null; end: string | null; weekdays: number[] }>();
  for (const p of programs) {
    const row = programDays.get(p.id) ?? { start: p.start_date, end: p.end_date, weekdays: [] as number[] };
    for (const d of (p.days ?? []) as number[]) if (!row.weekdays.includes(Number(d))) row.weekdays.push(Number(d));
    programDays.set(p.id, row);
  }
  const firstPlanned = weekly.findIndex((w) => w.planned > 0);
  const weeks = firstPlanned < 0 ? [] : weekly.slice(firstPlanned).map((w) => ({ full: w.planned > 0 && w.completed >= w.planned }));
  const fullWeeks = weekly
    .filter((w) => w.planned > 0 && w.completed >= w.planned)
    .map((w) => {
      const sunday = addDays(w.weekStart, 6);
      return { date: sunday <= today ? sunday : today };
    });

  const computed = computeSkillXp({
    exercises,
    measurements,
    sessions: sessions.map((s) => {
      const prog = programDays.get(s.program_id);
      const planned = plannedSession.has(s.day) || (!!prog && plannedOn(s.day, prog.weekdays, prog.start, prog.end));
      return { date: s.day, planned };
    }),
    fullWeeks,
    weeks,
    recovery,
    criteria: criteria.map((c) => ({ date: c.day, kind: c.kind })),
    accountKind,
  });

  // Best estimated 1RM per exercise (all sources), for the Strength ceiling.
  const bestByName = new Map<string, number>();
  for (const m of measurements) {
    const n = names.get(m.exerciseId);
    for (const nm of [n?.nl, n?.en]) if (nm) bestByName.set(nm, Math.max(bestByName.get(nm) ?? 0, m.estimateKg));
  }
  const bodyweight = body?.logged ? Number(body.logged) : body?.metric ? Number(body.metric) : null;
  const ceiling = strengthCap({ frame: body?.frame ?? null, bodyweightKg: bodyweight, lifts: [...bestByName].map(([name, oneRmKg]) => ({ name, oneRmKg })) });

  const skills: SkillView[] = SKILLS.map((k) => {
    const lock = skillLock(k.key, ctx);
    const lv = skillLevel(computed.xp[k.key] + (extraXp[k.key] ?? 0));
    if (k.key !== 'strength') return { key: k.key, ...lv, locked: lock.locked, reason: lock.reason, phase: lock.phase };
    // XP keeps counting; the level waits at the ceiling until the lifts catch up.
    const capped = lv.level > ceiling.cap;
    const shown = capped ? { ...skillLevel(skillXpForLevel(ceiling.cap)), xp: lv.xp, progress: 1 } : lv;
    return { key: k.key, ...shown, locked: lock.locked, reason: lock.reason, phase: lock.phase, ceiling: { ...ceiling, capped } };
  });
  const gearLevels = Object.fromEntries(skills.map((s) => [s.key, s.locked ? 0 : s.level])) as Partial<Record<SkillKey, number>>;
  const strengthEstimates: StrengthEstimate[] = computed.strength.filter((s) => !s.exerciseId.startsWith('gym:')).map((s) => ({
    exerciseId: s.exerciseId,
    nameNl: names.get(s.exerciseId)?.nl ?? '',
    nameEn: names.get(s.exerciseId)?.en ?? '',
    startKg: s.startKg === null ? null : round1(s.startKg),
    latestKg: s.latestKg === null ? null : round1(s.latestKg),
    progressPct: s.progressPct,
    history: s.history.map((h) => ({ date: h.date, kg: round1(h.kg) })),
  }));

  return {
    skills,
    totalLevel: skills.reduce((sum, s) => sum + (s.locked ? 0 : s.level), 0),
    disciplineStreak: computed.streak,
    accountKind,
    strengthEstimates,
    gearLevels,
    friendSkills: Object.fromEntries(skills.map((s) => [s.key, friendSkillCard(s)])) as Record<SkillKey, FriendSkillCard>,
  };
}
