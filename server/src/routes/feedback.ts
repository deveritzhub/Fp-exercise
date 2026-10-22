import { Hono } from 'hono';
import { z } from 'zod';
import { withUser } from '../db';
import { config } from '../config';
import { requireUser, type AppEnv } from '../middleware';
import { parse } from '../lib/validate';
import { HttpError } from '../lib/errors';

export const feedback = new Hono<AppEnv>();

/** In-app feedback from therapists and patients (test phase and beyond). */
feedback.post('/', async (c) => {
  const user = requireUser(c);
  const b = parse(
    z.object({
      kind: z.enum(['idea', 'problem', 'praise']),
      message: z.string().trim().min(1).max(2000),
      page: z.string().max(200).optional(),
      device: z.string().max(200).optional(),
    }),
    await c.req.json(),
  );
  const wanted = c.req.header('x-practice-id');
  const m = (wanted && user.memberships.find((x) => x.practiceId === wanted)) || user.memberships[0];
  const practiceId = m?.practiceId ?? user.patient?.practiceId ?? null;
  const role = m?.role ?? (user.patient ? 'patient' : user.isPlatformAdmin ? 'platform_admin' : null);
  if (!role) throw new HttpError(403, 'forbidden');
  // Only the path, never query strings (could hold search terms).
  const page = b.page?.split('?')[0];
  await withUser(user.id, (tx) =>
    tx.query('INSERT INTO feedback(user_id, practice_id, role, kind, message, page, device) VALUES (app.uid(),$1,$2,$3,$4,$5,$6)', [
      practiceId, role, b.kind, b.message, page ?? null, b.device ?? null,
    ]),
  );
  // On the synthetic-data demo, feedback also goes to the server log so the developer can read it
  // right away. Never in a real production setup: feedback might mention a person.
  if (config.demoMode) {
    console.log(`[feedback] ${b.kind} · ${role} · ${page ?? '-'} · ${b.message.replace(/\s+/g, ' ').slice(0, 600)}`);
  }
  return c.json({ ok: true }, 201);
});

feedback.get('/', async (c) => {
  const user = requireUser(c);
  const isAdmin = user.isPlatformAdmin || user.memberships.some((m) => m.role !== 'therapist');
  if (!isAdmin) throw new HttpError(403, 'forbidden');
  if (user.mfaRequired) throw new HttpError(403, 'mfa_required');
  const rows = await withUser(user.id, async (tx) =>
    (
      await tx.query(
        `SELECT f.id, f.kind, f.role, f.message, f.page, f.device, f.created_at, u.full_name, p.name AS practice
           FROM feedback f LEFT JOIN users u ON u.id = f.user_id LEFT JOIN practices p ON p.id = f.practice_id
          ORDER BY f.created_at DESC LIMIT 300`,
      )
    ).rows,
  );
  return c.json({
    items: rows.map((r) => ({
      id: r.id, kind: r.kind, role: r.role, message: r.message, page: r.page, device: r.device,
      createdAt: r.created_at, author: r.full_name, practice: r.practice,
    })),
  });
});
