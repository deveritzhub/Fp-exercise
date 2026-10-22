import { Hono } from 'hono';
import { z } from 'zod';
import { withUser } from '../db';
import { requirePlatformAdmin, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { audit } from '../lib/audit';
import { HttpError, notFound } from '../lib/errors';
import { uuid } from '../lib/crypto';
import { exposeInviteLinks } from '../config';
import { assertNotPatient, inviteUser } from '../auth/service';

/**
 * Platform administration. Deliberately has no access to patients, programs or activity:
 * the overview is produced by a SECURITY DEFINER function that returns aggregate counts only.
 */
export const admin = new Hono<AppEnv>();

admin.get('/practices', async (c) => {
  const u = requirePlatformAdmin(c);
  const rows = await withUser(u.id, async (tx) => (await tx.query('SELECT * FROM app.platform_practice_overview()')).rows);
  return c.json({
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      city: r.city,
      planCode: r.plan_code,
      subscriptionStatus: r.subscription_status,
      createdAt: r.created_at,
      archived: !!r.archived_at,
      members: r.members,
      activePatients: r.active_patients,
      customExercises: r.custom_exercises,
    })),
  });
});

admin.post('/practices', async (c) => {
  const u = requirePlatformAdmin(c);
  const b = parse(
    z.object({
      name: z.string().trim().min(2).max(160),
      slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/),
      city: z.string().trim().max(80).nullable().optional(),
      planCode: z.string().default('trial'),
      ownerEmail: z.string().trim().toLowerCase().email(),
      ownerName: z.string().trim().min(2).max(160),
    }),
    await c.req.json(),
  );
  const id = uuid();
  await withUser(u.id, async (tx) => {
    try {
      await tx.query(
        // New practices start with two-factor authentication required for all staff.
        `INSERT INTO practices(id, name, slug, city, plan_code, trial_ends_at, settings)
         VALUES ($1,$2,$3,$4,$5, now() + interval '30 days', '{"requireMfa": true}')`,
        [id, b.name, b.slug, b.city ?? null, b.planCode],
      );
    } catch (e: any) {
      if (e.code === '23505') throw new HttpError(409, 'slug_taken');
      throw e;
    }
    await audit(tx, u.id, id, 'create', 'practice', id);
  });
  const res = await inviteUser({
    email: b.ownerEmail,
    fullName: b.ownerName,
    locale: 'nl',
    practiceName: b.name,
    kind: 'staff',
    beforeSend: async (userId) => {
      await assertNotPatient(userId);
      await withUser(u.id, (tx) =>
        tx.query(`INSERT INTO practice_members(practice_id, user_id, role) VALUES ($1,$2,'owner')`, [id, userId]),
      );
    },
  });
  return c.json({ id, ...(exposeInviteLinks ? { inviteUrl: res.inviteUrl } : {}) }, 201);
});

admin.patch('/practices/:id', async (c) => {
  const u = requirePlatformAdmin(c);
  const id = parse(uuidParam, c.req.param('id'));
  const b = parse(
    z.object({
      planCode: z.string().optional(),
      subscriptionStatus: z.enum(['trialing', 'active', 'past_due', 'canceled', 'none']).optional(),
      archived: z.boolean().optional(),
    }),
    await c.req.json(),
  );
  await withUser(u.id, async (tx) => {
    const r = await tx.query(
      `UPDATE practices SET plan_code = coalesce($2, plan_code), subscription_status = coalesce($3, subscription_status),
         archived_at = CASE WHEN $4::boolean IS NULL THEN archived_at WHEN $4 THEN now() ELSE NULL END
       WHERE id = $1`,
      [id, b.planCode ?? null, b.subscriptionStatus ?? null, b.archived ?? null],
    );
    if (!r.rowCount) throw notFound();
    await audit(tx, u.id, id, 'update', 'practice', id, b);
  });
  return c.json({ ok: true });
});
