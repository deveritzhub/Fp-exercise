import { randomBytes } from 'node:crypto';
import { authPool, withUser } from '../db';
import { config } from '../config';
import { audit } from './audit';
import { importLibrary } from './libraryImport';
import { readFpBundle } from './fpLibrary';

/** Which kinds may sign up themselves. Physiotherapy practices are set up by the platform (contract, DPA). */
export function selfSignupKinds(): ('coach' | 'personal')[] {
  const v = (process.env.SELF_SIGNUP ?? (config.isProd ? '' : 'coach,personal')).toLowerCase();
  return (['coach', 'personal'] as const).filter((k) => v.split(',').map((s) => s.trim()).includes(k));
}

const slugify = (s: string) =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'account';

/** Exercises and the krachttraining/mobiliteit templates. The rehab bundles are for physiotherapy only. */
const BUNDLES = { coach: ['fp-library.json', 'fp-app-update.json'], personal: ['fp-app-update.json'] } as const;

/**
 * Sets up a coach or personal account for a user who was just created (password or Google/Apple).
 * Everything runs in one transaction as that user. Only for brand-new users: on failure the user is
 * disabled and their e-mail address released, so they can try again.
 */
export async function provisionSelfAccount(userId: string, kind: 'coach' | 'personal', opts: { fullName: string; businessName?: string }) {
  const [first, ...rest] = opts.fullName.trim().split(/\s+/);
  const last = rest.join(' ') || '-';
  const name = kind === 'coach' ? (opts.businessName?.trim() || opts.fullName) : opts.fullName;
  try {
    return await withUser(userId, async (tx) => {
      const slug = `${slugify(name)}-${randomBytes(3).toString('hex')}`;
      const practiceId = (await tx.query('SELECT app.self_signup($1, $2, $3, $4, $5) AS id', [kind, name.slice(0, 160), slug, first.slice(0, 80), last.slice(0, 80)])).rows[0].id as string;
      for (const file of BUNDLES[kind]) await importLibrary(tx, practiceId, userId, readFpBundle(file));
      if (kind === 'personal') await tx.query('SELECT app.finish_personal_signup($1)', [practiceId]);
      await audit(tx, userId, practiceId, 'self_signup', 'practice', practiceId, { kind });
      return practiceId;
    });
  } catch (e) {
    await authPool.query(
      `UPDATE users SET disabled_at = now(), email = 'released+' || id || '@invalid.local' WHERE id = $1`,
      [userId],
    );
    throw e;
  }
}
