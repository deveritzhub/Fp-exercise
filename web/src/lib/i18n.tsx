import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locale } from '@shared/taxonomy';
import { vocab, type AccountKind } from '@shared/accountKind';

/**
 * Translation approach: UI copy is co-located and bilingual — t('Nederlands', 'English').
 * Dutch is the source language. Strings are greppable via `t('` so they can be extracted into
 * message catalogs (e.g. ICU/JSON) once a third language is added. Shared vocabularies come from
 * shared/taxonomy.ts; error codes from errorMessage().
 */
type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (nl: string, en: string) => string; kind: AccountKind; setKind: (k: AccountKind) => void };
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
  // Account kind of the screen being shown: staff screens follow the active practice, the patient
  // app the patient's account. Coaches and personal accounts get their own words (shared/accountKind).
  const [kind, setKind] = useState<AccountKind>('physio');
  const value = useMemo<Ctx>(
    () => ({ locale, setLocale, kind, setKind, t: (nl, en) => vocab(kind, locale === 'nl' ? nl : en, locale) }),
    [locale, setLocale, kind],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Layouts call this so the copy below them uses the words of that account kind. */
export function useAccountKind(kind: AccountKind | null | undefined) {
  const { setKind } = useI18n();
  useEffect(() => {
    setKind(kind ?? 'physio');
  }, [kind, setKind]);
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
  paused_red_flag: ['Je programma staat stil na je melding. Wacht tot je fysiotherapeut contact met je heeft gehad.', 'Your programme is paused after your report. Wait until your physiotherapist has been in touch.'],
  red_flag_empty: ['Kies wat je merkt of beschrijf het kort.', 'Choose what you notice or describe it briefly.'],
  strength_not_cleared: ['Je fysiotherapeut moet eerst bevestigen dat je klaar bent voor krachttraining.', 'Your physiotherapist first has to confirm you are ready for strength training.'],
  transition_incomplete: ['Vink eerst alle punten van de checklist af.', 'Tick every item of the checklist first.'],
  one_rm_too_early: ['Een 1RM-test kan pas na 4 weken in dit programma.', 'A 1RM test is only possible after 4 weeks in this programme.'],
  weight_required: ['Vul het gewicht in.', 'Enter the weight.'],
  deletion_already_requested: ['Je hebt al een verwijderverzoek gedaan; de praktijk handelt het af.', 'You already requested deletion; the practice is handling it.'],
  reason_required: ['Geef een reden.', 'Give a reason.'],
  confirmation_required: ['Typ VERWIJDEREN om te bevestigen.', 'Type VERWIJDEREN to confirm.'],
  patient_email_exists: ['Er bestaat al een patiënt met dit e-mailadres.', 'A patient with this email already exists.'],
  patient_email_required: ['Voeg eerst een e-mailadres toe om uit te nodigen.', 'Add an email address before inviting.'],
  email_linked_to_other_patient: ['Dit e-mailadres is al gekoppeld aan een andere patiënt.', 'This email is already linked to another patient.'],
  email_belongs_to_staff: ['Dit e-mailadres hoort bij een medewerker.', 'This email belongs to a staff member.'],
  email_belongs_to_patient: ['Dit e-mailadres hoort bij een patiëntaccount.', 'This email belongs to a patient account.'],
  program_empty: ['Voeg minimaal één oefening toe voordat je het programma activeert.', 'Add at least one exercise before activating.'],
  invalid_exercise: ['Een of meer oefeningen zijn niet beschikbaar.', 'One or more exercises are not available.'],
  alternative_is_progression: ['Een progressie (zwaardere variant) kan geen vervangende oefening zijn. Kies een regressie of gelijkwaardig alternatief.', 'A progression (harder variant) cannot be a substitute. Choose a regression or an equivalent alternative.'],
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
  hero_required: ['Maak eerst je sportheld aan.', 'Create your sports hero first.'],
  email_in_use: ['Er bestaat al een account met dit e-mailadres. Log in, of herstel je wachtwoord via “Wachtwoord vergeten”.', 'An account with this email address already exists. Log in, or reset your password via “Forgot password”.'],
  signup_closed: ['Aanmelden is nu niet mogelijk.', 'Sign-up is not available right now.'],
  rehab_needs_physio: ['Revalidatieprogramma’s zijn alleen voor fysiotherapiepraktijken.', 'Rehabilitation programmes are for physiotherapy practices only.'],
  red_flag_needs_physio: ['Meldingen gaan naar een fysiotherapeut. Stop met trainen en bel bij twijfel je huisarts, of 112 bij spoed.', 'Reports go to a physiotherapist. Stop training and call your GP if in doubt, or 112 in an emergency.'],
  social_cancelled: ['Inloggen is geannuleerd.', 'Login was cancelled.'],
  social_login_failed: ['Inloggen via Google of Apple is niet gelukt. Probeer het opnieuw.', 'Logging in with Google or Apple failed. Please try again.'],
  social_login_expired: ['Je inlogpoging is verlopen. Probeer het opnieuw.', 'Your login attempt expired. Please try again.'],
  social_email_unverified: ['Je e-mailadres is bij Google of Apple niet bevestigd.', 'Your email address is not verified with Google or Apple.'],
  social_link_required: ['Er bestaat al een FP Flow-account met dit e-mailadres. Log in met je wachtwoord en koppel Google of Apple via Account → Inlogmethoden.', 'An FP Flow account with this email address already exists. Log in with your password and link Google or Apple under Account → Login methods.'],
  social_no_account: ['Er is nog geen account voor dit Google- of Apple-account. Maak eerst een account aan.', 'There is no account for this Google or Apple account yet. Create an account first.'],
  social_in_use: ['Dit Google- of Apple-account is al aan een ander FP Flow-account gekoppeld.', 'This Google or Apple account is already linked to another FP Flow account.'],
  social_already_linked: ['Er is al een account van deze aanbieder gekoppeld. Ontkoppel dat eerst.', 'An account from this provider is already linked. Unlink it first.'],
  provider_not_configured: ['Deze inlogmethode is nog niet beschikbaar.', 'This login method is not available yet.'],
  last_login_method: ['Dit is je enige manier om in te loggen. Voeg eerst een andere toe (bijv. een wachtwoord of passkey).', 'This is your only way to log in. Add another one first (e.g. a password or passkey).'],
  passkey_expired: ['Dat duurde te lang. Probeer het opnieuw.', 'That took too long. Please try again.'],
  passkey_failed: ['De passkey kon niet worden gecontroleerd. Probeer het opnieuw.', 'The passkey could not be verified. Please try again.'],
  passkey_unknown: ['Deze passkey is niet (meer) bij ons bekend. Log in op een andere manier.', 'This passkey is not (or no longer) known to us. Log in another way.'],
  passkey_exists: ['Deze passkey is al toegevoegd.', 'This passkey has already been added.'],
  passkey_limit: ['Je hebt het maximum van 10 passkeys bereikt.', 'You have reached the maximum of 10 passkeys.'],
  gear_locked: ['Dit item heb je nog niet vrijgespeeld.', 'You have not unlocked this item yet.'],
  sharing_off: ['Zet eerst "Deel mijn held met vrienden" aan.', 'Switch on "Share my hero with friends" first.'],
  friend_code_not_found: ['Geen held gevonden met deze vriendcode. Controleer de code; je vriend moet delen ook aan hebben staan.', 'No hero found with this friend code. Check the code; your friend must have sharing switched on too.'],
  friend_self: ['Dit is je eigen vriendcode.', 'This is your own friend code.'],
  friend_exists: ['Jullie zijn al vrienden of er staat al een verzoek open.', 'You are already friends or a request is pending.'],
  friend_limit: ['Je hebt het maximum van 100 vrienden en verzoeken bereikt.', 'You have reached the maximum of 100 friends and requests.'],
};

export function errorMessage(code: string | undefined, locale: Locale) {
  const e = code ? ERRORS[code] : undefined;
  if (e) return locale === 'nl' ? e[0] : e[1];
  const base = locale === 'nl' ? 'Er ging iets mis. Probeer het opnieuw.' : 'Something went wrong. Please try again.';
  // An unknown error still names its code, so it can be reported and looked up.
  return code ? `${base} (${locale === 'nl' ? 'foutcode' : 'error code'}: ${code})` : base;
}

/** Field names as the forms show them (API field → label). */
const FIELDS: Record<string, [string, string]> = {
  name: ['Naam', 'Name'], fullName: ['Naam', 'Name'], firstName: ['Voornaam', 'First name'], lastName: ['Achternaam', 'Last name'],
  email: ['E-mailadres', 'Email'], ownerEmail: ['E-mail eigenaar', 'Owner email'], ownerName: ['Naam eigenaar', 'Owner name'],
  slug: ['Slug', 'Slug'], city: ['Plaats', 'City'], password: ['Wachtwoord', 'Password'], current: ['Huidig wachtwoord', 'Current password'],
  next: ['Nieuw wachtwoord', 'New password'], title: ['Titel', 'Title'], description: ['Beschrijving', 'Description'],
  patientInstructions: ['Instructies voor de patiënt', 'Patient instructions'], startDate: ['Startdatum', 'Start date'], endDate: ['Einddatum', 'End date'],
  nameNl: ['Naam (NL)', 'Name (NL)'], nameEn: ['Naam (EN)', 'Name (EN)'], bodyRegion: ['Lichaamsregio', 'Body region'], difficulty: ['Niveau', 'Level'],
  sets: ['Sets', 'Sets'], reps: ['Herhalingen', 'Reps'], holdS: ['Vasthouden', 'Hold'], restS: ['Rust', 'Rest'], weightKg: ['Gewicht', 'Weight'],
  externalRef: ['Kenmerk', 'Reference'], locale: ['Taal', 'Language'], defaultLocale: ['Standaardtaal', 'Default language'], accent: ['Accentkleur', 'Accent colour'],
  note: ['Notitie', 'Note'], reason: ['Reden', 'Reason'], message: ['Bericht', 'Message'], phone: ['Telefoon', 'Phone'], role: ['Rol', 'Role'],
};
/** Extra explanation for fields with a fixed format. */
const FORMATS: Record<string, [string, string]> = {
  slug: ['alleen kleine letters, cijfers en streepjes (bijv. fp-training)', 'only lowercase letters, numbers and hyphens (e.g. fp-training)'],
  accent: ['een kleurcode zoals #29483c', 'a colour code like #29483c'],
};

type Issue = { path?: string; message?: string; code?: string; minimum?: number; maximum?: number; validation?: string; type?: string; received?: string };

function issueText(i: Issue, nl: boolean) {
  const { label, why } = issueParts(i, nl);
  return `${label} ${why}`;
}

function issueParts(i: Issue, nl: boolean) {
  const key = (i.path ?? '').split('.').filter((p) => !/^\d+$/.test(p)).pop() ?? '';
  const label = FIELDS[key] ? FIELDS[key][nl ? 0 : 1] : key || (nl ? 'Formulier' : 'Form');
  let why: string;
  if (i.code === 'invalid_type' && (i.received === 'undefined' || i.received === 'null')) why = nl ? 'is verplicht' : 'is required';
  else if (i.code === 'too_small' && i.type === 'string') why = i.minimum === 1 ? (nl ? 'is verplicht' : 'is required') : nl ? `is te kort (minimaal ${i.minimum} tekens)` : `is too short (at least ${i.minimum} characters)`;
  else if (i.code === 'too_big' && i.type === 'string') why = nl ? `is te lang (maximaal ${i.maximum} tekens)` : `is too long (at most ${i.maximum} characters)`;
  else if (i.code === 'too_small') why = nl ? `moet minimaal ${i.minimum} zijn` : `must be at least ${i.minimum}`;
  else if (i.code === 'too_big') why = nl ? `mag maximaal ${i.maximum} zijn` : `must be at most ${i.maximum}`;
  else if (i.code === 'invalid_string' && i.validation === 'email') why = nl ? 'is geen geldig e-mailadres' : 'is not a valid email address';
  else if (i.code === 'invalid_string' && FORMATS[key]) why = nl ? `heeft een ongeldig formaat: ${FORMATS[key][0]}` : `has an invalid format: ${FORMATS[key][1]}`;
  else if (i.code === 'invalid_string' || i.code === 'invalid_date') why = nl ? 'heeft een ongeldig formaat' : 'has an invalid format';
  else if (i.code === 'invalid_enum_value' || i.code === 'invalid_union') why = nl ? 'heeft een ongeldige keuze' : 'has an invalid choice';
  else why = i.message ?? (nl ? 'klopt niet' : 'is not valid');
  return { key, label, why };
}

/**
 * What went wrong, as precisely as possible: for a rejected form every field and the reason
 * ("Slug heeft een ongeldig formaat: alleen kleine letters…"), otherwise the known message or the
 * error code. Use this wherever an error is shown to a person.
 */
export function describeError(err: unknown, locale: Locale): string {
  const nl = locale === 'nl';
  const code = (err as { code?: string } | null)?.code;
  const details = (err as { details?: unknown } | null)?.details;
  if (code === 'validation_failed' && Array.isArray(details) && details.length) {
    const lines = [...new Set((details as Issue[]).map((i) => issueText(i, nl)))];
    return `${nl ? 'Controleer' : 'Please check'}: ${lines.join('; ')}.`;
  }
  if (typeof code === 'string') return errorMessage(code, locale);
  if (err instanceof Error && err.message) return `${errorMessage(undefined, locale).replace(/\.$/, '')} (${err.message})`;
  return errorMessage(undefined, locale);
}

/** Per form field (API name) what is wrong with it, to show under the input and mark it red. */
export function fieldErrors(err: unknown, locale: Locale): Record<string, string> {
  const details = (err as { details?: unknown } | null)?.details;
  if ((err as { code?: string } | null)?.code !== 'validation_failed' || !Array.isArray(details)) return {};
  const out: Record<string, string> = {};
  for (const i of details as Issue[]) {
    const field = (i.path ?? '').split('.')[0];
    if (!field || out[field]) continue;
    const why = issueParts(i, locale === 'nl').why;
    out[field] = why.charAt(0).toUpperCase() + why.slice(1) + '.';
  }
  return out;
}

/** Turns typed text into a valid slug: lowercase letters, numbers and single hyphens. */
export const slugify = (v: string, final = false) => {
  const s = v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-/, '').slice(0, 60);
  return final ? s.replace(/-$/, '') : s;
};
