/**
 * "Wat houdt je tegen?": a short self-check that points at the likely limiter of a flexibility goal,
 * using the differentiation physiotherapists use in the clinic:
 * - Knee bent vs straight: muscles that cross the knee (hamstrings, calf, gracilis) or not (back, glutes,
 *   one-joint adductors, hip joint).
 * - Head up vs chin to chest (structural differentiation): muscles of the leg do not change length when
 *   the head moves, nerves do. A feeling in the leg that changes with the head points at a nerve.
 * - Toes up vs heels up: the calf and the tibial nerve.
 * - A pinching, blocking feeling deep in the hip is the joint, not a stretch.
 * - Passive range much larger than what you can actively hold: strength at end range is the limiter.
 *
 * It gives a direction to work on, never a diagnosis. Own texts; to be reviewed clinically.
 */
type Fn = readonly [nl: string, en: string];

export type LimiterKey =
  | 'kuit' | 'hamstrings' | 'zenuw_ischiadicus' | 'rug' | 'bil' | 'heupgewricht' | 'adductoren'
  | 'binnen_tweegewricht' | 'zenuw_obturatorius' | 'heupbuigers' | 'rectus_femoris' | 'zenuw_femoralis' | 'controle';

export type Limiter = { name: Fn; what: Fn; advice: Fn; exercises: readonly string[]; nerve?: boolean; joint?: boolean };

export const LIMITERS: Record<LimiterKey, Limiter> = {
  kuit: {
    name: ['Kuit', 'Calf'], what: ['De kuitspieren (gastrocnemius en soleus) lopen over je enkel en knie.', 'The calf muscles (gastrocnemius and soleus) cross your ankle and knee.'],
    advice: ['Rek je kuit dagelijks met gestrekte én gebogen knie.', 'Stretch your calf daily with a straight and a bent knee.'], exercises: ['mb3_kuitrek_muur', 'mb3_soleus_rek'],
  },
  hamstrings: {
    name: ['Hamstrings', 'Hamstrings'], what: ['De achterkant van je bovenbeen, van zitbot tot onder de knie.', 'The back of your thigh, from sitting bone to below the knee.'],
    advice: ['Rekken plus kracht op lengte werkt het best: hamstringrek, aanspannen-ontspannen en de Roemeense deadlift.', 'Stretching plus strength at length works best: hamstring stretch, contract-relax and the Romanian deadlift.'],
    exercises: ['mb_hamstring_stretch', 'mb4_hamstring_pnf', 'kr_rdl'],
  },
  zenuw_ischiadicus: {
    name: ['Zenuw achter in je been (n. ischiadicus)', 'Nerve at the back of your leg (sciatic nerve)'], nerve: true,
    what: ['De heupzenuw loopt van je onderrug via bil en knieholte tot in je voet. Als die gevoelig is, remt je lichaam de beweging af.', 'The sciatic nerve runs from your low back through buttock and back of the knee into your foot. If it is sensitive, your body brakes the movement.'],
    advice: ['Een gevoelige zenuw rek je niet, die laat je glijden. Doe sliders: rustig heen en weer, zonder door te drukken. Hard hamstrings rekken helpt hier minder.', 'You do not stretch a sensitive nerve, you let it glide. Do sliders: gently back and forth, without pushing. Hard hamstring stretching helps less here.'],
    exercises: ['nd_sciatic_slider', 'nd_slump_slider', 'nd_tibial_slider'],
  },
  rug: {
    name: ['Onderrug (rugstrekkers)', 'Low back (back extensors)'], what: ['Je rug moet rond kunnen worden; stijve rugstrekkers houden dat tegen.', 'Your back needs to be able to round; stiff back extensors hold that back.'],
    advice: ['Maak je rug soepel rond: kat-koe, kinderhouding en wervel voor wervel afrollen.', 'Get your back to round smoothly: cat-camel, child’s pose and rolling down vertebra by vertebra.'],
    exercises: ['ex_cat_camel', 'mb_child_pose', 'mb3_afrollen'],
  },
  bil: {
    name: ['Bil', 'Buttock'], what: ['De bilspieren aan de achterkant van je heup.', 'The glutes at the back of your hip.'],
    advice: ['Rek je bil met de figuur 4 of de duifhouding.', 'Stretch your buttock with the figure 4 or the pigeon pose.'], exercises: ['mb3_figuur4', 'mb3_duif'],
  },
  heupgewricht: {
    name: ['Heupgewricht', 'Hip joint'], joint: true,
    what: ['Een knellend of botsend gevoel diep in de heup of lies is geen rek: daar raakt bot of kapsel zijn grens.', 'A pinching or blocking feeling deep in the hip or groin is not a stretch: bone or capsule reaches its limit there.'],
    advice: ['Niet doorduwen. Laat je fysiotherapeut kijken: soms helpt een andere stand van je been, soms is de vorm van je heup de grens.', 'Do not push through. Have your physiotherapist look: sometimes another leg position helps, sometimes the shape of your hip is the limit.'],
    exercises: ['mb_90_90'],
  },
  adductoren: {
    name: ['Binnenkant bovenbeen (adductoren)', 'Inner thigh (adductors)'], what: ['De korte en lange adductoren trekken je been naar binnen.', 'The short and long adductors pull your leg inwards.'],
    advice: ['Rek ze in vlinder en kikker, en maak ze sterk met de Copenhagen.', 'Stretch them in butterfly and frog, and make them strong with the Copenhagen.'],
    exercises: ['mb3_vlinder', 'mb3_kikker', 'mb4_adductor_rock_back', 'kt_copenhagen_kort'],
  },
  binnen_tweegewricht: {
    name: ['Gracilis en hamstrings (over de knie)', 'Gracilis and hamstrings (across the knee)'],
    what: ['Deze spieren lopen over heup én knie. Met gebogen knieën lukt het spreiden dan duidelijk beter.', 'These muscles cross hip and knee. With bent knees spreading is clearly easier.'],
    advice: ['Rek met gestrekte knieën: benen in een V tegen de muur, pancake en aanspannen-ontspannen.', 'Stretch with straight knees: legs in a V against the wall, pancake and contract-relax.'],
    exercises: ['mb3_v_muur', 'mb3_pancake', 'mb4_pancake_pnf'],
  },
  zenuw_obturatorius: {
    name: ['Zenuw binnenkant bovenbeen (n. obturatorius)', 'Nerve of the inner thigh (obturator nerve)'], nerve: true,
    what: ['Deze zenuw loopt langs de binnenkant van je bovenbeen. Is hij gevoelig, dan voelt spreiden snel strak.', 'This nerve runs along the inner thigh. If it is sensitive, spreading soon feels tight.'],
    advice: ['Laat de zenuw glijden met de obturatorius slider, rustig en zonder door te drukken.', 'Let the nerve glide with the obturator slider, gently and without pushing.'], exercises: ['nd_obturator_slider'],
  },
  heupbuigers: {
    name: ['Heupbuigers (iliopsoas)', 'Hip flexors (iliopsoas)'], what: ['Voor in je heup; houdt het achterste been in een spagaat of uitvalspas tegen.', 'At the front of your hip; holds back the rear leg in a split or lunge.'],
    advice: ['Rek met je bil aangespannen en zonder holle rug: heupbuigerrek en diepe uitvalspas.', 'Stretch with your buttock squeezed and without arching: hip flexor stretch and deep lunge.'],
    exercises: ['ex_hip_flexor_stretch', 'mb4_lunge_diep'],
  },
  rectus_femoris: {
    name: ['Voorkant dij (rectus femoris)', 'Front of the thigh (rectus femoris)'], what: ['Loopt over heup én knie: strakker als je de knie buigt.', 'Crosses hip and knee: tighter when you bend the knee.'],
    advice: ['De couch stretch rekt hem met gebogen knie.', 'The couch stretch stretches it with a bent knee.'], exercises: ['mb3_couch_stretch'],
  },
  zenuw_femoralis: {
    name: ['Zenuw voorkant dij (n. femoralis)', 'Nerve at the front of the thigh (femoral nerve)'], nerve: true,
    what: ['Loopt voor in je heup en dij. Is hij gevoelig, dan verandert de rek voor op je dij als je je hoofd beweegt.', 'Runs at the front of your hip and thigh. If it is sensitive, the stretch at the front of the thigh changes when you move your head.'],
    advice: ['Laat de zenuw glijden met de femoralis slider in zijlig.', 'Let the nerve glide with the side-lying femoral slider.'], exercises: ['nd_femoral_slider'],
  },
  controle: {
    name: ['Kracht in de eindstand', 'Strength at end range'],
    what: ['Je hebt meer ruimte dan je actief kunt vasthouden. Je lichaam remt af waar je geen kracht hebt.', 'You have more range than you can actively hold. Your body brakes where it has no strength.'],
    advice: ['Train kracht in de lengte: benen actief optillen, cossack squat en rekken met gewicht. Dat maakt de ruimte bruikbaar.', 'Train strength at length: active leg lifts, cossack squat and loaded stretching. That makes the range usable.'],
    exercises: ['mb4_spreidzit_beentil', 'mb4_actief_been_heffen', 'mb3_cossack'],
  },
};

type Points = Partial<Record<LimiterKey, number>>;
export type CheckAnswer = { key: string; label: Fn; points: Points; stop?: boolean };
export type CheckQuestion = { key: string; text: Fn; how?: Fn; answers: readonly CheckAnswer[] };
export type CheckGoal = 'tenen' | 'pancake' | 'spagaat_voor' | 'spagaat_zij';

const YES: Fn = ['Ja', 'Yes'];
const NO: Fn = ['Nee', 'No'];
const SAFETY: CheckQuestion = {
  key: 'tintel',
  text: ['Kreeg je bij een van deze tests tintelingen, een doof gevoel of een schietende pijn in je been?', 'Did any of these tests give you tingling, numbness or a shooting pain in your leg?'],
  answers: [{ key: 'nee', label: NO, points: {} }, { key: 'ja', label: YES, points: {}, stop: true }],
};
const HEAD_HOW: Fn = [
  'Je beenspieren veranderen niet van lengte als je je hoofd beweegt, je zenuwen wel: die lopen van je nek tot in je voet.',
  'Your leg muscles do not change length when you move your head, your nerves do: they run from your neck into your foot.',
];

export const CHECKS: Record<CheckGoal, readonly CheckQuestion[]> = {
  tenen: [
    {
      key: 'waar', text: ['Buig rustig voorover tot je rek voelt. Waar voel je het vooral?', 'Bend forward slowly until you feel a stretch. Where do you mainly feel it?'],
      answers: [
        { key: 'kuit', label: ['In mijn kuit', 'In my calf'], points: { kuit: 2 } },
        { key: 'knieholte', label: ['In mijn knieholte', 'Behind my knee'], points: { hamstrings: 1, zenuw_ischiadicus: 1 } },
        { key: 'bovenbeen', label: ['Achter in mijn bovenbeen', 'At the back of my thigh'], points: { hamstrings: 2 } },
        { key: 'bil', label: ['In mijn bil', 'In my buttock'], points: { bil: 2 } },
        { key: 'rug', label: ['In mijn onderrug', 'In my low back'], points: { rug: 2 } },
        { key: 'knel', label: ['Knel of botsen diep in mijn lies', 'Pinching or blocking deep in my groin'], points: { heupgewricht: 3 } },
      ],
    },
    {
      key: 'knieen', text: ['Buig je knieën flink. Leg je je handpalmen dan makkelijk plat op de grond?', 'Bend your knees well. Can you then easily put your palms flat on the floor?'],
      how: ['Met gebogen knieën ontspannen alle spieren die over je knie lopen.', 'With bent knees every muscle that crosses your knee relaxes.'],
      answers: [{ key: 'ja', label: YES, points: { hamstrings: 2, kuit: 1, zenuw_ischiadicus: 1 } }, { key: 'nee', label: NO, points: { rug: 2, bil: 1, heupgewricht: 1 } }],
    },
    {
      key: 'hoofd', text: ['Hang voorover tot je rek voelt achter je benen. Kijk rustig op en breng daarna je kin naar je borst. Verandert het gevoel achter je knie of in je kuit?', 'Hang forward until you feel a stretch behind your legs. Look up gently, then bring your chin to your chest. Does the feeling behind your knee or in your calf change?'],
      how: HEAD_HOW,
      answers: [{ key: 'ja', label: YES, points: { zenuw_ischiadicus: 3 } }, { key: 'nee', label: NO, points: { hamstrings: 1, kuit: 1 } }, { key: 'weet', label: ['Weet ik niet', 'Not sure'], points: {} }],
    },
    {
      key: 'voet', text: ['Zet je tenen op een dik boek, hielen op de grond, en buig weer voorover. Is het duidelijk strakker dan zonder boek?', 'Put your toes on a thick book, heels on the floor, and bend forward again. Is it clearly tighter than without the book?'],
      answers: [{ key: 'ja', label: YES, points: { kuit: 2, zenuw_ischiadicus: 1 } }, { key: 'nee', label: NO, points: { hamstrings: 1 } }],
    },
    {
      key: 'kat', text: ['Ga op handen en knieën. Kun je je rug van onder tot boven rond maken als een kat, ook je onderrug?', 'Get on hands and knees. Can you round your back from bottom to top like a cat, including your low back?'],
      answers: [{ key: 'ja', label: ['Ja, makkelijk', 'Yes, easily'], points: {} }, { key: 'nee', label: ['Nee, mijn onderrug blijft vlak', 'No, my low back stays flat'], points: { rug: 2 } }],
    },
    {
      key: 'knieborst', text: ['Lig op je rug en trek één knie naar je borst. Wat merk je?', 'Lie on your back and pull one knee to your chest. What do you notice?'],
      answers: [
        { key: 'makkelijk', label: ['Gaat makkelijk', 'Goes easily'], points: {} },
        { key: 'bil', label: ['Rek in mijn bil voordat de knie bij mijn borst is', 'A stretch in my buttock before the knee reaches my chest'], points: { bil: 2 } },
        { key: 'knel', label: ['Knel diep in mijn lies', 'Pinching deep in my groin'], points: { heupgewricht: 3 } },
      ],
    },
    SAFETY,
  ],
  pancake: [
    {
      key: 'waar', text: ['Zit in spreidzit en kantel met een lange rug naar voren tot je rek voelt. Waar vooral?', 'Sit in a straddle and tilt forward with a long back until you feel a stretch. Where mainly?'],
      answers: [
        { key: 'binnen', label: ['Binnenkant bovenbenen', 'Inner thighs'], points: { adductoren: 2, binnen_tweegewricht: 1 } },
        { key: 'achter', label: ['Achterkant bovenbenen', 'Back of the thighs'], points: { hamstrings: 2 } },
        { key: 'knieholte', label: ['Knieholte', 'Behind the knee'], points: { hamstrings: 1, zenuw_ischiadicus: 1 } },
        { key: 'rug', label: ['Onderrug', 'Low back'], points: { rug: 1, hamstrings: 1 } },
        { key: 'knel', label: ['Knel of botsen in de lies of zijkant heup', 'Pinching or blocking in the groin or side of the hip'], points: { heupgewricht: 3 } },
      ],
    },
    {
      key: 'knieen', text: ['Buig in je spreidzit je knieën een beetje (voeten plat, knieën omhoog). Kun je dan duidelijk verder spreiden of verder naar voren?', 'In your straddle, bend your knees a little (feet flat, knees up). Can you then clearly spread further or fold further?'],
      how: ['Met gebogen knieën ontspannen gracilis en hamstrings, de korte adductoren niet.', 'With bent knees the gracilis and hamstrings relax, the short adductors do not.'],
      answers: [{ key: 'ja', label: YES, points: { binnen_tweegewricht: 3, hamstrings: 1, adductoren: -1 } }, { key: 'nee', label: NO, points: { adductoren: 2, heupgewricht: 1, binnen_tweegewricht: -1 } }],
    },
    {
      key: 'rechtop', text: ['Kun je rechtop in spreidzit zitten zonder handen achter je, met je bekken naar voren gekanteld?', 'Can you sit upright in a straddle without hands behind you, with your pelvis tilted forward?'],
      answers: [{ key: 'ja', label: YES, points: {} }, { key: 'nee', label: NO, points: { hamstrings: 2, controle: 1 } }],
    },
    {
      key: 'hoofd', text: ['Kantel naar voren tot je rek voelt. Breng je kin naar je borst en kijk weer op. Verandert het gevoel in je benen?', 'Tilt forward until you feel a stretch. Bring your chin to your chest and look up again. Does the feeling in your legs change?'],
      how: HEAD_HOW,
      answers: [
        { key: 'binnen', label: ['Ja, aan de binnenkant', 'Yes, on the inside'], points: { zenuw_obturatorius: 3 } },
        { key: 'achter', label: ['Ja, achterkant of knieholte', 'Yes, at the back or behind the knee'], points: { zenuw_ischiadicus: 3 } },
        { key: 'nee', label: NO, points: { adductoren: 1, hamstrings: 1 } },
      ],
    },
    {
      key: 'actief', text: ['Zit rechtop in spreidzit. Kun je één gestrekt been een paar centimeter van de grond tillen?', 'Sit upright in a straddle. Can you lift one straight leg a few centimetres off the floor?'],
      answers: [{ key: 'ja', label: YES, points: {} }, { key: 'nee', label: NO, points: { controle: 2 } }],
    },
    SAFETY,
  ],
  spagaat_voor: [
    {
      key: 'waar', text: ['Ga in een halve spagaat of lage uitvalspas. Waar houdt het je vooral tegen?', 'Get into a half split or low lunge. Where does it mainly hold you back?'],
      answers: [
        { key: 'achter', label: ['Achterkant van het voorste been', 'Back of the front leg'], points: { hamstrings: 2 } },
        { key: 'knieholte', label: ['Knieholte of kuit van het voorste been', 'Behind the knee or calf of the front leg'], points: { zenuw_ischiadicus: 1, kuit: 1, hamstrings: 1 } },
        { key: 'heup', label: ['Voor in de heup van het achterste been', 'Front of the hip of the back leg'], points: { heupbuigers: 2 } },
        { key: 'dij', label: ['Voorkant dij van het achterste been', 'Front of the thigh of the back leg'], points: { rectus_femoris: 2 } },
        { key: 'knel', label: ['Knel of botsen in de lies', 'Pinching or blocking in the groin'], points: { heupgewricht: 3 } },
      ],
    },
    {
      key: 'thomas', text: ['Lig op je rug op de rand van je bed en trek één knie naar je borst. Komt het andere bovenbeen omhoog van het bed?', 'Lie on your back at the edge of your bed and pull one knee to your chest. Does the other thigh lift off the bed?'],
      answers: [{ key: 'ja', label: YES, points: { heupbuigers: 2 } }, { key: 'nee', label: NO, points: {} }],
    },
    {
      key: 'knie', text: ['Blijf zo liggen en buig de knie van het hangende been verder (hiel naar je bil). Komt het bovenbeen dan omhoog of voel je meer rek voor op je dij?', 'Stay like that and bend the knee of the hanging leg further (heel to buttock). Does the thigh lift or do you feel more stretch at the front of the thigh?'],
      answers: [{ key: 'ja', label: YES, points: { rectus_femoris: 2 } }, { key: 'nee', label: NO, points: {} }],
    },
    {
      key: 'hoofd', text: ['Ga in de halve spagaat. Breng je kin naar je borst en kijk weer op. Verandert de rek achter je voorste knie?', 'Get into the half split. Bring your chin to your chest and look up again. Does the stretch behind your front knee change?'],
      how: HEAD_HOW,
      answers: [{ key: 'ja', label: YES, points: { zenuw_ischiadicus: 3 } }, { key: 'nee', label: NO, points: { hamstrings: 1 } }],
    },
    {
      key: 'femoraal', text: ['Ga in de couch stretch. Breng je kin naar je borst en kijk weer op. Verandert het gevoel voor op je dij of in je lies?', 'Get into the couch stretch. Bring your chin to your chest and look up again. Does the feeling at the front of your thigh or groin change?'],
      how: HEAD_HOW,
      answers: [{ key: 'ja', label: YES, points: { zenuw_femoralis: 3 } }, { key: 'nee', label: NO, points: { rectus_femoris: 1 } }],
    },
    {
      key: 'actief', text: ['Sta rechtop. Kun je je gestrekte been actief voor je optillen tot ongeveer heuphoogte?', 'Stand tall. Can you actively lift your straight leg in front of you to about hip height?'],
      answers: [{ key: 'ja', label: YES, points: {} }, { key: 'nee', label: NO, points: { controle: 2 } }],
    },
    SAFETY,
  ],
  spagaat_zij: [
    {
      key: 'waar', text: ['Ga in spreidzit of zet je voeten breed uit elkaar. Waar houdt het je vooral tegen?', 'Get into a straddle or stand with your feet wide. Where does it mainly hold you back?'],
      answers: [
        { key: 'binnen', label: ['Binnenkant bovenbenen', 'Inner thighs'], points: { adductoren: 2 } },
        { key: 'achter', label: ['Achterkant bovenbeen of knieholte', 'Back of the thigh or behind the knee'], points: { binnen_tweegewricht: 1, hamstrings: 1 } },
        { key: 'knel', label: ['Knel of botsen in de lies of zijkant heup', 'Pinching or blocking in the groin or side of the hip'], points: { heupgewricht: 3 } },
      ],
    },
    {
      key: 'knieen', text: ['Ga van een brede stand met gestrekte benen naar een paardenstand (knieën gebogen). Kun je je voeten dan duidelijk verder uit elkaar zetten?', 'Go from a wide stance with straight legs to a horse stance (knees bent). Can you then put your feet clearly further apart?'],
      answers: [{ key: 'ja', label: YES, points: { binnen_tweegewricht: 3, adductoren: -1 } }, { key: 'nee', label: NO, points: { adductoren: 2, heupgewricht: 1, binnen_tweegewricht: -1 } }],
    },
    {
      key: 'kikker', text: ['Ga in de kikkerhouding. Wat voel je?', 'Get into the frog. What do you feel?'],
      answers: [
        { key: 'rek', label: ['Rek aan de binnenkant van mijn bovenbenen', 'A stretch on my inner thighs'], points: { adductoren: 2 } },
        { key: 'knel', label: ['Knel of botsen voor of opzij in de heup', 'Pinching or blocking at the front or side of the hip'], points: { heupgewricht: 3 } },
      ],
    },
    {
      key: 'hoofd', text: ['Zit in spreidzit tot je rek voelt. Breng je kin naar je borst en kijk weer op. Verandert het gevoel aan de binnenkant van je dij?', 'Sit in a straddle until you feel a stretch. Bring your chin to your chest and look up again. Does the feeling on your inner thigh change?'],
      how: HEAD_HOW,
      answers: [{ key: 'ja', label: YES, points: { zenuw_obturatorius: 3 } }, { key: 'nee', label: NO, points: { adductoren: 1 } }],
    },
    {
      key: 'actief', text: ['Lukt de cossack squat diep aan beide kanten zonder je vast te houden?', 'Can you do a deep cossack squat on both sides without holding on?'],
      answers: [{ key: 'ja', label: YES, points: {} }, { key: 'nee', label: NO, points: { controle: 2 } }],
    },
    SAFETY,
  ],
};

export type CheckResult = {
  /** Likely limiters, strongest first. */
  limiters: { key: LimiterKey; score: number; level: 'waarschijnlijk' | 'mogelijk' }[];
  /** Tingling, numbness or shooting pain: stop and contact the physiotherapist. */
  stop: boolean;
  /** Every question answered. */
  complete: boolean;
};

/** Adds up the answers (an answer can also count against a limiter). A limiter needs at least 2 points; 4 or more (and the top) reads as likely. */
export function scoreCheck(goal: CheckGoal, answers: Readonly<Record<string, string>>): CheckResult {
  const qs = CHECKS[goal];
  const total: Partial<Record<LimiterKey, number>> = {};
  let stop = false;
  for (const q of qs) {
    const a = q.answers.find((x) => x.key === answers[q.key]);
    if (!a) continue;
    if (a.stop) stop = true;
    for (const [k, v] of Object.entries(a.points) as [LimiterKey, number][]) total[k] = (total[k] ?? 0) + v;
  }
  const ranked = (Object.entries(total) as [LimiterKey, number][]).filter(([, s]) => s >= 2).sort((a, b) => b[1] - a[1]);
  const top = ranked[0]?.[1] ?? 0;
  return {
    limiters: ranked.slice(0, 3).map(([key, score]) => ({ key, score, level: score >= 4 && score === top ? 'waarschijnlijk' : 'mogelijk' })),
    stop,
    complete: qs.every((q) => answers[q.key] !== undefined),
  };
}
