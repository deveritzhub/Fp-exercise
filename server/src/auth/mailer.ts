import nodemailer, { type Transporter } from 'nodemailer';
import { authPool } from '../db';
import { config } from '../config';
import { HttpError } from '../lib/errors';

/**
 * Mail abstraction. Mails never contain health information: only greetings and one-time links.
 *
 *  - MAIL_TRANSPORT=outbox (default): mail is written to the `mail_outbox` table, for development,
 *    tests and the demo. Nothing leaves the server.
 *  - MAIL_TRANSPORT=smtp: mail is sent through the provider set with SMTP_HOST, SMTP_PORT (587),
 *    SMTP_USER, SMTP_PASS and MAIL_FROM. Any provider with SMTP works; pick one hosted in the EU
 *    with a processor agreement. Nothing is kept in the database: the links are one-time secrets.
 */
export type SmtpSettings = { host: string; port: number; user: string; pass: string; from: string };

/** The SMTP settings from the environment, or the names of the ones that are missing. */
export function smtpSettings(env: NodeJS.ProcessEnv = process.env): { ok: true; smtp: SmtpSettings } | { ok: false; missing: string[] } {
  const need = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'] as const;
  const missing = need.filter((k) => !env[k]?.trim());
  const port = Number(env.SMTP_PORT ?? 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) missing.push('SMTP_PORT' as never);
  if (missing.length) return { ok: false, missing: [...missing] };
  return { ok: true, smtp: { host: env.SMTP_HOST!.trim(), port, user: env.SMTP_USER!.trim(), pass: env.SMTP_PASS!, from: env.MAIL_FROM!.trim() } };
}

/** Refuse to start with a mail transport that cannot send: better than finding out at the first invite. */
export function checkMailConfig() {
  if (config.mailTransport === 'outbox') return;
  if (config.mailTransport !== 'smtp') throw new Error(`Mail transport "${config.mailTransport}" is not known (use "outbox" or "smtp")`);
  const s = smtpSettings();
  if (!s.ok) throw new Error(`MAIL_TRANSPORT=smtp needs ${s.missing.join(', ')}`);
}

let transporter: Transporter | null = null;
/** Tests put a fake here; `null` goes back to the real one. */
export function setMailTransporter(t: Transporter | null) {
  transporter = t;
}
function smtp(): { t: Transporter; from: string } {
  const s = smtpSettings();
  if (!s.ok) throw new Error(`MAIL_TRANSPORT=smtp needs ${s.missing.join(', ')}`);
  // Port 465 speaks TLS from the first byte; the others start plain and must upgrade (STARTTLS).
  transporter ??= nodemailer.createTransport({
    host: s.smtp.host, port: s.smtp.port, secure: s.smtp.port === 465, requireTLS: s.smtp.port !== 465,
    auth: { user: s.smtp.user, pass: s.smtp.pass },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
  });
  return { t: transporter, from: s.smtp.from };
}

export async function sendMail(to: string, subject: string, body: string) {
  if (config.mailTransport === 'outbox') {
    await authPool.query('INSERT INTO mail_outbox(to_email, subject, body) VALUES ($1,$2,$3)', [to, subject, body]);
    if (!config.isTest && !config.isProd) console.log(`[mail] to=${to} subject="${subject}"\n${body}\n`);
    return;
  }
  if (config.mailTransport !== 'smtp') throw new Error(`Mail transport "${config.mailTransport}" is not configured`);
  try {
    const { t, from } = smtp();
    await t.sendMail({ from, to, subject, text: body });
  } catch (e) {
    // The body holds a one-time link and the address is personal: neither goes into the log.
    console.error(`[mail] sending failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    throw new HttpError(502, 'mail_failed');
  }
}
