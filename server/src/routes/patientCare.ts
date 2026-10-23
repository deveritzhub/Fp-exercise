import { Hono } from 'hono';
import { z } from 'zod';
import { withUser } from '../db';
import { requireStaff, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { audit } from '../lib/audit';
import { badRequest, HttpError, notFound } from '../lib/errors';
import { loadStrength } from '../lib/strengthData';
import { eraseLogin } from '../auth/service';
import { STRENGTH_TRANSITION } from '../../../shared/strength';

/**
 * Therapist side of the FP app update: modules and consent per patient, the transition checklist to
 * the strength module (W09), red-flag reports (W11), strength progress (only with consent) and
 * deletion requests (W15, owner/admin).
 */
export const patientCare = new Hono<AppEnv>();
export const redFlags = new Hono<AppEnv>();

async function managedPatient(tx: any, id: string) {
  const { rows } = await tx.query('SELECT id, practice_id, strength_cleared_at, strength_cleared_by FROM patients WHERE id = $1', [id]);
  if (!rows[0]) throw notFound();
  return rows[0];
}

patientCare.get('/:id/modules', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(
    await withUser(user.id, async (tx) => {
      const p = await managedPatient(tx, id);
      const consents = (await tx.query('SELECT module, granted_at, revoked_at FROM patient_module_consents WHERE patient_id = $1 ORDER BY granted_at DESC', [id])).rows;
      const checks = (
        await tx.query(
          `SELECT c.item_no, c.checked_at, u.full_name FROM strength_transition_checks c LEFT JOIN users u ON u.id = c.checked_by WHERE c.patient_id = $1`,
          [id],
        )
      ).rows;
      const clearedBy = p.strength_cleared_by ? (await tx.query('SELECT full_name FROM users WHERE id = $1', [p.strength_cleared_by])).rows[0]?.full_name : null;
      const flags = (
        await tx.query(
          `SELECT r.id, r.flags, r.note, r.created_at, r.handled_at, r.handled_note, u.full_name AS handled_by, pr.title AS program_title
             FROM red_flag_reports r LEFT JOIN users u ON u.id = r.handled_by LEFT JOIN programs pr ON pr.id = r.program_id
            WHERE r.patient_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
          [id],
        )
      ).rows;
      const deletion = (await tx.query('SELECT id, reason, created_at, handled_at, outcome FROM deletion_requests WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 1', [id])).rows[0];
      const active = (m: string) => consents.find((x) => x.module === m && !x.revoked_at)?.granted_at ?? null;
      return {
        consents: { kracht: active('kracht'), mobiliteit: active('mobiliteit') },
        consentHistory: consents.map((x) => ({ module: x.module, grantedAt: x.granted_at, revokedAt: x.revoked_at })),
        strength: {
          items: STRENGTH_TRANSITION,
          checks: checks.map((x) => ({ no: x.item_no, checkedAt: x.checked_at, checkedBy: x.full_name })),
          cleared: p.strength_cleared_at ? { at: p.strength_cleared_at, by: clearedBy } : null,
        },
        redFlags: flags.map((r) => ({
          id: r.id, programTitle: r.program_title, flags: r.flags, note: r.note, createdAt: r.created_at,
          handledAt: r.handled_at, handledBy: r.handled_by, handledNote: r.handled_note,
        })),
        deletionRequest: deletion
          ? { id: deletion.id, reason: deletion.reason, createdAt: deletion.created_at, handledAt: deletion.handled_at, outcome: deletion.outcome }
          : null,
      };
    }),
  );
});

/** W09: tick one item of the rehab → strength checklist. */
patientCare.put('/:id/transition/:no', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const no = parse(z.coerce.number().int().min(0).max(STRENGTH_TRANSITION.length - 1), c.req.param('no'));
  await withUser(user.id, async (tx) => {
    const p = await managedPatient(tx, id);
    await tx.query(
      `INSERT INTO strength_transition_checks(patient_id, practice_id, item_no, label, checked_by) VALUES ($1,$2,$3,$4,app.uid())
       ON CONFLICT (patient_id, item_no) DO NOTHING`,
      [id, p.practice_id, no, STRENGTH_TRANSITION[no]],
    );
    await audit(tx, user.id, p.practice_id, 'check', 'strength_transition', id, { no });
  });
  return c.json({ ok: true });
});

patientCare.delete('/:id/transition/:no', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const no = parse(z.coerce.number().int().min(0).max(19), c.req.param('no'));
  await withUser(user.id, async (tx) => {
    const p = await managedPatient(tx, id);
    await tx.query('DELETE FROM strength_transition_checks WHERE patient_id = $1 AND item_no = $2', [id, no]);
    await audit(tx, user.id, p.practice_id, 'uncheck', 'strength_transition', id, { no });
  });
  return c.json({ ok: true });
});

/** W09: the therapist confirms the transition (all items ticked). Never automatic. */
patientCare.post('/:id/strength-clearance', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  await withUser(user.id, async (tx) => {
    const p = await managedPatient(tx, id);
    const n = (await tx.query('SELECT count(*)::int AS n FROM strength_transition_checks WHERE patient_id = $1', [id])).rows[0].n;
    if (n < STRENGTH_TRANSITION.length) throw badRequest('transition_incomplete');
    await tx.query('UPDATE patients SET strength_cleared_at = now(), strength_cleared_by = app.uid() WHERE id = $1', [id]);
    await audit(tx, user.id, p.practice_id, 'strength_cleared', 'patient', id);
  });
  return c.json({ ok: true });
});

patientCare.delete('/:id/strength-clearance', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  await withUser(user.id, async (tx) => {
    const p = await managedPatient(tx, id);
    await tx.query('UPDATE patients SET strength_cleared_at = NULL, strength_cleared_by = NULL WHERE id = $1', [id]);
    await audit(tx, user.id, p.practice_id, 'strength_clearance_withdrawn', 'patient', id);
  });
  return c.json({ ok: true });
});

/** Strength progress: only returns data when the patient shared the strength module (RLS). */
patientCare.get('/:id/strength', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(
    await withUser(user.id, async (tx) => {
      await managedPatient(tx, id);
      const shared = (await tx.query("SELECT app.staff_sees_module($1, 'kracht') AS ok", [id])).rows[0].ok;
      return shared ? { shared: true, ...(await loadStrength(tx, id)) } : { shared: false, exercises: [] };
    }),
  );
});

/** W15: carry out or decline a deletion request (practice owner/admin, as data controller). */
patientCare.post('/:id/deletion/:requestId', async (c) => {
  const { user, practiceId } = requireStaff(c, ['owner', 'admin']);
  const id = parse(uuidParam, c.req.param('id'));
  const rid = parse(uuidParam, c.req.param('requestId'));
  const b = parse(z.object({ outcome: z.enum(['deleted', 'declined']), note: z.string().trim().max(1000).optional(), confirm: z.string().optional() }), await c.req.json());
  const login = await withUser(user.id, async (tx) => {
    const r = (await tx.query('SELECT id, patient_id FROM deletion_requests WHERE id = $1 AND patient_id = $2 AND handled_at IS NULL', [rid, id])).rows[0];
    if (!r) throw notFound();
    if (b.outcome === 'declined') {
      if (!b.note) throw badRequest('reason_required');
      await tx.query("UPDATE deletion_requests SET handled_at = now(), handled_by = app.uid(), outcome = 'declined', outcome_note = $2 WHERE id = $1", [rid, b.note]);
      await audit(tx, user.id, practiceId, 'deletion_declined', 'patient', id);
      return null;
    }
    if (b.confirm !== 'VERWIJDEREN') throw badRequest('confirmation_required');
    const u = (await tx.query('SELECT app.delete_patient_on_request($1) AS login', [rid])).rows[0].login as string | null;
    await audit(tx, user.id, practiceId, 'patient_deleted_on_request', 'patient', id);
    return u;
  });
  if (login) await eraseLogin(login);
  return c.json({ ok: true });
});

/** W11: mark a red-flag report as handled (after contact); the programme can be used again. */
redFlags.post('/:id/handle', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const b = parse(z.object({ note: z.string().trim().min(1).max(1000) }), await c.req.json());
  await withUser(user.id, async (tx) => {
    const r = (await tx.query('SELECT practice_id, patient_id FROM red_flag_reports WHERE id = $1 AND handled_at IS NULL', [id])).rows[0];
    if (!r) throw notFound();
    const u = await tx.query('UPDATE red_flag_reports SET handled_at = now(), handled_by = app.uid(), handled_note = $2 WHERE id = $1', [id, b.note]);
    if (!u.rowCount) throw new HttpError(403, 'forbidden');
    await audit(tx, user.id, r.practice_id, 'red_flag_handled', 'patient', r.patient_id);
  });
  return c.json({ ok: true });
});
