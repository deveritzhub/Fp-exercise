import { readFile } from 'node:fs/promises';
import { heroAssetFile, isHeroAsset } from './lib/heroAssets';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { serveStatic } from '@hono/node-server/serve-static';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';
import { authPool } from './db';
import { csrfMiddleware, sessionMiddleware, type AppEnv } from './middleware';
import { HttpError } from './lib/errors';
import { authRoutes } from './routes/auth';
import { me } from './routes/me';
import { exercises } from './routes/exercises';
import { media } from './routes/media';
import { patients } from './routes/patients';
import { programs } from './routes/programs';
import { patientApp } from './routes/patientApp';
import { dashboard } from './routes/dashboard';
import { practice } from './routes/practice';
import { admin } from './routes/admin';
import { publicRoutes } from './routes/public';
import { feedback } from './routes/feedback';
import { reminders } from './routes/reminders';
import { patientModules } from './routes/patientModules';
import { mobilityPatient, mobilityStaff } from './routes/mobilityTests';
import { heroPatient, heroStaff } from './routes/hero';
import { patientLogs } from './routes/patientLogs';
import { gymPatient, gymStaff } from './routes/gymLog';
import { atlasPatient, atlasStaff } from './routes/atlas';
import { stepRoutes } from './routes/steps';
import { patientCare, redFlags } from './routes/patientCare';
import { worldPatient, worldStaff } from './routes/world';
import { bossProgram, bossPatient } from './routes/boss';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
      },
      strictTransportSecurity: config.isProd ? 'max-age=63072000; includeSubDomains' : false,
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
    }),
  );

  const api = new Hono<AppEnv>();
  api.use('*', async (c, next) => {
    await next();
    // API responses may contain personal data: never cache in shared caches.
    if (!c.res.headers.get('Cache-Control')) c.header('Cache-Control', 'no-store');
  });
  // Request size: JSON and forms at most 5 MB (a practice library file is ~0.2 MB). This also caps
  // how much a validator has to look at. Media uploads have their own, larger limit (MAX_UPLOAD_MB).
  const jsonLimit = bodyLimit({ maxSize: 5 * 1024 * 1024, onError: (c) => c.json({ error: 'request_too_large' }, 413) });
  api.use('*', (c, next) => (c.req.path.startsWith('/api/media') ? next() : jsonLimit(c, next)));
  api.use('*', csrfMiddleware);
  api.use('*', sessionMiddleware);

  api.get('/health', (c) => c.json({ ok: true }));
  // Generated hero art (generic, no personal data): served from private storage, cached by the browser.
  api.get('/hero-assets/:kind/:key', async (c) => {
    const kind = c.req.param('kind');
    const key = c.req.param('key').replace(/\.png$/, '');
    if (!isHeroAsset(kind, key)) return c.json({ error: 'not_found' }, 404);
    const buf = await readFile(heroAssetFile(config.storageDir, kind, key)).catch(() => null);
    if (!buf) return c.json({ error: 'not_found' }, 404);
    c.header('Content-Type', 'image/png');
    c.header('Cache-Control', 'public, max-age=604800, immutable');
    return c.body(new Uint8Array(buf));
  });
  api.route('/auth', authRoutes);
  api.route('/me', me);
  api.route('/public', publicRoutes);
  api.route('/exercises', exercises);
  api.route('/media', media);
  api.route('/patients', patients);
  api.route('/patients', patientCare);
  api.route('/red-flags', redFlags);
  api.route('/programs', programs);
  api.route('/programs', bossProgram);
  api.route('/patients', bossPatient);
  api.route('/patient', patientApp);
  api.route('/patient', worldPatient);
  api.route('/patient', patientModules);
  api.route('/patient', heroPatient);
  api.route('/patient', patientLogs);
  api.route('/patient', gymPatient);
  api.route('/patient', atlasPatient);
  api.route('/atlas', atlasStaff);
  api.route('/patient', stepRoutes);
  api.route('/patients', heroStaff);
  api.route('/patients', gymStaff);
  api.route('/patient', mobilityPatient);
  api.route('/patients', mobilityStaff);
  api.route('/dashboard', dashboard);
  api.route('/practice', practice);
  api.route('/practice', worldStaff);
  api.route('/admin', admin);
  api.route('/feedback', feedback);
  api.route('/reminders', reminders);

  if (!config.isProd) {
    // Development helper: read the mail outbox (synthetic data only). Disabled in production.
    api.get('/dev/outbox', async (c) => {
      const to = c.req.query('to');
      const { rows } = await authPool.query(
        'SELECT to_email, subject, body, created_at FROM mail_outbox WHERE ($1::text IS NULL OR to_email = $1) ORDER BY created_at DESC LIMIT 20',
        [to ?? null],
      );
      return c.json({ items: rows });
    });
  }

  // Digital Asset Links: proves the Google Play app belongs to this site, so it opens full screen
  // (without address bar). Empty until the app's signing certificate is configured.
  app.get('/.well-known/assetlinks.json', (c) => {
    const { packageName, fingerprints } = config.android;
    c.header('Cache-Control', 'public, max-age=3600');
    return c.json(
      packageName && fingerprints.length
        ? [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints } }]
        : [],
    );
  });

  app.route('/api', api);
  // Unknown API paths must never fall through to the SPA fallback below.
  app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404));

  const webDist = path.resolve(import.meta.dirname, '../../dist/web');
  if (config.isProd && fs.existsSync(webDist)) {
    const root = path.relative(process.cwd(), webDist);
    app.use('/assets/*', async (c, next) => {
      await next();
      c.header('Cache-Control', 'public, max-age=31536000, immutable');
    });
    // The service worker must always be revalidated, or app updates would get stuck.
    app.use('/sw.js', async (c, next) => {
      await next();
      c.header('Cache-Control', 'no-cache');
    });
    app.use('*', serveStatic({ root }));
    app.get('*', serveStatic({ root, path: 'index.html' }));
  }

  app.onError((err, c) => {
    if (err instanceof HttpError) {
      return c.json({ error: err.code, details: err.details }, err.status as 400);
    }
    if (err instanceof HTTPException) return c.json({ error: 'http_error' }, err.status);
    const pgCode = (err as { code?: string }).code;
    // Rules enforced in the database that the app explains in its own words.
    const hint = (err as { hint?: string }).hint;
    if (hint && ['rehab_needs_physio', 'strength_not_cleared'].includes(hint)) return c.json({ error: hint }, 409);
    if (pgCode === '42501') return c.json({ error: 'forbidden' }, 403); // RLS / privilege violation
    if (pgCode === '23503' || pgCode === '23514' || pgCode === '22P02') return c.json({ error: 'invalid_request' }, 400);
    // Privacy-conscious logging: no request bodies or query parameters.
    console.error(`[error] ${c.req.method} ${c.req.routePath} ${(err as Error).name}: ${(err as Error).message}`);
    return c.json({ error: 'internal_error' }, 500);
  });

  return app;
}
