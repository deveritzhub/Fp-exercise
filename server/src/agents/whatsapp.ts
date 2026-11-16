import crypto from 'node:crypto';
import { Hono } from 'hono';
import { handleMessage } from './agent';
import { agentConfig, whatsappConfigured } from './config';
import { getOrCreateConversation, markProcessed, setStatus } from './store';

const MAX_CHARS = 4096;

/** Outgoing WhatsApp messages. Tests replace `send` to capture messages instead of calling Meta. */
export const whatsappTransport = {
  async send(to: string, body: string): Promise<void> {
    const w = agentConfig.whatsapp;
    if (!w.token || !w.phoneNumberId) {
      console.warn('[agents] WhatsApp not configured; message not sent');
      return;
    }
    const url = `https://graph.facebook.com/${w.apiVersion}/${w.phoneNumberId}/messages`;
    for (let i = 0; i < body.length; i += MAX_CHARS) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${w.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: body.slice(i, i + MAX_CHARS), preview_url: false } }),
      });
      if (!res.ok) console.error(`[agents] WhatsApp send failed: ${res.status}`);
    }
  },
  async markRead(messageId: string): Promise<void> {
    const w = agentConfig.whatsapp;
    if (!w.token || !w.phoneNumberId) return;
    await fetch(`https://graph.facebook.com/${w.apiVersion}/${w.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${w.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
    }).catch(() => {});
  },
};

export async function notifyOwner(messages: string[]): Promise<void> {
  for (const m of messages) {
    if (agentConfig.ownerWhatsapp) await whatsappTransport.send(agentConfig.ownerWhatsapp, m);
    else console.warn('[agents] OWNER_WHATSAPP not set; owner notification dropped');
  }
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** X-Hub-Signature-256: proves the webhook call comes from Meta. */
export function verifyMetaSignature(rawBody: string, header: string | undefined): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', agentConfig.whatsapp.appSecret).update(rawBody).digest('hex');
  return safeEqual(expected, header.slice(7));
}

interface WaMessage {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
}

function textOf(msg: WaMessage): string | null {
  if (msg.type === 'text') return msg.text?.body ?? null;
  if (msg.type === 'button') return msg.button?.text ?? null;
  if (msg.type === 'interactive') return msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? null;
  return null;
}

/** Owner sends "#bot 316..." to let the assistant take a handed-off conversation back. */
async function ownerCommand(text: string): Promise<boolean> {
  const m = /^#bot\s+\+?(\d{6,15})\s*$/i.exec(text.trim());
  if (!m) return false;
  const conv = await getOrCreateConversation('whatsapp', m[1], m[1]);
  await setStatus(conv.id, 'active');
  await whatsappTransport.send(agentConfig.ownerWhatsapp, `De assistent neemt het gesprek met +${m[1]} weer over.`);
  return true;
}

export async function processMessage(msg: WaMessage, contactName: string | undefined): Promise<void> {
  const sender = msg.from;
  if (!(await markProcessed(msg.id))) return;
  await whatsappTransport.markRead(msg.id);

  let text = textOf(msg);
  if (text && agentConfig.ownerWhatsapp && sender === agentConfig.ownerWhatsapp && (await ownerCommand(text))) return;
  if (text === null) {
    await whatsappTransport.send(sender, 'Ik kan op dit moment alleen tekstberichten lezen. Wil je je vraag typen?');
    return;
  }
  if (contactName) text = `(WhatsApp-naam: ${contactName.slice(0, 80)})\n${text}`;

  const conv = await getOrCreateConversation('whatsapp', sender, sender);
  if (conv.status === 'handoff') {
    // Someone from the practice has the conversation: the assistant stays quiet and forwards.
    if (agentConfig.ownerWhatsapp) await whatsappTransport.send(agentConfig.ownerWhatsapp, `Bericht van +${sender}:\n${text}`);
    return;
  }

  const reply = await handleMessage('whatsapp', sender, sender, text);
  await whatsappTransport.send(sender, reply.text);
  await notifyOwner(reply.notifications);
  if (reply.handoffReason) {
    await notifyOwner([
      `🔔 Overdracht WhatsApp-klant +${sender}\n${reply.handoffReason}\n\n` +
        `Antwoord de klant direct via WhatsApp Business. Stuur '#bot ${sender}' om de assistent het weer te laten overnemen.`,
    ]);
  }
}

export const whatsappRoutes = new Hono();

/** Verification handshake Meta performs when the webhook is set up. */
whatsappRoutes.get('/webhook', (c) => {
  const vt = agentConfig.whatsapp.verifyToken;
  if (c.req.query('hub.mode') === 'subscribe' && vt && safeEqual(c.req.query('hub.verify_token') ?? '', vt)) {
    return c.text(c.req.query('hub.challenge') ?? '');
  }
  return c.json({ error: 'forbidden' }, 403);
});

whatsappRoutes.post('/webhook', async (c) => {
  if (!whatsappConfigured()) return c.json({ error: 'not_configured' }, 503);
  const raw = await c.req.text();
  if (!verifyMetaSignature(raw, c.req.header('X-Hub-Signature-256'))) return c.json({ error: 'invalid_signature' }, 401);

  let payload: { entry?: { changes?: { value?: { contacts?: { wa_id?: string; profile?: { name?: string } }[]; messages?: WaMessage[] } }[] }[] };
  try {
    payload = JSON.parse(raw);
  } catch {
    return c.json({ error: 'invalid_request' }, 400);
  }

  const jobs: Promise<void>[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const names = new Map((value.contacts ?? []).map((ct) => [ct.wa_id, ct.profile?.name]));
      for (const msg of value.messages ?? []) {
        // Answer Meta right away; Claude runs in the background.
        jobs.push(
          processMessage(msg, names.get(msg.from)).catch((e) => console.error(`[agents] WhatsApp message failed: ${(e as Error).message}`)),
        );
      }
    }
  }
  if (process.env.AGENTS_AWAIT_WEBHOOK === '1') await Promise.all(jobs); // tests only
  return c.json({ status: 'ok' });
});
