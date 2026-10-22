import { authPool } from '../db';
import { config } from '../config';

/**
 * Mail abstraction. In development/test mail is written to the `mail_outbox` table.
 * A real provider (EU-hosted, with a processor agreement) must be configured before production.
 * Mails never contain health information — only greetings and one-time links.
 */
export async function sendMail(to: string, subject: string, body: string) {
  if (config.mailTransport !== 'outbox') {
    throw new Error(`Mail transport "${config.mailTransport}" is not configured`);
  }
  await authPool.query('INSERT INTO mail_outbox(to_email, subject, body) VALUES ($1,$2,$3)', [to, subject, body]);
  if (!config.isTest && !config.isProd) console.log(`[mail] to=${to} subject="${subject}"\n${body}\n`);
}
