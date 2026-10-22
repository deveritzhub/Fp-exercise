import crypto from 'node:crypto';

/**
 * Time-based one-time passwords (RFC 6238, HMAC-SHA1, 6 digits, 30 s) — the format every
 * authenticator app supports (Google/Microsoft Authenticator, 1Password, Authy, iOS Passwords).
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const PERIOD = 30;
const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) throw new Error('invalid base32');
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const generateSecret = () => base32Encode(crypto.randomBytes(20));

export const timeStep = (now = Date.now()) => Math.floor(now / 1000 / PERIOD);

export function totp(secret: string, step: number, digits = DIGITS): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

/**
 * Returns the matching time step (allowing ±1 step of clock drift), or null.
 * Steps at or before `lastStep` are refused so a code can never be used twice.
 */
export function verifyTotp(secret: string, code: string, lastStep: number | null, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const cur = timeStep(now);
  for (const step of [cur, cur - 1, cur + 1]) {
    if (lastStep !== null && step <= lastStep) continue;
    const expected = Buffer.from(totp(secret, step));
    if (crypto.timingSafeEqual(expected, Buffer.from(code))) return step;
  }
  return null;
}

export function otpauthUri(secret: string, account: string, issuer = 'FP Exercise') {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}

/** Recovery codes look like "k7m2-x9qp-4tdn": easy to type, ~60 bits of entropy. */
export function generateRecoveryCodes(n = 10): string[] {
  const alpha = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: n }, () => {
    const chars = Array.from({ length: 12 }, () => alpha[crypto.randomInt(alpha.length)]).join('');
    return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
  });
}

export const normalizeRecoveryCode = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
