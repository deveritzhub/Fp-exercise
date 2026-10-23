/**
 * Start-up for a hosted demo (e.g. Render web service + Neon Postgres) — SYNTHETIC DATA ONLY.
 *
 * Input: DATABASE_ADMIN_URL (the provider's owner role, needs CREATEROLE — Neon's default owner has it)
 *        ROLE_PASSWORD_SECRET (optional random string; role passwords are derived from it)
 * It creates/updates the fp_owner / fp_app / fp_auth roles, runs migrations, seeds demo data once,
 * derives the runtime connection strings and then starts the API (which also serves the web app).
 * For a real production deployment use separately managed credentials instead (see SECURITY.md).
 */
import crypto from 'node:crypto';
import pg from 'pg';

const adminUrl = process.env.DATABASE_ADMIN_URL?.trim();
if (!adminUrl) {
  console.error('DATABASE_ADMIN_URL is not set. Paste the Neon connection string in Render → Environment.');
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//.test(adminUrl)) {
  console.error('DATABASE_ADMIN_URL must start with postgresql:// (copy the full Neon connection string, without "psql" or quotes).');
  process.exit(1);
}
// Role passwords are derived from ROLE_PASSWORD_SECRET, or (if unset) from the admin URL itself, which is
// already a secret. Roles are re-synced on every start, so rotating either value is safe.
const secret = process.env.ROLE_PASSWORD_SECRET?.trim() || adminUrl;

const pw = (role: string) => crypto.createHmac('sha256', secret).update(role).digest('hex');
const urlFor = (role: string) => {
  const u = new URL(adminUrl);
  u.username = role;
  u.password = pw(role);
  return u.toString();
};

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
const dbName = (await admin.query('SELECT current_database() AS d')).rows[0].d as string;
const ident = (s: string) => '"' + s.replace(/"/g, '""') + '"';
for (const role of ['fp_owner', 'fp_app', 'fp_auth']) {
  const exists = (await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role])).rowCount;
  // The password is a hex HMAC, safe to inline as a literal.
  await admin.query(`${exists ? 'ALTER' : 'CREATE'} ROLE ${role} LOGIN PASSWORD '${pw(role)}'`);
}
await admin.query(`GRANT CREATE, CONNECT ON DATABASE ${ident(dbName)} TO fp_owner`);
await admin.query(`GRANT CONNECT ON DATABASE ${ident(dbName)} TO fp_app, fp_auth`);
await admin.query('GRANT USAGE, CREATE ON SCHEMA public TO fp_owner');
for (const ext of ['citext', 'pgcrypto', 'unaccent']) await admin.query(`CREATE EXTENSION IF NOT EXISTS ${ext}`);
await admin.end();

process.env.DATABASE_OWNER_URL = urlFor('fp_owner');
process.env.DATABASE_URL = urlFor('fp_app');
process.env.DATABASE_AUTH_URL = urlFor('fp_auth');

const { migrate } = await import('./migrate');
await migrate(process.env.DATABASE_OWNER_URL);

const owner = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
await owner.connect();
const seeded = (await owner.query('SELECT count(*)::int AS n FROM users')).rows[0].n > 0;
await owner.end();
if (!seeded) {
  // seed() refuses to run in production mode; this is an explicitly synthetic demo database.
  const env = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  const { seed } = await import('./seed');
  await seed(process.env.DATABASE_OWNER_URL);
  process.env.NODE_ENV = env;
}

await import('../src/index');

// Demo videos: fetched in the background so start-up (and the health check) is not delayed.
const { importLibraryVideos } = await import('./import-videos');
const { config } = await import('../src/config');
const { importFpLibrary } = await import('./import-library');
importLibraryVideos(process.env.DATABASE_OWNER_URL!, config.storageDir)
  .catch((e) => console.error('[videos]', e.message))
  // The practice's own library (once), then reuse matching library videos.
  .then(() => importFpLibrary(process.env.DATABASE_OWNER_URL!))
  .catch((e) => console.error('[library]', e.message))
  // Fill empty texts of the practice library, then link videos to practice exercises (they exist now).
  .then(async () => {
    const { completeExerciseTexts } = await import('./complete-exercises');
    await completeExerciseTexts(process.env.DATABASE_OWNER_URL!);
    await importLibraryVideos(process.env.DATABASE_OWNER_URL!, config.storageDir);
  })
  .catch((e) => console.error('[library]', e.message));
