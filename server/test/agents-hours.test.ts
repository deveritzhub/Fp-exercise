import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Twilio number is the published practice number: ring the practice 09:00-18:00 on weekdays,
// the assistant answers outside those hours and whenever nobody picks up.
vi.hoisted(() => {
  Object.assign(process.env, {
    ANTHROPIC_API_KEY: 'test-key',
    TWILIO_ACCOUNT_SID: 'AC123',
    TWILIO_AUTH_TOKEN: 'twilio-secret',
    TWILIO_PHONE_NUMBER: '+3110000000',
    OWNER_PHONE: '+31681700829',
    OWNER_WHATSAPP: '',
    PRACTICE_HOURS: 'ma-vr 09:00-18:00',
    RING_OWNER_FIRST: '1',
    AGENT_PUBLIC_URL: 'https://fp.example',
  });
});

import { createApp } from '../src/app';
import { setClaudeClient, type ClaudeClient } from '../src/agents/agent';
import { twilioSignature } from '../src/agents/voice';

const app = createApp();

function postTwilio(path: string, form: Record<string, string>) {
  const sig = twilioSignature('https://fp.example' + path, form, 'twilio-secret');
  return app.request(path, { method: 'POST', body: new URLSearchParams(form), headers: { 'X-Twilio-Signature': sig, 'Content-Type': 'application/x-www-form-urlencoded' } });
}

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterEach(() => vi.useRealTimers());

describe('phone: practice hours ma-vr 09:00-18:00', () => {
  it('during hours rings the practice first, showing the caller number', async () => {
    vi.setSystemTime(new Date('2026-11-11T10:00:00+01:00')); // Wednesday 10:00
    const body = await (await postTwilio('/agents/voice/incoming', { CallSid: 'CH1', From: '+31655555555', Direction: 'inbound' })).text();
    expect(body).toContain('<Dial callerId="+31655555555" timeout="20" action="/agents/voice/dial-result" method="POST">+31681700829</Dial>');
    expect(body).not.toContain('<Gather');
  });

  it('when the practice answered the call simply ends', async () => {
    const body = await (await postTwilio('/agents/voice/dial-result', { CallSid: 'CH1', From: '+31655555555', DialCallStatus: 'completed' })).text();
    expect(body).toContain('<Hangup/>');
  });

  it('when nobody answers the assistant takes over and never rings the practice again', async () => {
    vi.setSystemTime(new Date('2026-11-11T10:00:00+01:00'));
    const missed = await (await postTwilio('/agents/voice/dial-result', { CallSid: 'CH2', From: '+31655555555', DialCallStatus: 'no-answer' })).text();
    expect(missed).toContain('<Gather');
    expect(missed).toContain('even bezet');

    const calls: unknown[] = [];
    const responses = [
      { content: [{ type: 'tool_use', id: 't1', name: 'handoff_to_human', input: { reason: 'wil mens', summary: 'x' } }], stop_reason: 'tool_use' },
      { content: [{ type: 'text', text: 'Zal ik zorgen dat je wordt teruggebeld?' }], stop_reason: 'end_turn' },
    ];
    const fake: ClaudeClient = { beta: { messages: { create: async (p) => { calls.push(p); return responses.shift() as never; } } } };
    setClaudeClient(fake);
    const body = await (await postTwilio('/agents/voice/respond?silent=0', { CallSid: 'CH2', From: '+31655555555', SpeechResult: 'Ik wil iemand spreken' })).text();
    expect(body).not.toContain('<Dial');
    expect(body).toContain('teruggebeld');
  });

  it('before 09:00, after 18:00 and in the weekend the assistant answers with the closed greeting', async () => {
    for (const t of ['2026-11-11T08:59:00+01:00', '2026-11-11T18:00:00+01:00', '2026-11-11T23:30:00+01:00', '2026-11-14T12:00:00+01:00']) {
      vi.setSystemTime(new Date(t));
      const body = await (await postTwilio('/agents/voice/incoming', { CallSid: `CH-${t}`, From: '+31655555555', Direction: 'inbound' })).text();
      expect(body, t).not.toContain('<Dial');
      expect(body, t).toContain('De praktijk is nu gesloten');
    }
  });
});
