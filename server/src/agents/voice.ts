import crypto from 'node:crypto';
import { Hono, type Context } from 'hono';
import { handleMessage } from './agent';
import { agentConfig, twilioConfigured } from './config';
import { practice } from './practice';
import { notifyOwner } from './whatsapp';

const MAX_SILENT_TURNS = 2;

const xml = (s: string) => s.replace(/[<>&'"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[ch]!);

/** Minimal TwiML builder (no Twilio SDK needed). */
class TwiML {
  private parts: string[] = [];
  say(text: string) {
    const { voiceName, voiceLanguage } = agentConfig.twilio;
    this.parts.push(`<Say voice="${xml(voiceName)}" language="${xml(voiceLanguage)}">${xml(text)}</Say>`);
    return this;
  }
  /** Listen for speech; Twilio posts the transcript to /agents/voice/respond. */
  gather(prompt: string | null, silent = 0) {
    const { voiceName, voiceLanguage } = agentConfig.twilio;
    const say = prompt ? `<Say voice="${xml(voiceName)}" language="${xml(voiceLanguage)}">${xml(prompt)}</Say>` : '';
    this.parts.push(
      `<Gather input="speech" language="${xml(voiceLanguage)}" speechTimeout="auto" actionOnEmptyResult="true" ` +
        `method="POST" action="/agents/voice/respond?silent=${silent}">${say}</Gather>`,
    );
    // No answer within the Gather: Twilio continues here.
    this.parts.push(`<Redirect method="POST">/agents/voice/respond?silent=${silent + 1}</Redirect>`);
    return this;
  }
  dial(number: string) {
    const callerId = agentConfig.twilio.phoneNumber ? ` callerId="${xml(agentConfig.twilio.phoneNumber)}"` : '';
    this.parts.push(`<Dial${callerId}>${xml(number)}</Dial>`);
    return this;
  }
  hangup() {
    this.parts.push('<Hangup/>');
    return this;
  }
  toString() {
    return `<?xml version="1.0" encoding="UTF-8"?><Response>${this.parts.join('')}</Response>`;
  }
}

const twiml = (c: Context, t: TwiML) => c.body(t.toString(), 200, { 'Content-Type': 'application/xml' });

/** X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + sorted key/value pairs)). */
export function twilioSignature(url: string, params: Record<string, string>, authToken: string): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  return crypto.createHmac('sha1', authToken).update(data).digest('base64');
}

async function validatedForm(c: Context): Promise<Record<string, string> | null> {
  const body = await c.req.parseBody();
  const form: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) if (typeof v === 'string') form[k] = v;
  // Behind Render's proxy the request URL is internal: sign against the public URL.
  const u = new URL(c.req.url);
  const url = agentConfig.publicUrl() + u.pathname + u.search;
  const expected = Buffer.from(twilioSignature(url, form, agentConfig.twilio.authToken));
  const got = Buffer.from(c.req.header('X-Twilio-Signature') ?? '');
  return expected.length === got.length && crypto.timingSafeEqual(expected, got) ? form : null;
}

const customerNumber = (form: Record<string, string>) =>
  (form.Direction ?? '').startsWith('outbound') ? form.To ?? 'onbekend' : form.From ?? 'onbekend';

async function respond(c: Context, form: Record<string, string>, userText: string) {
  const phone = customerNumber(form);
  const reply = await handleMessage('voice', form.CallSid ?? 'onbekend', phone, userText);
  await notifyOwner(reply.notifications);
  const t = new TwiML();

  if (reply.handoffReason) {
    t.say(reply.text);
    await notifyOwner([`📞 Beller ${phone} wil een medewerker\n${reply.handoffReason}`]);
    if (agentConfig.ownerPhone) t.dial(agentConfig.ownerPhone);
    else t.say('Er is op dit moment geen medewerker bereikbaar. We bellen je zo snel mogelijk terug.').hangup();
    return twiml(c, t);
  }
  if (reply.endCall) return twiml(c, t.say(reply.text).hangup());
  return twiml(c, t.gather(reply.text));
}

export const voiceRoutes = new Hono();

voiceRoutes.use('*', async (c, next) => {
  if (!twilioConfigured()) return c.json({ error: 'not_configured' }, 503);
  await next();
});

/** Twilio calls this when someone calls the practice number (or picks up an outbound call). */
voiceRoutes.post('/incoming', async (c) => {
  const form = await validatedForm(c);
  if (!form) return c.json({ error: 'invalid_signature' }, 403);
  const purpose = c.req.query('purpose');
  if (purpose) {
    return respond(
      c,
      form,
      `(Uitgaand gesprek dat jij namens de praktijk voert; de klant heeft net opgenomen. Doel van het gesprek: ${purpose.slice(0, 500)}. Stel jezelf kort voor en begin het gesprek.)`,
    );
  }
  return twiml(c, new TwiML().gather(`Goedendag, je spreekt met de digitale assistent van ${practice.name}. Waarmee kan ik je helpen?`));
});

voiceRoutes.post('/respond', async (c) => {
  const form = await validatedForm(c);
  if (!form) return c.json({ error: 'invalid_signature' }, 403);
  const speech = (form.SpeechResult ?? '').trim();
  const silent = Math.max(0, Math.min(10, Number(c.req.query('silent') ?? 0) || 0));
  if (!speech) {
    if (silent > MAX_SILENT_TURNS) {
      return twiml(c, new TwiML().say('Ik hoor je helaas niet. Bel gerust nog een keer of stuur ons een WhatsApp. Tot ziens!').hangup());
    }
    return twiml(c, new TwiML().gather('Sorry, ik verstond je niet. Kun je dat herhalen?', silent));
  }
  return respond(c, form, speech);
});

/** Starts an outbound call where the assistant calls someone (e.g. an appointment reminder). */
voiceRoutes.post('/outbound', async (c) => {
  const key = c.req.header('X-Api-Key') ?? '';
  const expected = agentConfig.adminKey;
  if (!expected || key.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected))) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const body = (await c.req.json().catch(() => null)) as { to?: unknown; purpose?: unknown } | null;
  const to = typeof body?.to === 'string' ? body.to.trim() : '';
  const purpose = typeof body?.purpose === 'string' ? body.purpose.trim() : '';
  if (!/^\+\d{8,15}$/.test(to) || !purpose || purpose.length > 500) return c.json({ error: 'invalid_request' }, 400);
  const { accountSid, authToken, phoneNumber } = agentConfig.twilio;
  if (!phoneNumber) return c.json({ error: 'not_configured' }, 503);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      From: phoneNumber,
      Method: 'POST',
      Url: `${agentConfig.publicUrl()}/agents/voice/incoming?${new URLSearchParams({ purpose })}`,
    }),
  });
  if (!res.ok) return c.json({ error: 'twilio_error', status: res.status }, 502);
  const call = (await res.json()) as { sid: string; status: string };
  return c.json({ callSid: call.sid, status: call.status });
});
