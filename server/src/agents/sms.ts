import { agentConfig } from './config';

/** Outgoing SMS via Twilio. Tests replace `send` to capture messages. */
export const smsTransport = {
  async send(to: string, body: string): Promise<{ ok: boolean; status: number }> {
    const { accountSid, authToken, phoneNumber } = agentConfig.twilio;
    const from = agentConfig.smsFrom || phoneNumber;
    if (!accountSid || !authToken || !from) return { ok: false, status: 503 };
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    if (!res.ok) console.error(`[agents] SMS send failed: ${res.status}`);
    return { ok: res.ok, status: res.status };
  },
};
