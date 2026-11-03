/**
 * The synthetic demo accounts (see server/db/seed.ts). Their password is in the source code, so
 * on a hosted environment the owner can close them without a code change:
 *  - DEMO_PASSWORD=<own password, 12+ characters>: the demo accounts get that password at start-up
 *    and the site stops showing the public one;
 *  - DEMO_ACCOUNTS=off: the demo accounts cannot log in at all, and their sessions are ended.
 */
export const DEMO_EMAILS = [
  'admin@fp-exercise.test',
  'eigenaar@praktijk-a.test',
  'therapeut@praktijk-a.test',
  'patient@praktijk-a.test',
  'eigenaar@praktijk-b.test',
  'therapeut@praktijk-b.test',
  'patient@praktijk-b.test',
] as const;

export const isDemoEmail = (email: string) => (DEMO_EMAILS as readonly string[]).includes(email.trim().toLowerCase());

export const demoSettings = () => {
  const own = process.env.DEMO_PASSWORD?.trim() ?? '';
  return {
    /** Demo accounts may log in. */
    enabled: (process.env.DEMO_ACCOUNTS ?? 'on').trim().toLowerCase() !== 'off',
    /** An own demo password replaces the public one (ignored when shorter than 12 characters). */
    ownPassword: own.length >= 12 ? own : null,
  };
};

/** What the public site may show: the password only while it is still the public seed one. */
export const publicDemoInfo = () => {
  const s = demoSettings();
  return {
    accounts: s.enabled,
    publicPassword: s.enabled && !s.ownPassword,
    /** Test version (DEMO_MODE=1 or TEST_VERSION=1): the app shows a "no real medical data" banner. */
    testVersion: process.env.DEMO_MODE === '1' || process.env.TEST_VERSION === '1',
  };
};
