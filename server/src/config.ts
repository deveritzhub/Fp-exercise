import 'dotenv/config';
import path from 'node:path';

process.env.TZ ??= 'Europe/Amsterdam';

const required = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
};

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test' || !!process.env.VITEST,
  port: Number(process.env.PORT ?? 8787),
  appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: required('DATABASE_URL'),
  authDatabaseUrl: required('DATABASE_AUTH_URL'),
  storageDir: path.resolve(process.env.STORAGE_DIR ?? './storage'),
  mailTransport: process.env.MAIL_TRANSPORT ?? 'outbox',
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 12),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 200) * 1024 * 1024,
};
