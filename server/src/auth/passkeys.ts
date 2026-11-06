import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { authPool } from '../db';
import { config } from '../config';
import { randomToken, sha256 } from '../lib/crypto';
import { HttpError, badRequest } from '../lib/errors';
import { authAudit, createSession } from './service';

/**
 * Passkeys (WebAuthn): log in with Face ID, a fingerprint or the phone's screen lock. The private
 * key never leaves the device; we store the public key. A passkey is phishing-resistant and proves
 * possession plus the user's biometrics/PIN, so it also counts as the second step for two-step
 * verification.
 */
const rp = () => {
  const origin = new URL(config.appOrigin);
  return { rpID: origin.hostname, origin: origin.origin, rpName: 'FP Flow' };
};

async function saveChallenge(purpose: 'passkey_register' | 'passkey_login', challenge: string, userId: string | null) {
  const handle = randomToken();
  await authPool.query(
    `INSERT INTO auth_challenges(purpose, key_hash, user_id, data, expires_at) VALUES ($1, $2, $3, $4, now() + interval '5 minutes')`,
    [purpose, sha256(handle), userId, { challenge }],
  );
  return handle;
}

async function takeChallenge(purpose: string, handle: string, userId: string | null) {
  const row = (
    await authPool.query(
      `DELETE FROM auth_challenges WHERE key_hash = $1 AND purpose = $2 AND expires_at > now() RETURNING user_id, data`,
      [sha256(handle), purpose],
    )
  ).rows[0];
  if (!row || (userId && row.user_id !== userId)) throw badRequest('passkey_expired');
  return row.data.challenge as string;
}

export async function registrationOptions(user: { id: string; email: string; fullName: string }) {
  const existing = (await authPool.query('SELECT id, transports FROM webauthn_credentials WHERE user_id = $1', [user.id])).rows;
  if (existing.length >= 10) throw new HttpError(409, 'passkey_limit');
  const { rpID, rpName } = rp();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.fullName,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: c.transports as AuthenticatorTransportFuture[] })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  return { options, handle: await saveChallenge('passkey_register', options.challenge, user.id) };
}

export async function register(userId: string, handle: string, response: RegistrationResponseJSON, name: string) {
  const expectedChallenge = await takeChallenge('passkey_register', handle, userId);
  const { rpID, origin } = rp();
  let v;
  try {
    v = await verifyRegistrationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
  } catch {
    throw badRequest('passkey_failed');
  }
  if (!v.verified || !v.registrationInfo) throw badRequest('passkey_failed');
  const c = v.registrationInfo.credential;
  try {
    await authPool.query(
      'INSERT INTO webauthn_credentials(id, user_id, public_key, counter, transports, name) VALUES ($1,$2,$3,$4,$5,$6)',
      [c.id, userId, Buffer.from(c.publicKey), c.counter, c.transports ?? [], name.slice(0, 60) || 'Passkey'],
    );
  } catch (e) {
    if ((e as { code?: string }).code === '23505') throw new HttpError(409, 'passkey_exists');
    throw e;
  }
  await authAudit(userId, 'passkey_added');
}

export async function loginOptions() {
  const { rpID } = rp();
  // No allowCredentials: the device offers the passkeys it has for this site (no e-mail needed).
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'required' });
  return { options, handle: await saveChallenge('passkey_login', options.challenge, null) };
}

export async function login(handle: string, response: AuthenticationResponseJSON, userAgent?: string) {
  const expectedChallenge = await takeChallenge('passkey_login', handle, null);
  const cred = (
    await authPool.query(
      `SELECT c.*, u.disabled_at, u.locked_until FROM webauthn_credentials c JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
      [response.id],
    )
  ).rows[0];
  if (!cred || cred.disabled_at) throw new HttpError(401, 'passkey_unknown');
  if (cred.locked_until && new Date(cred.locked_until) > new Date()) throw new HttpError(429, 'account_locked');
  const { rpID, origin } = rp();
  let v;
  try {
    v = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: { id: cred.id, publicKey: new Uint8Array(cred.public_key), counter: Number(cred.counter), transports: cred.transports },
    });
  } catch {
    throw new HttpError(401, 'passkey_failed');
  }
  if (!v.verified) throw new HttpError(401, 'passkey_failed');
  await authPool.query('UPDATE webauthn_credentials SET counter = $2, last_used_at = now() WHERE id = $1', [cred.id, v.authenticationInfo.newCounter]);
  await authPool.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [cred.user_id]);
  const token = await createSession(cred.user_id, userAgent);
  await authAudit(cred.user_id, 'login', { method: 'passkey' });
  return { token, userId: cred.user_id as string };
}

export async function list(userId: string) {
  return (await authPool.query('SELECT id, name, created_at, last_used_at FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at', [userId])).rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
  }));
}

export async function remove(userId: string, id: string) {
  const u = (
    await authPool.query(
      `SELECT password_hash IS NOT NULL AS has_pw,
              (SELECT count(*) FROM user_identities WHERE user_id = $1)::int AS ids,
              (SELECT count(*) FROM webauthn_credentials WHERE user_id = $1)::int AS keys
         FROM users WHERE id = $1`,
      [userId],
    )
  ).rows[0];
  if (!u.has_pw && u.ids + u.keys <= 1) throw new HttpError(409, 'last_login_method');
  const r = await authPool.query('DELETE FROM webauthn_credentials WHERE user_id = $1 AND id = $2', [userId, id]);
  if (!r.rowCount) throw new HttpError(404, 'not_found');
  await authAudit(userId, 'passkey_removed');
}
