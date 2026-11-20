/**
 * Mobility goals a person picks from a menu. Every goal looks at the whole chain, not one muscle:
 * a stiff back of the leg when touching the toes is often the calf, hamstrings, buttock and the back
 * extensors (erector spinae) together, so the programme stretches all of them.
 *
 * `programs` are the source keys of the shipped mobility programmes (fp-mobiliteit-v2/v3), best first.
 * `test` is a mobility self-test that shows progress. Own texts; to be reviewed clinically.
 */
import type { MobilityTestKey } from './mobilityTests';

type Fn = readonly [nl: string, en: string];

export type GoalGroup = 'lenigheid' | 'dagelijks' | 'sport' | 'routine';
export const GOAL_GROUPS: readonly { key: GoalGroup; name: Fn }[] = [
  { key: 'lenigheid', name: ['Lenigheid', 'Flexibility'] },
  { key: 'dagelijks', name: ['Dagelijks leven', 'Daily life'] },
  { key: 'sport', name: ['Sport', 'Sport'] },
  { key: 'routine', name: ['Vaste routine', 'Daily routine'] },
];

export type MobilityGoal = {
  key: string;
  group: GoalGroup;
  name: Fn;
  /** What you will be able to do. */
  gain: Fn;
  /** The chain, link by link, in plain words. */
  chain: readonly Fn[];
  /** Why the whole chain matters here. */
  why: Fn;
  test?: MobilityTestKey;
  programs: readonly string[];
};

const KUIT: Fn = ['Kuit', 'Calf'];
const HAM: Fn = ['Hamstrings', 'Hamstrings'];
const BIL: Fn = ['Bil', 'Buttock'];
const RUG: Fn = ['Rugstrekkers', 'Back extensors'];
const HEUPBUIGER: Fn = ['Heupbuigers', 'Hip flexors'];
const QUAD: Fn = ['Voorkant bovenbeen', 'Front of the thigh'];
const ADD: Fn = ['Binnenkant bovenbeen', 'Inner thigh'];
const HEUP: Fn = ['Heupgewricht', 'Hip joint'];
const ENKEL: Fn = ['Enkel', 'Ankle'];
const BOVENRUG: Fn = ['Bovenrug', 'Upper back'];
const SCHOUDERBLAD: Fn = ['Schouderblad', 'Shoulder blade'];
const SCHOUDER: Fn = ['Schouder', 'Shoulder'];
const BORST: Fn = ['Borst', 'Chest'];
const NEK: Fn = ['Nek', 'Neck'];

export const MOBILITY_GOALS: readonly MobilityGoal[] = [
  {
    key: 'tenen', group: 'lenigheid', name: ['Tenen aantikken', 'Touch your toes'],
    gain: ['Voorover buigen en met gestrekte benen je tenen raken.', 'Bend forward and reach your toes with straight legs.'],
    chain: [KUIT, HAM, BIL, RUG],
    why: [
      'Voelt het als stijve hamstrings? Vaak trekt de hele achterkant mee: van kuit via hamstrings en bil tot de rugstrekkers. Rek je alleen de hamstring, dan blijft de rest stug. Daarom zit de hele keten in dit programma.',
      'Feels like tight hamstrings? Often the whole back line pulls: from the calf through hamstrings and buttock to the back extensors. Stretch only the hamstring and the rest stays stiff. So the whole chain is in this programme.',
    ],
    test: 'fingertip_floor', programs: ['mb3_tenen', 'mb2_heup_onderrug'],
  },
  {
    key: 'spagaat_voor', group: 'lenigheid', name: ['Spagaat voorwaarts', 'Front split'],
    gain: ['Stap voor stap naar een spagaat met één been voor en één been achter.', 'Step by step towards a split with one leg in front and one behind.'],
    chain: [KUIT, HAM, HEUPBUIGER, QUAD],
    why: [
      'Een spagaat vraagt twee kettingen tegelijk: de achterkant van het voorste been en de voorkant van het achterste been. Is één van de twee stug, dan kantelt je bekken en kom je niet verder.',
      'A split asks two chains at once: the back of the front leg and the front of the back leg. If either is stiff, the pelvis tilts and you get no further.',
    ],
    test: 'chair_sit_reach', programs: ['mb3_spagaat_voor', 'mb3_tenen'],
  },
  {
    key: 'spagaat_zij', group: 'lenigheid', name: ['Spagaat zijwaarts (spreidzit)', 'Side split (straddle)'],
    gain: ['Je benen verder uit elkaar, tot een spreidzit of spagaat zijwaarts.', 'Your legs further apart, towards a straddle or side split.'],
    chain: [ADD, HAM, HEUP],
    why: [
      'Hier zit de rek vooral aan de binnenkant van de bovenbenen, maar de hamstrings lopen mee en het heupgewricht moet kunnen draaien. Daarom combineer je spreiden, kantelen en draaien.',
      'The stretch is mostly on the inner thighs, but the hamstrings come along and the hip joint has to rotate. So you combine spreading, tilting and turning.',
    ],
    programs: ['mb3_spagaat_zij'],
  },
  {
    key: 'heupen_open', group: 'lenigheid', name: ['Heupen open', 'Open hips'],
    gain: ['Makkelijk in kleermakerszit, je voet op je knie voor je schoen, meer draai bij golf of voetbal.', 'Sit cross-legged easily, foot on your knee for your shoe, more turn in golf or football.'],
    chain: [BIL, ADD, HEUP, RUG],
    why: [
      'Draait de heup te weinig, dan neemt de lage rug het draaien over en raakt die overbelast. Heupen open geeft je rug rust.',
      'If the hip turns too little, the low back takes over the turning and gets overloaded. Opening the hips gives your back a rest.',
    ],
    programs: ['mb3_heupen_open', 'mb2_heup_onderrug'],
  },
  {
    key: 'hurken', group: 'dagelijks', name: ['Diep hurken', 'Deep squat'],
    gain: ['Diep door je knieën met je hielen aan de grond, bijvoorbeeld om iets van de grond te pakken.', 'Squat deep with your heels on the floor, for example to pick something up.'],
    chain: [ENKEL, KUIT, HEUP, RUG],
    why: [
      'Komen je hielen los of kantelt je bekken onderin? Vaak is de enkel (kuit) de rem, niet de heup. Daarom begin je bij de enkel en werk je omhoog.',
      'Heels lifting or the pelvis tucking at the bottom? Often the ankle (calf) is the brake, not the hip. So you start at the ankle and work upwards.',
    ],
    test: 'knee_to_wall', programs: ['mb2_diepe_squat'],
  },
  {
    key: 'boven_hoofd', group: 'dagelijks', name: ['Armen boven je hoofd', 'Arms overhead'],
    gain: ['Je armen recht omhoog: de bovenste plank van de kast, ramen lappen, overhead trainen.', 'Your arms straight up: the top shelf, cleaning windows, overhead training.'],
    chain: [BOVENRUG, SCHOUDERBLAD, SCHOUDER, BORST],
    why: [
      'Een arm gaat pas helemaal omhoog als de bovenrug strekt en het schouderblad meedraait. Een stijve bovenrug voelt als een stijve schouder.',
      'An arm only goes all the way up when the upper back extends and the shoulder blade rotates. A stiff upper back feels like a stiff shoulder.',
    ],
    test: 'back_scratch', programs: ['mb2_schouder'],
  },
  {
    key: 'achter_rug', group: 'dagelijks', name: ['Achter je rug reiken', 'Reach behind your back'],
    gain: ['Je jas aan, je rug wassen, iets uit je achterzak pakken.', 'Putting on your coat, washing your back, reaching your back pocket.'],
    chain: [SCHOUDER, BORST, SCHOUDERBLAD, BOVENRUG],
    why: [
      'Achter je rug draait de schouder naar binnen. Stugge borstspieren en een stijve bovenrug houden de schouder vast; daarom rek je die mee.',
      'Behind your back the shoulder turns inwards. Tight chest muscles and a stiff upper back hold the shoulder; so they are stretched as well.',
    ],
    test: 'back_scratch', programs: ['mb3_achter_rug', 'mb2_schouder'],
  },
  {
    key: 'nek', group: 'dagelijks', name: ['Over je schouder kijken', 'Look over your shoulder'],
    gain: ['Je hoofd makkelijk draaien, bijvoorbeeld bij autorijden of fietsen.', 'Turn your head easily, for example when driving or cycling.'],
    chain: [NEK, SCHOUDERBLAD, BOVENRUG],
    why: [
      'Draaien gebeurt niet alleen in de nek: de bovenrug draait mee en gespannen schouderspieren remmen af. Daarom zitten bovenrug en schouderblad in dit programma.',
      'Turning does not only happen in the neck: the upper back turns along and tense shoulder muscles brake it. So upper back and shoulder blade are in this programme.',
    ],
    programs: ['mb3_nek'],
  },
  {
    key: 'opstaan', group: 'dagelijks', name: ['Van de grond opstaan', 'Get up from the floor'],
    gain: ['Zelf, rustig en veilig van de grond opstaan, bijvoorbeeld na spelen met (klein)kinderen.', 'Get up from the floor yourself, calmly and safely, for example after playing with (grand)children.'],
    chain: [ENKEL, HEUP, HEUPBUIGER, QUAD],
    why: [
      'Opstaan is enkel, heup en been samen: diep kunnen buigen én kracht om je op te drukken. Je oefent daarom bewegen én het opstaan zelf.',
      'Getting up is ankle, hip and leg together: bending deeply and the strength to push up. So you practise mobility and the getting up itself.',
    ],
    programs: ['mb3_opstaan'],
  },
  {
    key: 'zitten', group: 'dagelijks', name: ['Minder stijf na zitten', 'Less stiff after sitting'],
    gain: ['Soepel opstaan en rechtop staan na lang zitten of autorijden.', 'Get up and stand tall easily after long sitting or driving.'],
    chain: [HEUPBUIGER, BOVENRUG, BORST],
    why: [
      'Lang zitten maakt de voorkant kort (heupbuigers, borst) en de bovenrug rond. Je rekt de voorkant en beweegt de bovenrug.',
      'Long sitting shortens the front (hip flexors, chest) and rounds the upper back. You stretch the front and move the upper back.',
    ],
    test: 'fingertip_floor', programs: ['mb2_bureau', 'mb2_heup_onderrug'],
  },
  {
    key: 'squat', group: 'sport', name: ['Dieper squatten', 'Deeper squat'],
    gain: ['Dieper en rechter squatten met gewicht.', 'Squat deeper and more upright with weight.'],
    chain: [ENKEL, KUIT, HEUP, ADD],
    why: [
      'Een diepe squat vraagt enkelruimte, draaiende heupen en lange binnenkant bovenbeen. Mist er één, dan kantelt je rug onderin.',
      'A deep squat needs ankle range, rotating hips and long inner thighs. Miss one and your back tucks at the bottom.',
    ],
    test: 'knee_to_wall', programs: ['mb2_diepe_squat', 'mb3_heupen_open'],
  },
  {
    key: 'hardlopen', group: 'sport', name: ['Soepeler hardlopen', 'Run more smoothly'],
    gain: ['Een vrijere pas met meer afzet en minder stijve kuiten.', 'A freer stride with more push-off and less stiff calves.'],
    chain: [KUIT, HAM, HEUPBUIGER],
    why: [
      'Bij hardlopen werken kuit, hamstrings en heupbuigers als één veer. Stijve heupbuigers maken je pas kort en laten de kuiten harder werken.',
      'In running, calf, hamstrings and hip flexors work as one spring. Stiff hip flexors shorten your stride and make the calves work harder.',
    ],
    test: 'knee_to_wall', programs: ['mb2_na_hardlopen', 'mb3_tenen'],
  },
  {
    key: 'ochtend', group: 'routine', name: ['Soepel de dag beginnen', 'Start the day supple'],
    gain: ['In 5 minuten los: rug, heupen en bovenrug.', 'Loose in 5 minutes: back, hips and upper back.'],
    chain: [RUG, HEUP, BOVENRUG],
    why: ['Een korte vaste routine werkt beter dan af en toe lang rekken.', 'A short fixed routine works better than a long stretch now and then.'],
    programs: ['mb2_ochtend_5min'],
  },
  {
    key: 'avond', group: 'routine', name: ['Ontspannen voor het slapen', 'Unwind before sleep'],
    gain: ['Rustig rekken om de dag af te sluiten.', 'Calm stretching to end the day.'],
    chain: [RUG, HEUP, BORST],
    why: ['Langzaam rekken met rustig uitademen helpt je lichaam tot rust te komen.', 'Slow stretching with calm breathing out helps your body settle.'],
    programs: ['mb2_avond'],
  },
];

/** The programmes of a goal that this practice has, in the goal's order. */
export function programsForGoal<T extends { sourceKey: string | null }>(goal: MobilityGoal, templates: readonly T[]): T[] {
  return goal.programs.flatMap((k) => templates.filter((t) => t.sourceKey === k));
}
