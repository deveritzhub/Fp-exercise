import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import pg from 'pg';

// Agent settings are read when the module loads: set them first.
vi.hoisted(() => {
  Object.assign(process.env, {
    ANTHROPIC_API_KEY: 'test-key',
    WHATSAPP_TOKEN: 'wa-token',
    WHATSAPP_PHONE_NUMBER_ID: '123',
    WHATSAPP_VERIFY_TOKEN: 'verify-me',
    WHATSAPP_APP_SECRET: 'app-secret',
    TWILIO_ACCOUNT_SID: 'AC123',
    TWILIO_AUTH_TOKEN: 'twilio-secret',
    TWILIO_PHONE_NUMBER: '+3110000000',
    OWNER_WHATSAPP: '31600000000',
    OWNER_PHONE: '+31600000000',
    AGENT_PUBLIC_URL: 'https://fp.example',
    AGENT_ADMIN_KEY: 'admin-key',
    AGENTS_AWAIT_WEBHOOK: '1',
  });
});

import { createApp } from '../src/app';
import { setClaudeClient, systemPrompt, type ClaudeClient } from '../src/agents/agent';
import { whatsappTransport } from '../src/agents/whatsapp';
import { twilioSignature } from '../src/agents/voice';
import { smsTransport } from '../src/agents/sms';
import { isOpen, parseHours } from '../src/agents/hours';

const app = createApp();

// --- fake Claude ---------------------------------------------------------------
type Block = Record<string, unknown>;
const text = (t: string): Block => ({ type: 'text', text: t });
let toolSeq = 0;
const tool = (name: string, input: Record<string, unknown>): Block => ({ type: 'tool_use', id: `tu_${++toolSeq}`, name, input });

class FakeClaude implements ClaudeClient {
  calls: Record<string, unknown>[] = [];
  constructor(private responses: [Block[], string][]) {}
  beta = {
    messages: {
      create: async (params: object) => {
        this.calls.push(JSON.parse(JSON.stringify(params)));
        const next = this.responses.shift();
        if (!next) throw new Error('no fake response left');
        return { content: next[0], stop_reason: next[1] } as never;
      },
    },
  };
}

// --- outgoing WhatsApp captured instead of sent ----------------------------------
let sent: [string, string][] = [];
beforeEach(() => {
  sent = [];
  vi.spyOn(whatsappTransport, 'send').mockImplementation(async (to, body) => {
    sent.push([to, body]);
  });
  vi.spyOn(whatsappTransport, 'markRead').mockResolvedValue();
});

const owner = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
beforeAll(async () => {
  await owner.connect();
  await owner.query('TRUNCATE agent_conversations, agent_callback_requests, agent_processed_messages');
  return () => owner.end();
});

let msgSeq = 0;
function waPayload(from: string, body: string, name = 'Sanne') {
  return JSON.stringify({
    entry: [{ changes: [{ value: {
      contacts: [{ wa_id: from, profile: { name } }],
      messages: [{ id: `wamid.${++msgSeq}`, from, type: 'text', text: { body } }],
    } }] }],
  });
}
function postWhatsapp(raw: string, secret = 'app-secret') {
  const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return app.request('/agents/whatsapp/webhook', { method: 'POST', body: raw, headers: { 'X-Hub-Signature-256': sig, 'Content-Type': 'application/json' } });
}
function postTwilio(path: string, form: Record<string, string>, valid = true) {
  const sig = twilioSignature('https://fp.example' + path, form, valid ? 'twilio-secret' : 'wrong');
  return app.request(path, { method: 'POST', body: new URLSearchParams(form), headers: { 'X-Twilio-Signature': sig, 'Content-Type': 'application/x-www-form-urlencoded' } });
}

describe('practice assistant: prompt', () => {
  it('contains the practice facts and Flux links; the phone version names no URLs', () => {
    const wa = systemPrompt('whatsapp');
    expect(wa).toContain('Functional Performance');
    expect(wa).toContain('Noorderhavenkade 158C');
    expect(wa).toContain('Wijnhaven 66');
    expect(wa).toContain('€ 49');
    expect(wa).toContain('flux.healthcare/schedule/functional-performance');
    expect(systemPrompt('voice')).toContain("GEEN opmaak, opsommingstekens, emoji, URL's");
  });

  it('reports which channels are configured, without secrets', async () => {
    const r = await app.request('/agents/health');
    expect(await r.json()).toEqual({ claude: true, whatsapp: true, voice: true });
  });
});

describe('practice assistant: WhatsApp', () => {
  it('passes the Meta verification handshake only with the right token', async () => {
    const ok = await app.request('/agents/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42');
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('42');
    const bad = await app.request('/agents/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42');
    expect(bad.status).toBe(403);
  });

  it('rejects a webhook without a valid signature', async () => {
    const r = await postWhatsapp(waPayload('31611111111', 'Hoi'), 'wrong-secret');
    expect(r.status).toBe(401);
  });

  it('answers, creates a callback request, notifies the owner and ignores duplicates', async () => {
    const fake = new FakeClaude([
      [[text('Even voor je regelen.'), tool('request_callback', { customer_name: 'Sanne', reason: 'intake plannen', preference: 'Centrum' })], 'tool_use'],
      [[text('Je wordt binnen een werkdag teruggebeld.')], 'end_turn'],
    ]);
    setClaudeClient(fake);
    const raw = waPayload('31611111111', 'Kunnen jullie me terugbellen voor een intake?');
    expect((await postWhatsapp(raw)).status).toBe(200);
    expect((await postWhatsapp(raw)).status).toBe(200); // duplicate delivery

    expect(fake.calls).toHaveLength(2);
    const req = fake.calls[0] as { fallbacks: string; tools: { name: string }[]; thinking: unknown; betas: string[] };
    expect(req.fallbacks).toBe('default');
    expect(req.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(req.thinking).toEqual({ type: 'adaptive' });
    expect(req.tools.map((t) => t.name)).toEqual(['request_callback', 'handoff_to_human']);

    const toCustomer = sent.filter(([to]) => to === '31611111111');
    expect(toCustomer).toEqual([['31611111111', 'Even voor je regelen.\n\nJe wordt binnen een werkdag teruggebeld.']]);
    const toOwner = sent.filter(([to]) => to === '31600000000');
    expect(toOwner).toHaveLength(1);
    expect(toOwner[0][1]).toContain('Sanne — +31611111111');
    expect(toOwner[0][1]).toContain('Voorkeur: Centrum');

    const { rows } = await owner.query('SELECT customer_name, reason, channel FROM agent_callback_requests');
    expect(rows).toEqual([{ customer_name: 'Sanne', reason: 'intake plannen', channel: 'whatsapp' }]);
  });

  it('keeps the conversation history append-only across messages', async () => {
    const fake = new FakeClaude([
      [[text('Een intake kost € 60.')], 'end_turn'],
      [[text('Graag gedaan!')], 'end_turn'],
    ]);
    setClaudeClient(fake);
    await postWhatsapp(waPayload('31622222222', 'Wat kost een intake?'));
    await postWhatsapp(waPayload('31622222222', 'Dank je'));
    const [first, second] = fake.calls.map((c) => (c as { messages: unknown[] }).messages);
    expect(second.slice(0, first.length)).toEqual(first);
    expect((second[first.length] as { role: string }).role).toBe('assistant');
  });

  it('after a handoff forwards messages to the owner until "#bot <number>"', async () => {
    const fake = new FakeClaude([
      [[tool('handoff_to_human', { reason: 'klacht', summary: 'ontevreden over factuur' })], 'tool_use'],
      [[text('Ik vraag een collega om contact met je op te nemen.')], 'end_turn'],
      [[text('Waarmee kan ik je helpen?')], 'end_turn'],
    ]);
    setClaudeClient(fake);
    await postWhatsapp(waPayload('31633333333', 'Ik heb een klacht'));
    expect(sent.some(([to, b]) => to === '31600000000' && b.includes('Overdracht'))).toBe(true);

    sent = [];
    await postWhatsapp(waPayload('31633333333', 'Hallo?'));
    expect(fake.calls).toHaveLength(2); // Claude not called while a person has the conversation
    expect(sent).toEqual([['31600000000', 'Bericht van +31633333333:\n(WhatsApp-naam: Sanne)\nHallo?']]);

    await postWhatsapp(waPayload('31600000000', '#bot 31633333333', 'Dinish'));
    await postWhatsapp(waPayload('31633333333', 'Nog een vraag'));
    expect(fake.calls).toHaveLength(3);
  });

  it('answers politely when Claude declines', async () => {
    setClaudeClient(new FakeClaude([[[], 'refusal']]));
    await postWhatsapp(waPayload('31644444444', '...'));
    expect(sent.find(([to]) => to === '31644444444')?.[1]).toContain('terugbelt');
  });
});

describe('practice assistant: phone', () => {
  it('greets a caller with a speech Gather; refuses unsigned requests', async () => {
    const r = await postTwilio('/agents/voice/incoming', { CallSid: 'CA1', From: '+31655555555', Direction: 'inbound' });
    const body = await r.text();
    expect(r.headers.get('Content-Type')).toContain('application/xml');
    expect(body).toContain('<Gather input="speech" language="nl-NL"');
    expect(body).toContain('Functional Performance');
    const bad = await postTwilio('/agents/voice/incoming', { CallSid: 'CA1', From: '+31655555555' }, false);
    expect(bad.status).toBe(403);
  });

  it('answers speech, offers the phone-only end_call tool and hangs up after goodbye', async () => {
    const fake = new FakeClaude([[[text('Fijne dag, tot ziens!'), tool('end_call', {})], 'tool_use'], [[], 'end_turn']]);
    setClaudeClient(fake);
    const r = await postTwilio('/agents/voice/respond?silent=0', { CallSid: 'CA2', From: '+31655555555', SpeechResult: 'Dat was alles, dank je' });
    const body = await r.text();
    expect(body).toContain('Fijne dag, tot ziens!');
    expect(body).toContain('<Hangup/>');
    expect((fake.calls[0] as { tools: { name: string }[] }).tools.map((t) => t.name)).toContain('end_call');
  });

  it('transfers to the owner on handoff and escapes text in TwiML', async () => {
    setClaudeClient(new FakeClaude([
      [[tool('handoff_to_human', { reason: 'wil mens', summary: 'vraag over <rekening> & termijn' })], 'tool_use'],
      [[text('Ik verbind je door <nu>.')], 'end_turn'],
    ]));
    const r = await postTwilio('/agents/voice/respond?silent=0', { CallSid: 'CA3', From: '+31655555555', SpeechResult: 'Mag ik iemand spreken' });
    const body = await r.text();
    expect(body).toContain('Ik verbind je door &lt;nu&gt;.');
    expect(body).toContain('<Dial callerId="+3110000000">+31600000000</Dial>');
  });

  it('never transfers a forwarded call (e.g. the practice mobile on no-answer) but offers a callback', async () => {
    const fake = new FakeClaude([
      [[tool('handoff_to_human', { reason: 'wil mens', summary: 'vraag' })], 'tool_use'],
      [[text('Ik kan je nu niet doorverbinden. Zal ik zorgen dat je wordt teruggebeld?')], 'end_turn'],
    ]);
    setClaudeClient(fake);
    const r = await postTwilio('/agents/voice/respond?silent=0', {
      CallSid: 'CA5', From: '+31655555555', ForwardedFrom: '+31681700829', SpeechResult: 'Mag ik iemand spreken',
    });
    const body = await r.text();
    expect(body).not.toContain('<Dial');
    expect(body).toContain('teruggebeld');
    const msgs = (fake.calls[1] as { messages: { role: string; content: { type: string; content?: string; text?: string }[] }[] }).messages;
    expect(JSON.stringify(msgs)).toContain('doorverbinden met een medewerker kan nu niet');
    expect(JSON.stringify(msgs.at(-1))).toContain('Doorverbinden kan nu niet');
  });

  it('texts the caller the Flux booking link (at most twice per call) and reports a failed text', async () => {
    const texts: [string, string][] = [];
    let ok = true;
    const spy = vi.spyOn(smsTransport, 'send').mockImplementation(async (to, body) => {
      texts.push([to, body]);
      return { ok, status: ok ? 201 : 400 };
    });
    const intake = 'Nieuwe klacht: intake op locatie Rotterdam Centrum (Wijnhaven)';
    const results: string[] = [];
    const fake = new FakeClaude([
      [[tool('send_booking_link', { link: intake })], 'tool_use'],
      [[text('Ik heb je een sms gestuurd met de link.')], 'end_turn'],
    ]);
    setClaudeClient(fake);
    const r = await postTwilio('/agents/voice/respond?silent=0', { CallSid: 'CA6', From: '+31666666666', SpeechResult: 'Ik wil een intake in het centrum' });
    expect(await r.text()).toContain('sms gestuurd');
    expect(texts).toHaveLength(1);
    expect(texts[0][0]).toBe('+31666666666');
    expect(texts[0][1]).toContain('location=9ca9fc8d-17a1-4576-bfac-e92a0ffe47f1');
    expect(texts[0][1]).toContain('Functional Performance');
    const tools = (fake.calls[0] as { tools: { name: string; input_schema: { properties: { link?: { enum: string[] } } } }[] }).tools;
    expect(tools.find((t) => t.name === 'send_booking_link')?.input_schema.properties.link?.enum).toContain(intake);

    // two more requests in the same call: one is sent, the third is refused
    setClaudeClient(new FakeClaude([
      [[tool('send_booking_link', { link: intake }), tool('send_booking_link', { link: intake })], 'tool_use'],
      [[text('Klaar.')], 'end_turn'],
    ]));
    await postTwilio('/agents/voice/respond?silent=0', { CallSid: 'CA6', From: '+31666666666', SpeechResult: 'Nog eens graag' });
    expect(texts).toHaveLength(2);

    // landline / failed text: the assistant is told so it can offer a callback
    ok = false;
    const failing = new FakeClaude([
      [[tool('send_booking_link', { link: intake })], 'tool_use'],
      [[text('Dat lukte niet, zal ik je laten terugbellen?')], 'end_turn'],
    ]);
    setClaudeClient(failing);
    await postTwilio('/agents/voice/respond?silent=0', { CallSid: 'CA7', From: '+31101234567', SpeechResult: 'Stuur maar een sms' });
    results.push(JSON.stringify((failing.calls[1] as { messages: unknown[] }).messages.at(-1)));
    expect(results[0]).toContain('kon niet worden verstuurd');
    spy.mockRestore();
  });

  it('hangs up after repeated silence', async () => {
    const r = await postTwilio('/agents/voice/respond?silent=3', { CallSid: 'CA4', From: '+31655555555', SpeechResult: '' });
    expect(await r.text()).toContain('<Hangup/>');
  });

  it('only starts outbound calls with the admin key', async () => {
    const r = await app.request('/agents/voice/outbound', { method: 'POST', body: JSON.stringify({ to: '+31612345678', purpose: 'x' }), headers: { 'X-Api-Key': 'wrong', 'Content-Type': 'application/json' } });
    expect(r.status).toBe(401);
  });
});

describe('practice assistant: database isolation', () => {
  it('regular app connections (fp_app without the agent flag) cannot read or write assistant data', async () => {
    const appDb = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await appDb.connect();
    try {
      const { rows } = await appDb.query('SELECT count(*)::int AS n FROM agent_conversations');
      expect(rows[0].n).toBe(0);
      await expect(
        appDb.query("INSERT INTO agent_callback_requests (customer_name, customer_phone, reason, channel) VALUES ('x','1','y','whatsapp')"),
      ).rejects.toThrow(/row-level security/);
      const total = await owner.query('SELECT count(*)::int AS n FROM agent_conversations');
      expect(total.rows[0].n).toBeGreaterThan(0);
    } finally {
      await appDb.end();
    }
  });
});

describe('practice assistant: practice hours', () => {
  const rules = parseHours('ma-vr 08:00-18:00; za 09:00-12:00');
  const at = (iso: string) => isOpen(rules, new Date(iso), 'Europe/Amsterdam');

  it('knows when the practice is open, in Amsterdam time', () => {
    expect(at('2026-11-11T09:30:00+01:00')).toBe(true); // Wednesday morning
    expect(at('2026-11-11T07:59:00+01:00')).toBe(false);
    expect(at('2026-11-11T18:00:00+01:00')).toBe(false); // closing time itself is closed
    expect(at('2026-11-11T16:59:00Z')).toBe(true); // 17:59 in Amsterdam (CET, UTC+1)
  });

  it('handles Saturday, Sunday and summer time', () => {
    expect(at('2026-11-14T10:00:00+01:00')).toBe(true); // Saturday
    expect(at('2026-11-14T12:30:00+01:00')).toBe(false);
    expect(at('2026-11-15T10:00:00+01:00')).toBe(false); // Sunday
    expect(at('2026-07-01T06:30:00Z')).toBe(true); // 08:30 in Amsterdam (CEST, UTC+2)
    expect(at('2026-07-01T05:30:00Z')).toBe(false); // 07:30 in Amsterdam
  });

  it('returns null without configured hours and rejects bad input', () => {
    expect(isOpen(parseHours(''), new Date(), 'Europe/Amsterdam')).toBeNull();
    expect(() => parseHours('maandag 9-17')).toThrow(/PRACTICE_HOURS/);
    expect(() => parseHours('ma-xx 08:00-18:00')).toThrow(/Invalid day/);
  });
});
