/**
 * Account types. A "practice" is the account that owns data and pays:
 * - physio:   a physiotherapy practice. Full clinical features (pain map, warning signs, rehab phases).
 * - coach:    a personal trainer / studio. Same tools, but fitness only: no rehab programmes,
 *             no clinical warning-sign reports; pain becomes "how does your body feel" (a diary).
 * - personal: someone training for themselves, without a professional. Fitness only, self-service.
 *
 * The non-physio kinds are deliberately NOT medical: the app records how someone feels but never
 * draws conclusions or changes a programme because of it (see docs/ACCOUNT_TYPES.md).
 */
export const ACCOUNT_KINDS = ['physio', 'coach', 'personal'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

/** Clinical features (pain map wording, warning-sign reports, rehab module, phase criteria). */
export const isClinical = (kind: AccountKind | null | undefined) => (kind ?? 'physio') === 'physio';

/** Modules a kind can use. Rehab programmes need a physiotherapist. */
export const modulesFor = (kind: AccountKind | null | undefined) =>
  isClinical(kind) ? (['revalidatie', 'kracht', 'mobiliteit'] as const) : (['kracht', 'mobiliteit'] as const);

/**
 * Words per kind. Staff screens are written for physiotherapy; for a coach the same screens use
 * these words instead. Order matters: longer words first.
 */
const COACH_NL: [RegExp, string][] = [
  [/Fysiotherapeuten/g, 'Coaches'], [/fysiotherapeuten/g, 'coaches'],
  [/Fysiotherapeut/g, 'Coach'], [/fysiotherapeut/g, 'coach'],
  [/Therapeuten/g, 'Coaches'], [/therapeuten/g, 'coaches'],
  [/Therapeut/g, 'Coach'], [/therapeut/g, 'coach'],
  [/Patiënten/g, 'Klanten'], [/patiënten/g, 'klanten'],
  [/Patiënt/g, 'Klant'], [/patiënt/g, 'klant'],
  [/Praktijken/g, 'Studio’s'], [/praktijken/g, 'studio’s'],
  [/Praktijk/g, 'Studio'], [/praktijk/g, 'studio'],
];
const COACH_EN: [RegExp, string][] = [
  [/Physiotherapists/g, 'Coaches'], [/physiotherapists/g, 'coaches'],
  [/Physiotherapist/g, 'Coach'], [/physiotherapist/g, 'coach'],
  [/Therapists/g, 'Coaches'], [/therapists/g, 'coaches'],
  [/Therapist/g, 'Coach'], [/therapist/g, 'coach'],
  [/Patients/g, 'Clients'], [/patients/g, 'clients'],
  [/Patient/g, 'Client'], [/patient/g, 'client'],
  [/Practices/g, 'Studios'], [/practices/g, 'studios'],
  [/Practice/g, 'Studio'], [/practice/g, 'studio'],
];

/** Someone training for themselves has no therapist or practice: point to professionals in general. */
const PERSONAL_NL: [RegExp, string][] = [
  // Whole sentences about what "your physiotherapist" does first.
  [/Zodra je fysiotherapeut een programma voor je klaarzet, zie/g, 'Kies een schema, dan zie'],
  [/Je fysiotherapeut bespreekt met je hoe je verder gaat\./g, 'Kies daarna een volgend schema.'],
  [/, en je fysiotherapeut beslist wanneer je verder gaat\./g, '.'],
  [/; je fysiotherapeut bepaalt de duur\./g, '; je bepaalt zelf hoe lang je doorgaat.'],
  [/Je fysiotherapeut kan je voortgang en feedback nu bekijken\./g, 'Je training is opgeslagen.'],
  [/Bericht voor je fysiotherapeut/g, 'Notitie voor jezelf'],
  [/bespreek het met je fysiotherapeut/gi, 'vraag advies aan een fysiotherapeut of huisarts'],
  [/je huisarts of fysiotherapeut/g, 'je huisarts of een fysiotherapeut'],
  [/met je fysiotherapeut/g, 'met een fysiotherapeut of huisarts'],
  [/je fysiotherapeut/g, 'een fysiotherapeut of huisarts'],
  [/Je fysiotherapeut/g, 'Een fysiotherapeut of huisarts'],
  [/bel je praktijk/g, 'bel je huisarts'],
  [/Je praktijk/g, 'FP Flow'], [/je praktijk/g, 'FP Flow'],
];
const PERSONAL_EN: [RegExp, string][] = [
  [/As soon as your physiotherapist sets up a programme for you, you see/g, 'Choose a plan, then you see'],
  [/Your physiotherapist discusses the next steps with you\./g, 'Then choose a next plan.'],
  [/, and your physiotherapist decides when you move on\./g, '.'],
  [/; your physiotherapist decides the duration\./g, '; you decide how long to keep going.'],
  [/Your physiotherapist can now see your progress and feedback\./g, 'Your workout has been saved.'],
  [/Message for your physiotherapist/g, 'Note to self'],
  [/discuss it with your physiotherapist/gi, 'ask a physiotherapist or GP for advice'],
  [/your physiotherapist/g, 'a physiotherapist or GP'], [/Your physiotherapist/g, 'A physiotherapist or GP'],
  [/call your practice/g, 'call your GP'],
  [/Your practice/g, 'FP Flow'], [/your practice/g, 'FP Flow'],
];

/** Rewrites UI copy for the account kind (physiotherapy is the source wording). */
export function vocab(kind: AccountKind | null | undefined, text: string, locale: 'nl' | 'en') {
  const rules = kind === 'coach' ? (locale === 'nl' ? COACH_NL : COACH_EN) : kind === 'personal' ? (locale === 'nl' ? PERSONAL_NL : PERSONAL_EN) : null;
  if (!rules) return text;
  let out = text;
  for (const [re, to] of rules) out = out.replace(re, to);
  return out;
}

export const KIND_LABEL: Record<AccountKind, [string, string]> = {
  physio: ['Fysiotherapiepraktijk', 'Physiotherapy practice'],
  coach: ['Personal trainer / studio', 'Personal trainer / studio'],
  personal: ['Voor mezelf', 'For myself'],
};

/**
 * Self-check before training harder, for accounts without a physiotherapist (based on the idea of
 * the PAR-Q: general questions, no diagnosis). Any "yes" means: ask a doctor first.
 */
export const SELF_CHECK: { key: string; nl: string; en: string }[] = [
  { key: 'heart', nl: 'Heeft een arts ooit gezegd dat je een hartaandoening of hoge bloeddruk hebt?', en: 'Has a doctor ever said you have a heart condition or high blood pressure?' },
  { key: 'chest', nl: 'Heb je pijn op de borst in rust, bij dagelijkse dingen of bij sporten?', en: 'Do you have chest pain at rest, in daily activities or when exercising?' },
  { key: 'dizzy', nl: 'Ben je het afgelopen jaar flauwgevallen of je evenwicht verloren door duizeligheid?', en: 'In the past year, have you fainted or lost your balance because of dizziness?' },
  { key: 'condition', nl: 'Heb je een andere chronische aandoening waarvoor je onder behandeling bent?', en: 'Do you have another chronic condition you are being treated for?' },
  { key: 'medication', nl: 'Gebruik je medicijnen voor een chronische aandoening?', en: 'Do you take medication for a chronic condition?' },
  { key: 'joints', nl: 'Heb je een bot-, gewrichts- of spierprobleem dat erger kan worden door meer te bewegen?', en: 'Do you have a bone, joint or muscle problem that could get worse with more activity?' },
  { key: 'told', nl: 'Heeft een arts gezegd dat je alleen onder begeleiding mag sporten?', en: 'Has a doctor said you should only exercise under supervision?' },
];
