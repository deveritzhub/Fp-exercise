import { Hono } from 'hono';
import { z } from 'zod';
import { withUser, type Tx } from '../db';
import { requireStaff, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { audit } from '../lib/audit';
import { badRequest, notFound, HttpError } from '../lib/errors';
import { uuid } from '../lib/crypto';
import { exposeInviteLinks } from '../config';
import { inviteUser, linkPatientLogin, unlinkPendingPatientLogin } from '../auth/service';
import { adherenceForPatient, loadAdherenceInputs, weeklyForPatient } from '../lib/progress';
import { ACL_MEASURE_KEYS } from '../../../shared/aclRoute';
import { isClinical } from '../../../shared/accountKind';
import { refreshBosses } from '../lib/boss';

export const patients = new Hono<AppEnv>();

export function mapPatient(r: Record<string, any>) {
  return {
    id: r.id,
    practiceId: r.practice_id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    locale: r.locale,
    externalRef: r.external_ref,
    // true only once the patient has activated their login (set a password)
    hasAccount: !!r.activated,
    invitedAt: r.invited_at,
    createdAt: r.created_at,
    archived: !!r.archived_at,
  };
}

const listQuery = z.object({
  q: z.string().max(80).optional().default(''),
  status: z.enum(['active', 'archived']).optional().default('active'),
  scope: z.enum(['mine', 'practice']).optional().default('practice'),
});

patients.get('/', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const f = parse(listQuery, c.req.query());
  return c.json(
    await withUser(user.id, async (tx) => {
      const { rows } = await tx.query(
        `SELECT pt.*, app.user_activated(pt.user_id) AS activated,
            (SELECT count(*) FROM programs p WHERE p.patient_id = pt.id AND p.status = 'active') AS active_programs,
            (SELECT p.phase_name FROM programs p WHERE p.patient_id = pt.id AND p.series_key = 'acl_vkb_flagship' AND p.status = 'active' ORDER BY p.phase_no LIMIT 1) AS acl_phase,
            (SELECT p.phase_no FROM programs p WHERE p.patient_id = pt.id AND p.series_key = 'acl_vkb_flagship' AND p.status = 'active' ORDER BY p.phase_no LIMIT 1) AS acl_phase_no,
            (SELECT max(completed_at) FROM workout_sessions s WHERE s.patient_id = pt.id) AS last_activity,
            (SELECT coalesce(json_agg(json_build_object('id', u.id, 'fullName', u.full_name)), '[]')
               FROM patient_therapists a JOIN users u ON u.id = a.therapist_id WHERE a.patient_id = pt.id) AS therapists
           FROM patients pt
          WHERE pt.practice_id = $1
            AND (CASE WHEN $2 = 'archived' THEN pt.archived_at IS NOT NULL ELSE pt.archived_at IS NULL END)
            AND ($3 = '' OR (pt.first_name || ' ' || pt.last_name) ILIKE '%' || $3 || '%' OR pt.email ILIKE '%' || $3 || '%'
                 OR pt.external_ref ILIKE '%' || $3 || '%')
            AND ($4 = 'practice' OR EXISTS (SELECT 1 FROM patient_therapists a WHERE a.patient_id = pt.id AND a.therapist_id = app.uid()))
          ORDER BY pt.last_name, pt.first_name
          LIMIT 500`,
        [practiceId, f.status, f.q.trim(), f.scope],
      );
      const inputs = await loadAdherenceInputs(tx, rows.map((r) => r.id));
      const aclIds = rows.filter((r) => r.acl_phase).map((r) => r.id);
      const aclCounts = new Map<string, { met: number; total: number }>();
      if (aclIds.length) {
        const counts = await tx.query(
          `SELECT g.patient_id,
                  count(*) FILTER (WHERE g.active AND g.defeated_at IS NOT NULL)::int AS met,
                  count(*) FILTER (WHERE g.active)::int AS total
             FROM phase_boss_goals g
             JOIN programs p ON p.id = g.program_id AND p.status = 'active' AND p.series_key = 'acl_vkb_flagship'
            WHERE g.patient_id = ANY($1::uuid[])
            GROUP BY g.patient_id`,
          [aclIds],
        );
        for (const row of counts.rows) aclCounts.set(row.patient_id, { met: Number(row.met), total: Number(row.total) });
      }
      return {
        items: rows.map((r) => ({
          ...mapPatient(r),
          activePrograms: r.active_programs,
          aclPhase: r.acl_phase ?? null,
          aclPhaseNo: r.acl_phase_no == null ? null : Number(r.acl_phase_no),
          aclMet: aclCounts.get(r.id)?.met ?? null,
          aclTotal: aclCounts.get(r.id)?.total ?? null,
          lastActivity: r.last_activity,
          therapists: r.therapists,
          adherence7d: adherenceForPatient(inputs, r.id, 7),
        })),
      };
    }),
  );
});

const patientBody = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(254).nullable().optional(),
  locale: z.enum(['nl', 'en']).default('nl'),
  externalRef: z.string().trim().max(64).nullable().optional(),
});

patients.post('/', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const b = parse(patientBody.extend({ therapistIds: z.array(z.string().uuid()).max(10).optional() }), await c.req.json());
  const id = uuid();
  await withUser(user.id, async (tx) => {
    try {
      await tx.query(
        // Clients of a coach start in krachttraining (rehab needs a physiotherapy practice).
        `INSERT INTO patients(id, practice_id, first_name, last_name, email, locale, external_ref, created_by, active_mode)
         VALUES ($1,$2,$3,$4,$5,$6,$7,app.uid(), CASE WHEN app.practice_kind($2) = 'physio' THEN 'revalidatie' ELSE 'kracht' END)`,
        [id, practiceId, b.firstName, b.lastName, b.email || null, b.locale, b.externalRef || null],
      );
    } catch (e: any) {
      if (e.code === '23505') throw new HttpError(409, 'patient_email_exists');
      throw e;
    }
    // The creator is always assigned first (this is what grants them access under RLS).
    await tx.query('INSERT INTO patient_therapists(patient_id, therapist_id, practice_id, is_primary) VALUES ($1, app.uid(), $2, true)', [id, practiceId]);
    for (const tid of b.therapistIds ?? []) {
      if (tid === user.id) continue;
      await tx.query(
        'INSERT INTO patient_therapists(patient_id, therapist_id, practice_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [id, tid, practiceId],
      );
    }
    await audit(tx, user.id, practiceId, 'create', 'patient', id);
  });
  return c.json({ id }, 201);
});

async function loadPatient(tx: Tx, id: string) {
  const { rows } = await tx.query('SELECT *, app.user_activated(user_id) AS activated FROM patients WHERE id = $1', [id]);
  return rows[0] ?? null;
}

patients.get('/:id', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(
    await withUser(user.id, async (tx) => {
      const p = await loadPatient(tx, id);
      if (!p) throw notFound();
      const therapists = await tx.query(
        `SELECT u.id, u.full_name, a.is_primary FROM patient_therapists a JOIN users u ON u.id = a.therapist_id
          WHERE a.patient_id = $1 ORDER BY a.is_primary DESC, u.full_name`,
        [id],
      );
      const programs = await tx.query(
        `SELECT p.id, p.title, p.status, p.start_date, p.end_date, p.version, p.updated_at,
                (SELECT count(*) FROM program_items i WHERE i.program_id = p.id) AS item_count
           FROM programs p WHERE p.patient_id = $1 ORDER BY (p.status = 'active') DESC, p.updated_at DESC`,
        [id],
      );
      await audit(tx, user.id, p.practice_id, 'view', 'patient', id);
      return {
        ...mapPatient(p),
        therapists: therapists.rows.map((t) => ({ id: t.id, fullName: t.full_name, isPrimary: t.is_primary })),
        programs: programs.rows.map((r) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          startDate: r.start_date,
          endDate: r.end_date,
          version: r.version,
          updatedAt: r.updated_at,
          itemCount: r.item_count,
        })),
      };
    }),
  );
});

patients.patch('/:id', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const b = parse(patientBody, await c.req.json());
  const unlink = await withUser(user.id, async (tx) => {
    const p = await loadPatient(tx, id);
    if (!p) throw notFound();
    const emailChanged = (b.email || null) !== p.email;
    if (p.activated && emailChanged) throw badRequest('email_locked_after_activation');
    const r = await tx.query(
      `UPDATE patients SET first_name=$2, last_name=$3, email=$4, locale=$5, external_ref=$6,
         invited_at = CASE WHEN $7 THEN NULL ELSE invited_at END WHERE id = $1`,
      [id, b.firstName, b.lastName, b.email || null, b.locale, b.externalRef || null, emailChanged],
    );
    if (!r.rowCount) throw notFound();
    await audit(tx, user.id, p.practice_id, 'update', 'patient', id, { fields: Object.keys(b) });
    return emailChanged && !!p.user_id;
  });
  // A pending (not yet activated) invite to the old address is withdrawn — after commit, so the
  // auth service does not wait on this transaction's row lock.
  if (unlink) await unlinkPendingPatientLogin(id);
  return c.json({ ok: true });
});

for (const [action, value] of [
  ['archive', 'now()'],
  ['restore', 'NULL'],
] as const) {
  patients.post(`/:id/${action}`, async (c) => {
    const { user } = requireStaff(c);
    const id = parse(uuidParam, c.req.param('id'));
    await withUser(user.id, async (tx) => {
      const p = await loadPatient(tx, id);
      if (!p) throw notFound();
      await tx.query(`UPDATE patients SET archived_at = ${value} WHERE id = $1`, [id]);
      if (action === 'archive') {
        await tx.query(`UPDATE programs SET status = 'archived', updated_at = now() WHERE patient_id = $1 AND status IN ('draft','active')`, [id]);
      }
      await audit(tx, user.id, p.practice_id, action, 'patient', id);
    });
    return c.json({ ok: true });
  });
}

patients.put('/:id/therapists', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const b = parse(z.object({ therapistIds: z.array(z.string().uuid()).min(1).max(10) }), await c.req.json());
  await withUser(user.id, async (tx) => {
    const p = await loadPatient(tx, id);
    if (!p) throw notFound();
    // Insert new assignments first (while the actor still has access), then remove the others.
    for (const tid of b.therapistIds) {
      await tx.query(
        'INSERT INTO patient_therapists(patient_id, therapist_id, practice_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [id, tid, p.practice_id],
      );
    }
    await tx.query('DELETE FROM patient_therapists WHERE patient_id = $1 AND NOT (therapist_id = ANY($2))', [id, b.therapistIds]);
    await audit(tx, user.id, p.practice_id, 'assign', 'patient', id, { therapists: b.therapistIds.length });
  });
  return c.json({ ok: true });
});

patients.post('/:id/invite', async (c) => {
  const { user, practiceName } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  // Authorisation check under RLS: only professionals who manage this patient get past this point.
  const p = await withUser(user.id, (tx) => loadPatient(tx, id));
  if (!p) throw notFound();
  if (!p.email) throw badRequest('patient_email_required');
  if (p.archived_at) throw badRequest('patient_archived');
  if (p.activated) throw badRequest('already_activated');
  const res = await inviteUser({
    email: p.email,
    fullName: `${p.first_name} ${p.last_name}`,
    locale: p.locale,
    practiceName,
    kind: 'patient',
    beforeSend: (userId) => linkPatientLogin(id, userId),
  });
  await withUser(user.id, async (tx) => {
    await tx.query('UPDATE patients SET invited_at = now() WHERE id = $1', [id]);
    await audit(tx, user.id, p.practice_id, 'invite', 'patient', id);
  });
  // The link is only returned outside production (to support demo + automated tests).
  return c.json({ ok: true, ...(exposeInviteLinks ? { inviteUrl: res.inviteUrl } : {}) });
});

const measuredDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{
  const d=new Date(v+'T12:00:00Z');
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;
},{message:'Invalid calendar date'});

const outcomeBody = z.object({
  domain: z.enum(['rom', 'strength', 'function', 'confidence']),
  metric: z.string().trim().min(1).max(80),
  metricKey: z.string().regex(/^[a-z0-9_]{2,40}$/).optional(),
  value: z.number().finite().min(0).max(100000),
  unit: z.enum(['degrees', 'kg', 'N', 'Nm', 'score_0_10', 'percent', 'grade', 'seconds', 'cm']),
  side: z.enum(['left', 'right', 'bilateral', 'not_applicable']).default('not_applicable'),
  measuredOn: measuredDate,
  note: z.string().trim().max(300).default(''),
}).superRefine((v, ctx) => {
  const ok = (v.domain === 'rom' && v.unit === 'degrees' && v.value <= 360)
    || (v.domain === 'strength' && (v.unit === 'kg' || v.unit === 'N' || v.unit === 'Nm'))
    || (v.domain === 'function' && ((v.unit === 'score_0_10' && v.value <= 10) || (v.unit === 'percent' && v.value <= 100) || (v.unit === 'grade' && v.value <= 4) || (v.unit === 'seconds' && v.value <= 600) || (v.unit === 'cm' && v.value <= 2000)))
    || (v.domain === 'confidence' && ((v.unit === 'score_0_10' && v.value <= 10) || (v.unit === 'percent' && v.value <= 100)));
  if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'unit', path: ['unit'] });
});

patients.post('/:id/outcomes', async (c)=>{
  const {user}=requireStaff(c);
  const id=parse(uuidParam,c.req.param('id'));
  const b=parse(outcomeBody,await c.req.json());
  return c.json(await withUser(user.id,async(tx)=>{
    const p=await loadPatient(tx,id);
    if(!p)throw notFound();
    if (b.metricKey && ACL_MEASURE_KEYS.has(b.metricKey)) {
      const kind = (await tx.query('SELECT kind FROM practices WHERE id = $1', [p.practice_id])).rows[0]?.kind;
      if (!isClinical(kind)) throw badRequest('clinical_measure');
    }
    const r=await tx.query(`INSERT INTO patient_outcomes
      (patient_id,practice_id,recorded_by,measured_on,domain,metric,metric_key,value,unit,side,note)
      VALUES ($1,$2,app.uid(),$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id,measured_on,domain,metric,metric_key,value,unit,side,note,created_at`,
      [id,p.practice_id,b.measuredOn,b.domain,b.metric,b.metricKey ?? null,b.value,b.unit,b.side,b.note]);
    await audit(tx,user.id,p.practice_id,'create','patient_outcome',r.rows[0].id,{domain:b.domain});
    await refreshBosses(tx, id);
    return {item:mapOutcome(r.rows[0])};
  }),201);
});

const mapOutcome=(r:any)=>({
  id:r.id,measuredOn:r.measured_on,domain:r.domain,metric:r.metric,metricKey:r.metric_key ?? null,
  value:Number(r.value),unit:r.unit,side:r.side,note:r.note,createdAt:r.created_at,
});

patients.get('/:id/progress', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const weeks = Math.min(26, Math.max(1, Number(c.req.query('weeks') ?? 8)));
  return c.json(
    await withUser(user.id, async (tx) => {
      const p = await loadPatient(tx, id);
      if (!p) throw notFound();
      const inputs = await loadAdherenceInputs(tx, [id]);
      const sessions = await tx.query(
        `SELECT s.id, s.program_id, pr.title AS program_title, s.started_at, s.completed_at, s.difficulty, s.pain,
                s.feedback, s.reviewed_at, s.review_note,
                (SELECT coalesce(json_agg(json_build_object(
                    'exerciseId', l.exercise_id, 'nameNl', e.name_nl, 'nameEn', e.name_en, 'completed', l.completed,
                    'setsDone', l.sets_done, 'repsDone', l.reps_done, 'difficulty', l.difficulty, 'pain', l.pain,
                    'feedback', l.feedback, 'plannedHoldS', i.hold_s, 'plannedSets', i.sets) ORDER BY i.position), '[]')
                   FROM exercise_logs l JOIN exercises e ON e.id = l.exercise_id
                   LEFT JOIN program_items i ON i.id = l.program_item_id
                  WHERE l.session_id = s.id) AS logs
           FROM workout_sessions s JOIN programs pr ON pr.id = s.program_id
          WHERE s.patient_id = $1
          ORDER BY s.started_at DESC LIMIT 100`,
        [id],
      );
      const outcomes=await tx.query(
        `SELECT id,measured_on,domain,metric,metric_key,value,unit,side,note,created_at
           FROM patient_outcomes WHERE patient_id=$1
           ORDER BY measured_on DESC,created_at DESC LIMIT 100`,[id]);
      const perExercise = await tx.query(
        `SELECT l.exercise_id, e.name_nl, e.name_en, count(*) FILTER (WHERE l.completed) AS completed,
                count(*) AS logged, round(avg(l.difficulty)::numeric, 1) AS avg_difficulty,
                round(avg(l.pain)::numeric, 1) AS avg_pain, max(l.pain) AS max_pain
           FROM exercise_logs l JOIN exercises e ON e.id = l.exercise_id
          WHERE l.patient_id = $1 AND l.created_at > now() - make_interval(days => $2)
          GROUP BY l.exercise_id, e.name_nl, e.name_en ORDER BY e.name_nl`,
        [id, weeks * 7],
      );
      return {
        weekly: weeklyForPatient(inputs, id, weeks),
        adherence7d: adherenceForPatient(inputs, id, 7),
        adherence28d: adherenceForPatient(inputs, id, 28),
        completedSessions: sessions.rows.filter((s) => s.completed_at).length,
        sessions: sessions.rows.map((s) => ({
          id: s.id,
          programId: s.program_id,
          programTitle: s.program_title,
          startedAt: s.started_at,
          completedAt: s.completed_at,
          difficulty: s.difficulty,
          pain: s.pain,
          feedback: s.feedback,
          reviewedAt: s.reviewed_at,
          reviewNote: s.review_note ?? null,
          logs: s.logs,
        })),
        outcomes: outcomes.rows.map(mapOutcome),
        perExercise: perExercise.rows.map((r) => ({
          exerciseId: r.exercise_id,
          nameNl: r.name_nl,
          nameEn: r.name_en,
          completed: r.completed,
          logged: r.logged,
          avgDifficulty: r.avg_difficulty === null ? null : Number(r.avg_difficulty),
          avgPain: r.avg_pain === null ? null : Number(r.avg_pain),
          maxPain: r.max_pain,
        })),
      };
    }),
  );
});

/** GDPR/AVG: machine-readable export of everything stored about this patient. */
patients.get('/:id/export', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const data = await withUser(user.id, async (tx) => {
    const p = await loadPatient(tx, id);
    if (!p) throw notFound();
    const q = async (sql: string) => (await tx.query(sql, [id])).rows;
    const out = {
      exportedAt: new Date().toISOString(),
      patient: mapPatient(p),
      programs: await q('SELECT * FROM programs WHERE patient_id = $1'),
      programItems: await q('SELECT i.* FROM program_items i JOIN programs p ON p.id = i.program_id WHERE p.patient_id = $1'),
      sessions: await q('SELECT * FROM workout_sessions WHERE patient_id = $1'),
      exerciseLogs: await q('SELECT * FROM exercise_logs WHERE patient_id = $1'),
      outcomeMeasurements: await q('SELECT * FROM patient_outcomes WHERE patient_id = $1'),
    };
    await audit(tx, user.id, p.practice_id, 'export', 'patient', id);
    return out;
  });
  c.header('Content-Disposition', `attachment; filename="patient-export-${id}.json"`);
  return c.json(data);
});

patients.post('/sessions/:sessionId/review', async (c) => {
  const { user } = requireStaff(c);
  const sid = parse(uuidParam, c.req.param('sessionId'));
  // Optional short reply to the patient, delivered as a notification in their app.
  const b = parse(z.object({ reply: z.string().trim().max(500).default('') }), await c.req.json().catch(() => ({})));
  const delivered = await withUser(user.id, async (tx) => {
    const r = await tx.query(
      `UPDATE workout_sessions SET reviewed_at = now(), reviewed_by = app.uid(), review_note = coalesce(nullif($2, ''), review_note)
        WHERE id = $1 AND app.can_manage_patient(patient_id) RETURNING practice_id, patient_id`,
      [sid, b.reply],
    );
    if (!r.rowCount) throw notFound();
    await audit(tx, user.id, r.rows[0].practice_id, 'review', 'workout_session', sid);
    if (!b.reply) return false;
    const pt = (await tx.query('SELECT user_id, locale FROM patients WHERE id = $1', [r.rows[0].patient_id])).rows[0];
    if (!pt?.user_id) return false;
    await tx.query(
      'INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5,$6)',
      [pt.user_id, r.rows[0].practice_id, 'feedback_reply', pt.locale === 'en' ? 'Reply from your physiotherapist' : 'Reactie van je fysiotherapeut', b.reply, '/p/voortgang'],
    );
    return true;
  });
  return c.json({ ok: true, delivered });
});
