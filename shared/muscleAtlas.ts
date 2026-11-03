/**
 * Spierenatlas: the main muscles, what they do, which nerve drives them, and words to find the
 * exercises that train or stretch them (matched against an exercise's target muscles and name).
 * Standard textbook anatomy, simplified for patients. Knowledge, not a diagnosis or advice.
 *
 * The quiz is built from this data, so every question and answer comes from the same source.
 */

export const ATLAS_REGIONS = [
  { key: 'nek', nl: 'Nek', en: 'Neck', side: 'front' },
  { key: 'schouder', nl: 'Schouder', en: 'Shoulder', side: 'front' },
  { key: 'borst', nl: 'Borst', en: 'Chest', side: 'front' },
  { key: 'bovenarm', nl: 'Bovenarm', en: 'Upper arm', side: 'front' },
  { key: 'onderarm', nl: 'Onderarm en pols', en: 'Forearm and wrist', side: 'front' },
  { key: 'buik', nl: 'Buik en romp', en: 'Abdomen and trunk', side: 'front' },
  { key: 'rug', nl: 'Rug', en: 'Back', side: 'back' },
  { key: 'heup', nl: 'Heup en bil', en: 'Hip and buttock', side: 'back' },
  { key: 'bovenbeen', nl: 'Bovenbeen', en: 'Thigh', side: 'front' },
  { key: 'onderbeen', nl: 'Onderbeen en enkel', en: 'Lower leg and ankle', side: 'back' },
] as const;
export type AtlasRegion = (typeof ATLAS_REGIONS)[number]['key'];

export const NERVES = [
  { key: 'accessorius', nl: 'n. accessorius', en: 'accessory nerve', areaNl: 'nek en schouderblad', areaEn: 'neck and shoulder blade', match: [] },
  { key: 'cervicaal', nl: 'rami ventrales van de halszenuwen', en: 'ventral rami of the cervical nerves', areaNl: 'diepe nekspieren', areaEn: 'deep neck muscles', match: [] },
  { key: 'suprascapularis', nl: 'n. suprascapularis', en: 'suprascapular nerve', areaNl: 'achterkant schouderblad', areaEn: 'back of the shoulder blade', match: [] },
  { key: 'axillaris', nl: 'n. axillaris', en: 'axillary nerve', areaNl: 'schouder', areaEn: 'shoulder', match: [] },
  { key: 'subscapularis', nl: 'nn. subscapulares', en: 'subscapular nerves', areaNl: 'voorkant schouderblad', areaEn: 'front of the shoulder blade', match: [] },
  { key: 'thoracicus_longus', nl: 'n. thoracicus longus', en: 'long thoracic nerve', areaNl: 'zijkant borstkas', areaEn: 'side of the ribcage', match: [] },
  { key: 'thoracodorsalis', nl: 'n. thoracodorsalis', en: 'thoracodorsal nerve', areaNl: 'brede rugspier', areaEn: 'broad back muscle', match: [] },
  { key: 'dorsalis_scapulae', nl: 'n. dorsalis scapulae', en: 'dorsal scapular nerve', areaNl: 'tussen de schouderbladen', areaEn: 'between the shoulder blades', match: [] },
  { key: 'pectorales', nl: 'nn. pectorales', en: 'pectoral nerves', areaNl: 'borst', areaEn: 'chest', match: [] },
  { key: 'musculocutaneus', nl: 'n. musculocutaneus', en: 'musculocutaneous nerve', areaNl: 'voorkant bovenarm', areaEn: 'front of the upper arm', match: [] },
  { key: 'radialis', nl: 'n. radialis', en: 'radial nerve', areaNl: 'achterkant arm, polsstrekkers', areaEn: 'back of the arm, wrist extensors', match: ['radialis', 'radial'] },
  { key: 'medianus', nl: 'n. medianus', en: 'median nerve', areaNl: 'voorkant onderarm, duim', areaEn: 'front of the forearm, thumb', match: ['medianus', 'median'] },
  { key: 'ulnaris', nl: 'n. ulnaris', en: 'ulnar nerve', areaNl: 'pinkzijde onderarm, hand', areaEn: 'little-finger side of forearm, hand', match: ['ulnaris', 'ulnar'] },
  { key: 'rami_dorsales', nl: 'rami dorsales', en: 'dorsal rami', areaNl: 'rugstrekkers', areaEn: 'back extensors', match: [] },
  { key: 'thoracoabdominales', nl: 'nn. thoracoabdominales', en: 'thoracoabdominal nerves', areaNl: 'buikwand', areaEn: 'abdominal wall', match: [] },
  { key: 'plexus_lumbalis', nl: 'plexus lumbalis', en: 'lumbar plexus', areaNl: 'onderrug en lies', areaEn: 'low back and groin', match: [] },
  { key: 'plexus_sacralis', nl: 'plexus sacralis', en: 'sacral plexus', areaNl: 'diepe heupspieren', areaEn: 'deep hip muscles', match: [] },
  { key: 'femoralis', nl: 'n. femoralis', en: 'femoral nerve', areaNl: 'voorkant bovenbeen', areaEn: 'front of the thigh', match: ['femoralis', 'femoral'] },
  { key: 'obturatorius', nl: 'n. obturatorius', en: 'obturator nerve', areaNl: 'binnenkant bovenbeen', areaEn: 'inner thigh', match: [] },
  { key: 'gluteus_superior', nl: 'n. gluteus superior', en: 'superior gluteal nerve', areaNl: 'zijkant heup', areaEn: 'side of the hip', match: [] },
  { key: 'gluteus_inferior', nl: 'n. gluteus inferior', en: 'inferior gluteal nerve', areaNl: 'grote bilspier', areaEn: 'large buttock muscle', match: [] },
  { key: 'ischiadicus', nl: 'n. ischiadicus', en: 'sciatic nerve', areaNl: 'achterkant been', areaEn: 'back of the leg', match: ['ischiadicus', 'sciatic', 'slump', 'slr'] },
  { key: 'tibialis', nl: 'n. tibialis', en: 'tibial nerve', areaNl: 'kuit en voetzool', areaEn: 'calf and sole', match: ['tibialis'] },
  { key: 'fibularis', nl: 'n. fibularis (peroneus)', en: 'fibular (peroneal) nerve', areaNl: 'voor- en buitenkant onderbeen', areaEn: 'front and outside of the lower leg', match: ['fibularis', 'peroneus'] },
] as const;
export type NerveKey = (typeof NERVES)[number]['key'];

type Fn = [nl: string, en: string];
export type Muscle = {
  key: string;
  nl: string;
  en: string;
  latin: string;
  region: AtlasRegion;
  functions: Fn[];
  nerve: NerveKey;
  /** A group of muscles (Dutch "de rugstrekkers"): the quiz then asks "Wat doen de …". */
  plural?: boolean;
  /** Nerves that also supply part of it: never offered as a wrong answer. */
  also?: NerveKey[];
  /** Lowercase words found in an exercise's target muscles (or name) that mean this muscle. */
  match: string[];
};

export const MUSCLES: Muscle[] = [
  // Neck
  { key: 'diepe_nekflexoren', plural: true, nl: 'Diepe nekbuigers', en: 'Deep neck flexors', latin: 'mm. longus colli et capitis', region: 'nek', nerve: 'cervicaal', functions: [['Kin intrekken, nek buigen', 'Tucking the chin, bending the neck'], ['Nek stabiliseren', 'Stabilising the neck']], match: ['longus colli', 'longus capitis', 'diepe nekflexoren', 'deep neck flexor'] },
  { key: 'scalenus', plural: true, nl: 'Trapspieren van de nek', en: 'Scalenes', latin: 'mm. scaleni', region: 'nek', nerve: 'cervicaal', functions: [['Nek zijwaarts buigen', 'Side-bending the neck'], ['Bovenste ribben optillen bij inademen', 'Lifting the upper ribs when breathing in']], match: ['scalen'] },
  { key: 'trapezius', nl: 'Monnikskapspier', en: 'Trapezius', latin: 'm. trapezius', region: 'nek', nerve: 'accessorius', also: ['cervicaal'], functions: [['Schouders optrekken (bovenste deel)', 'Shrugging the shoulders (upper part)'], ['Schouderbladen naar elkaar (middelste deel)', 'Drawing the shoulder blades together (middle part)'], ['Schouderblad omlaag (onderste deel)', 'Pulling the shoulder blade down (lower part)']], match: ['trapezius', 'monnikskap'] },
  // Shoulder
  { key: 'deltoideus', nl: 'Deltaspier', en: 'Deltoid', latin: 'm. deltoideus', region: 'schouder', nerve: 'axillaris', functions: [['Arm zijwaarts heffen (abductie)', 'Raising the arm sideways (abduction)'], ['Arm naar voren heffen (voorste deel)', 'Raising the arm forward (front part)'], ['Arm naar achteren (achterste deel)', 'Moving the arm back (rear part)']], match: ['deltoid', 'schouders', 'deltaspier'] },
  { key: 'supraspinatus', nl: 'Bovengratspier', en: 'Supraspinatus', latin: 'm. supraspinatus', region: 'schouder', nerve: 'suprascapularis', functions: [['Start van arm zijwaarts heffen', 'Starting to raise the arm sideways'], ['Kop van de bovenarm in de kom houden', 'Keeping the head of the upper arm in its socket']], match: ['supraspinatus', 'rotatorcuff', 'rotator cuff'] },
  { key: 'infraspinatus', nl: 'Ondergratspier', en: 'Infraspinatus', latin: 'm. infraspinatus', region: 'schouder', nerve: 'suprascapularis', functions: [['Arm naar buiten draaien (exorotatie)', 'Turning the arm outward (external rotation)'], ['Schouderkop stabiliseren', 'Stabilising the shoulder joint']], match: ['infraspinatus', 'exorotator', 'rotatorcuff', 'rotator cuff'] },
  { key: 'teres_minor', nl: 'Kleine ronde spier', en: 'Teres minor', latin: 'm. teres minor', region: 'schouder', nerve: 'axillaris', functions: [['Arm naar buiten draaien (exorotatie)', 'Turning the arm outward (external rotation)']], match: ['teres minor'] },
  { key: 'subscapularis', nl: 'Onderschouderbladspier', en: 'Subscapularis', latin: 'm. subscapularis', region: 'schouder', nerve: 'subscapularis', functions: [['Arm naar binnen draaien (endorotatie)', 'Turning the arm inward (internal rotation)'], ['Voorkant schouder stabiliseren', 'Stabilising the front of the shoulder']], match: ['subscapularis', 'rotatorcuff', 'rotator cuff'] },
  { key: 'serratus', nl: 'Voorste zaagspier', en: 'Serratus anterior', latin: 'm. serratus anterior', region: 'schouder', nerve: 'thoracicus_longus', functions: [['Schouderblad naar voren tegen de borstkas', 'Holding the shoulder blade forward against the ribcage'], ['Helpt bij arm boven het hoofd', 'Helps when lifting the arm overhead']], match: ['serratus'] },
  // Chest
  { key: 'pectoralis_major', nl: 'Grote borstspier', en: 'Pectoralis major', latin: 'm. pectoralis major', region: 'borst', nerve: 'pectorales', functions: [['Arm naar het lichaam toe (adductie)', 'Bringing the arm towards the body (adduction)'], ['Arm naar binnen draaien', 'Turning the arm inward'], ['Duwen, zoals bij opdrukken', 'Pushing, as in a push-up']], match: ['pectoralis major', 'borst', 'chest', 'pectoralis'] },
  // Upper arm
  { key: 'biceps', nl: 'Tweehoofdige armspier', en: 'Biceps', latin: 'm. biceps brachii', region: 'bovenarm', nerve: 'musculocutaneus', functions: [['Elleboog buigen', 'Bending the elbow'], ['Onderarm naar buiten draaien (supinatie)', 'Turning the forearm palm-up (supination)'], ['Helpt bij arm naar voren heffen', 'Helps raise the arm forward']], match: ['biceps'] },
  { key: 'brachialis', nl: 'Opperarmspier', en: 'Brachialis', latin: 'm. brachialis', region: 'bovenarm', nerve: 'musculocutaneus', also: ['radialis'], functions: [['Elleboog buigen, in elke stand van de hand', 'Bending the elbow, whatever the hand position']], match: ['brachialis', 'hammer'] },
  { key: 'triceps', nl: 'Driehoofdige armspier', en: 'Triceps', latin: 'm. triceps brachii', region: 'bovenarm', nerve: 'radialis', functions: [['Elleboog strekken', 'Straightening the elbow'], ['Helpt bij arm naar achteren', 'Helps move the arm back']], match: ['triceps'] },
  // Forearm
  { key: 'brachioradialis', nl: 'Opperarm-spaakbeenspier', en: 'Brachioradialis', latin: 'm. brachioradialis', region: 'onderarm', nerve: 'radialis', functions: [['Elleboog buigen met de duim omhoog', 'Bending the elbow with the thumb up']], match: ['brachioradialis'] },
  { key: 'polsstrekkers', plural: true, nl: 'Polsstrekkers', en: 'Wrist extensors', latin: 'mm. extensor carpi radialis et ulnaris', region: 'onderarm', nerve: 'radialis', functions: [['Pols strekken (hand omhoog)', 'Extending the wrist (hand up)'], ['Pols stabiel houden bij grijpen', 'Keeping the wrist steady when gripping']], match: ['extensor carpi', 'polsextensor', 'polsstrekker', 'wrist extensor'] },
  { key: 'supinator', nl: 'Supinator', en: 'Supinator', latin: 'm. supinator', region: 'onderarm', nerve: 'radialis', functions: [['Onderarm naar buiten draaien (supinatie)', 'Turning the forearm palm-up (supination)']], match: ['supinator'] },
  { key: 'pronator', nl: 'Ronde binnenwaartse draaier', en: 'Pronator teres', latin: 'm. pronator teres', region: 'onderarm', nerve: 'medianus', functions: [['Onderarm naar binnen draaien (pronatie)', 'Turning the forearm palm-down (pronation)'], ['Helpt bij elleboog buigen', 'Helps bend the elbow']], match: ['pronator'] },
  { key: 'polsbuigers', plural: true, nl: 'Pols- en vingerbuigers', en: 'Wrist and finger flexors', latin: 'mm. flexor carpi radialis et digitorum', region: 'onderarm', nerve: 'medianus', also: ['ulnaris'], functions: [['Pols buigen (hand omlaag)', 'Flexing the wrist (hand down)'], ['Vingers buigen, grijpkracht', 'Bending the fingers, grip strength']], match: ['flexor carpi radialis', 'flexor digitorum', 'vingerflexor', 'polsflexor', 'grijpkracht', 'grip'] },
  { key: 'fcu', nl: 'Ellepijpszijdige polsbuiger', en: 'Flexor carpi ulnaris', latin: 'm. flexor carpi ulnaris', region: 'onderarm', nerve: 'ulnaris', functions: [['Pols buigen naar de pinkkant', 'Bending the wrist towards the little finger'], ['Kleine handspieren: vingers spreiden', 'Small hand muscles: spreading the fingers']], match: ['flexor carpi ulnaris', 'handspier', 'interossei'] },
  // Back
  { key: 'latissimus', nl: 'Brede rugspier', en: 'Latissimus dorsi', latin: 'm. latissimus dorsi', region: 'rug', nerve: 'thoracodorsalis', functions: [['Arm van boven naar beneden trekken', 'Pulling the arm down from overhead'], ['Arm naar achteren en naar binnen draaien', 'Moving the arm back and turning it inward']], match: ['latissimus', 'brede rugspier', 'lats'] },
  { key: 'rhomboideus', plural: true, nl: 'Ruitvormige spieren', en: 'Rhomboids', latin: 'mm. rhomboidei', region: 'rug', nerve: 'dorsalis_scapulae', functions: [['Schouderbladen naar elkaar trekken', 'Drawing the shoulder blades together']], match: ['rhomboid'] },
  { key: 'erector_spinae', plural: true, nl: 'Rugstrekkers', en: 'Erector spinae', latin: 'm. erector spinae', region: 'rug', nerve: 'rami_dorsales', functions: [['Rug strekken', 'Straightening the back'], ['Rechtop blijven staan en tillen', 'Staying upright and lifting']], match: ['erector spinae', 'lumbale extensor', 'rugstrekker', 'back extensor'] },
  { key: 'multifidus', nl: 'Multifidus', en: 'Multifidus', latin: 'm. multifidus', region: 'rug', nerve: 'rami_dorsales', functions: [['Wervels per segment stabiliseren', 'Stabilising the spine segment by segment']], match: ['multifidus'] },
  { key: 'quadratus_lumborum', nl: 'Vierkante lendenspier', en: 'Quadratus lumborum', latin: 'm. quadratus lumborum', region: 'rug', nerve: 'plexus_lumbalis', also: ['thoracoabdominales'], functions: [['Romp zijwaarts buigen', 'Side-bending the trunk'], ['Bekken aan één kant optrekken', 'Hitching one side of the pelvis']], match: ['quadratus lumborum'] },
  // Abdomen
  { key: 'rectus_abdominis', nl: 'Rechte buikspier', en: 'Rectus abdominis', latin: 'm. rectus abdominis', region: 'buik', nerve: 'thoracoabdominales', functions: [['Romp buigen (opkrullen)', 'Bending the trunk (curling up)']], match: ['rectus abdominis', 'buikspier', 'abdominal'] },
  { key: 'obliqui', plural: true, nl: 'Schuine buikspieren', en: 'Obliques', latin: 'mm. obliqui abdominis', region: 'buik', nerve: 'thoracoabdominales', functions: [['Romp draaien', 'Rotating the trunk'], ['Romp zijwaarts buigen', 'Side-bending the trunk']], match: ['obliqu', 'schuine buik'] },
  { key: 'transversus', nl: 'Dwarse buikspier', en: 'Transversus abdominis', latin: 'm. transversus abdominis', region: 'buik', nerve: 'thoracoabdominales', functions: [['Buik plat aanspannen, romp stabiliseren', 'Drawing the belly in, stabilising the trunk']], match: ['transversus', 'romp', 'core'] },
  // Hip
  { key: 'iliopsoas', nl: 'Heupbuiger', en: 'Iliopsoas', latin: 'm. iliopsoas', region: 'heup', nerve: 'plexus_lumbalis', also: ['femoralis'], functions: [['Heup buigen (knie optillen)', 'Bending the hip (lifting the knee)']], match: ['iliopsoas', 'heupflexor', 'hip flexor', 'psoas'] },
  { key: 'gluteus_maximus', nl: 'Grote bilspier', en: 'Gluteus maximus', latin: 'm. gluteus maximus', region: 'heup', nerve: 'gluteus_inferior', functions: [['Heup strekken (been naar achteren)', 'Extending the hip (leg back)'], ['Opstaan, traplopen, springen', 'Standing up, climbing stairs, jumping'], ['Been naar buiten draaien', 'Turning the leg outward']], match: ['gluteus maximus', 'bilspier', 'glute', 'bil'] },
  { key: 'gluteus_medius', nl: 'Middelste bilspier', en: 'Gluteus medius', latin: 'm. gluteus medius', region: 'heup', nerve: 'gluteus_superior', functions: [['Been zijwaarts heffen (abductie)', 'Raising the leg sideways (abduction)'], ['Bekken recht houden als je op één been staat', 'Keeping the pelvis level when standing on one leg']], match: ['gluteus medius', 'gluteus minimus', 'heupabductor', 'abductor'] },
  { key: 'tfl', nl: 'Spanner van de brede peesplaat', en: 'Tensor fasciae latae', latin: 'm. tensor fasciae latae', region: 'heup', nerve: 'gluteus_superior', functions: [['Heup buigen en been zijwaarts', 'Bending the hip and moving the leg sideways'], ['Knie stabiliseren via de IT-band', 'Steadying the knee via the IT band']], match: ['tensor fasciae', 'tfl'] },
  { key: 'exorotatoren', plural: true, nl: 'Diepe heupdraaiers', en: 'Deep hip rotators', latin: 'm. piriformis e.a.', region: 'heup', nerve: 'plexus_sacralis', functions: [['Heup naar buiten draaien', 'Turning the hip outward'], ['Heupkop in de kom houden', 'Keeping the hip joint centred']], match: ['piriformis', 'heupexorotator', 'exorotatoren heup', 'hip rotator'] },
  { key: 'adductoren', plural: true, nl: 'Binnenkant bovenbeen', en: 'Adductors', latin: 'mm. adductores', region: 'heup', nerve: 'obturatorius', also: ['ischiadicus', 'tibialis'], functions: [['Been naar binnen trekken (adductie)', 'Pulling the leg inward (adduction)']], match: ['adductor', 'lies', 'groin'] },
  // Thigh
  { key: 'quadriceps', nl: 'Vierhoofdige dijspier', en: 'Quadriceps', latin: 'm. quadriceps femoris', region: 'bovenbeen', nerve: 'femoralis', functions: [['Knie strekken', 'Straightening the knee'], ['Heup buigen (rectus femoris)', 'Bending the hip (rectus femoris)'], ['Afremmen bij hurken en traplopen', 'Braking when squatting and going downstairs']], match: ['quadriceps', 'vastus', 'rectus femoris', 'dijspier', 'quads'] },
  { key: 'hamstrings', plural: true, nl: 'Hamstrings', en: 'Hamstrings', latin: 'mm. biceps femoris, semitendinosus, semimembranosus', region: 'bovenbeen', nerve: 'ischiadicus', also: ['tibialis', 'fibularis'], functions: [['Knie buigen', 'Bending the knee'], ['Heup strekken', 'Extending the hip'], ['Afremmen bij sprinten', 'Braking when sprinting']], match: ['hamstring', 'biceps femoris', 'semitendinosus', 'achterkant bovenbeen'] },
  // Lower leg
  { key: 'gastrocnemius', nl: 'Tweelingkuitspier', en: 'Gastrocnemius', latin: 'm. gastrocnemius', region: 'onderbeen', nerve: 'tibialis', functions: [['Op de tenen gaan (met gestrekte knie)', 'Rising onto the toes (knee straight)'], ['Helpt bij knie buigen', 'Helps bend the knee']], match: ['gastrocnemius', 'kuit', 'calf'] },
  { key: 'soleus', nl: 'Scholspier', en: 'Soleus', latin: 'm. soleus', region: 'onderbeen', nerve: 'tibialis', functions: [['Op de tenen gaan (met gebogen knie)', 'Rising onto the toes (knee bent)'], ['Rechtop blijven staan, lopen', 'Staying upright, walking']], match: ['soleus', 'kuit', 'achillespees', 'calf'] },
  { key: 'tibialis_anterior', nl: 'Voorste scheenbeenspier', en: 'Tibialis anterior', latin: 'm. tibialis anterior', region: 'onderbeen', nerve: 'fibularis', functions: [['Voet optrekken (dorsaalflexie)', 'Pulling the foot up (dorsiflexion)'], ['Voorvoet afremmen bij het neerzetten', 'Lowering the forefoot when the foot lands']], match: ['tibialis anterior', 'dorsaalflex', 'tibialis raise'] },
  { key: 'peronei', plural: true, nl: 'Kuitbeenspieren', en: 'Peroneals', latin: 'mm. fibulares (peronei)', region: 'onderbeen', nerve: 'fibularis', functions: [['Voet naar buiten kantelen (eversie)', 'Tilting the foot outward (eversion)'], ['Enkel stabiliseren tegen omzwikken', 'Steadying the ankle against rolling over']], match: ['perone', 'fibular', 'enkelstabilisator', 'ankle stabil'] },
  { key: 'tibialis_posterior', nl: 'Achterste scheenbeenspier', en: 'Tibialis posterior', latin: 'm. tibialis posterior', region: 'onderbeen', nerve: 'tibialis', functions: [['Voet naar binnen kantelen (inversie)', 'Tilting the foot inward (inversion)'], ['Voetboog ondersteunen', 'Supporting the foot arch']], match: ['tibialis posterior', 'voetspier', 'voetboog'] },
];

export const muscleByKey = (key: string) => MUSCLES.find((m) => m.key === key) ?? null;
export const nerveByKey = (key: string) => NERVES.find((n) => n.key === key) ?? null;

export type AtlasExerciseKind = 'kracht' | 'rek' | 'revalidatie' | 'zenuw';
export type AtlasExerciseInput = { name: string; muscles: string[]; training: string[]; movement: string | null; sourceKey: string | null; tags: string[] };

/** What an exercise is for in the atlas: strength, stretch/mobility, nerve mobility or rehab. */
export function exerciseKind(e: AtlasExerciseInput): AtlasExerciseKind {
  if (e.training.includes('neurodynamics') || e.sourceKey?.startsWith('nd_') || e.tags.includes('neurodynamiek')) return 'zenuw';
  if (e.movement === 'stretch' || e.training.includes('mobility') || e.sourceKey?.startsWith('mb_')) return 'rek';
  if (e.training.includes('strength') || e.sourceKey?.startsWith('kr_') || e.tags.includes('krachttraining')) return 'kracht';
  return 'revalidatie';
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/**
 * The muscles an exercise works, from its target muscles (and for broad words, its name), in the
 * order they are listed: the first one is the exercise's main target.
 */
export function musclesOf(e: AtlasExerciseInput): string[] {
  const hay = norm([...e.muscles, e.name].join(' | '));
  const at = (m: Muscle) => Math.min(...m.match.map((w) => hay.indexOf(norm(w))).filter((i) => i >= 0));
  return MUSCLES.filter((m) => m.match.some((w) => hay.includes(norm(w)))).sort((a, b) => at(a) - at(b)).map((m) => m.key);
}

/** The nerve an exercise mobilises (nerve exercises only). */
export function nerveOf(e: AtlasExerciseInput): NerveKey | null {
  if (exerciseKind(e) !== 'zenuw') return null;
  const hay = norm([e.name, e.sourceKey ?? '', ...e.tags].join(' '));
  return NERVES.find((n) => n.match.some((w) => hay.includes(norm(w))))?.key ?? null;
}

// ------------------------------------------------------------------------------------------------
// Quiz: questions built from the atlas data. Each question has a stable id, so XP is given once.
// ------------------------------------------------------------------------------------------------

export const QUIZ_XP = 5;
/** Most correct answers that earn XP per day (so it stays a bonus, not a grind). */
export const QUIZ_DAILY_CAP = 10;

export type QuizQuestion = {
  id: string;
  muscle: string | null;
  nerve: NerveKey | null;
  q: Fn;
  options: { id: string; label: Fn }[];
  answer: string;
  explain: Fn;
};

/** Small deterministic hash, so the options keep the same order for everyone. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** Branches of the same nerve: the tibial and fibular nerves are the two parts of the sciatic nerve. */
const SAME: Partial<Record<NerveKey, NerveKey[]>> = { ischiadicus: ['tibialis', 'fibularis'], tibialis: ['ischiadicus'], fibularis: ['ischiadicus'], femoralis: ['plexus_lumbalis'], plexus_lumbalis: ['femoralis', 'obturatorius'], obturatorius: ['plexus_lumbalis'] };
/** Every nerve that (partly) supplies a muscle, including the trunk it branches from. */
export const nervesOf = (m: Muscle): NerveKey[] => {
  const base = [m.nerve, ...(m.also ?? [])];
  return [...new Set([...base, ...base.flatMap((n) => SAME[n] ?? [])])];
};

function pickOthers<T>(pool: T[], n: number, seed: string): T[] {
  return [...pool].sort((a, b) => hash(seed + JSON.stringify(a)) - hash(seed + JSON.stringify(b))).slice(0, n);
}
function shuffle<T extends { id: string }>(xs: T[], seed: string): T[] {
  return [...xs].sort((a, b) => hash(seed + a.id) - hash(seed + b.id));
}

/** The core of a function, to spot overlaps: "Helpt bij knie buigen" and "Knie buigen" are the same. */
const fnCore = (f: Fn) => norm(f[0]).replace(/\(.*?\)/g, '').replace(/^helpt (bij|mee met) /, '').replace(/[,.].*$/, '').trim();
/** True when a function is (also) done by this muscle, so it can never be a wrong option. */
const doesIt = (m: Muscle, f: Fn) => m.functions.some((g) => { const a = fnCore(g); const b = fnCore(f); return a.includes(b) || b.includes(a); });

export function quizQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const m of MUSCLES) {
    const n = nerveByKey(m.nerve)!;
    // 1. What does it do? Distractors: main functions of muscles elsewhere in the body.
    const main = m.functions[0];
    // Wrong options come from other regions and are never something this muscle also does.
    const others = pickOthers(MUSCLES.filter((x) => x.region !== m.region && !doesIt(m, x.functions[0])), 3, m.key + 'f').map((x) => x.functions[0]);
    out.push({
      id: `${m.key}:functie`, muscle: m.key, nerve: null,
      q: m.plural
        ? [`Wat doen de ${m.nl.toLowerCase()} (${m.latin})?`, `What do the ${m.en.toLowerCase()} (${m.latin}) do?`]
        : [`Wat doet de ${m.nl.toLowerCase()} (${m.latin})?`, `What does the ${m.en.toLowerCase()} (${m.latin}) do?`],
      options: shuffle([{ id: 'a', label: main }, ...others.map((f, i) => ({ id: `x${i}`, label: f }))], m.key + 'fo'),
      answer: 'a',
      explain: [`${m.nl}: ${m.functions.map((f) => f[0].toLowerCase()).join('; ')}.`, `${m.en}: ${m.functions.map((f) => f[1].toLowerCase()).join('; ')}.`],
    });
    // 2. Which nerve? Distractors: other nerves.
    const wrong = pickOthers(NERVES.filter((x) => !nervesOf(m).includes(x.key)), 3, m.key + 'n');
    out.push({
      id: `${m.key}:zenuw`, muscle: m.key, nerve: m.nerve,
      q: [`Welke zenuw stuurt de ${m.nl.toLowerCase()} aan?`, `Which nerve drives the ${m.en.toLowerCase()}?`],
      options: shuffle([{ id: m.nerve, label: [n.nl, n.en] as Fn }, ...wrong.map((x) => ({ id: x.key, label: [x.nl, x.en] as Fn }))], m.key + 'no'),
      answer: m.nerve,
      explain: [`De ${m.nl.toLowerCase()} wordt aangestuurd door de ${n.nl} (${n.areaNl}).`, `The ${m.en.toLowerCase()} is driven by the ${n.en} (${n.areaEn}).`],
    });
  }
  // 3. Per nerve with two or more muscles: which of these does it drive?
  for (const n of NERVES) {
    const own = MUSCLES.filter((m) => m.nerve === n.key);
    if (own.length < 2) continue;
    const right = pickOthers(own, 1, n.key + 'r')[0];
    const wrong = pickOthers(MUSCLES.filter((m) => !nervesOf(m).includes(n.key)), 3, n.key + 'w');
    out.push({
      id: `zenuw:${n.key}`, muscle: right.key, nerve: n.key,
      q: [`Welke spier wordt aangestuurd door de ${n.nl}?`, `Which muscle is driven by the ${n.en}?`],
      options: shuffle([{ id: right.key, label: [right.nl, right.en] as Fn }, ...wrong.map((m) => ({ id: m.key, label: [m.nl, m.en] as Fn }))], n.key + 'o'),
      answer: right.key,
      explain: [`De ${n.nl} stuurt onder andere: ${own.map((m) => m.nl.toLowerCase()).join(', ')}.`, `The ${n.en} drives among others: ${own.map((m) => m.en.toLowerCase()).join(', ')}.`],
    });
  }
  return out;
}

export const questionById = (() => {
  let cache: Map<string, QuizQuestion> | null = null;
  return (id: string) => {
    cache ??= new Map(quizQuestions().map((q) => [q.id, q]));
    return cache.get(id) ?? null;
  };
})();

/** XP from correct answers: QUIZ_XP each, at most QUIZ_DAILY_CAP per day. */
export function quizXp(correctPerDay: number[]): number {
  return correctPerDay.reduce((s, n) => s + Math.min(n, QUIZ_DAILY_CAP), 0) * QUIZ_XP;
}
