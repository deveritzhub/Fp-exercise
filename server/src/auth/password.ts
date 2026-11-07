import bcrypt from 'bcryptjs';

const COST = process.env.VITEST ? 4 : 12;

export const MIN_PASSWORD_LENGTH = 10;

export function validatePassword(pw: string): string | null {
  if (typeof pw !== 'string' || pw.length < MIN_PASSWORD_LENGTH) return 'password_too_short';
  if (pw.length > 200) return 'password_too_long';
  if (!/[a-zA-Z]/.test(pw) || !/[0-9\W_]/.test(pw)) return 'password_too_weak';
  return null;
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, COST);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

// Used to keep timing similar when the account does not exist.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', COST);
export const dummyVerify = (pw: string) => bcrypt.compare(pw, DUMMY_HASH);
