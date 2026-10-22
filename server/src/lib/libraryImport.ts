import { z } from 'zod';
import { FP_LIBRARY_EN } from '../../db/seed-data/fp-library-en';

/**
 * Imports a practice's own exercise library (JSON in the Functional Performance format) as
 * practice-owned exercises plus one programme template per phase.
 *
 * - Idempotent: rows are matched on the file's ids (`source_key`); importing a new version of the
 *   file updates them instead of creating duplicates.
 * - Runs under the caller's database role: via the API that is the practice admin under RLS.
 * - Dutch clinical text is kept as written. Doses are starting values; exercises the file marks as
 *   "gecheckt" are imported as reviewed, everything else needs clinical review in the app.
 * - External ids/links in the file (video_url, physitrack_id) are not used: media is only added
 *   by the practice itself (or reused from our own library videos when it is clearly the same exercise).
 */

const num = z.number().int().min(0).max(1000).nullable().optional();
const exerciseSchema = z.object({
  id: z.string().min(1).max(80),
  naam: z.string().min(2).max(160),
  categorie: z.string().max(40),
  type_belasting: z.string().max(40),
  regio: z.string().max(40),
  niveau: z.string().max(40).optional(),
  instructie: z.string().max(2000),
  dosering: z.object({ sets: num, reps: num, hold_sec: num, tempo: z.string().max(80).nullable().optional(), rust_sec: num, intensiteit: z.string().max(200).nullable().optional() }).partial(),
  symptoomregel: z.string().max(500).optional(),
  tags: z.array(z.string().max(60)).max(30).optional(),
  dosis_status: z.string().max(300).optional(),
});
const phaseItem = z.object({
  exercise_id: z.string().max(80),
  sets: num,
  reps: num,
  hold_sec: num,
  frequentie_per_week: z.number().int().min(1).max(7).optional(),
  opmerking: z.string().max(1000).optional(),
});
const criterion = z.object({ criterium: z.string().max(300), drempel: z.string().max(300).optional(), meetmethode: z.string().max(200).optional(), bron: z.string().max(300).optional() });
const programSchema = z.object({
  id: z.string().min(1).max(80),
  naam: z.string().min(2).max(120),
  indicatie: z.string().max(500).optional(),
  duur_weken: z.number().int().min(1).max(104).optional(),
  fases: z.array(z.object({ naam: z.string().max(60), weken: z.string().max(20).optional(), doel: z.string().max(500).optional(), oefeningen: z.array(phaseItem).max(40) })).min(1).max(12),
  progressiecriteria: z.array(z.string().max(300)).max(30).optional(),
  rode_vlaggen: z.array(z.string().max(300)).max(30).optional(),
  aanpassen_aan_protocol: z.boolean().optional(),
  evidentie_status: z.string().max(1000).optional(),
  criteria_per_fase: z.array(z.object({ van: z.string().max(60), naar: z.string().max(60), criteria: z.array(criterion).max(30) })).max(12).optional(),
  criteria_toelichting: z.string().max(1000).optional(),
});
export const libraryFileSchema = z.object({
  _toelichting: z.object({ symptoomregel_standaard: z.string().max(500).optional() }).passthrough().optional(),
  oefeningen: z.array(exerciseSchema).min(1).max(1000),
  programmas: z.array(programSchema).max(200).default([]),
});
export type LibraryFile = z.infer<typeof libraryFileSchema>;

type Db = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> };

const REGION: Record<string, string> = {
  knie: 'knee', heup: 'hip', enkel_voet: 'ankle_foot', enkel: 'ankle_foot', voet: 'ankle_foot', schouder: 'shoulder',
  nek: 'cervical_spine', rug: 'lumbar_spine', core: 'lumbar_spine', elleboog: 'elbow', pols_hand: 'wrist_hand',
};
const TRAINING: Record<string, string> = {
  isometrisch: 'isometric', concentrisch: 'concentric', excentrisch: 'eccentric', isotoon: 'strength', kracht: 'strength',
  neurodynamisch: 'neurodynamics', neurodynamiek: 'neurodynamics', mobiliteit: 'mobility', stretch: 'mobility',
  balans: 'balance', plyometrisch: 'plyometrics', activatie: 'motor_control',
};
const DAYS: Record<number, number[]> = { 1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 7] };

function equipmentFor(name: string, instruction: string) {
  const s = `${name} ${instruction}`.toLowerCase();
  const out = new Set<string>();
  if (/\bband\b/.test(s)) out.add('resistance_band');
  if (/muur|deurpost/.test(s)) out.add('wall');
  if (/leg press|platform/.test(s)) out.add('gym_machine');
  if (/step-up|box|trede/.test(s)) out.add('step');
  if (/bankje|bulgarian/.test(s)) out.add('bench');
  if (/stoel/.test(s)) out.add('none');
  return out.size ? [...out] : ['none'];
}

/** Same exercise in our central library (with an approved demo video): reuse that video. */
const SAME_AS_LIBRARY: Record<string, string> = {
  ex_glute_bridge: 'Bekkenbrug',
  ex_clamshell: 'Schelp met weerstandsband',
  ex_heel_raise_bilateraal: 'Hielheffen staand',
  ex_single_leg_balance: 'Eenbeensstand',
  ex_step_up: 'Opstappen',
  ex_dead_bug: 'Dead bug',
  ex_chin_tuck: 'Kinintrekking',
  ex_cat_camel: 'Kat-koe',
};

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export async function importLibrary(db: Db, practiceId: string, userId: string | null, file: LibraryFile) {
  const en = FP_LIBRARY_EN;
  const ids: Record<string, string> = {};
  let created = 0;
  let updated = 0;
  for (const e of file.oefeningen) {
    const d = e.dosering ?? {};
    const tempo = d.tempo && d.tempo !== 'n.v.t.' && d.tempo.length <= 20 ? d.tempo : null;
    const longTempo = d.tempo && d.tempo !== 'n.v.t.' && !tempo ? d.tempo : null;
    const cuesNl = [
      e.symptoomregel && `Pijnregel: ${e.symptoomregel}.`,
      d.intensiteit && `Intensiteit: ${d.intensiteit}.`,
      longTempo && `Tempo: ${longTempo}.`,
    ].filter(Boolean).join(' ');
    const t = en[e.id];
    const cuesEn = t?.rule ? `Pain rule: ${t.rule}.` : '';
    const training = [...new Set([TRAINING[e.type_belasting], TRAINING[e.categorie]].filter(Boolean))] as string[];
    const region = e.naam.toLowerCase().includes('thoracale') ? 'thoracic_spine' : REGION[e.regio] ?? 'full_body';
    const reviewed = /^gecheckt/i.test(e.dosis_status ?? '');
    const video = SAME_AS_LIBRARY[e.id]
      ? (await db.query('SELECT video_media_id FROM exercises WHERE practice_id IS NULL AND name_nl = $1 AND video_media_id IS NOT NULL', [SAME_AS_LIBRARY[e.id]])).rows[0]?.video_media_id ?? null
      : null;
    const r = await db.query(
      `INSERT INTO exercises(practice_id, created_by, source_key, name_nl, name_en, body_region, training_categories, equipment, difficulty,
         movement_nl, movement_en, instructions_nl, instructions_en, default_sets, default_reps, default_hold_s, default_rest_s, default_tempo,
         tags, review_status, video_media_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (practice_id, source_key) WHERE source_key IS NOT NULL DO UPDATE SET
         name_nl = EXCLUDED.name_nl, name_en = EXCLUDED.name_en, body_region = EXCLUDED.body_region,
         training_categories = EXCLUDED.training_categories, equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty,
         movement_nl = EXCLUDED.movement_nl, movement_en = EXCLUDED.movement_en, instructions_nl = EXCLUDED.instructions_nl,
         instructions_en = EXCLUDED.instructions_en, default_sets = EXCLUDED.default_sets, default_reps = EXCLUDED.default_reps,
         default_hold_s = EXCLUDED.default_hold_s, default_rest_s = EXCLUDED.default_rest_s, default_tempo = EXCLUDED.default_tempo,
         tags = EXCLUDED.tags, video_media_id = coalesce(exercises.video_media_id, EXCLUDED.video_media_id),
         archived_at = NULL, updated_at = now()
       RETURNING id, (xmax = 0) AS inserted`,
      [
        practiceId, userId, e.id, e.naam, t?.name ?? e.naam, region, training, equipmentFor(e.naam, e.instructie),
        e.niveau === 'gevorderd' ? 4 : 2, e.instructie, t?.instruction ?? '', cuesNl, cuesEn,
        d.sets || null, d.reps || null, d.hold_sec || null, d.rust_sec ?? null, tempo,
        [...new Set(e.tags ?? [])], reviewed ? 'reviewed' : 'needs_clinical_review', video,
      ],
    );
    ids[e.id] = r.rows[0].id;
    if (r.rows[0].inserted) created++;
    else updated++;
    // Therapist-only: what the source says about the evidence for this dose.
    const notes = [e.dosis_status && `Onderbouwing dosering: ${e.dosis_status}.`, d.intensiteit && `Intensiteit: ${d.intensiteit}.`]
      .filter(Boolean).join('\n');
    await db.query(
      `INSERT INTO exercise_clinical_notes(exercise_id, practice_id, notes) VALUES ($1,$2,$3)
       ON CONFLICT (exercise_id) DO UPDATE SET notes = EXCLUDED.notes, updated_at = now()`,
      [ids[e.id], practiceId, notes],
    );
  }

  const rule = file._toelichting?.symptoomregel_standaard;
  let templates = 0;
  for (const p of file.programmas) {
    for (const [i, f] of p.fases.entries()) {
      const key = `${p.id}#${i + 1}`;
      const next = p.criteria_per_fase?.find((c) => c.van === f.naam);
      const description = [
        p.indicatie && `Indicatie: ${p.indicatie}.`,
        `${f.naam}${f.weken ? ` (week ${f.weken})` : ''}${p.duur_weken ? ` van ${p.duur_weken} weken` : ''}${f.doel ? `: ${f.doel}.` : '.'}`,
        p.aanpassen_aan_protocol && 'Pas aan aan het (chirurgisch) protocol; dat is het bindende kader.',
        next && `Criteria voor ${next.naar}:\n${next.criteria.map((c) => `☐ ${c.criterium}${c.drempel ? ` — ${c.drempel}` : ''}${c.meetmethode ? ` (${c.meetmethode})` : ''}${c.bron ? ` [${c.bron}]` : ''}`).join('\n')}`,
        !next && p.progressiecriteria?.length && `Progressiecriteria:\n${p.progressiecriteria.map((c) => `☐ ${c}`).join('\n')}`,
        f.oefeningen.some((it) => it.opmerking) &&
          `Per oefening:\n${f.oefeningen.filter((it) => it.opmerking).map((it) => `• ${file.oefeningen.find((x) => x.id === it.exercise_id)?.naam ?? it.exercise_id}: ${it.opmerking}`).join('\n')}`,
        p.rode_vlaggen?.length && `Rode vlaggen: ${p.rode_vlaggen.join('; ')}.`,
        p.evidentie_status && `Onderbouwing: ${p.evidentie_status}`,
        p.criteria_toelichting && `Toelichting criteria: ${p.criteria_toelichting}`,
      ].filter(Boolean).join('\n\n').slice(0, 4000);
      const instructions = [
        rule && `${rule}.`,
        p.rode_vlaggen?.length && `Stop en neem contact op met je fysiotherapeut bij: ${p.rode_vlaggen.map((r) => r.charAt(0).toLowerCase() + r.slice(1)).join('; ')}.`,
      ].filter(Boolean).join(' ');
      const title = clip(`${p.naam} — ${f.naam}${f.weken ? ` (wk ${f.weken})` : ''}`, 160);
      const r = await db.query(
        `INSERT INTO programs(practice_id, is_template, source_key, title, description, patient_instructions, status, created_by)
         VALUES ($1, true, $2, $3, $4, $5, 'active', $6)
         ON CONFLICT (practice_id, source_key) WHERE source_key IS NOT NULL AND is_template DO UPDATE SET
           title = EXCLUDED.title, description = EXCLUDED.description, patient_instructions = EXCLUDED.patient_instructions,
           status = 'active', updated_at = now()
         RETURNING id`,
        [practiceId, key, title, description, instructions, userId],
      );
      const programId = r.rows[0].id;
      // Item notes are shown to the patient. The file's remarks per exercise are clinical
      // ("optional, no proven benefit"), so they go into the internal description above instead.
      await db.query('DELETE FROM program_items WHERE program_id = $1', [programId]);
      for (const [pos, it] of f.oefeningen.entries()) {
        const exId = ids[it.exercise_id];
        if (!exId) continue;
        const ex = file.oefeningen.find((x) => x.id === it.exercise_id)!;
        const freq = it.frequentie_per_week;
        await db.query(
          `INSERT INTO program_items(program_id, practice_id, exercise_id, position, sets, reps, hold_s, rest_s, frequency, days, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [programId, practiceId, exId, pos, it.sets || null, it.reps || null, it.hold_sec || null, ex.dosering?.rust_sec ?? null,
            freq ? `${freq}× per week` : null, DAYS[freq ?? 7], ''],
        );
      }
      templates++;
    }
  }
  return { exercises: file.oefeningen.length, created, updated, templates };
}

/** Fills in library videos for imported exercises that are the same as one in our own library. */
export async function linkSharedVideos(db: Db) {
  let n = 0;
  for (const [key, name] of Object.entries(SAME_AS_LIBRARY)) {
    const r = await db.query(
      `UPDATE exercises e SET video_media_id = g.video_media_id
         FROM exercises g
        WHERE e.source_key = $1 AND e.practice_id IS NOT NULL AND e.video_media_id IS NULL
          AND g.practice_id IS NULL AND g.name_nl = $2 AND g.video_media_id IS NOT NULL`,
      [key, name],
    );
    n += r.rowCount ?? 0;
  }
  return n;
}
