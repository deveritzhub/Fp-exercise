import { config } from '../config';

const env = (name: string, fallback = '') => (process.env[name] ?? fallback).trim();

/**
 * Settings for the WhatsApp/phone assistant. Every channel is optional: a channel whose keys are
 * missing answers 503, the rest of FP Flow is unaffected.
 */
export const agentConfig = {
  model: env('CLAUDE_MODEL', 'claude-opus-5-5'),
  /** low = fastest (recommended for the phone), medium/high = more thorough. */
  effort: env('CLAUDE_EFFORT', 'low') as 'low' | 'medium' | 'high',
  anthropicConfigured: () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
  /** Public https URL of this server (Twilio signatures, outbound calls). */
  publicUrl: () => env('AGENT_PUBLIC_URL', config.appOrigin).replace(/\/$/, ''),
  retentionDays: Number(env('AGENT_RETENTION_DAYS', '90')),

  whatsapp: {
    token: env('WHATSAPP_TOKEN'),
    phoneNumberId: env('WHATSAPP_PHONE_NUMBER_ID'),
    verifyToken: env('WHATSAPP_VERIFY_TOKEN'),
    appSecret: env('WHATSAPP_APP_SECRET'),
    apiVersion: env('WHATSAPP_API_VERSION', 'v21.0'),
  },
  twilio: {
    accountSid: env('TWILIO_ACCOUNT_SID'),
    authToken: env('TWILIO_AUTH_TOKEN'),
    phoneNumber: env('TWILIO_PHONE_NUMBER'),
    voiceLanguage: env('VOICE_LANGUAGE', 'nl-NL'),
    voiceName: env('VOICE_NAME', 'Google.nl-NL-Standard-A'),
  },
  /** WhatsApp number of the practice owner (notifications, "#bot <number>"), e.g. 31612345678. */
  ownerWhatsapp: env('OWNER_WHATSAPP').replace(/^\+/, ''),
  /**
   * Practice hours, e.g. "ma-vr 08:00-18:00; za 09:00-12:00". Outside these hours the phone
   * assistant says the practice is closed and never transfers (it takes a callback request instead).
   */
  practiceHours: env('PRACTICE_HOURS'),
  /**
   * "1" = during PRACTICE_HOURS, ring OWNER_PHONE first and let the assistant answer only when
   * nobody picks up. Only for when the Twilio number is the number customers call (never when
   * OWNER_PHONE itself forwards to Twilio).
   */
  ringOwnerFirst: env('RING_OWNER_FIRST') === '1',
  /** Number callers are transferred to, e.g. +31612345678. */
  ownerPhone: env('OWNER_PHONE'),
  /** Protects POST /agents/voice/outbound. */
  adminKey: env('AGENT_ADMIN_KEY'),
};

export const whatsappConfigured = () => {
  const w = agentConfig.whatsapp;
  return !!(w.token && w.phoneNumberId && w.verifyToken && w.appSecret);
};
export const twilioConfigured = () => !!(agentConfig.twilio.accountSid && agentConfig.twilio.authToken);
