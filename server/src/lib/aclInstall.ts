import { ACL_PHASES, ACL_REVIEW_BANNER, ACL_SERIES_KEY, type AclCriterion, type AclPhase } from '../../../shared/aclRoute';
import type { Tx } from '../db';

const EVIDENCE = [
  'Standaardwaarden voor een criteriegestuurde VKB-route. Nakijken vóór gebruik in de zorg.',
  'van Melick 2016, Br J Sports Med; Adams 2012, JOSPT; Grindem 2016, Br J Sports Med; Kyritsis 2016, Br J Sports Med; Noyes 1991, Clin Orthop Relat Res; Webster 2008, Phys Ther Sport; Sturgill 2009, JOSPT.',
  'Drempels verschillen per protocol en per chirurg. Deze app geeft geen vrijgave.',
].join(' ');

export async function installAclRoute(db: Tx, opts: {
  practiceId: string;
  patientId: string;
  therapistId: string;
  side: 'left' | 'right';
  /** Phase that stays active. Earlier phases are completed; later ones stay draft. */
  currentPhase?: number;
  surgeryOn?: string | null;
  startOn?: string | null;
}) {
  const current = opts.currentPhase ?? 1;
  const existing = await db.query(
    `SELECT 1 FROM programs WHERE patient_id = $1 AND series_key = $2 AND NOT is_template LIMIT 1`,
    [opts.patientId, ACL_SERIES_KEY],
  );
  if (existing.rows[0]) return { already: true as const, programIds: [] as string[] };

  const templates = await ensureTemplates(db, opts.practiceId, opts.therapistId);
  const programIds: string[] = [];
  for (const phase of ACL_PHASES) {
    const templateId = templates.get(phase.no);
    const status = phase.no < current ? 'completed' : phase.no === current ? 'active' : 'draft';
    const program = await db.query(
      `INSERT INTO programs(practice_id, patient_id, is_template, title, description, patient_instructions, status,
         module, series_key, series_title, indication, phase_no, phase_count, phase_name, phase_weeks, phase_goal,
         map_region, source_template_id, created_by, activated_at, start_date)
       VALUES ($1,$2,false,$3,$4,$5,$6,'revalidatie',$7,$8,$9,$10,$11,$12,$13,$14,'knee',$15,$16,
         CASE WHEN $6 = 'draft' THEN NULL ELSE now() END,
         CASE WHEN $6 = 'draft' THEN NULL
              WHEN $6 = 'active' AND $18::date IS NOT NULL THEN $18::date
              ELSE current_date - make_interval(days => $17::int) END)
       RETURNING id`,
      [
        opts.practiceId, opts.patientId, titleFor(phase), descriptionFor(phase),
        'Je therapeut beoordeelt de metingen. De volgende zone gaat niet vanzelf open.',
        status, ACL_SERIES_KEY, 'VKB-route',
        'Na een voorstekruisbandletsel. Standaardwaarden, door de fysiotherapeut aan te passen.',
        phase.no, ACL_PHASES.length, phase.zoneNl, phase.weeks, phase.goalNl,
        templateId ?? null,         opts.therapistId, (ACL_PHASES.length - phase.no) * 21, opts.startOn ?? null,
      ],
    );
    const id = program.rows[0].id as string;
    programIds.push(id);
    await addExercise(db, id, opts.practiceId, phase.exerciseNameNl);
    await insertGoals(db, id, opts, phase);
  }
  await db.query(
    `INSERT INTO acl_routes(patient_id, practice_id, side, surgery_on, start_on)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (patient_id) DO UPDATE SET side = EXCLUDED.side, surgery_on = EXCLUDED.surgery_on, start_on = EXCLUDED.start_on`,
    [opts.patientId, opts.practiceId, opts.side, opts.surgeryOn ?? null, opts.startOn ?? null],
  );
  return { already: false as const, programIds };
}

async function ensureTemplates(db: Tx, practiceId: string, therapistId: string) {
  const have = await db.query(
    `SELECT id, phase_no FROM programs WHERE practice_id = $1 AND is_template AND series_key = $2`,
    [practiceId, ACL_SERIES_KEY],
  );
  const map = new Map<number, string>(have.rows.map((r) => [Number(r.phase_no), r.id as string]));
  for (const phase of ACL_PHASES) {
    if (map.has(phase.no)) continue;
    const row = await db.query(
      `INSERT INTO programs(practice_id, patient_id, is_template, title, description, patient_instructions, status,
         module, series_key, series_title, indication, phase_no, phase_count, phase_name, phase_weeks, phase_goal,
         map_region, evidence, created_by)
       VALUES ($1,NULL,true,$2,$3,$4,'active','revalidatie',$5,'VKB-route',$6,$7,$8,$9,$10,$11,'knee',$12,$13)
       RETURNING id`,
      [
        practiceId, titleFor(phase), descriptionFor(phase),
        'Je therapeut beoordeelt de metingen. De volgende zone gaat niet vanzelf open.',
        ACL_SERIES_KEY, 'Na een voorstekruisbandletsel. Alleen voor een fysiotherapiepraktijk.',
        phase.no, ACL_PHASES.length, phase.zoneNl, phase.weeks, phase.goalNl,
        EVIDENCE.slice(0, 2000), therapistId,
      ],
    );
    const id = row.rows[0].id as string;
    map.set(phase.no, id);
    await addExercise(db, id, practiceId, phase.exerciseNameNl);
  }
  return map;
}

function titleFor(phase: AclPhase) {
  return `VKB-route — ${phase.zoneNl}`.slice(0, 160);
}

function descriptionFor(phase: AclPhase) {
  const lines = [
    ACL_REVIEW_BANNER.nl,
    `Zone ${phase.zoneNl}. Baas ${phase.bossNl}.`,
    ...phase.criteria.map((c) => `${c.clinicalNl} Patiënt ziet: "${c.labelNl}".`),
  ];
  return lines.join('\n').slice(0, 4000);
}

async function addExercise(db: Tx, programId: string, practiceId: string, nameNl: string) {
  const found = await db.query(
    `SELECT id FROM exercises
      WHERE body_region = 'knee' AND (practice_id IS NULL OR practice_id = $1)
      ORDER BY (name_nl = $2) DESC, (practice_id IS NULL) DESC
      LIMIT 1`,
    [practiceId, nameNl],
  );
  const exerciseId = found.rows[0]?.id as string | undefined;
  if (!exerciseId) return;
  await db.query(
    `INSERT INTO program_items(program_id, practice_id, exercise_id, position, sets, reps, days, notes)
     VALUES ($1,$2,$3,0,3,10,'{1,2,3,4,5,6,7}','')`,
    [programId, practiceId, exerciseId],
  );
}

async function insertGoals(db: Tx, programId: string, opts: { practiceId: string; patientId: string; side: 'left' | 'right' }, phase: AclPhase) {
  for (const c of phase.criteria) await insertGoal(db, programId, opts, phase, c);
}

async function insertGoal(db: Tx, programId: string, opts: { practiceId: string; patientId: string; side: 'left' | 'right' }, phase: AclPhase, c: AclCriterion) {
  const source = c.mode === 'value' ? 'outcome' : 'lsi';
  const side = c.sided ? opts.side : 'not_applicable';
  const involved = c.mode === 'value' ? null : opts.side;
  await db.query(
    `INSERT INTO phase_boss_goals(practice_id, patient_id, program_id, source, domain, metric, unit, side, test_key,
       comparator, target, label_nl, label_en, slot, measure_key, boss_nl, boss_en, clinical_nl, clinical_en, involved_side, mode)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      opts.practiceId, opts.patientId, programId, source, c.domain, c.mode === 'value' ? c.labelNl : null, c.unit, side,
      c.comparator, c.target, c.labelNl, c.labelEn, c.slot, c.measureKey, phase.bossNl, phase.bossEn,
      c.clinicalNl.slice(0, 600), c.clinicalEn.slice(0, 600), involved, c.mode,
    ],
  );
}
