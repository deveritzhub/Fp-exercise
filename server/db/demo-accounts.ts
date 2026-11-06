/**
 * Applies DEMO_PASSWORD / DEMO_ACCOUNTS (see server/src/lib/demo.ts) to the demo accounts at
 * start-up. Only touches the seven synthetic demo users; real accounts are never changed.
 */
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { DEMO_EMAILS, demoSettings } from '../src/lib/demo';

export async function applyDemoSettings(ownerUrl: string) {
  const s = demoSettings();
  const db = new pg.Client({ connectionString: ownerUrl });
  await db.connect();
  try {
    const users = (await db.query('SELECT id, password_hash FROM users WHERE lower(email) = ANY($1::text[])', [[...DEMO_EMAILS]])).rows as { id: string; password_hash: string | null }[];
    if (!users.length) return;
    if (s.ownPassword) {
      let changed = 0;
      for (const u of users) {
        if (u.password_hash && (await bcrypt.compare(s.ownPassword, u.password_hash))) continue;
        await db.query('UPDATE users SET password_hash = $2 WHERE id = $1', [u.id, await bcrypt.hash(s.ownPassword, 10)]);
        changed++;
      }
      // A new password also ends the sessions that were opened with the old (public) one.
      if (changed) await db.query('DELETE FROM auth_sessions WHERE user_id = ANY($1::uuid[])', [users.map((u) => u.id)]);
      console.log(`[demo] own demo password in use${changed ? ` (set for ${changed} accounts)` : ''}`);
    }
    if (!s.enabled) {
      await db.query('DELETE FROM auth_sessions WHERE user_id = ANY($1::uuid[])', [users.map((u) => u.id)]);
      console.log('[demo] demo accounts are switched off');
    }
  } finally {
    await db.end();
  }
}
