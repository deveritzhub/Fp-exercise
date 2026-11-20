/**
 * Flexibility paths with a phased build-up: pancake, front split, side split and touching the toes.
 * Every phase has a goal, the physiology in plain words, the exercises (keys of the FP library) and
 * criteria to move on. Every exercise has a short form checklist.
 *
 * Physiology behind the build-up (own summary, to be reviewed clinically):
 * - The first weeks most range comes from tolerating the stretch better (stretch tolerance); that is fast.
 * - Static stretching of 30 s gives about the same as 60 s (Medeiros 2016); at least ~5 minutes per
 *   muscle group per week, 5 or more days, gives more gain (Thomas 2018; association, no proven optimum).
 * - Contract-relax (PNF) gives the same or a little more range than static stretching (Sharman 2006).
 * - Strength training through the full range gives similar range gains to stretching (Afonso 2021) and
 *   makes the muscle strong at length, so the new range can be used and held.
 * - Real changes in muscle and tendon take months. Joint shape sets a hard limit for some people.
 *
 * Template source keys are `${series}#${phase no}` (bundle fp-mobiliteit-v4).
 */
import type { MobilityTestKey } from './mobilityTests';

type Fn = readonly [nl: string, en: string];

export type FlexPathKey = 'pancake' | 'spagaat_voor' | 'spagaat_zij' | 'tenen';

export type Criterion = {
  key: string;
  text: Fn;
  /** How to check it yourself. */
  how?: Fn;
  /** Met automatically by the latest mobility self-test result. */
  auto?: { test: MobilityTestKey; atMost?: number; atLeast?: number };
};

export type PathItem = { ex: string; sets: number; reps?: number; holdS?: number; note?: Fn };

export type PathPhase = {
  name: Fn;
  weeks: string;
  minWeeks: number;
  perWeek: number;
  goal: Fn;
  physiology: Fn;
  items: readonly PathItem[];
  /** Criteria to go to the next phase; in the last phase: the goal is reached. */
  criteria: readonly Criterion[];
};

export type FlexPath = { key: FlexPathKey; series: string; name: Fn; intro: Fn; anatomy?: Fn; phases: readonly PathPhase[] };

const PHYS_1: Fn = [
  'De eerste weken komt de winst vooral doordat je zenuwstelsel de rek beter verdraagt (rektolerantie). Dat gaat snel. 30 seconden vasthouden is genoeg; vaker per week telt meer dan langer per keer.',
  'In the first weeks most of the gain comes from your nervous system tolerating the stretch better (stretch tolerance). That is quick. Holding 30 seconds is enough; more days a week counts more than longer each time.',
];
const PHYS_2: Fn = [
  'Aanspannen-ontspannen (PNF) en bewegen in de rek geven extra ruimte. Kracht in de eindstand zorgt dat je die ruimte ook kunt gebruiken en vasthouden.',
  'Contract-relax (PNF) and moving in the stretch give extra range. Strength at end range lets you use and keep that range.',
];
const PHYS_3: Fn = [
  'Rekken onder belasting, met gewicht in de lengte, geeft evenveel bewegingsuitslag als rekken en maakt de spier sterk op lengte. Echte aanpassing van spier en pees kost maanden: blijf geduldig.',
  'Loaded stretching, with weight at length, gives as much range as stretching and makes the muscle strong at length. Real adaptation of muscle and tendon takes months: be patient.',
];
const PHYS_4: Fn = [
  'Onderhoud: 2 à 3 keer per week houdt vast wat je gewonnen hebt. Stop je helemaal, dan zakt het in een paar weken terug.',
  'Maintenance: 2 to 3 times a week keeps what you gained. Stop completely and it fades within a few weeks.',
];

/** The criteria every phase has: pain, nerve symptoms and enough practice. */
function common(weeks: number, perWeek: number): Criterion[] {
  return [
    {
      key: 'pijn',
      text: ['Je voelt rek, geen pijn: hooguit 3 op 10 tijdens het oefenen, en de volgende ochtend is het niet erger dan normaal.', 'You feel a stretch, no pain: at most 3 out of 10 while practising, and the next morning it is no worse than usual.'],
    },
    {
      key: 'zenuw',
      text: ['Geen tintelingen, doof gevoel of schietende pijn in je been.', 'No tingling, numbness or shooting pain in your leg.'],
    },
    {
      key: 'trouw',
      text: [`Je hebt ${weeks} weken lang minstens ${perWeek} keer per week geoefend.`, `You practised at least ${perWeek} times a week for ${weeks} weeks.`],
      how: ['Kijk in Voortgang hoe vaak je de training deed.', 'Check in Progress how often you did the session.'],
    },
  ];
}
const KEEP: Criterion = {
  key: 'onderhoud',
  text: ['Je houdt het vast door 2 à 3 keer per week te blijven oefenen.', 'You keep it by practising 2 to 3 times a week.'],
};

const HIP_SHAPE: Fn = [
  'Hoe ver je benen uit elkaar kunnen, hangt ook af van de vorm van je heupkom en dijbeen. Voel je diep in de heup of lies een knellend, botsend gevoel (geen rek)? Dan is dat het gewricht, geen spier: niet doorduwen en bespreek het met je fysiotherapeut. Niet iedereen kan een volledige spagaat; dat is anatomie, geen falen.',
  'How far your legs can spread also depends on the shape of your hip socket and thigh bone. Do you feel a pinching, blocking feeling deep in the hip or groin (not a stretch)? That is the joint, not a muscle: do not push through and discuss it with your physiotherapist. Not everyone can do a full split; that is anatomy, not failure.',
];

export const FLEX_PATHS: readonly FlexPath[] = [
  {
    key: 'pancake', series: 'mb4_pancake', name: ['Pancake', 'Pancake'],
    intro: [
      'De pancake: in spreidzit met een lange rug naar voren tot je borst de grond raakt. Vraagt lange binnenkant bovenbenen (adductoren), hamstrings, een bekken dat naar voren kan kantelen én kracht om dat vast te houden.',
      'The pancake: in a straddle, folding forward with a long back until your chest touches the floor. It needs long inner thighs (adductors), hamstrings, a pelvis that can tilt forward and the strength to hold it.',
    ],
    anatomy: HIP_SHAPE,
    phases: [
      {
        name: ['Rechtop in spreidzit', 'Upright in a straddle'], weeks: '1-3', minWeeks: 3, perWeek: 5,
        goal: ['Ontspannen rechtop zitten in spreidzit met je bekken naar voren gekanteld.', 'Sit upright in a straddle, relaxed, with your pelvis tilted forward.'],
        physiology: PHYS_1,
        items: [
          { ex: 'mb3_vlinder', sets: 3, holdS: 30 },
          { ex: 'mb3_v_muur', sets: 3, holdS: 30 },
          { ex: 'mb4_adductor_rock_back', sets: 2, reps: 8, note: ['per kant', 'each side'] },
          { ex: 'mb_hamstring_stretch', sets: 2, holdS: 30, note: ['per been', 'each leg'] },
          { ex: 'mb4_spreidzit_rechtop', sets: 3, holdS: 30 },
        ],
        criteria: [
          { key: 'rechtop', text: ['Je zit 30 seconden rechtop in spreidzit zonder handen achter je: benen minstens een rechte hoek uit elkaar, knieën gestrekt, knieschijven naar het plafond.', 'You sit upright in a straddle for 30 seconds without hands behind you: legs at least a right angle apart, knees straight, kneecaps to the ceiling.'], how: ['Een rechte hoek is zoals de wijzers van de klok op half vijf en half acht.', 'A right angle is like clock hands at half past four and half past seven.'] },
          { key: 'bekken', text: ['Je kunt in die spreidzit je bekken naar voren kantelen: je rolt naar de voorkant van je zitbotjes en je onderrug wordt hol in plaats van bol.', 'In that straddle you can tilt your pelvis forward: you roll to the front of your sitting bones and your low back hollows instead of rounding.'] },
          ...common(3, 4),
        ],
      },
      {
        name: ['Kantelen vanuit je heupen', 'Hinging from the hips'], weeks: '4-7', minWeeks: 4, perWeek: 4,
        goal: ['Met een lange rug vanuit je heupen naar voren kantelen, verder dan alleen je rug kan buigen.', 'Fold forward from the hips with a long back, further than your back alone can bend.'],
        physiology: PHYS_2,
        items: [
          { ex: 'mb4_spreidzit_rechtop', sets: 2, holdS: 30 },
          { ex: 'mb3_pancake', sets: 3, holdS: 30 },
          { ex: 'mb4_pancake_pnf', sets: 3, reps: 3, note: ['rondes van aanspannen en ontspannen', 'rounds of contract and relax'] },
          { ex: 'mb4_straddle_good_morning', sets: 3, reps: 8 },
          { ex: 'mb3_cossack', sets: 2, reps: 6, note: ['per kant', 'each side'] },
        ],
        criteria: [
          { key: 'hoek', text: ['Je benen gaan in spreidzit ongeveer 120 graden uit elkaar, knieschijven naar het plafond.', 'Your legs spread about 120 degrees in a straddle, kneecaps to the ceiling.'], how: ['120 graden is zoals de wijzers van de klok op 4 en 8 uur.', '120 degrees is like clock hands at 4 and 8 o’clock.'] },
          { key: 'handen', text: ['Met een lange rug leg je je handen ver voor je op de grond en buig je je ellebogen richting de vloer, 30 seconden ontspannen.', 'With a long back you place your hands far in front of you on the floor and bend your elbows towards it, 30 seconds relaxed.'] },
          { key: 'actief', text: ['Je kantelt rechtop in spreidzit, zonder handen, 10 keer langzaam vanuit je heupen naar voren en terug met een lange rug.', 'Upright in a straddle, without hands, you tilt forward from your hips and back 10 times slowly with a long back.'] },
          ...common(4, 4),
        ],
      },
      {
        name: ['Dieper en sterker', 'Deeper and stronger'], weeks: '8-12', minWeeks: 5, perWeek: 4,
        goal: ['Onderarmen op de grond, en kracht om je benen in de spreidzit actief te bewegen.', 'Forearms on the floor, and the strength to move your legs actively in the straddle.'],
        physiology: PHYS_3,
        items: [
          { ex: 'mb3_pancake', sets: 3, holdS: 30 },
          { ex: 'mb4_pancake_gewicht', sets: 3, holdS: 30 },
          { ex: 'mb4_pancake_pnf', sets: 3, reps: 3 },
          { ex: 'mb4_spreidzit_beentil', sets: 3, reps: 8, note: ['per been', 'each leg'] },
          { ex: 'mb4_straddle_good_morning', sets: 3, reps: 8, note: ['iets zwaarder dan in fase 2', 'a little heavier than in phase 2'] },
          { ex: 'mb3_kikker', sets: 2, holdS: 30 },
        ],
        criteria: [
          { key: 'onderarmen', text: ['Je legt je onderarmen plat op de grond, zonder blok, met een lange rug, en houdt dat 30 seconden ontspannen vol.', 'You put your forearms flat on the floor, without a block, with a long back, and hold that for 30 seconds relaxed.'] },
          { key: 'beentil', text: ['Rechtop in spreidzit til je elk been 5 keer een paar centimeter van de grond, knie gestrekt en knieschijf naar boven.', 'Upright in a straddle you lift each leg a few centimetres off the floor 5 times, knee straight and kneecap up.'] },
          ...common(5, 4),
        ],
      },
      {
        name: ['Volledige pancake en onderhoud', 'Full pancake and maintenance'], weeks: '13+', minWeeks: 0, perWeek: 3,
        goal: ['Borst naar de grond, en wat je hebt vasthouden.', 'Chest to the floor, and keeping what you have.'],
        physiology: PHYS_4,
        items: [
          { ex: 'mb3_pancake', sets: 3, holdS: 30 },
          { ex: 'mb4_pancake_gewicht', sets: 2, holdS: 30 },
          { ex: 'mb4_spreidzit_beentil', sets: 2, reps: 8, note: ['per been', 'each leg'] },
          { ex: 'mb3_vlinder', sets: 2, holdS: 30 },
        ],
        criteria: [
          { key: 'borst', text: ['Je borst of buik raakt de grond met een lange rug, benen ongeveer 120 graden uit elkaar.', 'Your chest or belly touches the floor with a long back, legs about 120 degrees apart.'] },
          KEEP,
        ],
      },
    ],
  },
  {
    key: 'spagaat_voor', series: 'mb4_spagaat_voor', name: ['Spagaat voorwaarts', 'Front split'],
    intro: [
      'Een spagaat voorwaarts vraagt twee kettingen tegelijk: de achterkant van het voorste been (hamstrings, kuit, zenuw) en de voorkant van het achterste been (heupbuigers en voorkant dij). Je bekken blijft recht naar voren.',
      'A front split asks two chains at once: the back of the front leg (hamstrings, calf, nerve) and the front of the back leg (hip flexors and front of the thigh). Your pelvis stays square.',
    ],
    anatomy: HIP_SHAPE,
    phases: [
      {
        name: ['Voor- en achterkant los', 'Front and back loose'], weeks: '1-3', minWeeks: 3, perWeek: 5,
        goal: ['Halve spagaat en heupbuigerrek met een recht bekken.', 'Half split and hip flexor stretch with a square pelvis.'],
        physiology: PHYS_1,
        items: [
          { ex: 'mb_world_greatest', sets: 2, reps: 5, note: ['per kant, als warming-up', 'each side, as a warm-up'] },
          { ex: 'ex_hip_flexor_stretch', sets: 3, holdS: 30, note: ['per kant', 'each side'] },
          { ex: 'mb3_halve_spagaat', sets: 3, holdS: 30, note: ['per kant', 'each side'] },
          { ex: 'mb3_kuitrek_muur', sets: 2, holdS: 30, note: ['per kant', 'each side'] },
        ],
        criteria: [
          { key: 'halve_spagaat', text: ['In de halve spagaat houd je met een lange rug en recht bekken 30 seconden vol, voorste knie gestrekt.', 'In the half split you hold 30 seconds with a long back and square pelvis, front knee straight.'] },
          { key: 'heupbuiger', text: ['In de heupbuigerrek span je je bil aan en kom je rechtop zonder holle rug; je voelt de rek voor in de heup van het achterste been.', 'In the hip flexor stretch you squeeze your buttock and come upright without arching; you feel the stretch at the front of the back hip.'] },
          { key: 'thomas', text: ['Op je rug op de rand van je bed, één knie tegen je borst: het andere bovenbeen blijft plat op het bed liggen.', 'On your back at the edge of your bed, one knee to your chest: the other thigh stays flat on the bed.'], how: ['Komt dat bovenbeen omhoog, dan zijn je heupbuigers nog kort (aangepaste Thomastest).', 'If that thigh lifts, your hip flexors are still short (modified Thomas test).'] },
          ...common(3, 4),
        ],
      },
      {
        name: ['Lengte en controle', 'Length and control'], weeks: '4-7', minWeeks: 4, perWeek: 4,
        goal: ['Couch stretch rechtop en de borst naar de knie in de halve spagaat; kracht om je been actief op te tillen.', 'Upright couch stretch and chest to knee in the half split; strength to lift your leg actively.'],
        physiology: PHYS_2,
        items: [
          { ex: 'mb3_couch_stretch', sets: 3, holdS: 30, note: ['per kant', 'each side'] },
          { ex: 'mb4_halve_spagaat_pnf', sets: 3, reps: 3, note: ['rondes per kant', 'rounds each side'] },
          { ex: 'mb4_lunge_diep', sets: 2, holdS: 30, note: ['per kant', 'each side'] },
          { ex: 'mb4_actief_been_heffen', sets: 3, reps: 8, note: ['per been', 'each leg'] },
          { ex: 'mb3_spagaat_voor', sets: 2, holdS: 30, note: ['per kant, met hoge steun', 'each side, with high support'] },
        ],
        criteria: [
          { key: 'couch', text: ['In de couch stretch kom je met je romp rechtop, zonder holle rug, 30 seconden aan beide kanten.', 'In the couch stretch you bring your trunk upright, without arching, 30 seconds on both sides.'] },
          { key: 'reik', text: ['In de halve spagaat breng je je borst richting je knie met een lange rug; je handen liggen naast je voet op de grond.', 'In the half split you bring your chest towards your knee with a long back; your hands rest beside your foot on the floor.'] },
          { key: 'actief', text: ['Staand til je je gestrekte been voor je tot ongeveer heuphoogte en houdt het 5 seconden vast zonder achterover te leunen (lichte steun aan een stoel mag).', 'Standing, you lift your straight leg in front of you to about hip height and hold it 5 seconds without leaning back (light support on a chair is fine).'] },
          ...common(4, 4),
        ],
      },
      {
        name: ['Spagaat met steun', 'Supported split'], weeks: '8-12', minWeeks: 5, perWeek: 4,
        goal: ['Met blokken of stoelen steeds lager in de spagaat, gecontroleerd in en uit.', 'Lower and lower in the split with blocks or chairs, in and out with control.'],
        physiology: PHYS_3,
        items: [
          { ex: 'mb3_couch_stretch', sets: 2, holdS: 30, note: ['per kant', 'each side'] },
          { ex: 'mb3_spagaat_voor', sets: 3, holdS: 30, note: ['per kant', 'each side'] },
          { ex: 'mb4_glijdende_spagaat', sets: 3, reps: 5, note: ['per kant', 'each side'] },
          { ex: 'mb4_halve_spagaat_pnf', sets: 2, reps: 3, note: ['rondes per kant', 'rounds each side'] },
          { ex: 'mb4_actief_been_heffen', sets: 3, reps: 8, note: ['per been', 'each leg'] },
        ],
        criteria: [
          { key: 'blokken', text: ['In de spagaat met steun zakken je heupen tot ongeveer een handbreedte (10 cm) boven de grond, bekken recht naar voren, 30 seconden ontspannen.', 'In the supported split your hips come to about a hand’s width (10 cm) above the floor, pelvis square, 30 seconds relaxed.'] },
          { key: 'glijden', text: ['Je glijdt gecontroleerd in en uit de spagaat met steun, zonder te schieten of te veren.', 'You slide in and out of the supported split with control, without dropping or bouncing.'] },
          ...common(5, 4),
        ],
      },
      {
        name: ['Volledige spagaat en onderhoud', 'Full split and maintenance'], weeks: '13+', minWeeks: 0, perWeek: 3,
        goal: ['Heupen op de grond, en vasthouden.', 'Hips on the floor, and keeping it.'],
        physiology: PHYS_4,
        items: [
          { ex: 'mb3_spagaat_voor', sets: 3, holdS: 30, note: ['per kant', 'each side'] },
          { ex: 'mb3_couch_stretch', sets: 2, holdS: 30, note: ['per kant', 'each side'] },
          { ex: 'mb4_actief_been_heffen', sets: 2, reps: 8, note: ['per been', 'each leg'] },
        ],
        criteria: [
          { key: 'vloer', text: ['Je zit in een spagaat met je heupen op de grond (of op een dun kussen), bekken recht naar voren.', 'You sit in a split with your hips on the floor (or a thin cushion), pelvis square.'] },
          KEEP,
        ],
      },
    ],
  },
  {
    key: 'spagaat_zij', series: 'mb4_spagaat_zij', name: ['Spagaat zijwaarts', 'Side split'],
    intro: [
      'Een spagaat zijwaarts vraagt lange adductoren (binnenkant bovenbeen), hamstrings en een heup die ver naar buiten kan. Kracht in de spreidstand (cossack, Copenhagen) beschermt je lies.',
      'A side split needs long adductors (inner thigh), hamstrings and a hip that can open far. Strength in the wide stance (cossack, Copenhagen) protects your groin.',
    ],
    anatomy: HIP_SHAPE,
    phases: [
      {
        name: ['Binnenkant bovenbeen los', 'Inner thighs loose'], weeks: '1-3', minWeeks: 3, perWeek: 5,
        goal: ['Diep in de cossack squat en rechtop in spreidzit.', 'Deep in the cossack squat and upright in a straddle.'],
        physiology: PHYS_1,
        items: [
          { ex: 'mb3_vlinder', sets: 3, holdS: 30 },
          { ex: 'mb3_v_muur', sets: 3, holdS: 30 },
          { ex: 'mb4_adductor_rock_back', sets: 2, reps: 8, note: ['per kant', 'each side'] },
          { ex: 'mb3_cossack', sets: 2, reps: 6, note: ['per kant, houvast mag', 'each side, holding on is fine'] },
        ],
        criteria: [
          { key: 'cossack', text: ['Je zakt in de cossack squat diep aan beide kanten met de hiel aan de grond en het andere been gestrekt (houvast mag).', 'You sink deep in the cossack squat on both sides with the heel down and the other leg straight (holding on is fine).'] },
          { key: 'spreid', text: ['Je zit rechtop in spreidzit met je benen minstens een rechte hoek uit elkaar, zonder handen.', 'You sit upright in a straddle with your legs at least a right angle apart, without hands.'] },
          { key: 'lies', text: ['Je voelt rek aan de binnenkant van je bovenbenen, geen knellend gevoel diep in de lies.', 'You feel a stretch on the inner thighs, no pinching deep in the groin.'] },
          ...common(3, 4),
        ],
      },
      {
        name: ['Openen en sterker', 'Opening and stronger'], weeks: '4-7', minWeeks: 4, perWeek: 4,
        goal: ['Kikker en paardenstand, plus kracht in de adductoren.', 'Frog and horse stance, plus strength in the adductors.'],
        physiology: PHYS_2,
        items: [
          { ex: 'mb3_kikker', sets: 3, holdS: 30 },
          { ex: 'mb4_paardenstand', sets: 3, holdS: 30 },
          { ex: 'mb4_v_muur_pnf', sets: 3, reps: 3, note: ['rondes', 'rounds'] },
          { ex: 'mb3_pancake', sets: 2, holdS: 30 },
          { ex: 'kt_copenhagen_kort', sets: 2, reps: 8, note: ['per kant', 'each side'] },
        ],
        criteria: [
          { key: 'kikker', text: ['In de kikkerhouding staan je heupen in lijn met je knieën (niet erachter), 30 seconden ontspannen.', 'In the frog your hips are in line with your knees (not behind), 30 seconds relaxed.'] },
          { key: 'paard', text: ['Je houdt de paardenstand 30 seconden vol met je dijen bijna horizontaal en je knieën boven je tenen.', 'You hold the horse stance for 30 seconds with your thighs almost horizontal and knees over your toes.'] },
          { key: 'copenhagen', text: ['Je doet de korte Copenhagen 8 keer per kant zonder pijn in de lies.', 'You do the short Copenhagen 8 times each side without groin pain.'] },
          ...common(4, 4),
        ],
      },
      {
        name: ['Spagaat zijwaarts met steun', 'Supported side split'], weeks: '8-12', minWeeks: 5, perWeek: 4,
        goal: ['Met steun steeds verder uit elkaar, met kracht in de lengte.', 'Wider and wider with support, with strength at length.'],
        physiology: PHYS_3,
        items: [
          { ex: 'mb4_zijspagaat_steun', sets: 3, holdS: 30 },
          { ex: 'mb4_cossack_gewicht', sets: 3, reps: 6, note: ['per kant', 'each side'] },
          { ex: 'mb4_v_muur_pnf', sets: 2, reps: 3, note: ['rondes', 'rounds'] },
          { ex: 'mb3_kikker', sets: 2, holdS: 30 },
          { ex: 'kt_copenhagen_kort', sets: 3, reps: 8, note: ['per kant', 'each side'] },
        ],
        criteria: [
          { key: 'steun', text: ['Met je handen op twee stoelen of blokken schuif je je voeten zo ver uit elkaar dat je benen ongeveer 150 graden maken, knieschijven naar voren, 30 seconden ontspannen.', 'With your hands on two chairs or blocks you slide your feet so far apart that your legs make about 150 degrees, kneecaps forward, 30 seconds relaxed.'], how: ['150 graden is bijna een rechte lijn: de wijzers van de klok op 4 uur en kwart voor 9 zijn ongeveer zo ver uit elkaar.', '150 degrees is almost a straight line.'] },
          { key: 'gewicht', text: ['Je doet de cossack squat met gewicht 6 keer per kant diep en gecontroleerd.', 'You do the weighted cossack squat 6 times each side, deep and controlled.'] },
          ...common(5, 4),
        ],
      },
      {
        name: ['Volledige spagaat zijwaarts en onderhoud', 'Full side split and maintenance'], weeks: '13+', minWeeks: 0, perWeek: 3,
        goal: ['Bekken (bijna) op de grond, en vasthouden.', 'Pelvis (almost) on the floor, and keeping it.'],
        physiology: PHYS_4,
        items: [
          { ex: 'mb4_zijspagaat_steun', sets: 3, holdS: 30 },
          { ex: 'mb3_kikker', sets: 2, holdS: 30 },
          { ex: 'kt_copenhagen_kort', sets: 2, reps: 8, note: ['per kant', 'each side'] },
        ],
        criteria: [
          { key: 'vloer', text: ['Je bekken komt (bijna) op de grond in spagaat zijwaarts, knieschijven naar voren of naar het plafond.', 'Your pelvis comes (almost) to the floor in the side split, kneecaps forward or to the ceiling.'] },
          KEEP,
        ],
      },
    ],
  },
  {
    key: 'tenen', series: 'mb4_tenen', name: ['Tenen aantikken', 'Touching your toes'],
    intro: [
      'Voorover buigen met gestrekte benen vraagt de hele achterkant: kuit, hamstrings, bil, rugstrekkers en een zenuw die mee kan glijden. Voelt het als stijve hamstrings, kijk dan naar de hele keten.',
      'Bending forward with straight legs asks the whole back line: calf, hamstrings, buttock, back extensors and a nerve that can glide along. If it feels like tight hamstrings, look at the whole chain.',
    ],
    phases: [
      {
        name: ['De hele achterkant soepel', 'The whole back line supple'], weeks: '1-3', minWeeks: 3, perWeek: 5,
        goal: ['Alle schakels van de achterkant een voor een losser.', 'Every link of the back line looser, one by one.'],
        physiology: PHYS_1,
        items: [
          { ex: 'mb3_kuitrek_muur', sets: 2, holdS: 30, note: ['per kant', 'each side'] },
          { ex: 'mb3_soleus_rek', sets: 2, holdS: 30, note: ['per kant', 'each side'] },
          { ex: 'mb_hamstring_stretch', sets: 2, holdS: 30, note: ['per been', 'each leg'] },
          { ex: 'mb3_figuur4', sets: 2, holdS: 30, note: ['per kant', 'each side'] },
          { ex: 'mb_child_pose', sets: 2, holdS: 30 },
          { ex: 'mb3_afrollen', sets: 2, reps: 6 },
        ],
        criteria: [
          { key: 'gebogen', text: ['Met licht gebogen knieën leg je je handpalmen plat op de grond.', 'With slightly bent knees you put your palms flat on the floor.'] },
          { key: 'ff15', text: ['Vinger-vloerafstand 15 cm of minder, met gestrekte knieën.', 'Fingertip-to-floor distance 15 cm or less, knees straight.'], how: ['Meet het bij Mobiliteit meten; dan vinkt de app dit zelf af.', 'Measure it under Measure mobility; the app then ticks this itself.'], auto: { test: 'fingertip_floor', atMost: 15 } },
          ...common(3, 5),
        ],
      },
      {
        name: ['Lengte onder controle', 'Length under control'], weeks: '4-7', minWeeks: 4, perWeek: 4,
        goal: ['Vingertoppen op de grond, en kracht in de lengte van de achterkant.', 'Fingertips to the floor, and strength at length in the back line.'],
        physiology: PHYS_2,
        items: [
          { ex: 'mb4_hamstring_pnf', sets: 3, reps: 3, note: ['rondes per been', 'rounds each leg'] },
          { ex: 'kt_heup_hinge', sets: 3, reps: 8 },
          { ex: 'kr_rdl', sets: 3, reps: 8, note: ['licht, tot je rek voelt in je hamstrings', 'light, until you feel your hamstrings stretch'] },
          { ex: 'mb4_zittend_vooroverbuigen', sets: 3, holdS: 30 },
          { ex: 'mb3_kuitrek_muur', sets: 2, holdS: 30, note: ['per kant', 'each side'] },
          { ex: 'mb3_afrollen', sets: 2, reps: 6 },
        ],
        criteria: [
          { key: 'ff0', text: ['Je vingertoppen raken de grond met gestrekte knieën (vinger-vloerafstand 0).', 'Your fingertips touch the floor with straight knees (fingertip-to-floor 0).'], auto: { test: 'fingertip_floor', atMost: 0 } },
          { key: 'hinge', text: ['Bij de heup-hinge met de stok houd je drie contactpunten (achterhoofd, bovenrug, staartbeen) tot je romp ongeveer 45 graden voorover is.', 'In the hip hinge with the stick you keep three points of contact (back of head, upper back, tailbone) until your trunk is about 45 degrees forward.'] },
          ...common(4, 4),
        ],
      },
      {
        name: ['Handpalmen plat en onderhoud', 'Palms flat and maintenance'], weeks: '8+', minWeeks: 0, perWeek: 3,
        goal: ['Handpalmen plat op de grond met gestrekte knieën, en vasthouden.', 'Palms flat on the floor with straight knees, and keeping it.'],
        physiology: PHYS_4,
        items: [
          { ex: 'mb4_zittend_vooroverbuigen', sets: 3, holdS: 30 },
          { ex: 'kr_rdl', sets: 3, reps: 8 },
          { ex: 'mb3_afrollen', sets: 2, reps: 6 },
          { ex: 'mb_hamstring_stretch', sets: 2, holdS: 30, note: ['per been', 'each leg'] },
        ],
        criteria: [
          { key: 'palmen', text: ['Je legt je handpalmen plat op de grond met gestrekte knieën.', 'You put your palms flat on the floor with straight knees.'] },
          { key: 'csr', text: ['Zittend reik je met gestrekt been tot voorbij je tenen (stoel-zit-en-reiktest 0 of meer).', 'Seated you reach past your toes with a straight leg (chair sit-and-reach 0 or more).'], auto: { test: 'chair_sit_reach', atLeast: 0 } },
          KEEP,
        ],
      },
    ],
  },
];

export const flexPath = (key: string) => FLEX_PATHS.find((p) => p.key === key) ?? null;
export const phaseSourceKey = (path: FlexPath, phaseIndex: number) => `${path.series}#${phaseIndex + 1}`;

/** Names of every exercise the paths and the limiter check use (FP library keys). */
export const EX_NAMES: Record<string, Fn> = {
  mb3_vlinder: ['Vlinderhouding', 'Butterfly'],
  mb3_v_muur: ['Benen in een V tegen de muur', 'Legs in a V against the wall'],
  mb3_pancake: ['Pancake (zittend in spreidzit vooroverbuigen)', 'Pancake (seated straddle fold)'],
  mb3_cossack: ['Cossack squat', 'Cossack squat'],
  mb3_kikker: ['Kikkerhouding', 'Frog stretch'],
  mb3_halve_spagaat: ['Halve spagaat', 'Half split'],
  mb3_couch_stretch: ['Couch stretch', 'Couch stretch'],
  mb3_spagaat_voor: ['Spagaat voorwaarts met steun', 'Supported front split'],
  mb3_kuitrek_muur: ['Kuitrek tegen de muur', 'Calf stretch against the wall'],
  mb3_soleus_rek: ['Kuitrek met gebogen knie (soleus)', 'Bent-knee calf stretch (soleus)'],
  mb3_figuur4: ['Bilspier rekken (figuur 4)', 'Glute stretch (figure 4)'],
  mb3_duif: ['Duifhouding', 'Pigeon pose'],
  mb3_afrollen: ['Staand afrollen', 'Standing roll-down'],
  mb_hamstring_stretch: ['Hamstringrek op je rug met band', 'Lying hamstring stretch with a band'],
  mb_child_pose: ['Kinderhouding', 'Child’s pose'],
  mb_world_greatest: ['World’s greatest stretch', 'World’s greatest stretch'],
  mb_90_90: ['90/90 heupmobiliteit', '90/90 hip mobility'],
  ex_hip_flexor_stretch: ['Heupbuigerrek in kniestand', 'Kneeling hip flexor stretch'],
  ex_cat_camel: ['Kat-koe', 'Cat-camel'],
  kt_copenhagen_kort: ['Copenhagen adductie, korte hefboom', 'Short-lever Copenhagen adduction'],
  kt_heup_hinge: ['Heup-hinge met stok', 'Hip hinge with a stick'],
  kr_rdl: ['Roemeense deadlift', 'Romanian deadlift'],
  mb4_spreidzit_rechtop: ['Rechtop zitten in spreidzit', 'Sitting upright in a straddle'],
  mb4_adductor_rock_back: ['Adductor rock-back', 'Adductor rock-back'],
  mb4_pancake_pnf: ['Pancake aanspannen-ontspannen', 'Pancake contract-relax'],
  mb4_straddle_good_morning: ['Good morning in brede stand', 'Wide-stance good morning'],
  mb4_spreidzit_beentil: ['Been optillen in spreidzit', 'Leg lift in a straddle'],
  mb4_pancake_gewicht: ['Pancake met licht gewicht', 'Pancake with a light weight'],
  mb4_halve_spagaat_pnf: ['Halve spagaat aanspannen-ontspannen', 'Half split contract-relax'],
  mb4_lunge_diep: ['Diepe uitvalspas met armen omhoog', 'Deep lunge with arms up'],
  mb4_glijdende_spagaat: ['Glijdende spagaat met steun', 'Sliding split with support'],
  mb4_actief_been_heffen: ['Gestrekt been actief heffen', 'Active straight-leg raise'],
  mb4_paardenstand: ['Paardenstand', 'Horse stance'],
  mb4_v_muur_pnf: ['V tegen de muur aanspannen-ontspannen', 'Wall straddle contract-relax'],
  mb4_zijspagaat_steun: ['Spagaat zijwaarts met steun', 'Supported side split'],
  mb4_cossack_gewicht: ['Cossack squat met gewicht', 'Weighted cossack squat'],
  mb4_hamstring_pnf: ['Hamstring aanspannen-ontspannen', 'Hamstring contract-relax'],
  mb4_zittend_vooroverbuigen: ['Zittend vooroverbuigen', 'Seated forward fold'],
  nd_sciatic_slider: ['Ischiadicus slider zittend', 'Seated sciatic slider'],
  nd_slump_slider: ['Slump slider', 'Slump slider'],
  nd_tibial_slider: ['Tibialis slider', 'Tibial slider'],
  nd_femoral_slider: ['Femoralis slider in zijlig', 'Side-lying femoral slider'],
  nd_obturator_slider: ['Obturatorius slider', 'Obturator slider'],
};

/** Form checklist per exercise: what to tick off while you do it. */
export const FORM_CHECKS: Record<string, readonly Fn[]> = {
  mb3_vlinder: [['Rug lang, je kantelt vanuit je heupen', 'Long back, you tilt from your hips'], ['Knieën zakken vanzelf, je duwt er niet op', 'Knees drop by themselves, you do not push them'], ['Rek aan de binnenkant van je bovenbenen, niet in de knie', 'Stretch on the inner thighs, not in the knee']],
  mb3_v_muur: [['Billen dicht tegen de muur', 'Buttocks close to the wall'], ['Benen ontspannen, de zwaartekracht doet het werk', 'Legs relaxed, gravity does the work'], ['Knieën gestrekt, niet op slot geduwd', 'Knees straight, not forced into lock']],
  mb3_pancake: [['Knieschijven en tenen naar het plafond', 'Kneecaps and toes to the ceiling'], ['Rug lang: je borst gaat naar voren, niet je hoofd naar beneden', 'Long back: your chest goes forward, not your head down'], ['Je kantelt vanuit je heupen, je bekken rolt mee', 'You tilt from your hips, your pelvis rolls along'], ['Rustig uitademen terwijl je zakt', 'Breathe out calmly as you sink']],
  mb3_cossack: [['Hiel van het gebogen been blijft aan de grond', 'Heel of the bent leg stays down'], ['Knie gaat in de richting van je tenen', 'Knee tracks over your toes'], ['Het andere been is gestrekt, tenen omhoog', 'The other leg is straight, toes up'], ['Romp rechtop, borst naar voren', 'Trunk upright, chest forward']],
  mb3_kikker: [['Enkels in lijn met de knieën, voeten gebogen', 'Ankles in line with the knees, feet flexed'], ['Rug neutraal, niet doorhangen', 'Back neutral, not sagging'], ['Geen druk of pijn op de knieën (zachte ondergrond)', 'No pressure or pain on the knees (soft surface)'], ['Rek binnenkant bovenbeen, geen knel in de lies', 'Stretch on the inner thigh, no pinch in the groin']],
  mb3_halve_spagaat: [['Voorste knie gestrekt, tenen omhoog', 'Front knee straight, toes up'], ['Heup boven de achterste knie', 'Hip above the back knee'], ['Rug lang, kantelen vanuit de heup', 'Long back, tilt from the hip']],
  mb3_couch_stretch: [['Bil van het achterste been aangespannen', 'Buttock of the back leg squeezed'], ['Geen holle rug: navel licht naar binnen', 'No arched back: navel gently in'], ['Bekken recht naar voren', 'Pelvis square'], ['Kussen onder de knie', 'Cushion under the knee']],
  mb3_spagaat_voor: [['Handen op de steun, je draagt je eigen gewicht', 'Hands on the support, you carry your own weight'], ['Heupen recht naar voren', 'Hips square'], ['Alleen zo diep als je ontspannen kunt ademen', 'Only as deep as you can breathe relaxed'], ['Nooit veren', 'Never bounce']],
  mb3_kuitrek_muur: [['Achterste knie gestrekt', 'Back knee straight'], ['Hiel op de grond', 'Heel on the floor'], ['Tenen recht naar voren', 'Toes pointing straight ahead']],
  mb3_soleus_rek: [['Knie gebogen, hiel blijft op de grond', 'Knee bent, heel stays down'], ['Rek laag in de kuit, vlak boven de hiel', 'Stretch low in the calf, just above the heel']],
  mb3_figuur4: [['Enkel op de knie, niet op het scheenbeen', 'Ankle on the knee, not the shin'], ['Hoofd en schouders ontspannen op de grond', 'Head and shoulders relaxed on the floor'], ['Rek in de bil, geen pijn in de knie', 'Stretch in the buttock, no pain in the knee']],
  mb3_duif: [['Heupen recht naar de grond', 'Hips square to the floor'], ['Voorste knie zonder pijn', 'Front knee pain-free'], ['Achterste been recht naar achteren', 'Back leg straight behind you']],
  mb3_afrollen: [['Knieën licht gebogen', 'Knees slightly bent'], ['Wervel voor wervel naar beneden en omhoog', 'Vertebra by vertebra down and up'], ['Hoofd komt als laatste omhoog', 'Head comes up last'], ['Stoppen bij uitstralende pijn in een been', 'Stop with pain radiating into a leg']],
  mb_hamstring_stretch: [['Andere been gestrekt of gebogen op de grond', 'Other leg straight or bent on the floor'], ['Bekken blijft op de grond', 'Pelvis stays on the floor'], ['Knie licht gebogen mag', 'A slightly bent knee is fine']],
  mb_child_pose: [['Billen naar je hielen', 'Buttocks towards your heels'], ['Armen lang naar voren', 'Arms long in front'], ['Rustig in je onderrug ademen', 'Breathe calmly into your low back']],
  mb_world_greatest: [['Achterste knie gestrekt', 'Back knee straight'], ['Elleboog naar de voet, dan arm omhoog draaien', 'Elbow to the foot, then rotate the arm up'], ['Ogen volgen je hand', 'Eyes follow your hand']],
  ex_hip_flexor_stretch: [['Bil van het achterste been aangespannen', 'Buttock of the back leg squeezed'], ['Bekken licht naar achteren gekanteld, geen holle rug', 'Pelvis slightly tucked, no arched back'], ['Romp rechtop', 'Trunk upright']],
  kt_copenhagen_kort: [['Knie op de bank, lichaam in één lijn', 'Knee on the bench, body in one line'], ['Heupen niet laten zakken', 'Do not let the hips drop'], ['Geen pijn in de lies', 'No groin pain']],
  kt_heup_hinge: [['Stok raakt achterhoofd, bovenrug en staartbeen', 'Stick touches the back of the head, upper back and tailbone'], ['Billen naar achteren, knieën licht gebogen', 'Hips back, knees slightly bent'], ['Rek in de hamstrings, rug blijft lang', 'Stretch in the hamstrings, back stays long']],
  kr_rdl: [['Gewicht dicht langs je benen', 'Weight close along your legs'], ['Billen naar achteren, rug lang', 'Hips back, long back'], ['Zakken tot je rek voelt, niet verder', 'Lower until you feel a stretch, no further'], ['Omhoog door je bil aan te spannen', 'Come up by squeezing your buttocks']],
  mb4_spreidzit_rechtop: [['Benen gestrekt, knieschijven naar het plafond', 'Legs straight, kneecaps to the ceiling'], ['Bekken naar voren gekanteld, onderrug hol', 'Pelvis tilted forward, low back hollow'], ['Zit op een kussen als je achterover kantelt', 'Sit on a cushion if you tip backwards']],
  mb4_adductor_rock_back: [['Gestrekt been opzij, voet plat', 'Straight leg to the side, foot flat'], ['Rug lang, billen naar achteren schuiven', 'Long back, slide your hips back'], ['Rek binnenkant bovenbeen', 'Stretch on the inner thigh']],
  mb4_pancake_pnf: [['Aanspannen 5 seconden, licht (een kwart van je kracht)', 'Contract for 5 seconds, lightly (a quarter of your strength)'], ['Ontspannen en uitademen voor je dieper gaat', 'Relax and breathe out before going deeper'], ['Daarna nooit verder dan rek zonder pijn', 'Never further than a pain-free stretch']],
  mb4_straddle_good_morning: [['Rug lang, stok of licht gewicht op je schouders', 'Long back, stick or light weight on your shoulders'], ['Billen naar achteren, knieën bijna gestrekt', 'Hips back, knees nearly straight'], ['Langzaam omlaag, omhoog met je bil', 'Slowly down, up with your buttocks']],
  mb4_spreidzit_beentil: [['Rechtop zitten, handen naast je', 'Sit upright, hands beside you'], ['Knie gestrekt, knieschijf naar boven', 'Knee straight, kneecap up'], ['Een paar centimeter is genoeg, niet achterover leunen', 'A few centimetres is enough, do not lean back']],
  mb4_pancake_gewicht: [['Licht gewicht tegen je borst of op je rug', 'Light weight against your chest or on your back'], ['Rug lang, zakken op je uitademing', 'Long back, sink on the out-breath'], ['Gewicht eerst wegleggen voor je opkomt', 'Put the weight down before coming up']],
  mb4_halve_spagaat_pnf: [['In de halve spagaat je hiel 5 seconden licht in de grond duwen', 'In the half split press your heel lightly into the floor for 5 seconds'], ['Ontspannen, uitademen, iets verder kantelen', 'Relax, breathe out, tilt a little further'], ['Rug blijft lang', 'Back stays long']],
  mb4_lunge_diep: [['Achterste knie op een kussen', 'Back knee on a cushion'], ['Bil van het achterste been aangespannen', 'Buttock of the back leg squeezed'], ['Armen omhoog zonder holle rug', 'Arms up without arching']],
  mb4_glijdende_spagaat: [['Handen op blokken of stoelen, je houdt je gewicht vast', 'Hands on blocks or chairs, you hold your weight'], ['Langzaam in, langzaam uit', 'Slowly in, slowly out'], ['Bekken recht, niet doorzakken', 'Pelvis square, do not drop']],
  mb4_actief_been_heffen: [['Staand been en romp rechtop', 'Standing leg and trunk upright'], ['Opgetild been gestrekt, tenen omhoog', 'Lifted leg straight, toes up'], ['Niet achterover leunen', 'Do not lean back']],
  mb4_paardenstand: [['Voeten breed, tenen iets naar buiten', 'Feet wide, toes slightly out'], ['Knieën boven je tenen', 'Knees over your toes'], ['Romp rechtop, gewicht op je hele voet', 'Trunk upright, weight on your whole foot']],
  mb4_v_muur_pnf: [['Benen 5 seconden licht naar elkaar toe duwen tegen je handen', 'Press your legs lightly together against your hands for 5 seconds'], ['Ontspannen en de benen verder laten zakken', 'Relax and let your legs sink further'], ['Billen tegen de muur', 'Buttocks against the wall']],
  mb4_zijspagaat_steun: [['Handen op twee stoelen of blokken', 'Hands on two chairs or blocks'], ['Voeten langzaam naar buiten schuiven', 'Slide your feet out slowly'], ['Knieschijven naar voren, bekken onder je schouders', 'Kneecaps forward, pelvis under your shoulders'], ['Geen knel in de lies of zijkant heup', 'No pinch in the groin or side of the hip']],
  mb4_cossack_gewicht: [['Gewicht tegen je borst (goblet)', 'Weight against your chest (goblet)'], ['Hiel aan de grond, knie boven de tenen', 'Heel down, knee over the toes'], ['Gecontroleerd zakken, niet veren', 'Lower with control, no bouncing']],
  mb4_hamstring_pnf: [['Op je rug, band om je voet', 'On your back, band around your foot'], ['5 seconden je hiel licht tegen de band duwen', 'Press your heel lightly into the band for 5 seconds'], ['Ontspannen, uitademen, been iets verder naar je toe', 'Relax, breathe out, bring the leg a little closer']],
  mb4_zittend_vooroverbuigen: [['Benen gestrekt, tenen omhoog', 'Legs straight, toes up'], ['Kantel vanuit je heupen met een lange rug', 'Tilt from your hips with a long back'], ['Zit op een kussen als je achterover kantelt', 'Sit on a cushion if you tip backwards']],
};

/** Form checklist for an exercise, also when it was stored under an older key. */
export function formChecks(key: string | null | undefined): readonly Fn[] {
  if (!key) return [];
  const same: Record<string, string> = { mb_hip_flexor_stretch: 'ex_hip_flexor_stretch', mb_cat_camel: 'ex_cat_camel' };
  return FORM_CHECKS[key] ?? FORM_CHECKS[same[key] ?? ''] ?? [];
}

/** Which criteria of a phase are met by the latest self-test results (any side counts for one-sided tests: the worst side must meet it). */
export function autoMet(c: Criterion, results: readonly { test: string; side: string; cm: number; day: string }[]): boolean {
  if (!c.auto) return false;
  const rows = results.filter((r) => r.test === c.auto!.test);
  if (!rows.length) return false;
  const lastDay = rows.reduce((m, r) => (r.day > m ? r.day : m), '');
  const latest = rows.filter((r) => r.day === lastDay);
  return latest.every((r) => (c.auto!.atMost === undefined || r.cm <= c.auto!.atMost) && (c.auto!.atLeast === undefined || r.cm >= c.auto!.atLeast));
}
