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
  appOrigin: process.env.APP_ORIGIN ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:5173',
  databaseUrl: required('DATABASE_URL'),
  authDatabaseUrl: required('DATABASE_AUTH_URL'),
  storageDir: path.resolve(process.env.STORAGE_DIR ?? './storage'),
  mailTransport: process.env.MAIL_TRANSPORT ?? 'outbox',
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 12),
  /** Staff (therapists, admins) are logged out after this many minutes without activity; 0 = off. */
  staffIdleMinutes: Number(process.env.STAFF_IDLE_MINUTES ?? 30),
  /** Public demo deployment with synthetic data: invite links are shown on screen because no real e-mail is sent. */
  demoMode: process.env.DEMO_MODE === '1',
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 200) * 1024 * 1024,
  /** Google Play app (Trusted Web Activity): package name and SHA-256 fingerprints of its signing certificates. */
  android: {
    packageName: process.env.ANDROID_PACKAGE_NAME ?? '',
    fingerprints: (process.env.ANDROID_CERT_SHA256 ?? '').split(',').map((s) => s.trim().toUpperCase()).filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s)),
  },
};

/** Invite links are returned in API responses only outside production, or on the synthetic-data demo. */
export const exposeInviteLinks = !config.isProd || config.demoMode;
