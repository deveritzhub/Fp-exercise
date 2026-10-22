import { Hono } from 'hono';
import { z } from 'zod';
import { withUser } from '../db';
import { requireStaff, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { audit } from '../lib/audit';
import { badRequest, notFound } from '../lib/errors';
import { exposeInviteLinks } from '../config';
import { assertNotPatient, inviteUser } from '../auth/service';

export const practice = new Hono<AppEnv>();

practice.get('/', async (c) => {
  const { user, practiceId } = requireStaff(c);
  return c.json(
    await withUser(user.id, async (tx) => {
      const { rows } = await tx.query(
        `SELECT p.*, pl.name AS plan_name, pl.limits,
                (SELECT count(*) FROM practice_members m WHERE m.practice_id = p.id AND m.active) AS members,
                (SELECT count(*) FROM patients x WHERE x.practice_id = p.id AND x.archived_at IS NULL) AS active_patients
           FROM practices p JOIN plans pl ON pl.code = p.plan_code WHERE p.id = $1`,
        [practiceId],
      );
      const p = rows[0];
      if (!p) throw notFound();
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        city: p.city,
        country: p.country,
        defaultLocale: p.default_locale,
        branding: p.branding,
        settings: p.settings,
        plan: { code: p.plan_code, name: p.plan_name, limits: p.limits, status: p.subscription_status, trialEndsAt: p.trial_ends_at },
        usage: { members: p.members, activePatients: p.active_patients },
      };
    }),
  );
});

practice.patch('/', async (c) => {
  const { user, practiceId } = requireStaff(c, ['owner', 'admin']);
  const b = parse(
    z.object({
      name: z.string().trim().min(2).max(160),
      city: z.string().trim().max(80).nullable().optional(),
      defaultLocale: z.enum(['nl', 'en']),
      branding: z.object({ accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }).default({}),
    }),
    await c.req.json(),
  );
  await withUser(user.id, async (tx) => {
    await tx.query('UPDATE practices SET name=$2, city=$3, default_locale=$4, branding=$5 WHERE id = $1', [
      practiceId,
      b.name,
      b.city ?? null,
      b.defaultLocale,
      b.branding,
    ]);
    await audit(tx, user.id, practiceId, 'update', 'practice', practiceId);
  });
  return c.json({ ok: true });
});

practice.get('/members', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const rows = await withUser(user.id, async (tx) =>
    (
      await tx.query(
        `SELECT m.user_id, m.role, m.title, m.active, m.created_at, u.full_name, u.email, app.user_activated(u.id) AS activated,
                (SELECT count(*) FROM patient_therapists a JOIN patients p ON p.id = a.patient_id
                  WHERE a.therapist_id = m.user_id AND p.practice_id = m.practice_id AND p.archived_at IS NULL) AS patients
           FROM practice_members m JOIN users u ON u.id = m.user_id
          WHERE m.practice_id = $1 ORDER BY m.active DESC, u.full_name`,
        [practiceId],
      )
    ).rows,
  );
  return c.json({
    items: rows.map((r) => ({
      userId: r.user_id,
      fullName: r.full_name,
      email: r.email,
      role: r.role,
      title: r.title,
      active: r.active,
      patients: r.patients,
      activated: r.activated,
      createdAt: r.created_at,
    })),
  });
});

practice.post('/members', async (c) => {
  const { user, practiceId, practiceName, role: myRole } = requireStaff(c, ['owner', 'admin']);
  const b = parse(
    z.object({
      email: z.string().trim().toLowerCase().email().max(254),
      fullName: z.string().trim().min(2).max(160),
      role: z.enum(['admin', 'therapist', 'owner']),
      title: z.string().trim().max(80).nullable().optional(),
      locale: z.enum(['nl', 'en']).default('nl'),
    }),
    await c.req.json(),
  );
  if (b.role === 'owner' && myRole !== 'owner') throw badRequest('only_owner_can_add_owner');
  // Plan limits (billing architecture): enforce therapist seat limit.
  await withUser(user.id, async (tx) => {
    const { rows } = await tx.query(
      `SELECT (pl.limits->>'therapists')::int AS max, (SELECT count(*) FROM practice_members m WHERE m.practice_id = p.id AND m.active) AS n
         FROM practices p JOIN plans pl ON pl.code = p.plan_code WHERE p.id = $1`,
      [practiceId],
    );
    if (rows[0]?.max && rows[0].n >= rows[0].max) throw badRequest('plan_limit_therapists');
  });
  const res = await inviteUser({
    email: b.email,
    fullName: b.fullName,
    locale: b.locale,
    practiceName,
    kind: 'staff',
    beforeSend: async (userId) => {
      await assertNotPatient(userId);
      await withUser(user.id, async (tx) => {
        await tx.query(
          `INSERT INTO practice_members(practice_id, user_id, role, title) VALUES ($1,$2,$3,$4)
           ON CONFLICT (practice_id, user_id) DO UPDATE SET active = true, role = EXCLUDED.role, title = EXCLUDED.title`,
          [practiceId, userId, b.role, b.title ?? null],
        );
        await audit(tx, user.id, practiceId, 'invite', 'member', userId, { role: b.role });
      });
    },
  });
  return c.json({ ok: true, userId: res.userId, ...(exposeInviteLinks ? { inviteUrl: res.inviteUrl } : {}) }, 201);
});

practice.patch('/members/:userId', async (c) => {
  const { user, practiceId, role: myRole } = requireStaff(c, ['owner', 'admin']);
  const target = parse(uuidParam, c.req.param('userId'));
  const b = parse(z.object({ role: z.enum(['owner', 'admin', 'therapist']).optional(), active: z.boolean().optional() }), await c.req.json());
  await withUser(user.id, async (tx) => {
    const cur = await tx.query('SELECT role FROM practice_members WHERE practice_id = $1 AND user_id = $2', [practiceId, target]);
    if (!cur.rows[0]) throw notFound();
    if ((cur.rows[0].role === 'owner' || b.role === 'owner') && myRole !== 'owner') throw badRequest('only_owner_can_change_owner');
    await tx.query(
      'UPDATE practice_members SET role = coalesce($3, role), active = coalesce($4, active) WHERE practice_id = $1 AND user_id = $2',
      [practiceId, target, b.role ?? null, b.active ?? null],
    );
    const owners = await tx.query(`SELECT count(*) AS n FROM practice_members WHERE practice_id = $1 AND role = 'owner' AND active`, [practiceId]);
    if (owners.rows[0].n < 1) throw badRequest('last_owner');
    await audit(tx, user.id, practiceId, 'update', 'member', target, b);
  });
  return c.json({ ok: true });
});

practice.get('/audit', async (c) => {
  const { user, practiceId } = requireStaff(c, ['owner', 'admin']);
  const rows = await withUser(user.id, async (tx) =>
    (
      await tx.query(
        `SELECT a.id, a.at, a.action, a.entity, a.entity_id, a.meta, u.full_name AS actor
           FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
          WHERE a.practice_id = $1 ORDER BY a.at DESC LIMIT 200`,
        [practiceId],
      )
    ).rows,
  );
  return c.json({
    items: rows.map((r) => ({ id: r.id, at: r.at, action: r.action, entity: r.entity, entityId: r.entity_id, meta: r.meta, actor: r.actor })),
  });
});
