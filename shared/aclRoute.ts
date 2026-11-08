/**
 * Flagship ACL (VKB) route for physiotherapy practices.
 *
 * The numbers are defaults for a therapist to review and change. They are not medical advice,
 * not a clearance, and not a promise that meeting them makes the next phase safe. The next phase
 * opens only when the therapist releases it.
 *
 * Sources (criteria-based ACL rehabilitation, not a single protocol):
 * - van Melick N et al. Evidence-based clinical practice update: practice guidelines for ACL
 *   rehabilitation. Br J Sports Med. 2016;50:1506-1515.
 * - Adams D et al. Current concepts for ACL reconstruction: a criterion-based rehabilitation
 *   progression. J Orthop Sports Phys Ther. 2012;42:601-614.
 * - Grindem H et al. Simple decision rules can reduce reinjury risk by 84% after ACL
 *   reconstruction (Delaware-Oslo). Br J Sports Med. 2016;50:804-808.
 * - Kyritsis P et al. Likelihood of ACL graft rupture and six clinical discharge criteria.
 *   Br J Sports Med. 2016;50:946-951.
 * - Noyes FR, Barber SD, Mangine RE. Hop tests after ACL rupture. Clin Orthop Relat Res. 1991;264:136-144.
 * - Webster KE, Feller JA, Lambros C. ACL-RSI scale. Phys Ther Sport. 2008;9:9-15.
 * - Sturgill LP et al. Clinical scale for knee joint effusion. J Orthop Sports Phys Ther. 2009;39:845-849.
 *
 * Needs clinical review before release. Thresholds differ by protocol and by the surgeon's rules.
 */
export const ACL_SERIES_KEY = 'acl_vkb_flagship';

export const ACL_REVIEW_BANNER = {
  nl: 'Standaardwaarden — door de fysiotherapeut te beoordelen en aan te passen. Geen behandeladvies en geen vrijgave. Nakijken vóór gebruik in de zorg.',
  en: 'Default values — for the physiotherapist to judge and change. Not treatment advice and not clearance. Review before use in care.',
} as const;

export type AclUnit = 'degrees' | 'kg' | 'grade' | 'seconds' | 'percent' | 'cm';
export type AclMode = 'value' | 'lsi' | 'recorded';

export type AclCriterion = {
  slot: number;
  measureKey: string;
  mode: AclMode;
  /** Raw outcome key. For an LSI goal this is the per-side measurement, not the index. */
  rawKey: string;
  domain: 'rom' | 'strength' | 'function' | 'confidence' | null;
  unit: AclUnit;
  sided: boolean;
  comparator: 'gte' | 'lte' | 'recorded';
  /** Higher raw numbers make a better LSI, except a timed hop (lower seconds is better). */
  lsiBetter: 'higher' | 'lower';
  target: number;
  clinicalNl: string;
  clinicalEn: string;
  labelNl: string;
  labelEn: string;
  methodNl: string;
  methodEn: string;
};

export type AclPhase = {
  no: number;
  zoneNl: string;
  zoneEn: string;
  bossNl: string;
  bossEn: string;
  weeks: string;
  goalNl: string;
  goalEn: string;
  exerciseNameNl: string;
  criteria: AclCriterion[];
};

const banner = ' Standaardwaarde — door de fysiotherapeut te beoordelen en aan te passen.';

function valueCriterion(part: Omit<AclCriterion, 'mode' | 'lsiBetter' | 'rawKey'> & { rawKey?: string }): AclCriterion {
  return { ...part, rawKey: part.rawKey ?? part.measureKey, mode: 'value', lsiBetter: 'higher' };
}

function lsiCriterion(part: Omit<AclCriterion, 'mode' | 'domain' | 'unit' | 'sided' | 'comparator'> & { comparator?: 'gte' | 'lte' }): AclCriterion {
  return {
    ...part,
    mode: 'lsi',
    domain: null,
    unit: 'percent',
    sided: true,
    comparator: part.comparator ?? 'gte',
  };
}

export const ACL_PHASES: readonly AclPhase[] = [
  {
    no: 1,
    zoneNl: 'De Poort',
    zoneEn: 'The gate',
    bossNl: 'De Zwelling',
    bossEn: 'The swelling',
    weeks: '0-2',
    goalNl: 'De knie rustiger laten aanvoelen',
    goalEn: 'Let the knee feel calmer',
    exerciseNameNl: 'Quadricepsaanspanning',
    criteria: [
      valueCriterion({
        slot: 1, measureKey: 'knee_extension', domain: 'rom', unit: 'degrees', sided: true, comparator: 'lte', target: 0,
        clinicalNl: `Volledige knie-extensie: 0° tekort tot gestrekt, vergeleken met de andere zijde.${banner}`,
        clinicalEn: `Full knee extension: 0° short of straight, compared with the other side.${banner}`,
        labelNl: 'Knie strekken', labelEn: 'Straighten the knee',
        methodNl: 'Goniometer. 0 = gestrekt. Hyperextensie past niet in het getal; noteer die en pas het doel aan.',
        methodEn: 'Goniometer. 0 = straight. Hyperextension does not fit the number; note it and change the target.',
      }),
      valueCriterion({
        slot: 2, measureKey: 'knee_flexion', domain: 'rom', unit: 'degrees', sided: true, comparator: 'gte', target: 90,
        clinicalNl: `Kniebuiging minstens 90°.${banner}`,
        clinicalEn: `Knee flexion at least 90°.${banner}`,
        labelNl: 'Knie buigen', labelEn: 'Bend the knee',
        methodNl: 'Goniometer, geopereerde knie.',
        methodEn: 'Goniometer, operated knee.',
      }),
      valueCriterion({
        slot: 3, measureKey: 'extension_lag', domain: 'rom', unit: 'degrees', sided: true, comparator: 'lte', target: 0,
        clinicalNl: `Geen extensielag bij het gestrekt heffen van het been (straight-leg raise).${banner}`,
        clinicalEn: `No extension lag on a straight-leg raise.${banner}`,
        labelNl: 'Been gestrekt optillen', labelEn: 'Lift the leg straight',
        methodNl: 'Graden lag. 0 = het been blijft gestrekt.',
        methodEn: 'Degrees of lag. 0 = the leg stays straight.',
      }),
      valueCriterion({
        slot: 4, measureKey: 'effusion_grade', domain: 'function', unit: 'grade', sided: true, comparator: 'lte', target: 1,
        clinicalNl: `Weinig zwelling: stroke-test graad 0 (geen) of 1 (trace). 2 mild, 3 matig, 4 gespannen (Sturgill 2009).${banner}`,
        clinicalEn: `Little swelling: stroke-test grade 0 (none) or 1 (trace). 2 mild, 3 moderate, 4 tense (Sturgill 2009).${banner}`,
        labelNl: 'Zwelling', labelEn: 'Swelling',
        methodNl: 'Stroke-test, door de therapeut. Niet door de patiënt.',
        methodEn: 'Stroke test, by the therapist. Not by the patient.',
      }),
    ],
  },
  {
    no: 2,
    zoneNl: 'Het Pad',
    zoneEn: 'The path',
    bossNl: 'De Stramme Reus',
    bossEn: 'The stiff giant',
    weeks: '3-6',
    goalNl: 'Verder buigen en lopen',
    goalEn: 'Bend further and walk',
    exerciseNameNl: 'Hielglijden',
    criteria: [
      valueCriterion({
        slot: 1, measureKey: 'knee_flexion', domain: 'rom', unit: 'degrees', sided: true, comparator: 'gte', target: 120,
        clinicalNl: `Kniebuiging minstens 120°.${banner}`,
        clinicalEn: `Knee flexion at least 120°.${banner}`,
        labelNl: 'Knie buigen', labelEn: 'Bend the knee',
        methodNl: 'Goniometer, geopereerde knie.',
        methodEn: 'Goniometer, operated knee.',
      }),
      valueCriterion({
        slot: 2, measureKey: 'single_leg_stance', domain: 'function', unit: 'seconds', sided: true, comparator: 'gte', target: 30,
        clinicalNl: `Gecontroleerde eenbenige stand minstens 30 seconden. Praktijkcriterium, geen vaste publicatiegrens.${banner}`,
        clinicalEn: `Controlled single-leg stance at least 30 seconds. A practice criterion, not a fixed published cutoff.${banner}`,
        labelNl: 'Op één been staan', labelEn: 'Stand on one leg',
        methodNl: 'Stopwatch, door de therapeut geklokt.',
        methodEn: 'Stopwatch, timed by the therapist.',
      }),
      valueCriterion({
        slot: 3, measureKey: 'controlled_squat', domain: 'function', unit: 'grade', sided: true, comparator: 'gte', target: 1,
        clinicalNl: `Gecontroleerde squat: 1 = de therapeut beoordeelt de squat als gecontroleerd, 0 = nog niet.${banner}`,
        clinicalEn: `Controlled squat: 1 = the therapist judges the squat controlled, 0 = not yet.${banner}`,
        labelNl: 'Gecontroleerd zakken', labelEn: 'A controlled squat',
        methodNl: 'Observatie. Geen automatische score.',
        methodEn: 'Observation. No automatic score.',
      }),
      valueCriterion({
        slot: 4, measureKey: 'unassisted_gait', domain: 'function', unit: 'grade', sided: false, comparator: 'gte', target: 1,
        clinicalNl: `Gang zonder krukken: 1 = de therapeut beoordeelt het lopen als zonder krukken, 0 = nog niet.${banner}`,
        clinicalEn: `Gait without crutches: 1 = the therapist judges walking is without crutches, 0 = not yet.${banner}`,
        labelNl: 'Lopen zonder krukken', labelEn: 'Walking without crutches',
        methodNl: 'Observatie door de therapeut.',
        methodEn: 'Observation by the therapist.',
      }),
    ],
  },
  {
    no: 3,
    zoneNl: 'De Krachtbron',
    zoneEn: 'The strength spring',
    bossNl: 'De Weegschaal',
    bossEn: 'The scales',
    weeks: '7-12',
    goalNl: 'Kracht van beide benen dichter bij elkaar',
    goalEn: 'Strength of both legs closer together',
    exerciseNameNl: 'Spaanse squat',
    criteria: [
      lsiCriterion({
        slot: 1, measureKey: 'lsi_quad', rawKey: 'quad_strength', lsiBetter: 'higher', target: 70,
        clinicalNl: `Quadricepskracht, limb symmetry index minstens 70%, als voorbeeldgrens vóór hardlopen. Grindem en van Melick noemen hogere grenzen voor terugkeer naar sport; 70% is hier een aanpasbare tussenstap.${banner}`,
        clinicalEn: `Quadriceps strength, limb symmetry index at least 70%, as an example bar before running. Grindem and van Melick cite higher bars for return to sport; 70% here is an adjustable step.${banner}`,
        labelNl: 'Kracht voorkant been', labelEn: 'Strength at the front of the leg',
        methodNl: 'Zelfde test links en rechts, dezelfde dag, in kg of N. De index rekent de server uit.',
        methodEn: 'Same test left and right, the same day, in kg or N. The server computes the index.',
      }),
      lsiCriterion({
        slot: 2, measureKey: 'lsi_hamstring', rawKey: 'hamstring_strength', lsiBetter: 'higher', target: 70,
        clinicalNl: `Hamstringkracht, limb symmetry index minstens 70%. Zelfde voorbehoud als bij de quadriceps.${banner}`,
        clinicalEn: `Hamstring strength, limb symmetry index at least 70%. Same caveat as for the quadriceps.${banner}`,
        labelNl: 'Kracht achterkant been', labelEn: 'Strength at the back of the leg',
        methodNl: 'Zelfde test links en rechts, dezelfde dag. De index rekent de server uit.',
        methodEn: 'Same test left and right, the same day. The server computes the index.',
      }),
    ],
  },
  {
    no: 4,
    zoneNl: 'De Springsprong',
    zoneEn: 'The spring',
    bossNl: 'De Landing',
    bossEn: 'The landing',
    weeks: '13-24',
    goalNl: 'Hardlopen en springen, als je therapeut dat beoordeelt',
    goalEn: 'Running and hopping, if your therapist judges that',
    exerciseNameNl: 'Opstappen',
    criteria: [
      lsiCriterion({
        slot: 1, measureKey: 'lsi_quad', rawKey: 'quad_strength', lsiBetter: 'higher', target: 80,
        clinicalNl: `Quadricepskracht, limb symmetry index minstens 80%, als voorbeeldgrens bij de start van hardlopen en springen.${banner}`,
        clinicalEn: `Quadriceps strength, limb symmetry index at least 80%, as an example bar when running and hopping start.${banner}`,
        labelNl: 'Kracht voorkant been', labelEn: 'Strength at the front of the leg',
        methodNl: 'Zelfde test links en rechts, dezelfde dag. De index rekent de server uit.',
        methodEn: 'Same test left and right, the same day. The server computes the index.',
      }),
      {
        slot: 2, measureKey: 'lsi_hop_single', rawKey: 'hop_single', mode: 'recorded', domain: null, unit: 'percent', sided: true,
        comparator: 'recorded', lsiBetter: 'higher', target: 0,
        clinicalNl: `Hoptest gestart: één single-leg hop links en rechts is vastgelegd. Nog geen prestatiegrens.${banner}`,
        clinicalEn: `Hop test started: one single-leg hop is recorded left and right. Not a performance cutoff yet.${banner}`,
        labelNl: 'Sprongtest', labelEn: 'Hop test',
        methodNl: 'Afstand in cm, beide benen, dezelfde dag (Noyes). Starten is genoeg voor deze baas.',
        methodEn: 'Distance in cm, both legs, the same day (Noyes). Starting is enough for this boss.',
      },
    ],
  },
  {
    no: 5,
    zoneNl: 'Het Veld',
    zoneEn: 'The field',
    bossNl: 'De Terugkeer',
    bossEn: 'The return',
    weeks: 'vanaf 9 mnd',
    goalNl: 'Terug naar je sport, als je therapeut dat beoordeelt',
    goalEn: 'Back to your sport, if your therapist judges that',
    exerciseNameNl: 'Split squat',
    criteria: [
      lsiCriterion({
        slot: 1, measureKey: 'lsi_quad', rawKey: 'quad_strength', lsiBetter: 'higher', target: 90,
        clinicalNl: `Quadricepskracht, limb symmetry index minstens 90% (vaak genoemd bij terugkeer naar sport: Grindem 2016, Kyritsis 2016, van Melick 2016).${banner}`,
        clinicalEn: `Quadriceps strength, limb symmetry index at least 90% (often cited for return to sport: Grindem 2016, Kyritsis 2016, van Melick 2016).${banner}`,
        labelNl: 'Kracht voorkant been', labelEn: 'Strength at the front of the leg',
        methodNl: 'Zelfde test links en rechts, dezelfde dag. De index rekent de server uit.',
        methodEn: 'Same test left and right, the same day. The server computes the index.',
      }),
      lsiCriterion({
        slot: 2, measureKey: 'lsi_hamstring', rawKey: 'hamstring_strength', lsiBetter: 'higher', target: 90,
        clinicalNl: `Hamstringkracht, limb symmetry index minstens 90%.${banner}`,
        clinicalEn: `Hamstring strength, limb symmetry index at least 90%.${banner}`,
        labelNl: 'Kracht achterkant been', labelEn: 'Strength at the back of the leg',
        methodNl: 'Zelfde test links en rechts, dezelfde dag. De index rekent de server uit.',
        methodEn: 'Same test left and right, the same day. The server computes the index.',
      }),
      lsiCriterion({
        slot: 3, measureKey: 'lsi_hop_single', rawKey: 'hop_single', lsiBetter: 'higher', target: 90,
        clinicalNl: `Single-leg hop, limb symmetry index minstens 90% (Noyes-batterij).${banner}`,
        clinicalEn: `Single-leg hop, limb symmetry index at least 90% (Noyes battery).${banner}`,
        labelNl: 'Eén sprong', labelEn: 'One hop',
        methodNl: 'Afstand in cm, beide benen, dezelfde dag.',
        methodEn: 'Distance in cm, both legs, the same day.',
      }),
      lsiCriterion({
        slot: 4, measureKey: 'lsi_hop_triple', rawKey: 'hop_triple', lsiBetter: 'higher', target: 90,
        clinicalNl: `Triple hop, limb symmetry index minstens 90%.${banner}`,
        clinicalEn: `Triple hop, limb symmetry index at least 90%.${banner}`,
        labelNl: 'Drie sprongen', labelEn: 'Three hops',
        methodNl: 'Afstand in cm, beide benen, dezelfde dag.',
        methodEn: 'Distance in cm, both legs, the same day.',
      }),
      lsiCriterion({
        slot: 5, measureKey: 'lsi_hop_crossover', rawKey: 'hop_crossover', lsiBetter: 'higher', target: 90,
        clinicalNl: `Crossover hop, limb symmetry index minstens 90%.${banner}`,
        clinicalEn: `Crossover hop, limb symmetry index at least 90%.${banner}`,
        labelNl: 'Kruissprong', labelEn: 'Crossover hop',
        methodNl: 'Afstand in cm, beide benen, dezelfde dag.',
        methodEn: 'Distance in cm, both legs, the same day.',
      }),
      lsiCriterion({
        slot: 6, measureKey: 'lsi_hop_timed', rawKey: 'hop_timed_6m', lsiBetter: 'lower', target: 90,
        clinicalNl: `Timed hop over 6 m, limb symmetry index minstens 90%. Een kortere tijd is beter; de index draait de verhouding om.${banner}`,
        clinicalEn: `Timed hop over 6 m, limb symmetry index at least 90%. A shorter time is better; the index inverts the ratio.${banner}`,
        labelNl: 'Sprong over 6 meter', labelEn: 'Hop over 6 metres',
        methodNl: 'Seconden, beide benen, dezelfde dag.',
        methodEn: 'Seconds, both legs, the same day.',
      }),
      valueCriterion({
        slot: 7, measureKey: 'acl_rsi', domain: 'confidence', unit: 'percent', sided: false, comparator: 'gte', target: 65,
        clinicalNl: `ACL-RSI (0–100, Webster 2008), voorbeeldgrens 65. Publicaties gebruiken uiteenlopende grenzen. Geen vaste afkapwaarde in deze app.${banner}`,
        clinicalEn: `ACL-RSI (0–100, Webster 2008), example bar 65. Papers use different cutoffs. This app has no fixed cutoff.${banner}`,
        labelNl: 'Vertrouwen om te sporten', labelEn: 'Confidence to play sport',
        methodNl: 'Vragenlijst, ingevuld door de therapeut als getal 0–100.',
        methodEn: 'Questionnaire, entered by the therapist as a number 0–100.',
      }),
    ],
  },
];

export const ACL_RED_FLAGS = [
  'Toenemende zwelling of warmte in de knie.',
  'Kuitpijn of een been dat dik en hard aanvoelt.',
  'Een knie die blokkeert of doorzakt.',
  'Het chirurgisch protocol blijft het bindende kader, niet deze route.',
] as const;

/** Raw measurements a therapist records. The limb symmetry index is never typed in. */
export const ACL_RECORDINGS = [
  { key: 'knee_extension', domain: 'rom' as const, unit: 'degrees' as const, sides: true, nameNl: 'Knie-extensie (tekort tot 0°)', nameEn: 'Knee extension (short of 0°)' },
  { key: 'knee_flexion', domain: 'rom' as const, unit: 'degrees' as const, sides: true, nameNl: 'Kniebuiging', nameEn: 'Knee flexion' },
  { key: 'extension_lag', domain: 'rom' as const, unit: 'degrees' as const, sides: true, nameNl: 'Extensielag bij gestrekt heffen', nameEn: 'Extension lag on a straight-leg raise' },
  { key: 'effusion_grade', domain: 'function' as const, unit: 'grade' as const, sides: true, nameNl: 'Zwelling (stroke-test 0-4)', nameEn: 'Swelling (stroke test 0-4)' },
  { key: 'single_leg_stance', domain: 'function' as const, unit: 'seconds' as const, sides: true, nameNl: 'Eenbenige stand', nameEn: 'Single-leg stance' },
  { key: 'controlled_squat', domain: 'function' as const, unit: 'grade' as const, sides: true, nameNl: 'Gecontroleerde squat (0 of 1)', nameEn: 'Controlled squat (0 or 1)' },
  { key: 'unassisted_gait', domain: 'function' as const, unit: 'grade' as const, sides: false, nameNl: 'Lopen zonder krukken (0 of 1)', nameEn: 'Walking without crutches (0 or 1)' },
  { key: 'quad_strength', domain: 'strength' as const, unit: 'kg' as const, sides: true, nameNl: 'Quadricepskracht', nameEn: 'Quadriceps strength' },
  { key: 'hamstring_strength', domain: 'strength' as const, unit: 'kg' as const, sides: true, nameNl: 'Hamstringkracht', nameEn: 'Hamstring strength' },
  { key: 'hop_single', domain: 'function' as const, unit: 'cm' as const, sides: true, nameNl: 'Single-leg hop', nameEn: 'Single-leg hop' },
  { key: 'hop_triple', domain: 'function' as const, unit: 'cm' as const, sides: true, nameNl: 'Triple hop', nameEn: 'Triple hop' },
  { key: 'hop_crossover', domain: 'function' as const, unit: 'cm' as const, sides: true, nameNl: 'Crossover hop', nameEn: 'Crossover hop' },
  { key: 'hop_timed_6m', domain: 'function' as const, unit: 'seconds' as const, sides: true, nameNl: 'Timed hop 6 m', nameEn: 'Timed hop 6 m' },
  { key: 'acl_rsi', domain: 'confidence' as const, unit: 'percent' as const, sides: false, nameNl: 'ACL-RSI', nameEn: 'ACL-RSI' },
] as const;

export const ACL_MEASURE_KEYS = new Set<string>([
  ...ACL_RECORDINGS.map((r) => r.key),
  ...ACL_PHASES.flatMap((p) => p.criteria.map((c) => c.measureKey)),
]);

export function aclPhase(no: number) {
  return ACL_PHASES.find((p) => p.no === no) ?? null;
}

/**
 * Limb symmetry index in percent. Higher-is-better uses involved / uninvolved.
 * Lower-is-better (a timed hop) uses uninvolved / involved. Null when the pair cannot be divided.
 */
export function limbSymmetryIndex(involved: number, uninvolved: number, better: 'higher' | 'lower'): number | null {
  if (!Number.isFinite(involved) || !Number.isFinite(uninvolved) || involved < 0 || uninvolved <= 0) return null;
  if (better === 'lower' && involved <= 0) return null;
  const raw = better === 'higher' ? (involved / uninvolved) * 100 : (uninvolved / involved) * 100;
  return Math.round(raw * 10) / 10;
}
