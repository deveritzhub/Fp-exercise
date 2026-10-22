import pg from 'pg';
import { config } from './config';

// Return DATE columns as plain 'YYYY-MM-DD' strings (no timezone shifting).
pg.types.setTypeParser(1082, (v) => v);
// bigint counts -> number (all counts in this app are far below 2^53)
pg.types.setTypeParser(20, (v) => Number(v));

/** Runtime pool for business data. Connects as fp_app => RLS enforced. */
const tz = `-c TimeZone=${process.env.TZ ?? 'Europe/Amsterdam'}`;
export const appPool = new pg.Pool({ connectionString: config.databaseUrl, max: 10, options: tz });
/** Auth service pool (fp_auth). Only used from server/src/auth. */
export const authPool = new pg.Pool({ connectionString: config.authDatabaseUrl, max: 5, options: tz });

export type Tx = pg.PoolClient;

/**
 * Runs `fn` in a transaction where RLS sees `userId` as the current user.
 * `set_config(..., true)` is transaction-local, so the setting never leaks across pooled connections.
 */
export async function withUser<T>(userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId ?? '']);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function closePools() {
  await Promise.all([appPool.end(), authPool.end()]);
}
