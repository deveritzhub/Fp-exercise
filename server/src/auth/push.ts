import webpush from 'web-push';
import { authPool } from '../db';
import { config } from '../config';
import { badRequest } from '../lib/errors';

/**
 * Opt-in push reminders for patients ("your exercises are ready").
 * Payloads are generic: never a programme, exercise or health detail, because the text passes
 * through the push service of Apple/Google/Mozilla (encrypted, but shown on the lock screen).
 */

let vapid: { publicKey: string; privateKey: string } | null = null;

/** VAPID keys from the environment, or generated once and kept in the database. */
export async function vapidKeys() {
  if (vapid) return vapid;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapid = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const fresh = webpush.generateVAPIDKeys();
    await authPool.query(`INSERT INTO server_secrets(name, value) VALUES ('vapid', $1) ON CONFLICT (name) DO NOTHING`, [JSON.stringify(fresh)]);
    const { rows } = await authPool.query(`SELECT value FROM server_secrets WHERE name = 'vapid'`);
    vapid = JSON.parse(rows[0].value);
  }
  return vapid!;
}

// Only real browser push services: the server sends requests to this URL, so never let a client
// point it at an arbitrary (internal) address.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];

export function validEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && !u.port && PUSH_HOSTS.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
}

export async function getSettings(userId: string) {
  const { rows } = await authPool.query('SELECT enabled, to_char(time_local, \'HH24:MI\') AS time FROM reminder_settings WHERE user_id = $1', [userId]);
  const { rows: subs } = await authPool.query('SELECT endpoint FROM push_subscriptions WHERE user_id = $1', [userId]);
  return {
    publicKey: (await vapidKeys()).publicKey,
    enabled: rows[0]?.enabled ?? false,
    time: rows[0]?.time ?? '18:00',
    endpoints: subs.map((s) => s.endpoint as string),
  };
}

export async function saveSettings(userId: string, enabled: boolean, time: string) {
  await authPool.query(
    `INSERT INTO reminder_settings(user_id, enabled, time_local) VALUES ($1,$2,$3)
     ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled, time_local = EXCLUDED.time_local, updated_at = now(),
       -- a new, later time today may still fire today
       last_sent_on = CASE WHEN reminder_settings.time_local <> EXCLUDED.time_local THEN NULL ELSE reminder_settings.last_sent_on END`,
    [userId, enabled, time],
  );
}

export async function subscribe(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  if (!validEndpoint(sub.endpoint)) throw badRequest('invalid_push_endpoint');
  // A device belongs to whoever signed in on it last.
  await authPool.query(
    `INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth) VALUES ($1,$2,$3,$4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth],
  );
}

export async function unsubscribe(userId: string, endpoint: string) {
  await authPool.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, endpoint]);
}

const MESSAGES = {
  nl: { title: 'FP Exercise', body: 'Je oefeningen voor vandaag staan klaar. Succes! 💪' },
  en: { title: 'FP Exercise', body: 'Your exercises for today are ready. Good luck! 💪' },
};
const TEST = {
  nl: { title: 'FP Exercise', body: 'Zo ziet je herinnering eruit. Je ontvangt hem alleen op dagen met oefeningen.' },
  en: { title: 'FP Exercise', body: 'This is what your reminder looks like. You only get it on exercise days.' },
};

/** Sends to every device of the user; removes subscriptions the push service reports as gone. */
export async function sendToUser(userId: string, msg: { title: string; body: string }) {
  const keys = await vapidKeys();
  const subject = config.appOrigin.startsWith('https://') ? config.appOrigin : 'mailto:noreply@fp-exercise.invalid';
  const { rows } = await authPool.query('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1', [userId]);
  let sent = 0;
  for (const s of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ ...msg, url: '/p' }),
        { vapidDetails: { subject, publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: 4 * 3600, urgency: 'normal' },
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await authPool.query('DELETE FROM push_subscriptions WHERE id = $1', [s.id]);
      else console.error('[reminders] push failed', status ?? (e as Error).message);
    }
  }
  return sent;
}

export async function sendTest(userId: string, locale: 'nl' | 'en') {
  return sendToUser(userId, TEST[locale]);
}

const amsterdamNow = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
};

/** One scheduler pass: claims due reminders atomically (safe with several instances) and sends them. */
export async function runDueReminders(now = amsterdamNow()) {
  const { rows } = await authPool.query('SELECT user_id, locale FROM app.due_reminders($1::date, $2::time)', [now.date, now.time]);
  let sent = 0;
  for (const r of rows) {
    const claim = await authPool.query(
      'UPDATE reminder_settings SET last_sent_on = $2 WHERE user_id = $1 AND (last_sent_on IS NULL OR last_sent_on < $2)',
      [r.user_id, now.date],
    );
    if (claim.rowCount !== 1) continue;
    sent += await sendToUser(r.user_id, MESSAGES[r.locale as 'nl' | 'en'] ?? MESSAGES.nl);
  }
  return { due: rows.length, sent };
}

export function startReminderScheduler() {
  const tick = () => runDueReminders().catch((e) => console.error('[reminders]', (e as Error).message));
  setTimeout(tick, 15_000);
  return setInterval(tick, 60_000);
}
