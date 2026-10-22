import { Hono } from 'hono';
import { z } from 'zod';
import { withUser } from '../db';
import { rateLimit, type AppEnv } from '../middleware';
import { parse } from '../lib/validate';
import { badRequest, notFound } from '../lib/errors';
import { streamFile } from './media';
import { uuidParam } from '../lib/validate';
import { BODY_REGIONS, EQUIPMENT, MOVEMENT_CATEGORIES, TRAINING_CATEGORIES, WEEKDAYS } from '../../../shared/taxonomy';

export const publicRoutes = new Hono<AppEnv>();

publicRoutes.get('/meta', (c) =>
  c.json({ bodyRegions: BODY_REGIONS, trainingCategories: TRAINING_CATEGORIES, movementCategories: MOVEMENT_CATEGORIES, equipment: EQUIPMENT, weekdays: WEEKDAYS }),
);

publicRoutes.get('/plans', async (c) => {
  const rows = await withUser(null, async (tx) => (await tx.query('SELECT * FROM plans WHERE public ORDER BY sort_order')).rows);
  c.header('Cache-Control', 'public, max-age=300');
  return c.json({
    items: rows.map((r) => ({
      code: r.code,
      name: r.name,
      priceMonthCents: r.price_month_cents,
      priceYearCents: r.price_year_cents,
      limits: r.limits,
      features: r.features,
    })),
  });
});

/**
 * Contact form. Spam protection: honeypot field, minimum fill time, rate limiting.
 * Only the minimum fields are stored and explicit consent is required.
 */
publicRoutes.post('/contact', rateLimit('contact', 5, 60 * 60_000), async (c) => {
  const b = parse(
    z.object({
      name: z.string().trim().min(1).max(120),
      email: z.string().trim().email().max(254),
      practice: z.string().trim().max(160).optional().default(''),
      message: z.string().trim().min(5).max(4000),
      topic: z.enum(['demo', 'question', 'pricing', 'other']).default('demo'),
      consent: z.literal(true),
      website: z.string().max(0).optional().default(''), // honeypot: must stay empty
      startedAt: z.number().int(),
    }),
    await c.req.json(),
  );
  if (Date.now() - b.startedAt < 2500) throw badRequest('too_fast');
  await withUser(null, (tx) =>
    tx.query('INSERT INTO contact_requests(name, email, practice, message, topic, consent_at) VALUES ($1,$2,$3,$4,$5, now())', [
      b.name,
      b.email,
      b.practice || null,
      b.message,
      b.topic,
    ]),
  );
  return c.json({ ok: true }, 201);
});

/** Central-library demonstration videos for the public website (never practice or patient media). */
publicRoutes.get('/showcase', async (c) => {
  const rows = await withUser(null, async (tx) => (await tx.query('SELECT * FROM app.public_showcase(6)')).rows);
  c.header('Cache-Control', 'public, max-age=300');
  return c.json({ items: rows.map((r) => ({ mediaId: r.media_id, nameNl: r.name_nl, nameEn: r.name_en, bodyRegion: r.body_region })) });
});

publicRoutes.get('/media/:id', async (c) => {
  const id = parse(uuidParam, c.req.param('id'));
  const row = await withUser(null, async (tx) => (await tx.query('SELECT * FROM app.public_library_video($1)', [id])).rows[0]);
  if (!row) throw notFound();
  return streamFile(c, row.storage_key, row.mime_type, 'public, max-age=86400');
});
