import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locale } from '@shared/taxonomy';

/**
 * Translation approach: UI copy is co-located and bilingual — t('Nederlands', 'English').
 * Dutch is the source language. Strings are greppable via `t('` so they can be extracted into
 * message catalogs (e.g. ICU/JSON) once a third language is added. Shared vocabularies come from
 * shared/taxonomy.ts; error codes from errorMessage().
 */
type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (nl: string, en: string) => string };
const I18nContext = createContext<Ctx | null>(null);
const KEY = 'fp.locale';

function initialLocale(): Locale {
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'nl' || s === 'en') return s;
  } catch {
    /* ignore */
  }
  return 'nl';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo<Ctx>(() => ({ locale, setLocale, t: (nl, en) => (locale === 'nl' ? nl : en) }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const c = useContext(I18nContext);
  if (!c) throw new Error('I18nProvider missing');
  return c;
}

const ERRORS: Record<string, [string, string]> = {
  invalid_credentials: ['E-mailadres of wachtwoord klopt niet.', 'Email or password is incorrect.'],
  account_locked: ['Te veel mislukte pogingen. Probeer het over 15 minuten opnieuw.', 'Too many failed attempts. Try again in 15 minutes.'],
  invalid_code: ['Deze code klopt niet of is al gebruikt. Wacht op een nieuwe code en probeer het opnieuw.', 'This code is incorrect or already used. Wait for a new code and try again.'],
  mfa_session_expired: ['Je inlogpoging is verlopen. Log opnieuw in.', 'Your sign-in attempt expired. Please log in again.'],
  mfa_required: ['Stel eerst tweestapsverificatie in.', 'Set up two-factor authentication first.'],
  mfa_already_enabled: ['Tweestapsverificatie staat al aan.', 'Two-factor authentication is already on.'],
  mfa_not_enabled: ['Tweestapsverificatie staat niet aan.', 'Two-factor authentication is not on.'],
  mfa_setup_not_started: ['Start het instellen opnieuw.', 'Please start the setup again.'],
  mfa_required_by_practice: ['Je praktijk vereist tweestapsverificatie; je kunt het niet uitzetten.', 'Your practice requires two-factor authentication; you cannot turn it off.'],
  mfa_enable_yourself_first: ['Zet eerst voor jezelf tweestapsverificatie aan (via Account).', 'First turn on two-factor authentication for yourself (under Account).'],
  cannot_reset_own_mfa: ['Je kunt je eigen tweestapsverificatie niet resetten.', 'You cannot reset your own two-factor authentication.'],
  member_of_other_practice: ['Deze collega werkt ook voor een andere praktijk; vraag de platformbeheerder om te resetten.', 'This colleague also works for another practice; ask the platform administrator to reset.'],
  rate_limited: ['Te veel verzoeken. Wacht even en probeer het opnieuw.', 'Too many requests. Please wait and try again.'],
  password_too_short: ['Kies een wachtwoord van minimaal 10 tekens.', 'Choose a password of at least 10 characters.'],
  password_too_weak: ['Gebruik letters én cijfers of leestekens.', 'Use letters and numbers or symbols.'],
  invalid_token: ['Deze link is ongeldig of verlopen.', 'This link is invalid or has expired.'],
  validation_failed: ['Controleer de gemarkeerde velden.', 'Please check the highlighted fields.'],
  network_error: ['Geen verbinding. Controleer je internet en probeer opnieuw.', 'No connection. Check your internet and try again.'],
  forbidden: ['Je hebt geen toegang tot deze gegevens.', 'You do not have access to this data.'],
  not_found: ['Niet gevonden of geen toegang.', 'Not found or no access.'],
  patient_email_exists: ['Er bestaat al een patiënt met dit e-mailadres.', 'A patient with this email already exists.'],
  patient_email_required: ['Voeg eerst een e-mailadres toe om uit te nodigen.', 'Add an email address before inviting.'],
  email_linked_to_other_patient: ['Dit e-mailadres is al gekoppeld aan een andere patiënt.', 'This email is already linked to another patient.'],
  email_belongs_to_staff: ['Dit e-mailadres hoort bij een medewerker.', 'This email belongs to a staff member.'],
  email_belongs_to_patient: ['Dit e-mailadres hoort bij een patiëntaccount.', 'This email belongs to a patient account.'],
  program_empty: ['Voeg minimaal één oefening toe voordat je het programma activeert.', 'Add at least one exercise before activating.'],
  invalid_exercise: ['Een of meer oefeningen zijn niet beschikbaar.', 'One or more exercises are not available.'],
  unsupported_file_type: ['Bestandstype niet ondersteund. Gebruik MP4, WebM, JPG, PNG of WebP.', 'Unsupported file type. Use MP4, WebM, JPG, PNG or WebP.'],
  file_too_large: ['Bestand is te groot.', 'File is too large.'],
  global_exercise_readonly: ['Oefeningen uit de centrale bibliotheek kun je dupliceren, maar niet wijzigen.', 'Library exercises can be duplicated but not edited.'],
  plan_limit_therapists: ['Het maximum aantal therapeuten voor je abonnement is bereikt.', 'Your plan’s therapist limit has been reached.'],
  last_owner: ['Een praktijk heeft minimaal één eigenaar nodig.', 'A practice needs at least one owner.'],
  slug_taken: ['Deze praktijk-URL is al in gebruik.', 'This practice slug is taken.'],
  too_fast: ['Probeer het opnieuw.', 'Please try again.'],
  already_activated: ['Deze patiënt heeft het account al geactiveerd.', 'This patient has already activated their account.'],
  email_locked_after_activation: ['Het e-mailadres kan na activatie niet meer worden gewijzigd.', 'The email address cannot be changed after activation.'],
  session_completed: ['Deze sessie is al afgerond.', 'This session is already completed.'],
};

export function errorMessage(code: string | undefined, locale: Locale) {
  const e = code ? ERRORS[code] : undefined;
  if (e) return locale === 'nl' ? e[0] : e[1];
  return locale === 'nl' ? 'Er ging iets mis. Probeer het opnieuw.' : 'Something went wrong. Please try again.';
}
