import { authPool } from '../db';
import { config } from '../config';
import { randomToken, sha256 } from '../lib/crypto';
import { HttpError, badRequest } from '../lib/errors';
import { dummyVerify, hashPassword, validatePassword, verifyPassword } from './password';
import { sendMail } from './mailer';

export type Membership = { practiceId: string; practiceName: string; practiceSlug: string; role: 'owner' | 'admin' | 'therapist' };
export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  locale: 'nl' | 'en';
  isPlatformAdmin: boolean;
  emailVerified: boolean;
  /** Two-factor authentication is switched on for this login. */
  mfaEnabled: boolean;
  /** A practice of this user (or the platform-admin role) demands MFA that is not set up yet: staff APIs are blocked. */
  mfaRequired: boolean;
  memberships: Membership[];
  patient: { id: string; practiceId: string; practiceName: string } | null;
};

const MAX_FAILED = 8;
const LOCK_MINUTES = 15;

export async function loadUser(userId: string): Promise<SessionUser | null> {
  const { rows } = await authPool.query(
    `SELECT id, email, full_name, locale, is_platform_admin, email_verified_at, mfa_enabled
       FROM users WHERE id = $1 AND disabled_at IS NULL`,
    [userId],
  );
  const u = rows[0];
  if (!u) return null;
  const members = await authPool.query(
    `SELECT m.practice_id, p.name, p.slug, m.role, coalesce((p.settings->>'requireMfa')::boolean, false) AS require_mfa
       FROM practice_members m
       JOIN practices p ON p.id = m.practice_id
      WHERE m.user_id = $1 AND m.active AND p.archived_at IS NULL ORDER BY m.created_at`,
    [userId],
  );
  const patient = await authPool.query(
    `SELECT pt.id, pt.practice_id, p.name FROM patients pt JOIN practices p ON p.id = pt.practice_id
      WHERE pt.user_id = $1 AND pt.archived_at IS NULL AND p.archived_at IS NULL LIMIT 1`,
    [userId],
  );
  const mfaDemanded =
    members.rows.some((r) => r.require_mfa) || (u.is_platform_admin && config.isProd && !config.demoMode);
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    locale: u.locale,
    isPlatformAdmin: u.is_platform_admin,
    emailVerified: !!u.email_verified_at,
    mfaEnabled: u.mfa_enabled,
    mfaRequired: mfaDemanded && !u.mfa_enabled,
    memberships: members.rows.map((r) => ({ practiceId: r.practice_id, practiceName: r.name, practiceSlug: r.slug, role: r.role })),
    patient: patient.rows[0]
      ? { id: patient.rows[0].id, practiceId: patient.rows[0].practice_id, practiceName: patient.rows[0].name }
      : null,
  };
}

export async function authAudit(actorId: string | null, action: string, meta: Record<string, unknown> = {}) {
  await authPool.query(
    'INSERT INTO audit_log(actor_id, action, entity, entity_id, meta) VALUES ($1,$2,$3,$1,$4)',
    [actorId, action, 'user', meta],
  );
}

export type LoginResult = { token: string; userId: string } | { mfaToken: string };

export async function login(email: string, password: string, userAgent?: string): Promise<LoginResult> {
  const { rows } = await authPool.query(
    'SELECT id, password_hash, locked_until, failed_logins, disabled_at, mfa_enabled FROM users WHERE email = $1',
    [email.trim()],
  );
  const u = rows[0];
  if (!u || !u.password_hash || u.disabled_at) {
    await dummyVerify(password);
    throw new HttpError(401, 'invalid_credentials');
  }
  if (u.locked_until && new Date(u.locked_until) > new Date()) {
    throw new HttpError(429, 'account_locked');
  }
  const ok = await verifyPassword(password, u.password_hash);
  if (!ok) {
    await registerFailure(u.id, 'login_failed');
    throw new HttpError(401, 'invalid_credentials');
  }
  if (u.mfa_enabled) {
    // Second step required. The failure counter is NOT reset here: otherwise someone who knows the
    // password could retry it between guesses and brute-force the 6-digit code.
    return { mfaToken: await issueToken(u.id, 'mfa_login', 0, 10) };
  }
  await authPool.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [u.id]);
  const token = await createSession(u.id, userAgent);
  await authAudit(u.id, 'login');
  return { token, userId: u.id as string };
}

/** Counts a failed password or code; locks the account after MAX_FAILED attempts. */
export async function registerFailure(userId: string, action: string) {
  await authPool.query(
    `UPDATE users SET failed_logins = failed_logins + 1,
       locked_until = CASE WHEN failed_logins + 1 >= ${MAX_FAILED} THEN now() + interval '${LOCK_MINUTES} minutes' ELSE locked_until END
     WHERE id = $1`,
    [userId],
  );
  await authAudit(userId, action);
}

export async function createSession(userId: string, userAgent?: string) {
  const token = randomToken();
  await authPool.query(
    `INSERT INTO auth_sessions(user_id, token_hash, expires_at, user_agent)
     VALUES ($1, $2, now() + make_interval(hours => $3), $4)`,
    [userId, sha256(token), config.sessionTtlHours, userAgent?.slice(0, 200) ?? null],
  );
  return token;
}

export async function resolveSession(token: string): Promise<SessionUser | null> {
  const { rows } = await authPool.query(
    `UPDATE auth_sessions SET last_seen_at = now()
      WHERE token_hash = $1 AND expires_at > now() RETURNING user_id`,
    [sha256(token)],
  );
  if (!rows[0]) return null;
  return loadUser(rows[0].user_id);
}

export async function logout(token: string) {
  await authPool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [sha256(token)]);
}

type TokenKind = 'verify_email' | 'reset_password' | 'invite' | 'mfa_login';

export async function issueToken(userId: string, kind: TokenKind, hours: number, minutes = 0) {
  const token = randomToken();
  await authPool.query(
    `UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND kind = $2 AND used_at IS NULL`,
    [userId, kind],
  );
  await authPool.query(
    `INSERT INTO auth_tokens(user_id, kind, token_hash, expires_at) VALUES ($1,$2,$3, now() + make_interval(hours => $4, mins => $5))`,
    [userId, kind, sha256(token), hours, minutes],
  );
  return token;
}

export async function peekToken(token: string, kind: string) {
  const { rows } = await authPool.query(
    `SELECT t.id, t.user_id, u.email, u.full_name, u.locale FROM auth_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = $1 AND t.kind = $2 AND t.used_at IS NULL AND t.expires_at > now()`,
    [sha256(token), kind],
  );
  return rows[0] ?? null;
}

export async function consumeToken(id: string) {
  const r = await authPool.query('UPDATE auth_tokens SET used_at = now() WHERE id = $1 AND used_at IS NULL', [id]);
  if (r.rowCount !== 1) throw badRequest('invalid_token');
}

export async function requestPasswordReset(email: string) {
  const { rows } = await authPool.query('SELECT id, locale FROM users WHERE email = $1 AND disabled_at IS NULL', [email.trim()]);
  // Same response whether or not the account exists (no account enumeration).
  if (!rows[0] || !rows[0].id) return;
  const token = await issueToken(rows[0].id, 'reset_password', 1);
  const nl = rows[0].locale === 'nl';
  await sendMail(
    email,
    nl ? 'Wachtwoord opnieuw instellen' : 'Reset your password',
    `${nl ? 'Stel je nieuwe wachtwoord in via' : 'Set a new password via'}: ${config.appOrigin}/wachtwoord-herstellen?token=${token}\n` +
      (nl ? 'Deze link is 1 uur geldig.' : 'This link is valid for 1 hour.'),
  );
}

export async function resetPassword(token: string, password: string) {
  const err = validatePassword(password);
  if (err) throw badRequest(err);
  const t = await peekToken(token, 'reset_password');
  if (!t) throw badRequest('invalid_token');
  await consumeToken(t.id);
  await authPool.query('UPDATE users SET password_hash = $2, failed_logins = 0, locked_until = NULL WHERE id = $1', [
    t.user_id,
    await hashPassword(password),
  ]);
  // Invalidate all existing sessions after a password change.
  await authPool.query('DELETE FROM auth_sessions WHERE user_id = $1', [t.user_id]);
  await authAudit(t.user_id, 'password_reset');
}

export async function sendVerification(userId: string) {
  const { rows } = await authPool.query('SELECT email, locale FROM users WHERE id = $1', [userId]);
  if (!rows[0]) return;
  const token = await issueToken(userId, 'verify_email', 48);
  const nl = rows[0].locale === 'nl';
  await sendMail(
    rows[0].email,
    nl ? 'Bevestig je e-mailadres' : 'Confirm your email address',
    `${config.appOrigin}/verifieer-email?token=${token}`,
  );
}

export async function verifyEmail(token: string) {
  const t = await peekToken(token, 'verify_email');
  if (!t) throw badRequest('invalid_token');
  await consumeToken(t.id);
  await authPool.query('UPDATE users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1', [t.user_id]);
}

/**
 * Creates (or reuses) a login for an invited person and mails a one-time invite link.
 * Business authorisation (may this actor invite?) is checked by the caller under RLS first.
 */
export async function inviteUser(opts: {
  email: string;
  fullName: string;
  locale: 'nl' | 'en';
  practiceName: string;
  kind: 'patient' | 'staff';
  /** Runs after the account exists and before any mail is sent; throw to abort. */
  beforeSend?: (userId: string) => Promise<void>;
}): Promise<{ userId: string; inviteUrl: string; existing: boolean }> {
  const email = opts.email.trim().toLowerCase();
  let { rows } = await authPool.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
  let existing = true;
  if (!rows[0]) {
    existing = false;
    ({ rows } = await authPool.query(
      'INSERT INTO users(email, full_name, locale) VALUES ($1,$2,$3) RETURNING id, password_hash',
      [email, opts.fullName, opts.locale],
    ));
  }
  const userId: string = rows[0].id;
  await opts.beforeSend?.(userId);
  const token = await issueToken(userId, 'invite', 24 * 7);
  const inviteUrl = `${config.appOrigin}/uitnodiging/${token}`;
  const nl = opts.locale === 'nl';
  const body =
    opts.kind === 'patient'
      ? nl
        ? `Hallo ${opts.fullName},\n\n${opts.practiceName} heeft een oefenprogramma voor je klaargezet in FP Exercise.\nActiveer je account: ${inviteUrl}\n\nDeze link is 7 dagen geldig.`
        : `Hello ${opts.fullName},\n\n${opts.practiceName} has prepared an exercise programme for you in FP Exercise.\nActivate your account: ${inviteUrl}\n\nThis link is valid for 7 days.`
      : nl
        ? `Hallo ${opts.fullName},\n\nJe bent uitgenodigd voor ${opts.practiceName} in FP Exercise.\nActiveer je account: ${inviteUrl}`
        : `Hello ${opts.fullName},\n\nYou have been invited to ${opts.practiceName} in FP Exercise.\nActivate your account: ${inviteUrl}`;
  await sendMail(email, nl ? `Uitnodiging van ${opts.practiceName}` : `Invitation from ${opts.practiceName}`, body);
  return { userId, inviteUrl, existing };
}

export async function getInvite(token: string) {
  const t = await peekToken(token, 'invite');
  if (!t) return null;
  const { rows } = await authPool.query('SELECT password_hash IS NOT NULL AS has_password FROM users WHERE id = $1', [t.user_id]);
  return { email: t.email as string, fullName: t.full_name as string, locale: t.locale as string, hasPassword: rows[0].has_password as boolean };
}

export async function acceptInvite(token: string, password: string | undefined, userAgent?: string): Promise<LoginResult> {
  const t = await peekToken(token, 'invite');
  if (!t) throw badRequest('invalid_token');
  const { rows } = await authPool.query('SELECT password_hash FROM users WHERE id = $1', [t.user_id]);
  if (!rows[0].password_hash) {
    const err = validatePassword(password ?? '');
    if (err) throw badRequest(err);
    await authPool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [t.user_id, await hashPassword(password!)]);
  } else if (!password || !(await verifyPassword(password, rows[0].password_hash))) {
    // Existing account: confirm by entering the existing password.
    throw new HttpError(401, 'invalid_credentials');
  }
  await consumeToken(t.id);
  // The invite link was delivered to this mailbox, which verifies the address.
  await authPool.query('UPDATE users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1', [t.user_id]);
  await authAudit(t.user_id, 'invite_accepted');
  // An existing login with two-factor authentication still has to pass its second step.
  const { rows: mfa } = await authPool.query('SELECT mfa_enabled FROM users WHERE id = $1', [t.user_id]);
  if (mfa[0].mfa_enabled) return { mfaToken: await issueToken(t.user_id, 'mfa_login', 0, 10) };
  return { token: await createSession(t.user_id, userAgent), userId: t.user_id as string };
}

/** Links an invited login to a patient record (called after RLS-checked invite creation). */
export async function linkPatientLogin(patientId: string, userId: string) {
  const { rows } = await authPool.query('SELECT id FROM patients WHERE user_id = $1 AND id <> $2', [userId, patientId]);
  if (rows[0]) throw new HttpError(409, 'email_linked_to_other_patient');
  const { rows: members } = await authPool.query('SELECT 1 FROM practice_members WHERE user_id = $1', [userId]);
  if (members[0]) throw new HttpError(409, 'email_belongs_to_staff');
  await authPool.query('UPDATE patients SET user_id = $2 WHERE id = $1', [patientId, userId]);
}

export async function changePassword(userId: string, current: string, next: string) {
  const err = validatePassword(next);
  if (err) throw badRequest(err);
  const { rows } = await authPool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!rows[0]?.password_hash || !(await verifyPassword(current, rows[0].password_hash))) {
    throw new HttpError(401, 'invalid_credentials');
  }
  await authPool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, await hashPassword(next)]);
  await authAudit(userId, 'password_changed');
}

export async function assertNotPatient(userId: string) {
  const { rows } = await authPool.query('SELECT 1 FROM patients WHERE user_id = $1', [userId]);
  if (rows[0]) throw new HttpError(409, 'email_belongs_to_patient');
}

/** Withdraws a pending invite: unlinks the login and revokes open invite tokens (only if never activated). */
export async function unlinkPendingPatientLogin(patientId: string) {
  const { rows } = await authPool.query(
    `SELECT u.id FROM patients p JOIN users u ON u.id = p.user_id WHERE p.id = $1 AND u.password_hash IS NULL`,
    [patientId],
  );
  if (!rows[0]) return;
  await authPool.query('UPDATE patients SET user_id = NULL WHERE id = $1', [patientId]);
  await authPool.query(`UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND kind = 'invite' AND used_at IS NULL`, [rows[0].id]);
}
