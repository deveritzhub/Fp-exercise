import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import { withUser, type Tx } from '../db';
import { requirePatient, type AppEnv } from '../middleware';
import { parse } from '../lib/validate';
import { HttpError, badRequest } from '../lib/errors';
import { sha256 } from '../lib/crypto';
import { config } from '../config';
import { STEPS } from '../../../shared/patientLogs';
import {
  authorizeUrl, exchangeCode, fetchDailySteps, healthConfigured, openSeal, pkcePair, readIdentity, refreshAccess, revokeToken, seal,
} from '../lib/googleHealth';

/** Daily steps: Google Health sync plus a manual fallback. Patient only. */
export const stepRoutes = new Hono<AppEnv>();

const STATE_COOKIE = 'fp_steps_oauth';
const back = (flag: string) => `/p/logboek?steps=${encodeURIComponent(flag)}#stappen`;

stepRoutes.put('/logs/steps/goal', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ steps: z.number().int().min(STEPS.goalMin).max(STEPS.goalMax) }), await c.req.json());
  await withUser(user.id, (tx) =>
    tx.query(
      `INSERT INTO step_goals(patient_id, practice_id, steps) VALUES ($1, app.patient_practice($1), $2)
       ON CONFLICT (patient_id) DO UPDATE SET steps = EXCLUDED.steps, updated_at = now()`,
      [patient.id, b.steps],
    ),
  );
  return c.json({ ok: true });
});

stepRoutes.put('/logs/steps', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ steps: z.number().int().min(0).max(STEPS.maxSteps) }), await c.req.json());
  await withUser(user.id, (tx) =>
    tx.query(
      `INSERT INTO step_days(patient_id, practice_id, day, steps, source) VALUES ($1, app.patient_practice($1), now()::date, $2, 'manual')
       ON CONFLICT (patient_id, day) DO UPDATE SET steps = EXCLUDED.steps, source = 'manual', updated_at = now()`,
      [patient.id, b.steps],
    ),
  );
  return c.json({ ok: true });
});

stepRoutes.get('/logs/steps/google/start', async (c) => {
  const { user, patient } = requirePatient(c);
  if (!healthConfigured()) return c.redirect(back('off'), 302);
  const { verifier, challenge } = pkcePair();
  const state = cryptoRandom();
  await withUser(user.id, (tx) =>
    tx.query(
      `INSERT INTO fitness_oauth_states(patient_id, state_hash, code_verifier, expires_at)
       VALUES ($1, $2, $3, now() + interval '10 minutes')`,
      [patient.id, sha256(state), verifier],
    ),
  );
  setCookie(c, STATE_COOKIE, state, { httpOnly: true, secure: config.isProd, sameSite: 'Lax', path: '/api/patient/logs/steps/google', maxAge: 600 });
  return c.redirect(authorizeUrl(state, challenge), 302);
});

stepRoutes.get('/logs/steps/google/callback', async (c) => {
  const { user, patient } = requirePatient(c);
  const q = c.req.query();
  const sent = getCookie(c, STATE_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: '/api/patient/logs/steps/google' });
  if (q.error) return c.redirect(back(q.error === 'access_denied' ? 'denied' : 'error'), 302);
  if (!sent || !q.code) return c.redirect(back('error'), 302);
  const row = await withUser(user.id, async (tx) => {
    const found = await tx.query(
      `DELETE FROM fitness_oauth_states WHERE patient_id = $1 AND state_hash = $2 AND expires_at > now()
       RETURNING code_verifier`,
      [patient.id, sha256(sent)],
    );
    return found.rows[0] as { code_verifier: string } | undefined;
  });
  if (!row) return c.redirect(back('error'), 302);
  try {
    const tokens = await exchangeCode(q.code, row.code_verifier);
    const who = await readIdentity(tokens.accessToken);
    if ('notLinked' in who) {
      await revokeToken(tokens.refreshToken || tokens.accessToken);
      return c.redirect(back('not_linked'), 302);
    }
    await withUser(user.id, async (tx) => {
      await tx.query(
        `INSERT INTO fitness_connections(patient_id, provider, practice_id, external_user_id, access_token, refresh_token, expires_at, scope)
         VALUES ($1, 'google_health', app.patient_practice($1), $2, $3, $4, $5, $6)
         ON CONFLICT (patient_id, provider) DO UPDATE SET
           external_user_id = EXCLUDED.external_user_id, access_token = EXCLUDED.access_token,
           refresh_token = COALESCE(EXCLUDED.refresh_token, fitness_connections.refresh_token),
           expires_at = EXCLUDED.expires_at, scope = EXCLUDED.scope, connected_at = now()`,
        [patient.id, who.healthUserId, seal(tokens.accessToken), tokens.refreshToken ? seal(tokens.refreshToken) : null, tokens.expiresAt, tokens.scope],
      );
      await pullSteps(tx, patient.id);
    });
  } catch {
    return c.redirect(back('error'), 302);
  }
  return c.redirect(back('connected'), 302);
});

stepRoutes.post('/logs/steps/google/sync', async (c) => {
  const { user, patient } = requirePatient(c);
  if (!healthConfigured()) throw badRequest('steps_provider_off');
  try {
    await withUser(user.id, async (tx) => {
      const ok = await pullSteps(tx, patient.id);
      if (!ok) throw badRequest('steps_sync_failed');
    });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw badRequest('steps_sync_failed');
  }
  return c.json({ ok: true });
});

stepRoutes.delete('/logs/steps/google', async (c) => {
  const { user, patient } = requirePatient(c);
  const token = await withUser(user.id, async (tx) => {
    const row = (await tx.query(
      `DELETE FROM fitness_connections WHERE patient_id = $1 AND provider = 'google_health' RETURNING access_token, refresh_token`,
      [patient.id],
    )).rows[0] as { access_token: string; refresh_token: string | null } | undefined;
    return row;
  });
  if (token) {
    const raw = token.refresh_token ? openSafe(token.refresh_token) : openSafe(token.access_token);
    if (raw) await revokeToken(raw);
  }
  return c.json({ ok: true });
});

function cryptoRandom() {
  return globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID();
}

function openSafe(payload: string) {
  try {
    return openSeal(payload);
  } catch {
    return null;
  }
}

/** Refresh if needed, then store up to a week of daily totals. Returns false when there is no connection. */
async function pullSteps(tx: Tx, patientId: string) {
  const row = (await tx.query(
    `SELECT access_token, refresh_token, expires_at FROM fitness_connections WHERE patient_id = $1 AND provider = 'google_health'`,
    [patientId],
  )).rows[0] as { access_token: string; refresh_token: string | null; expires_at: Date | null } | undefined;
  if (!row) return false;
  let access = openSeal(row.access_token);
  const refresh = row.refresh_token ? openSeal(row.refresh_token) : null;
  const exp = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (refresh && exp < Date.now() + 60_000) {
    const next = await refreshAccess(refresh);
    access = next.accessToken;
    await tx.query(
      `UPDATE fitness_connections SET access_token = $2, refresh_token = $3, expires_at = $4 WHERE patient_id = $1 AND provider = 'google_health'`,
      [patientId, seal(next.accessToken), next.refreshToken ? seal(next.refreshToken) : row.refresh_token, next.expiresAt],
    );
  }
  const today = (await tx.query("SELECT to_char(now(), 'YYYY-MM-DD') AS d")).rows[0].d as string;
  const days = await fetchDailySteps(access, today);
  for (const d of days) {
    await tx.query(
      `INSERT INTO step_days(patient_id, practice_id, day, steps, source) VALUES ($1, app.patient_practice($1), $2, $3, 'google_health')
       ON CONFLICT (patient_id, day) DO UPDATE SET steps = EXCLUDED.steps, source = 'google_health', updated_at = now()`,
      [patientId, d.day, d.steps],
    );
  }
  await tx.query(`UPDATE fitness_connections SET synced_at = now() WHERE patient_id = $1 AND provider = 'google_health'`, [patientId]);
  return true;
}
