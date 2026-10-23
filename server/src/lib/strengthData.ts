import type { Tx } from '../db';
import { best1RM, estimate1RM, oneRmTestAllowed, progressionAdvice, repRange, type Advice } from '../../../shared/strength';

type SetRow = { weightKg: number | null; reps: number | null; rpe: number | null; rir: number | null; pain: number | null; setNo: number };

/**
 * Strength overview for one patient: per exercise the history of estimated 1RMs (per session),
 * personal records, the last session's sets (to prefill) and the double-progression advice.
 * RLS decides what the caller may see (patient: always; therapist: only with consent for 'kracht').
 */
export async function loadStrength(tx: Tx, patientId: string) {
  const items = (
    await tx.query(
      `SELECT i.id, i.exercise_id, i.reps, i.notes, p.id AS program_id, coalesce(p.start_date, p.activated_at::date) AS program_start,
              e.name_nl, e.name_en, e.tags
         FROM program_items i JOIN programs p ON p.id = i.program_id JOIN exercises e ON e.id = i.exercise_id
        WHERE p.patient_id = $1 AND p.module = 'kracht' AND p.status = 'active' AND NOT p.is_template
        ORDER BY p.activated_at, i.position`,
      [patientId],
    )
  ).rows;
  const sets = (
    await tx.query(
      `SELECT s.exercise_id, s.session_id, s.set_no, s.weight_kg, s.reps, s.rpe, s.rir, s.pain, s.created_at,
              coalesce(ws.completed_at, ws.started_at) AS at
         FROM strength_sets s JOIN workout_sessions ws ON ws.id = s.session_id
        WHERE s.patient_id = $1 ORDER BY at DESC, s.set_no`,
      [patientId],
    )
  ).rows;
  const tests = (
    await tx.query(
      `SELECT t.exercise_id, t.weight_kg, t.screening_ok, t.created_at, e.name_nl, e.name_en
         FROM one_rm_tests t JOIN exercises e ON e.id = t.exercise_id WHERE t.patient_id = $1 ORDER BY t.created_at DESC`,
      [patientId],
    )
  ).rows;

  const exerciseIds = [...new Set([...items.map((i) => i.exercise_id), ...sets.map((s) => s.exercise_id)])];
  const byExercise = exerciseIds.map((exerciseId) => {
    const item = items.find((i) => i.exercise_id === exerciseId);
    // Sessions newest first, each with its sets.
    const sessions: { sessionId: string; at: string; sets: SetRow[] }[] = [];
    for (const s of sets.filter((x) => x.exercise_id === exerciseId)) {
      let sess = sessions.find((x) => x.sessionId === s.session_id);
      if (!sess) sessions.push((sess = { sessionId: s.session_id, at: s.at, sets: [] }));
      sess.sets.push({ setNo: s.set_no, weightKg: s.weight_kg === null ? null : Number(s.weight_kg), reps: s.reps, rpe: s.rpe === null ? null : Number(s.rpe), rir: s.rir, pain: s.pain });
    }
    const history = sessions
      .map((x) => ({ date: x.at, best: best1RM(x.sets), top: x.sets.reduce<SetRow | null>((a, b) => ((b.weightKg ?? 0) > (a?.weightKg ?? -1) ? b : a), null) }))
      .reverse();
    const direct = tests.filter((t) => t.exercise_id === exerciseId && t.screening_ok && t.weight_kg !== null).map((t) => ({ date: t.created_at, value: Number(t.weight_kg) }));
    const values = [...history.filter((h) => h.best !== null).map((h) => ({ date: h.date, value: h.best! })), ...direct];
    const best = values.reduce<{ date: string; value: number } | null>((a, b) => (!a || b.value > a.value ? b : a), null);
    // A PR is a session whose estimate beats every earlier value.
    const latest = history.at(-1);
    const earlier = values.filter((v) => latest && new Date(v.date) < new Date(latest.date)).map((v) => v.value);
    const latestIsPr = !!latest?.best && earlier.length > 0 && latest.best > Math.max(...earlier);
    const advice: Advice = item ? progressionAdvice(sessions.map((x) => ({ sets: x.sets })), repRange(item.notes, item.reps)) : { kind: 'none' };
    return {
      exerciseId,
      nameNl: item?.name_nl ?? tests.find((t) => t.exercise_id === exerciseId)?.name_nl ?? '',
      nameEn: item?.name_en ?? tests.find((t) => t.exercise_id === exerciseId)?.name_en ?? '',
      main: !!item?.tags?.includes('1rm'),
      programId: item?.program_id ?? null,
      oneRmTestAllowed: !!item && oneRmTestAllowed(item.program_start),
      range: item ? repRange(item.notes, item.reps) : null,
      history: history.map((h) => ({ date: h.date, best: h.best, topKg: h.top?.weightKg ?? null, topReps: h.top?.reps ?? null })),
      directTests: direct,
      best,
      latestIsPr,
      lastSets: sessions[0]?.sets ?? [],
      advice,
    };
  });
  // Names for exercises only known from sets (e.g. a stopped programme).
  for (const e of byExercise.filter((x) => !x.nameNl)) {
    const { rows } = await tx.query('SELECT name_nl, name_en FROM exercises WHERE id = $1', [e.exerciseId]);
    e.nameNl = rows[0]?.name_nl ?? '';
    e.nameEn = rows[0]?.name_en ?? '';
  }
  return { exercises: byExercise, screeningStops: tests.filter((t) => !t.screening_ok).length };
}

export { estimate1RM };
