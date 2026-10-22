import { Hono } from 'hono';
import { z } from 'zod';
import { requirePatient, rateLimit, type AppEnv } from '../middleware';
import { parse } from '../lib/validate';
import * as push from '../auth/push';

export const reminders = new Hono<AppEnv>();

reminders.get('/', async (c) => {
  const { user } = requirePatient(c);
  return c.json(await push.getSettings(user.id));
});

reminders.put('/', async (c) => {
  const { user } = requirePatient(c);
  const b = parse(z.object({ enabled: z.boolean(), time: z.string().regex(/^([01]\d|2[0-1]):[03]0$/) }), await c.req.json());
  await push.saveSettings(user.id, b.enabled, b.time);
  return c.json({ ok: true });
});

const subscription = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
});

reminders.post('/subscribe', rateLimit('push-subscribe', 20, 15 * 60_000), async (c) => {
  const { user } = requirePatient(c);
  await push.subscribe(user.id, parse(subscription, await c.req.json()));
  return c.json({ ok: true });
});

reminders.post('/unsubscribe', async (c) => {
  const { user } = requirePatient(c);
  const b = parse(z.object({ endpoint: z.string().max(1000) }), await c.req.json());
  await push.unsubscribe(user.id, b.endpoint);
  return c.json({ ok: true });
});

reminders.post('/test', rateLimit('push-test', 5, 15 * 60_000), async (c) => {
  const { user } = requirePatient(c);
  return c.json({ sent: await push.sendTest(user.id, user.locale) });
});
