import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { api } from '@/lib/api';
import type { SessionUser } from '@/lib/types';

/**
 * Remembers, on this device only, that a passkey (fingerprint, Face ID) was set up or used here, so the
 * login page can offer it first, and that the offer to set one up was turned down.
 */
const HAS = 'fp-passkey-here';
const NO_OFFER = 'fp-passkey-offer-off';

const read = (k: string) => {
  try {
    return localStorage.getItem(k) === '1';
  } catch {
    return false;
  }
};
const write = (k: string) => {
  try {
    localStorage.setItem(k, '1');
  } catch {
    /* private window: just ask again next time */
  }
};

export const passkeyHere = () => read(HAS);
export const markPasskeyHere = () => write(HAS);
export const declinePasskeyOffer = () => write(NO_OFFER);

/** Whether to offer "log in with your fingerprint next time" after a login with a password. */
export async function shouldOfferPasskey() {
  if (read(HAS) || read(NO_OFFER) || !browserSupportsWebAuthn() || navigator.webdriver) return false;
  try {
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

/** A short name for this device, for the list of passkeys on the account page. */
export function deviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Dit apparaat';
}

type LoginOptions = Parameters<typeof startAuthentication>[0]['optionsJSON'];
type RegisterOptions = Parameters<typeof startRegistration>[0]['optionsJSON'];

/** Logs in with a passkey. With `autofill`, it waits for the passkey to be picked in the email field. */
export async function passkeyLogin(autofill = false) {
  const { options, handle } = await api.post<{ options: LoginOptions; handle: string }>('/auth/passkeys/login/options');
  const response = await startAuthentication({ optionsJSON: options, useBrowserAutofill: autofill });
  const r = await api.post<{ user: SessionUser }>('/auth/passkeys/login', { handle, response });
  markPasskeyHere();
  return r.user;
}

/** Adds a passkey for the logged-in user on this device. */
export async function addPasskey(name: string) {
  const { options, handle } = await api.post<{ options: RegisterOptions; handle: string }>('/auth/passkeys/register/options');
  const response = await startRegistration({ optionsJSON: options });
  await api.post('/auth/passkeys/register', { handle, response, name });
  markPasskeyHere();
}
