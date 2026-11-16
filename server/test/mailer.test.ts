import { describe, it, expect } from 'vitest';
import { smtpSettings } from '../src/auth/mailer';

describe('mail settings', () => {
  const full = { SMTP_HOST: 'smtp.example.eu', SMTP_USER: 'u', SMTP_PASS: 'p', MAIL_FROM: 'FP Flow <no-reply@example.eu>' };

  it('reads a complete set and defaults to port 587', () => {
    const s = smtpSettings(full);
    expect(s).toEqual({ ok: true, smtp: { host: 'smtp.example.eu', port: 587, user: 'u', pass: 'p', from: 'FP Flow <no-reply@example.eu>' } });
    expect(smtpSettings({ ...full, SMTP_PORT: '465' })).toMatchObject({ ok: true, smtp: { port: 465 } });
  });

  it('names what is missing instead of sending half-configured', () => {
    expect(smtpSettings({})).toEqual({ ok: false, missing: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'] });
    expect(smtpSettings({ ...full, SMTP_PASS: '  ' })).toEqual({ ok: false, missing: ['SMTP_PASS'] });
    expect(smtpSettings({ ...full, SMTP_PORT: 'abc' })).toEqual({ ok: false, missing: ['SMTP_PORT'] });
  });
});
