/**
 * Development seed — SYNTHETIC DATA ONLY. Never run against a production database.
 * Creates plans, the original demo exercise library, global templates, two isolated demo practices
 * and synthetic patients with activity history.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { EXERCISES, RELATIONS, TEMPLATES } from './seed-data/exercises';

export const DEMO_PASSWORD = 'Demo-wachtwoord-1';

export const DEMO_USERS = {
  admin: { email: 'admin@fp-exercise.test', name: 'Platform Beheer' },
  ownerA: { email: 'eigenaar@praktijk-a.test', name: 'Sanne Visser' },
  therapistA: { email: 'therapeut@praktijk-a.test', name: 'Joris Bakker' },
  patientA: { email: 'patient@praktijk-a.test', name: 'Emma de Jong' },
  ownerB: { email: 'eigenaar@praktijk-b.test', name: 'Lotte Smit' },
  therapistB: { email: 'therapeut@praktijk-b.test', name: 'Milan Meijer' },
  patientB: { email: 'patient@praktijk-b.test', name: 'Noah Mulder' },
} as const;

const TABLES = [
  'exercise_logs', 'workout_sessions', 'notifications', 'template_favorites', 'program_versions', 'program_items',
  'programs', 'exercise_favorites', 'exercise_relations', 'exercise_clinical_notes', 'exercises', 'media',
  'patient_therapists', 'patients', 'auth_tokens', 'auth_sessions', 'mail_outbox', 'practice_members', 'users',
  'practices', 'plans', 'audit_log', 'contact_requests',
];

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setHours(18, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};
const isoWeekday = (d: Date) => ((d.getDay() + 6) % 7) + 1;

export async function seed(connectionString = process.env.DATABASE_OWNER_URL!, opts: { activity?: boolean; quiet?: boolean } = {}) {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed in production');
  const activity = opts.activity ?? true;
  const db = new pg.Client({ connectionString });
  await db.connect();
  const log = (...a: unknown[]) => !opts.quiet && console.log(...a);
  try {
    await db.query('BEGIN');
    await db.query(`TRUNCATE ${TABLES.join(', ')} CASCADE`);

    await db.query(`INSERT INTO plans(code, name, price_month_cents, price_year_cents, limits, features, sort_order, public) VALUES
      ('trial','Proefperiode',0,0,'{"therapists":3,"active_patients":50,"days":30}','{"Volledige functionaliteit","30 dagen"}',0,false),
      ('solo','Solo',3900,39000,'{"therapists":1,"active_patients":150}','{"1 therapeut","Oefenbibliotheek","Programmabouwer","Patiëntapp","Voortgangsmonitoring"}',1,true),
      ('praktijk','Praktijk',2900,29000,'{"therapists":15,"active_patients":2000}','{"Per therapeut","Eigen oefeningen en video''s","Gedeelde praktijksjablonen","Praktijkbeheer","Auditlog"}',2,true),
      ('organisatie','Organisatie',NULL,NULL,'{}','{"Meerdere locaties","Eigen huisstijl","SSO (gepland)","Verwerkersovereenkomst op maat"}',3,true)`);

    const hash = await bcrypt.hash(DEMO_PASSWORD, process.env.VITEST ? 4 : 10);
    const ids: Record<string, string> = {};
    for (const [k, u] of Object.entries(DEMO_USERS)) {
      const r = await db.query(
        `INSERT INTO users(email, full_name, password_hash, email_verified_at, is_platform_admin) VALUES ($1,$2,$3,now(),$4) RETURNING id`,
        [u.email, u.name, hash, k === 'admin'],
      );
      ids[k] = r.rows[0].id;
    }

    const pA = (await db.query(
      `INSERT INTO practices(name, slug, city, plan_code, subscription_status, trial_ends_at)
       VALUES ('Functional Performance (demo)','functional-performance-demo','Rotterdam','praktijk','trialing', now() + interval '30 days') RETURNING id`,
    )).rows[0].id;
    const pB = (await db.query(
      `INSERT INTO practices(name, slug, city, plan_code, subscription_status, trial_ends_at)
       VALUES ('Fysio Noord (demo)','fysio-noord-demo','Utrecht','solo','trialing', now() + interval '30 days') RETURNING id`,
    )).rows[0].id;
    await db.query(`INSERT INTO practice_members(practice_id, user_id, role, title) VALUES
      ($1,$3,'owner','Praktijkhouder / fysiotherapeut'), ($1,$4,'therapist','Sportfysiotherapeut'),
      ($2,$5,'owner','Praktijkhouder'), ($2,$6,'therapist','Fysiotherapeut')`,
      [pA, pB, ids.ownerA, ids.therapistA, ids.ownerB, ids.therapistB]);

    // ---- global exercise library
    const ex: Record<string, string> = {};
    for (const e of EXERCISES) {
      const r = await db.query(
        `INSERT INTO exercises(practice_id, created_by, name_nl, name_en, alt_names, body_region, target_muscles, movement_category,
           training_categories, equipment, difficulty, starting_position_nl, starting_position_en, movement_nl, movement_en,
           instructions_nl, instructions_en, default_sets, default_reps, default_hold_s, default_rest_s, default_tempo,
           default_frequency, tags)
         VALUES (NULL,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING id`,
        [ids.admin, e.nl, e.en, e.alt ?? [], e.region, e.muscles, e.movement ?? null, e.training, e.equipment, e.difficulty,
          e.startNl, e.startEn, e.moveNl, e.moveEn, e.cuesNl, e.cuesEn, e.d.sets ?? null, e.d.reps ?? null, e.d.holdS ?? null,
          e.d.restS ?? null, e.d.tempo ?? null, e.d.frequency ?? null, e.tags ?? []],
      );
      ex[e.key] = r.rows[0].id;
      await db.query('INSERT INTO exercise_clinical_notes(exercise_id, practice_id, notes) VALUES ($1, NULL, $2)', [ex[e.key], e.notes]);
    }
    for (const [a, b, kind] of RELATIONS) {
      await db.query('INSERT INTO exercise_relations(exercise_id, related_id, kind) VALUES ($1,$2,$3)', [ex[a], ex[b], kind]);
    }
    // ---- practice-specific exercises (used to verify tenant isolation)
    const customA = (await db.query(
      `INSERT INTO exercises(practice_id, created_by, name_nl, name_en, body_region, target_muscles, movement_category, training_categories,
         equipment, difficulty, movement_nl, movement_en, instructions_nl, instructions_en, default_sets, default_reps, tags)
       VALUES ($1,$2,'Sledge push (FP-variant)','Sled push (FP variant)','full_body','{m. quadriceps femoris,m. gluteus maximus}','push',
         '{strength,conditioning,sport_specific}','{gym_machine}',4,'Duw de slede met korte krachtige passen over 15 meter.',
         'Push the sled with short powerful steps over 15 metres.','Romp schuin naar voren, armen gestrekt.','Lean the trunk forward, arms straight.',4,1,'{praktijk-a}') RETURNING id`,
      [pA, ids.ownerA],
    )).rows[0].id;
    await db.query(`INSERT INTO exercise_clinical_notes(exercise_id, practice_id, notes) VALUES ($1,$2,'Alleen in de oefenzaal, onder begeleiding.')`, [customA, pA]);
    const customB = (await db.query(
      `INSERT INTO exercises(practice_id, created_by, name_nl, name_en, body_region, training_categories, equipment, difficulty, movement_nl, movement_en)
       VALUES ($1,$2,'Traplopen met leuning (Noord)','Stair walking with rail (Noord)','knee','{conditioning}','{step}',2,
         'Loop rustig de trap op en af met één hand aan de leuning.','Walk up and down the stairs slowly with one hand on the rail.') RETURNING id`,
      [pB, ids.ownerB],
    )).rows[0].id;
    await db.query(`INSERT INTO exercise_clinical_notes(exercise_id, practice_id, notes) VALUES ($1,$2,'Valrisico beoordelen.')`, [customB, pB]);

    // ---- templates
    const tmpl: Record<string, string> = {};
    const exDefaults = new Map(EXERCISES.map((e) => [e.key, e.d]));
    const addItems = async (programId: string, practiceId: string | null, items: { ex: string; days?: number[]; notes?: string }[]) => {
      for (const [i, it] of items.entries()) {
        const d = exDefaults.get(it.ex)!;
        await db.query(
          `INSERT INTO program_items(program_id, practice_id, exercise_id, position, sets, reps, hold_s, rest_s, tempo, frequency, days, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [programId, practiceId, ex[it.ex], i, d.sets ?? null, d.reps ?? null, d.holdS ?? null, d.restS ?? null, d.tempo ?? null,
            d.frequency ?? null, it.days ?? [1, 2, 3, 4, 5, 6, 7], it.notes ?? ''],
        );
      }
    };
    for (const t of TEMPLATES) {
      const r = await db.query(
        `INSERT INTO programs(practice_id, is_template, title, description, patient_instructions, status, created_by)
         VALUES (NULL, true, $1, $2, $3, 'active', $4) RETURNING id`,
        [t.title, t.description + ' Startpunt voor professionele aanpassing — geen geautomatiseerd behandeladvies.', t.instructions, ids.admin],
      );
      tmpl[t.title] = r.rows[0].id;
      await addItems(r.rows[0].id, null, t.items);
    }
    const practiceTemplate = (await db.query(
      `INSERT INTO programs(practice_id, is_template, title, description, status, created_by)
       VALUES ($1, true, 'FP — Return to run basis', 'Praktijksjabloon Functional Performance (demo).', 'active', $2) RETURNING id`,
      [pA, ids.ownerA],
    )).rows[0].id;
    await addItems(practiceTemplate, pA, [{ ex: 'sl_calf_raise' }, { ex: 'seated_soleus' }, { ex: 'pogo_hops', days: [2, 5] }, { ex: 'single_leg_bridge' }]);

    // ---- patients (synthetic)
    const patient = async (practice: string, first: string, last: string, email: string | null, therapist: string, userId: string | null, creator: string, invitedDaysAgo?: number) => {
      const r = await db.query(
        `INSERT INTO patients(practice_id, user_id, first_name, last_name, email, created_by, invited_at)
         VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $7::int IS NULL THEN NULL ELSE now() - make_interval(days => $7::int) END) RETURNING id`,
        [practice, userId, first, last, email, creator, invitedDaysAgo ?? null],
      );
      await db.query('INSERT INTO patient_therapists(patient_id, therapist_id, practice_id, is_primary) VALUES ($1,$2,$3,true)', [r.rows[0].id, therapist, practice]);
      return r.rows[0].id as string;
    };
    const emma = await patient(pA, 'Emma', 'de Jong', DEMO_USERS.patientA.email, ids.therapistA, ids.patientA, ids.therapistA, 25);
    const lucas = await patient(pA, 'Lucas', 'Jansen', 'lucas.jansen@voorbeeld.test', ids.therapistA, null, ids.therapistA, 5);
    const sophie = await patient(pA, 'Sophie', 'van Dijk', 'sophie.vandijk@voorbeeld.test', ids.ownerA, null, ids.ownerA);
    const daan = await patient(pA, 'Daan', 'Bos', null, ids.therapistA, null, ids.therapistA);
    const noah = await patient(pB, 'Noah', 'Mulder', DEMO_USERS.patientB.email, ids.therapistB, ids.patientB, ids.therapistB, 20);
    await patient(pB, 'Fleur', 'Hendriks', 'fleur.hendriks@voorbeeld.test', ids.therapistB, null, ids.therapistB);

    const program = async (practice: string, patientId: string, templateTitle: string, title: string, status: string, creator: string, startedDaysAgo: number, weeks = 8) => {
      const t = TEMPLATES.find((x) => x.title === templateTitle)!;
      const start = daysAgo(startedDaysAgo);
      const end = new Date(start);
      end.setDate(end.getDate() + weeks * 7);
      const r = await db.query(
        `INSERT INTO programs(practice_id, patient_id, title, description, patient_instructions, status, start_date, end_date,
           source_template_id, created_by, activated_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CASE WHEN $6 = 'active' THEN $11::timestamptz END, $11::timestamptz) RETURNING id`,
        [practice, patientId, title, t.description, t.instructions, status, iso(start), iso(end), tmpl[templateTitle], creator, start],
      );
      await addItems(r.rows[0].id, practice, t.items);
      const items = await db.query('SELECT p.*, row_to_json(p) AS j FROM program_items p WHERE program_id = $1 ORDER BY position', [r.rows[0].id]);
      await db.query(
        `INSERT INTO program_versions(program_id, practice_id, version, snapshot, change_note, created_by) VALUES ($1,$2,1,$3,'created',$4)`,
        [r.rows[0].id, practice, { items: items.rows.map((x) => x.j) }, creator],
      );
      return { id: r.rows[0].id as string, items: items.rows, start };
    };
    const progEmma = await program(pA, emma, 'Patellapees — belastingsopbouw', 'Knie — patellapees belastingsopbouw', 'active', ids.therapistA, 21);
    await program(pA, sophie, 'Rotator cuff — krachtopbouw', 'Schouder — rotator cuff opbouw', 'active', ids.ownerA, 10);
    await program(pA, lucas, 'Enkel — na inversietrauma', 'Enkel — herstel na verstuiking', 'draft', ids.therapistA, 0, 6);
    const progNoah = await program(pB, noah, 'Achillespees — belastingsopbouw', 'Achillespees — opbouw', 'active', ids.therapistB, 18);

    await db.query('INSERT INTO exercise_favorites(user_id, exercise_id) VALUES ($1,$2),($1,$3),($1,$4)', [ids.therapistA, ex.spanish_squat, ex.er_band, ex.sl_calf_raise]);
    await db.query('INSERT INTO template_favorites(user_id, program_id) VALUES ($1,$2)', [ids.therapistA, tmpl['Patellapees — belastingsopbouw']]);

    // ---- synthetic activity history
    if (activity) {
      const rand = rng(42);
      const history = async (practice: string, patientId: string, p: { id: string; items: any[]; start: Date }, rate: number, painBase: number) => {
        for (let n = Math.floor((Date.now() - p.start.getTime()) / 86400000); n >= 1; n--) {
          const day = daysAgo(n);
          const due = p.items.filter((i) => i.days.includes(isoWeekday(day)));
          if (!due.length || rand() > rate) continue;
          const pain = Math.max(0, Math.min(10, Math.round(painBase - (21 - n) * 0.1 + (rand() * 2 - 1))));
          const s = await db.query(
            `INSERT INTO workout_sessions(practice_id, patient_id, program_id, program_version, started_at, completed_at, difficulty, pain, feedback, reviewed_at)
             VALUES ($1,$2,$3,1,$4::timestamptz - interval '25 minutes',$4,$5,$6,$7,$8) RETURNING id`,
            [practice, patientId, p.id, day, Math.round(4 + rand() * 3), pain,
              n === 2 ? 'De decline squat voelde zwaar, maar de pijn was de volgende ochtend weer weg.' : null,
              n > 7 ? day : null],
          );
          for (const it of due) {
            await db.query(
              `INSERT INTO exercise_logs(session_id, practice_id, patient_id, program_item_id, exercise_id, completed, sets_done, reps_done, difficulty, pain, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
              [s.rows[0].id, practice, patientId, it.id, it.exercise_id, rand() > 0.08, it.sets, it.reps, Math.round(3 + rand() * 4), pain, day],
            );
          }
        }
      };
      await history(pA, emma, progEmma, 0.72, 4);
      await history(pB, noah, progNoah, 0.6, 3);
      // A recent high pain report for the "requires attention" list
      await db.query(
        `UPDATE workout_sessions SET pain = 6, reviewed_at = NULL WHERE id = (SELECT id FROM workout_sessions WHERE patient_id = $1 ORDER BY completed_at DESC LIMIT 1)`,
        [emma],
      );
      await db.query(
        `INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1,$2,'program_assigned','Nieuw oefenprogramma',$3,'/p')`,
        [ids.patientA, pA, 'Je fysiotherapeut heeft "Knie — patellapees belastingsopbouw" voor je klaargezet.'],
      );
    }
    void daan;
    await db.query('COMMIT');
    log(`Seeded ${EXERCISES.length + 2} exercises, ${TEMPLATES.length + 1} templates, 2 practices, 6 patients.`);
    log(`Demo password for all accounts: ${DEMO_PASSWORD}`);
    return { users: ids, practices: { A: pA, B: pB }, exercises: ex, customA, customB, patients: { emma, lucas, sophie, daan, noah }, programs: { emma: progEmma.id, noah: progNoah.id }, templates: tmpl };
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  } finally {
    await db.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seed();
}
