import QRCode from 'qrcode';
import { authPool } from '../db';
import { sha256 } from '../lib/crypto';
import { HttpError, badRequest } from '../lib/errors';
import { verifyPassword } from './password';
import { authAudit, consumeToken, createSession, peekToken, registerFailure } from './service';
import { generateRecoveryCodes, generateSecret, normalizeRecoveryCode, otpauthUri, verifyTotp } from './totp';

/**
 * Checks a 6-digit authenticator code or a single-use recovery code for a user with MFA set up.
 * A TOTP step is recorded atomically, so the same code cannot be accepted twice (not even concurrently).
 */
async function checkSecondFactor(userId: string, code: string): Promise<'totp' | 'recovery' | null> {
  const clean = code.replace(/\s/g, '');
  const { rows } = await authPool.query('SELECT mfa_secret, mfa_last_step FROM users WHERE id = $1', [userId]);
  const u = rows[0];
  if (!u?.mfa_secret) return null;
  if (/^\d{6}$/.test(clean)) {
    const step = verifyTotp(u.mfa_secret, clean, u.mfa_last_step === null ? null : Number(u.mfa_last_step));
    if (step === null) return null;
    const r = await authPool.query(
      'UPDATE users SET mfa_last_step = $2 WHERE id = $1 AND (mfa_last_step IS NULL OR mfa_last_step < $2)',
      [userId, step],
    );
    return r.rowCount === 1 ? 'totp' : null;
  }
  const norm = normalizeRecoveryCode(clean);
  if (norm.length !== 12) return null;
  const r = await authPool.query(
    'UPDATE mfa_recovery_codes SET used_at = now() WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL',
    [userId, sha256(norm)],
  );
  return r.rowCount === 1 ? 'recovery' : null;
}

async function storeRecoveryCodes(userId: string) {
  const codes = generateRecoveryCodes();
  await authPool.query('DELETE FROM mfa_recovery_codes WHERE user_id = $1', [userId]);
  for (const c of codes) {
    await authPool.query('INSERT INTO mfa_recovery_codes(user_id, code_hash) VALUES ($1,$2)', [userId, sha256(normalizeRecoveryCode(c))]);
  }
  return codes;
}

/** Second login step: exchanges the short-lived MFA token plus a valid code for a session. */
export async function loginWithCode(mfaToken: string, code: string, userAgent?: string) {
  const t = await peekToken(mfaToken, 'mfa_login');
  if (!t) throw new HttpError(401, 'mfa_session_expired');
  const { rows } = await authPool.query('SELECT locked_until, disabled_at FROM users WHERE id = $1', [t.user_id]);
  if (rows[0]?.disabled_at) throw new HttpError(401, 'mfa_session_expired');
  if (rows[0]?.locked_until && new Date(rows[0].locked_until) > new Date()) throw new HttpError(429, 'account_locked');
  const kind = await checkSecondFactor(t.user_id, code);
  if (!kind) {
    await registerFailure(t.user_id, 'mfa_failed');
    throw new HttpError(401, 'invalid_code');
  }
  await consumeToken(t.id);
  await authPool.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [t.user_id]);
  await authAudit(t.user_id, 'login', { mfa: kind });
  const left = kind === 'recovery' ? await recoveryCodesLeft(t.user_id) : undefined;
  return { token: await createSession(t.user_id, userAgent), userId: t.user_id as string, recoveryCodesLeft: left };
}

export async function recoveryCodesLeft(userId: string) {
  const { rows } = await authPool.query('SELECT count(*)::int AS n FROM mfa_recovery_codes WHERE user_id = $1 AND used_at IS NULL', [userId]);
  return rows[0].n as number;
}

/** Step 1 of setup: a fresh secret (not active yet) and a QR code for the authenticator app. */
export async function startSetup(userId: string) {
  const { rows } = await authPool.query('SELECT email, mfa_enabled FROM users WHERE id = $1', [userId]);
  if (rows[0].mfa_enabled) throw new HttpError(409, 'mfa_already_enabled');
  const secret = generateSecret();
  await authPool.query('UPDATE users SET mfa_secret = $2, mfa_last_step = NULL WHERE id = $1 AND NOT mfa_enabled', [userId, secret]);
  const uri = otpauthUri(secret, rows[0].email);
  const qrSvg = await QRCode.toString(uri, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1d1b10', light: '#ffffff' } });
  return { secret, uri, qrSvg };
}

/** Step 2 of setup: the first valid code switches MFA on and returns the recovery codes (shown once). */
export async function enable(userId: string, code: string) {
  const { rows } = await authPool.query('SELECT mfa_enabled, mfa_secret FROM users WHERE id = $1', [userId]);
  if (rows[0].mfa_enabled) throw new HttpError(409, 'mfa_already_enabled');
  if (!rows[0].mfa_secret) throw badRequest('mfa_setup_not_started');
  if (!/^\d{6}$/.test(code.replace(/\s/g, '')) || !(await checkSecondFactor(userId, code))) {
    throw badRequest('invalid_code');
  }
  await authPool.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [userId]);
  await authAudit(userId, 'mfa_enabled');
  return storeRecoveryCodes(userId);
}

async function practicesDemandingMfa(userId: string) {
  const { rows } = await authPool.query(
    `SELECT 1 FROM practice_members m JOIN practices p ON p.id = m.practice_id
      WHERE m.user_id = $1 AND m.active AND p.archived_at IS NULL AND coalesce((p.settings->>'requireMfa')::boolean, false)`,
    [userId],
  );
  return rows.length > 0;
}

/** Switching MFA off needs both the password and a current code. */
export async function disable(userId: string, password: string, code: string, currentSessionToken: string | null) {
  const { rows } = await authPool.query('SELECT password_hash, mfa_enabled FROM users WHERE id = $1', [userId]);
  if (!rows[0].mfa_enabled) throw badRequest('mfa_not_enabled');
  if (await practicesDemandingMfa(userId)) throw new HttpError(409, 'mfa_required_by_practice');
  if (!rows[0].password_hash || !(await verifyPassword(password, rows[0].password_hash))) throw new HttpError(401, 'invalid_credentials');
  if (!(await checkSecondFactor(userId, code))) throw new HttpError(401, 'invalid_code');
  await turnOff(userId, currentSessionToken);
  await authAudit(userId, 'mfa_disabled');
}

export async function regenerateRecoveryCodes(userId: string, code: string) {
  const { rows } = await authPool.query('SELECT mfa_enabled FROM users WHERE id = $1', [userId]);
  if (!rows[0].mfa_enabled) throw badRequest('mfa_not_enabled');
  if (!(await checkSecondFactor(userId, code))) throw new HttpError(401, 'invalid_code');
  await authAudit(userId, 'mfa_recovery_codes_regenerated');
  return storeRecoveryCodes(userId);
}

async function turnOff(userId: string, keepSessionToken: string | null) {
  await authPool.query('UPDATE users SET mfa_enabled = false, mfa_secret = NULL, mfa_last_step = NULL WHERE id = $1', [userId]);
  await authPool.query('DELETE FROM mfa_recovery_codes WHERE user_id = $1', [userId]);
  // Other devices must sign in again.
  await authPool.query('DELETE FROM auth_sessions WHERE user_id = $1 AND token_hash <> $2', [userId, keepSessionToken ? sha256(keepSessionToken) : '']);
}

/**
 * A practice owner/admin resets MFA for a colleague who lost their phone and recovery codes.
 * Only allowed when the colleague works exclusively in this practice, so one practice can never
 * weaken the login of someone who also works elsewhere. The caller has already checked, under RLS,
 * that the actor is owner/admin of `practiceId`.
 */
export async function resetForMember(actorId: string, practiceId: string, targetId: string) {
  if (actorId === targetId) throw badRequest('cannot_reset_own_mfa');
  const { rows } = await authPool.query(
    `SELECT bool_and(m.practice_id = $2) AS only_here, count(*) FILTER (WHERE m.practice_id = $2) AS here
       FROM practice_members m WHERE m.user_id = $1`,
    [targetId, practiceId],
  );
  if (!rows[0] || Number(rows[0].here) === 0) throw new HttpError(404, 'not_found');
  if (!rows[0].only_here) throw new HttpError(409, 'member_of_other_practice');
  const { rows: admin } = await authPool.query('SELECT is_platform_admin FROM users WHERE id = $1', [targetId]);
  if (admin[0]?.is_platform_admin) throw new HttpError(403, 'forbidden');
  await turnOff(targetId, null);
  await authPool.query(
    'INSERT INTO audit_log(actor_id, practice_id, action, entity, entity_id, meta) VALUES ($1,$2,$3,$4,$5,$6)',
    [actorId, practiceId, 'mfa_reset', 'member', targetId, {}],
  );
}
