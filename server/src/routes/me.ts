import { Hono } from 'hono';
import { z } from 'zod';
import { withUser } from '../db';
import { requireUser, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';

export const me = new Hono<AppEnv>();

me.patch('/', async (c) => {
  const user = requireUser(c);
  const b = parse(z.object({ fullName: z.string().trim().min(1).max(160), locale: z.enum(['nl', 'en']) }), await c.req.json());
  await withUser(user.id, (tx) => tx.query('UPDATE users SET full_name = $2, locale = $3 WHERE id = $1', [user.id, b.fullName, b.locale]));
  return c.json({ ok: true });
});

me.get('/notifications', async (c) => {
  const user = requireUser(c);
  const rows = await withUser(user.id, async (tx) =>
    (
      await tx.query(
        'SELECT id, kind, title, body, link, read_at, created_at FROM notifications WHERE user_id = app.uid() ORDER BY created_at DESC LIMIT 50',
      )
    ).rows,
  );
  return c.json({
    items: rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, link: r.link, readAt: r.read_at, createdAt: r.created_at })),
    unread: rows.filter((r) => !r.read_at).length,
  });
});

me.post('/notifications/read-all', async (c) => {
  const user = requireUser(c);
  await withUser(user.id, (tx) => tx.query('UPDATE notifications SET read_at = now() WHERE user_id = app.uid() AND read_at IS NULL'));
  return c.json({ ok: true });
});

me.post('/notifications/:id/read', async (c) => {
  const user = requireUser(c);
  const id = parse(uuidParam, c.req.param('id'));
  await withUser(user.id, (tx) => tx.query('UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = app.uid()', [id]));
  return c.json({ ok: true });
});
