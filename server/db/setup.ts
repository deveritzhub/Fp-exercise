/**
 * Local development bootstrap: creates the database roles and database.
 * Uses DATABASE_ADMIN_URL (a local superuser). Never run against production.
 *
 *   fp_owner  – owns schema objects, runs migrations.
 *   fp_app    – runtime API role. Not owner, no BYPASSRLS => row level security applies.
 *   fp_auth   – runtime auth service role (users, sessions, tokens) with narrow grants.
 */
import 'dotenv/config';
import pg from 'pg';

export async function setupDatabase(reset: boolean) {
const adminUrl = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres@localhost:5432/postgres';
const dbName = new URL(process.env.DATABASE_URL!).pathname.slice(1);
const ownerPw = decodeURIComponent(new URL(process.env.DATABASE_OWNER_URL!).password);
const appPw = decodeURIComponent(new URL(process.env.DATABASE_URL!).password);
const authPw = decodeURIComponent(new URL(process.env.DATABASE_AUTH_URL!).password);

if (process.env.NODE_ENV === 'production') throw new Error('db:setup is a development-only script.');

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
const ident = (s: string) => '"' + s.replace(/"/g, '""') + '"';
const lit = (s: string) => "'" + s.replace(/'/g, "''") + "'";

if (reset) {
  await admin.query(`DROP DATABASE IF EXISTS ${ident(dbName)} WITH (FORCE)`);
}
for (const [role, pw] of [['fp_owner', ownerPw], ['fp_app', appPw], ['fp_auth', authPw]] as const) {
  const { rowCount } = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
  if (!rowCount) await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD ${lit(pw)} NOSUPERUSER NOBYPASSRLS`);
  else await admin.query(`ALTER ROLE ${role} LOGIN PASSWORD ${lit(pw)} NOSUPERUSER NOBYPASSRLS`);
}
const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
if (!rowCount) await admin.query(`CREATE DATABASE ${ident(dbName)} OWNER fp_owner`);
await admin.end();

const db = new pg.Client({ connectionString: adminUrl.replace(/\/[^/]*$/, '/' + dbName) });
await db.connect();
await db.query('CREATE EXTENSION IF NOT EXISTS citext');
await db.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
await db.query('CREATE EXTENSION IF NOT EXISTS unaccent');
await db.end();
if (!process.env.VITEST) console.log(`Database ${dbName} ready (roles fp_owner, fp_app, fp_auth).`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await setupDatabase(process.argv.includes('--reset'));
}
