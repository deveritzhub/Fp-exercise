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
  { key: 'musculocutaneus', nl: 'n. musculocutaneus', en: 'musculocutaneous nerve', areaNl: 'voorkant bovenarm', areaEn: 'front of the upper arm', noteNl: 'De naam zegt het: musculo = spier, cutaneus = huid. Hij stuurt eerst de armbuigers aan en loopt daarna door als gevoelszenuw van de huid aan de buitenkant van de onderarm.', noteEn: 'The name says it: musculo = muscle, cutaneous = skin. It first drives the arm flexors, then carries on as the sensory nerve of the skin on the outer forearm.', match: ['musculocutaneus', 'musculocutaneous'] },
  { key: 'radialis', nl: 'n. radialis', en: 'radial nerve', areaNl: 'achterkant arm, polsstrekkers', areaEn: 'back of the arm, wrist extensors', match: ['radialis', 'radial'] },
  { key: 'medianus', nl: 'n. medianus', en: 'median nerve', areaNl: 'voorkant onderarm, duim', areaEn: 'front of the forearm, thumb', match: ['medianus', 'median'] },
  { key: 'ulnaris', nl: 'n. ulnaris', en: 'ulnar nerve', areaNl: 'pinkzijde onderarm, hand', areaEn: 'little-finger side of forearm, hand', match: ['ulnaris', 'ulnar'] },
  { key: 'rami_dorsales', nl: 'rami dorsales', en: 'dorsal rami', areaNl: 'rugstrekkers', areaEn: 'back extensors', match: [] },
  { key: 'thoracoabdominales', nl: 'nn. thoracoabdominales', en: 'thoracoabdominal nerves', areaNl: 'buikwand', areaEn: 'abdominal wall', match: [] },
  { key: 'plexus_lumbalis', nl: 'plexus lumbalis', en: 'lumbar plexus', areaNl: 'onderrug en lies', areaEn: 'low back and groin', match: [] },
  { key: 'suboccipitalis', nl: 'n. suboccipitalis', en: 'suboccipital nerve', areaNl: 'achterhoofd', areaEn: 'back of the head', match: [] },
  { key: 'phrenicus', nl: 'n. phrenicus', en: 'phrenic nerve', areaNl: 'middenrif', areaEn: 'diaphragm', match: [] },
  { key: 'intercostales', nl: 'nn. intercostales', en: 'intercostal nerves', areaNl: 'tussen de ribben', areaEn: 'between the ribs', match: [] },
  { key: 'pudendus', nl: 'n. pudendus', en: 'pudendal nerve', areaNl: 'bekkenbodem', areaEn: 'pelvic floor', match: [] },
  { key: 'plantares', nl: 'nn. plantares', en: 'plantar nerves', areaNl: 'voetzool', areaEn: 'sole of the foot', match: [] },
  { key: 'plexus_sacralis', nl: 'plexus sacralis', en: 'sacral plexus', areaNl: 'diepe heupspieren', areaEn: 'deep hip muscles', match: [] },
  { key: 'femoralis', nl: 'n. femoralis', en: 'femoral nerve', areaNl: 'voorkant bovenbeen', areaEn: 'front of the thigh', match: ['femoralis', 'femoral'] },
  { key: 'obturatorius', nl: 'n. obturatorius', en: 'obturator nerve', areaNl: 'binnenkant bovenbeen', areaEn: 'inner thigh', match: ['obturatorius', 'obturator'] },
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
  /** Quiz level: 1 the basics, 2 the extra muscles (unlocked after most of level 1). */
  level?: 2;
  /** A group of muscles (Dutch "de rugstrekkers"): the quiz then asks "Wat doen de …". */
  plural?: boolean;
  /** Nerves that also supply part of it: never offered as a wrong answer. */
  also?: NerveKey[];
  /** Lowercase words found in an exercise's target muscles (or name) that mean this muscle. */
  match: string[];
};

export const MUSCLES: Muscle[] = [
  // Neck
  { key: 'diepe_nekflexoren', plural: true, nl: 'Diepe nekbuigers', en: 'Deep neck flexors', latin: 'm. longus colli, m. longus capitis', region: 'nek', nerve: 'cervicaal', functions: [['Kin intrekken, nek buigen', 'Tucking the chin, bending the neck'], ['Nek stabiliseren', 'Stabilising the neck']], match: ['longus colli', 'longus capitis', 'diepe nekflexoren', 'deep neck flexor', 'kin intrekken', 'chin tuck', 'isometrische nek'] },
  { key: 'scalenus', plural: true, nl: 'Trapspieren van de nek', en: 'Scalenes', latin: 'mm. scaleni', region: 'nek', nerve: 'cervicaal', functions: [['Nek zijwaarts buigen', 'Side-bending the neck'], ['Bovenste ribben optillen bij inademen', 'Lifting the upper ribs when breathing in']], match: ['scalen'] },
  { key: 'trapezius', nl: 'Monnikskapspier', en: 'Trapezius', latin: 'm. trapezius', region: 'nek', nerve: 'accessorius', also: ['cervicaal'], functions: [['Schouders optrekken (bovenste deel)', 'Shrugging the shoulders (upper part)'], ['Schouderbladen naar elkaar (middelste deel)', 'Drawing the shoulder blades together (middle part)'], ['Schouderblad omlaag (onderste deel)', 'Pulling the shoulder blade down (lower part)']], match: ['trapezius', 'monnikskap', 'bovenrug', 'face pull', 'reverse fly', 'wall slide', 'schouderbladen samentrekken'] },
  // Shoulder
  { key: 'deltoideus', nl: 'Deltaspier', en: 'Deltoid', latin: 'm. deltoideus', region: 'schouder', nerve: 'axillaris', functions: [['Arm zijwaarts heffen (abductie)', 'Raising the arm sideways (abduction)'], ['Arm naar voren heffen (voorste deel)', 'Raising the arm forward (front part)'], ['Arm naar achteren (achterste deel)', 'Moving the arm back (rear part)']], match: ['deltoid', 'schouders', 'deltaspier', 'middelste schouder', 'achterste schouder', 'lateral raise', 'zijwaartse dumbbell raise'] },
  { key: 'supraspinatus', nl: 'Bovengratspier', en: 'Supraspinatus', latin: 'm. supraspinatus', region: 'schouder', nerve: 'suprascapularis', functions: [['Start van arm zijwaarts heffen', 'Starting to raise the arm sideways'], ['Kop van de bovenarm in de kom houden', 'Keeping the head of the upper arm in its socket']], match: ['supraspinatus', 'rotatorcuff', 'rotator cuff'] },
  { key: 'infraspinatus', nl: 'Ondergratspier', en: 'Infraspinatus', latin: 'm. infraspinatus', region: 'schouder', nerve: 'suprascapularis', functions: [['Arm naar buiten draaien (exorotatie)', 'Turning the arm outward (external rotation)'], ['Schouderkop stabiliseren', 'Stabilising the shoulder joint']], match: ['infraspinatus', 'exorotator', 'rotatorcuff', 'rotator cuff', 'externe rotatie', 'external rotation', 'face pull', 'sleeper'] },
  { key: 'teres_minor', nl: 'Kleine ronde spier', en: 'Teres minor', latin: 'm. teres minor', region: 'schouder', nerve: 'axillaris', functions: [['Arm naar buiten draaien (exorotatie)', 'Turning the arm outward (external rotation)']], match: ['teres minor', 'externe rotatie', 'external rotation'] },
  { key: 'subscapularis', nl: 'Onderschouderbladspier', en: 'Subscapularis', latin: 'm. subscapularis', region: 'schouder', nerve: 'subscapularis', functions: [['Arm naar binnen draaien (endorotatie)', 'Turning the arm inward (internal rotation)'], ['Voorkant schouder stabiliseren', 'Stabilising the front of the shoulder']], match: ['subscapularis', 'rotatorcuff', 'rotator cuff'] },
  { key: 'serratus', nl: 'Voorste zaagspier', en: 'Serratus anterior', latin: 'm. serratus anterior', region: 'schouder', nerve: 'thoracicus_longus', functions: [['Schouderblad naar voren tegen de borstkas', 'Holding the shoulder blade forward against the ribcage'], ['Helpt bij arm boven het hoofd', 'Helps when lifting the arm overhead']], match: ['serratus', 'wall slide', 'push-up plus'] },
  // Chest
  { key: 'pectoralis_major', nl: 'Grote borstspier', en: 'Pectoralis major', latin: 'm. pectoralis major', region: 'borst', nerve: 'pectorales', functions: [['Arm naar het lichaam toe (adductie)', 'Bringing the arm towards the body (adduction)'], ['Arm naar binnen draaien', 'Turning the arm inward'], ['Duwen, zoals bij opdrukken', 'Pushing, as in a push-up']], match: ['pectoralis major', 'borst', 'chest', 'pectoralis'] },
  // Upper arm
  { key: 'biceps', nl: 'Tweehoofdige armspier', en: 'Biceps', latin: 'm. biceps brachii', region: 'bovenarm', nerve: 'musculocutaneus', functions: [['Elleboog buigen', 'Bending the elbow'], ['Onderarm naar buiten draaien (supinatie)', 'Turning the forearm palm-up (supination)'], ['Helpt bij arm naar voren heffen', 'Helps raise the arm forward']], match: ['biceps'] },
  { key: 'brachialis', nl: 'Opperarmspier', en: 'Brachialis', latin: 'm. brachialis', region: 'bovenarm', nerve: 'musculocutaneus', also: ['radialis'], functions: [['Elleboog buigen, in elke stand van de hand', 'Bending the elbow, whatever the hand position']], match: ['brachialis', 'hammer'] },
  { key: 'triceps', nl: 'Driehoofdige armspier', en: 'Triceps', latin: 'm. triceps brachii', region: 'bovenarm', nerve: 'radialis', functions: [['Elleboog strekken', 'Straightening the elbow'], ['Helpt bij arm naar achteren', 'Helps move the arm back']], match: ['triceps'] },
  // Forearm
  { key: 'brachioradialis', nl: 'Opperarm-spaakbeenspier', en: 'Brachioradialis', latin: 'm. brachioradialis', region: 'onderarm', nerve: 'radialis', functions: [['Elleboog buigen met de duim omhoog', 'Bending the elbow with the thumb up']], match: ['brachioradialis'] },
  { key: 'polsstrekkers', plural: true, nl: 'Polsstrekkers', en: 'Wrist extensors', latin: 'm. extensor carpi radialis longus, m. extensor carpi radialis brevis, m. extensor carpi ulnaris', region: 'onderarm', nerve: 'radialis', functions: [['Pols strekken (hand omhoog)', 'Extending the wrist (hand up)'], ['Pols stabiel houden bij grijpen', 'Keeping the wrist steady when gripping']], match: ['extensor carpi', 'polsextensor', 'polsstrekker', 'wrist extensor'] },
  { key: 'supinator', nl: 'Supinator', en: 'Supinator', latin: 'm. supinator', region: 'onderarm', nerve: 'radialis', functions: [['Onderarm naar buiten draaien (supinatie)', 'Turning the forearm palm-up (supination)']], match: ['supinator'] },
  { key: 'pronator', nl: 'Ronde binnenwaartse draaier', en: 'Pronator teres', latin: 'm. pronator teres', region: 'onderarm', nerve: 'medianus', functions: [['Onderarm naar binnen draaien (pronatie)', 'Turning the forearm palm-down (pronation)'], ['Helpt bij elleboog buigen', 'Helps bend the elbow']], match: ['pronator'] },
  { key: 'polsbuigers', plural: true, nl: 'Pols- en vingerbuigers', en: 'Wrist and finger flexors', latin: 'm. flexor carpi radialis, m. flexor digitorum superficialis', region: 'onderarm', nerve: 'medianus', functions: [['Pols buigen (hand omlaag)', 'Flexing the wrist (hand down)'], ['Vingers buigen, grijpkracht', 'Bending the fingers, grip strength']], match: ['flexor carpi radialis', 'flexor digitorum', 'vingerflexor', 'polsflexor', 'grijpkracht', 'grip'] },
  { key: 'fcu', nl: 'Ellepijpszijdige polsbuiger', en: 'Flexor carpi ulnaris', latin: 'm. flexor carpi ulnaris', region: 'onderarm', nerve: 'ulnaris', functions: [['Pols buigen naar de pinkkant', 'Bending the wrist towards the little finger'], ['Helpt bij pols buigen en grijpen', 'Helps flex the wrist and grip']], match: ['flexor carpi ulnaris'] },
  // Back
  { key: 'latissimus', nl: 'Brede rugspier', en: 'Latissimus dorsi', latin: 'm. latissimus dorsi', region: 'rug', nerve: 'thoracodorsalis', functions: [['Arm van boven naar beneden trekken', 'Pulling the arm down from overhead'], ['Arm naar achteren en naar binnen draaien', 'Moving the arm back and turning it inward']], match: ['latissimus', 'brede rugspier', 'lats'] },
  { key: 'rhomboideus', plural: true, nl: 'Ruitvormige spieren', en: 'Rhomboids', latin: 'mm. rhomboidei', region: 'rug', nerve: 'dorsalis_scapulae', functions: [['Schouderbladen naar elkaar trekken', 'Drawing the shoulder blades together']], match: ['rhomboid', 'schouderbladen samentrekken', 'scapular retraction', 'midden rug', 'barbell row', 'cable row', 'dumbbell row', 'inverted row', 'chest-supported row', 'reverse fly', 'roeien'] },
  { key: 'erector_spinae', plural: true, nl: 'Rugstrekkers', en: 'Erector spinae', latin: 'm. erector spinae', region: 'rug', nerve: 'rami_dorsales', functions: [['Rug strekken', 'Straightening the back'], ['Rechtop blijven staan en tillen', 'Staying upright and lifting']], match: ['erector spinae', 'lumbale extensor', 'rugstrekker', 'back extensor', 'thoracale', 'thoracic'] },
  { key: 'multifidus', nl: 'Multifidus', en: 'Multifidus', latin: 'm. multifidus', region: 'rug', nerve: 'rami_dorsales', functions: [['Wervels per segment stabiliseren', 'Stabilising the spine segment by segment']], match: ['multifidus'] },
  { key: 'quadratus_lumborum', nl: 'Vierkante lendenspier', en: 'Quadratus lumborum', latin: 'm. quadratus lumborum', region: 'rug', nerve: 'plexus_lumbalis', also: ['thoracoabdominales'], functions: [['Romp zijwaarts buigen', 'Side-bending the trunk'], ['Bekken aan één kant optrekken', 'Hitching one side of the pelvis']], match: ['quadratus lumborum'] },
  // Abdomen
  { key: 'rectus_abdominis', nl: 'Rechte buikspier', en: 'Rectus abdominis', latin: 'm. rectus abdominis', region: 'buik', nerve: 'thoracoabdominales', functions: [['Romp buigen (opkrullen)', 'Bending the trunk (curling up)']], match: ['rectus abdominis', 'buikspier', 'abdominal'] },
  { key: 'obliqui', plural: true, nl: 'Schuine buikspieren', en: 'Obliques', latin: 'm. obliquus externus abdominis, m. obliquus internus abdominis', region: 'buik', nerve: 'thoracoabdominales', functions: [['Romp draaien', 'Rotating the trunk'], ['Romp zijwaarts buigen', 'Side-bending the trunk']], match: ['obliqu', 'schuine buik'] },
  { key: 'transversus', nl: 'Dwarse buikspier', en: 'Transversus abdominis', latin: 'm. transversus abdominis', region: 'buik', nerve: 'thoracoabdominales', functions: [['Buik plat aanspannen, romp stabiliseren', 'Drawing the belly in, stabilising the trunk']], match: ['transversus', 'romp', 'core'] },
  // Hip
  { key: 'iliopsoas', nl: 'Heupbuiger', en: 'Iliopsoas', latin: 'm. iliopsoas', region: 'heup', nerve: 'plexus_lumbalis', also: ['femoralis'], functions: [['Heup buigen (knie optillen)', 'Bending the hip (lifting the knee)']], match: ['iliopsoas', 'heupflexor', 'hip flexor', 'psoas'] },
  { key: 'gluteus_maximus', nl: 'Grote bilspier', en: 'Gluteus maximus', latin: 'm. gluteus maximus', region: 'heup', nerve: 'gluteus_inferior', functions: [['Heup strekken (been naar achteren)', 'Extending the hip (leg back)'], ['Opstaan, traplopen, springen', 'Standing up, climbing stairs, jumping'], ['Been naar buiten draaien', 'Turning the leg outward']], match: ['gluteus maximus', 'bilspier', 'glute', 'bil'] },
  { key: 'gluteus_medius', nl: 'Middelste bilspier', en: 'Gluteus medius', latin: 'm. gluteus medius', region: 'heup', nerve: 'gluteus_superior', functions: [['Been zijwaarts heffen (abductie)', 'Raising the leg sideways (abduction)'], ['Bekken recht houden als je op één been staat', 'Keeping the pelvis level when standing on one leg']], match: ['gluteus medius', 'heupabductor', 'abductoren heup', 'hip abductor'] },
  { key: 'tfl', nl: 'Spanner van de brede peesplaat', en: 'Tensor fasciae latae', latin: 'm. tensor fasciae latae', region: 'heup', nerve: 'gluteus_superior', functions: [['Heup buigen en been zijwaarts', 'Bending the hip and moving the leg sideways'], ['Knie stabiliseren via de IT-band', 'Steadying the knee via the IT band']], match: ['tensor fasciae', 'tfl'] },
  { key: 'exorotatoren', plural: true, nl: 'Diepe heupdraaiers', en: 'Deep hip rotators', latin: 'm. piriformis, mm. gemelli, m. obturator internus, m. quadratus femoris', region: 'heup', nerve: 'plexus_sacralis', functions: [['Heup naar buiten draaien', 'Turning the hip outward'], ['Heupkop in de kom houden', 'Keeping the hip joint centred']], match: ['piriformis', 'heupexorotator', 'exorotatoren heup', 'hip rotator'] },
  { key: 'adductoren', plural: true, nl: 'Binnenkant bovenbeen', en: 'Adductors', latin: 'mm. adductores', region: 'heup', nerve: 'obturatorius', also: ['ischiadicus', 'tibialis'], functions: [['Been naar binnen trekken (adductie)', 'Pulling the leg inward (adduction)']], match: ['adductor longus', 'adductor magnus', 'adductor brevis', 'adductoren', 'heupadductor', 'hip adductor', 'lies', 'groin'] },
  // Thigh
  { key: 'quadriceps', nl: 'Vierhoofdige dijspier', en: 'Quadriceps', latin: 'm. quadriceps femoris', region: 'bovenbeen', nerve: 'femoralis', functions: [['Knie strekken', 'Straightening the knee'], ['Heup buigen (rectus femoris)', 'Bending the hip (rectus femoris)'], ['Afremmen bij hurken en traplopen', 'Braking when squatting and going downstairs']], match: ['quadriceps', 'vastus', 'rectus femoris', 'dijspier', 'quads'] },
  { key: 'hamstrings', plural: true, nl: 'Hamstrings', en: 'Hamstrings', latin: 'm. biceps femoris, m. semitendinosus, m. semimembranosus', region: 'bovenbeen', nerve: 'ischiadicus', also: ['tibialis', 'fibularis'], functions: [['Knie buigen', 'Bending the knee'], ['Heup strekken', 'Extending the hip'], ['Afremmen bij sprinten', 'Braking when sprinting']], match: ['hamstring', 'biceps femoris', 'semitendinosus', 'achterkant bovenbeen'] },
  // Lower leg
  { key: 'gastrocnemius', nl: 'Tweelingkuitspier', en: 'Gastrocnemius', latin: 'm. gastrocnemius', region: 'onderbeen', nerve: 'tibialis', functions: [['Op de tenen gaan (met gestrekte knie)', 'Rising onto the toes (knee straight)'], ['Helpt bij knie buigen', 'Helps bend the knee']], match: ['gastrocnemius', 'kuit', 'calf'] },
  { key: 'soleus', nl: 'Scholspier', en: 'Soleus', latin: 'm. soleus', region: 'onderbeen', nerve: 'tibialis', functions: [['Op de tenen gaan (met gebogen knie)', 'Rising onto the toes (knee bent)'], ['Rechtop blijven staan, lopen', 'Staying upright, walking']], match: ['soleus', 'kuit', 'achillespees', 'calf'] },
  { key: 'tibialis_anterior', nl: 'Voorste scheenbeenspier', en: 'Tibialis anterior', latin: 'm. tibialis anterior', region: 'onderbeen', nerve: 'fibularis', functions: [['Voet optrekken (dorsaalflexie)', 'Pulling the foot up (dorsiflexion)'], ['Voorvoet afremmen bij het neerzetten', 'Lowering the forefoot when the foot lands']], match: ['tibialis anterior', 'dorsaalflex', 'tibialis raise'] },
  { key: 'peronei', plural: true, nl: 'Kuitbeenspieren', en: 'Peroneals', latin: 'm. fibularis longus, m. fibularis brevis (peronei)', region: 'onderbeen', nerve: 'fibularis', functions: [['Voet naar buiten kantelen (eversie)', 'Tilting the foot outward (eversion)'], ['Enkel stabiliseren tegen omzwikken', 'Steadying the ankle against rolling over']], match: ['perone', 'fibular', 'enkelstabilisator', 'ankle stabil'] },
  { key: 'tibialis_posterior', nl: 'Achterste scheenbeenspier', en: 'Tibialis posterior', latin: 'm. tibialis posterior', region: 'onderbeen', nerve: 'tibialis', functions: [['Voet naar binnen kantelen (inversie)', 'Tilting the foot inward (inversion)'], ['Voetboog ondersteunen', 'Supporting the foot arch']], match: ['tibialis posterior', 'voetboog'] },
  // ---- Level 2: more muscles, in the atlas from the start; their quiz questions unlock later. ----
  { key: 'scm', level: 2, nl: 'Borstbeen-sleutelbeen-tepelspier', en: 'Sternocleidomastoid', latin: 'm. sternocleidomastoideus', region: 'nek', nerve: 'accessorius', functions: [['Hoofd draaien naar de andere kant', 'Turning the head to the other side'], ['Nek buigen (beide kanten samen)', 'Bending the neck (both sides together)']], match: ['sternocleidomastoid', 'scm'] },
  { key: 'levator_scapulae', level: 2, nl: 'Schouderbladheffer', en: 'Levator scapulae', latin: 'm. levator scapulae', region: 'nek', nerve: 'dorsalis_scapulae', also: ['cervicaal'], functions: [['Schouderblad optrekken', 'Lifting the shoulder blade']], match: ['levator scapulae'] },
  { key: 'suboccipitaal', level: 2, plural: true, nl: 'Kleine achterhoofdsspieren', en: 'Suboccipital muscles', latin: 'mm. suboccipitales', region: 'nek', nerve: 'suboccipitalis', functions: [['Kleine knikbewegingen van het hoofd', 'Small nodding movements of the head'], ['Hoofdhouding fijn afstellen', 'Fine-tuning head posture']], match: ['suboccipita'] },
  { key: 'teres_major', level: 2, nl: 'Grote ronde spier', en: 'Teres major', latin: 'm. teres major', region: 'schouder', nerve: 'subscapularis', functions: [['Arm van boven naar beneden en naar achteren', 'Pulling the arm down and back'], ['Arm naar binnen draaien', 'Turning the arm inward']], match: ['teres major'] },
  { key: 'pectoralis_minor', level: 2, nl: 'Kleine borstspier', en: 'Pectoralis minor', latin: 'm. pectoralis minor', region: 'borst', nerve: 'pectorales', functions: [['Schouderblad naar voren en omlaag kantelen', 'Tilting the shoulder blade forward and down']], match: ['pectoralis minor'] },
  { key: 'coracobrachialis', level: 2, nl: 'Ravenbek-armspier', en: 'Coracobrachialis', latin: 'm. coracobrachialis', region: 'bovenarm', nerve: 'musculocutaneus', functions: [['Arm naar voren en naar het lichaam toe', 'Bringing the arm forward and towards the body']], match: ['coracobrachialis'] },
  { key: 'pronator_quadratus', level: 2, nl: 'Vierkante binnenwaartse draaier', en: 'Pronator quadratus', latin: 'm. pronator quadratus', region: 'onderarm', nerve: 'medianus', functions: [['Onderarm naar binnen draaien (pronatie), de hoofdspier hiervoor', 'Turning the forearm palm-down (pronation), the main muscle for it']], match: ['pronator quadratus'] },
  { key: 'extensor_digitorum', level: 2, nl: 'Vingerstrekker', en: 'Extensor digitorum', latin: 'm. extensor digitorum', region: 'onderarm', nerve: 'radialis', functions: [['Vingers strekken', 'Straightening the fingers']], match: ['extensor digitorum communis', 'vingerstrekker', 'vingerextensor', 'finger extensor'] },
  { key: 'fdp', level: 2, nl: 'Diepe vingerbuiger', en: 'Flexor digitorum profundus', latin: 'm. flexor digitorum profundus', region: 'onderarm', nerve: 'medianus', also: ['ulnaris'], functions: [['Vingertoppen buigen', 'Bending the fingertips']], match: ['flexor digitorum profundus'] },
  { key: 'thenar', level: 2, plural: true, nl: 'Duimmuisspieren', en: 'Thenar muscles', latin: 'thenarspieren: m. opponens pollicis, m. abductor pollicis brevis, m. flexor pollicis brevis', region: 'onderarm', nerve: 'medianus', functions: [['Duim tegenover de vingers zetten (opponeren)', 'Bringing the thumb opposite the fingers (opposition)']], match: ['thenar', 'opponens pollicis', 'duimmuis'] },
  { key: 'ulnaire_handspieren', level: 2, plural: true, nl: 'Kleine handspieren (pinkzijde en tussen de botjes)', en: 'Small hand muscles (little-finger side and interossei)', latin: 'mm. interossei, hypothenarspieren, m. adductor pollicis', region: 'onderarm', nerve: 'ulnaris', functions: [['Vingers spreiden en sluiten', 'Spreading and closing the fingers'], ['Knijpgreep tussen duim en wijsvinger', 'Pinch grip between thumb and index finger']], match: ['interossei', 'hypothenar', 'adductor pollicis', 'handspier'] },
  { key: 'diafragma', level: 2, nl: 'Middenrif', en: 'Diaphragm', latin: 'diaphragma', region: 'buik', nerve: 'phrenicus', functions: [['Inademen', 'Breathing in'], ['Romp onder druk zetten bij tillen', 'Pressurising the trunk when lifting']], match: ['diafragma', 'diaphragm', 'middenrif', 'ademhaling'] },
  { key: 'bekkenbodem', level: 2, nl: 'Bekkenbodem', en: 'Pelvic floor', latin: 'm. levator ani, m. coccygeus', region: 'buik', nerve: 'pudendus', also: ['plexus_sacralis'], functions: [['Bekkenorganen ondersteunen', 'Supporting the pelvic organs'], ['Plas en ontlasting ophouden', 'Holding urine and stool']], match: ['bekkenbodem', 'pelvic floor', 'levator ani'] },
  { key: 'intercostales', level: 2, plural: true, nl: 'Tussenribspieren', en: 'Intercostal muscles', latin: 'mm. intercostales', region: 'buik', nerve: 'intercostales', functions: [['Ribben bewegen bij het ademen', 'Moving the ribs when breathing']], match: ['intercostal', 'tussenrib'] },
  { key: 'gracilis', level: 2, nl: 'Slanke spier', en: 'Gracilis', latin: 'm. gracilis', region: 'heup', nerve: 'obturatorius', functions: [['Been naar binnen trekken (adductie)', 'Pulling the leg inward (adduction)'], ['Knie buigen', 'Bending the knee'], ['Onderbeen naar binnen draaien', 'Turning the lower leg inward']], match: ['gracilis', 'pes anserinus'] },
  { key: 'sartorius', level: 2, nl: 'Kleermakersspier', en: 'Sartorius', latin: 'm. sartorius', region: 'bovenbeen', nerve: 'femoralis', functions: [['Heup buigen en naar buiten draaien (kleermakerszit)', 'Bending and turning the hip outward (cross-legged sitting)'], ['Knie buigen', 'Bending the knee']], match: ['sartorius', 'pes anserinus'] },
  { key: 'pectineus', level: 2, nl: 'Kamspier', en: 'Pectineus', latin: 'm. pectineus', region: 'heup', nerve: 'femoralis', also: ['obturatorius'], functions: [['Heup buigen en been naar binnen trekken', 'Bending the hip and pulling the leg inward']], match: ['pectineus'] },
  { key: 'gluteus_minimus', level: 2, nl: 'Kleine bilspier', en: 'Gluteus minimus', latin: 'm. gluteus minimus', region: 'heup', nerve: 'gluteus_superior', functions: [['Been zijwaarts heffen (abductie)', 'Raising the leg sideways (abduction)'], ['Heup naar binnen draaien', 'Turning the hip inward']], match: ['gluteus minimus'] },
  { key: 'popliteus', level: 2, nl: 'Knieholtespier', en: 'Popliteus', latin: 'm. popliteus', region: 'onderbeen', nerve: 'tibialis', functions: [['Gestrekte knie "ontgrendelen" bij het begin van buigen', 'Unlocking the straight knee as it starts to bend']], match: ['popliteus'] },
  { key: 'ehl', level: 2, nl: 'Lange grote-teenstrekker', en: 'Extensor hallucis longus', latin: 'm. extensor hallucis longus', region: 'onderbeen', nerve: 'fibularis', functions: [['Grote teen optrekken', 'Lifting the big toe']], match: ['extensor hallucis'] },
  { key: 'fhl', level: 2, nl: 'Lange grote-teenbuiger', en: 'Flexor hallucis longus', latin: 'm. flexor hallucis longus', region: 'onderbeen', nerve: 'tibialis', functions: [['Grote teen buigen', 'Bending the big toe'], ['Afzetten bij lopen en springen', 'Pushing off when walking and jumping']], match: ['flexor hallucis'] },
  { key: 'edl', level: 2, nl: 'Lange tenenstrekker', en: 'Extensor digitorum longus', latin: 'm. extensor digitorum longus', region: 'onderbeen', nerve: 'fibularis', functions: [['Tenen optrekken', 'Lifting the toes'], ['Helpt bij voet optrekken', 'Helps pull the foot up']], match: ['extensor digitorum longus'] },
  { key: 'voetspieren', level: 2, plural: true, nl: 'Kleine voetspieren', en: 'Intrinsic foot muscles', latin: 'korte voetspieren: m. flexor digitorum brevis, m. abductor hallucis', region: 'onderbeen', nerve: 'plantares', also: ['tibialis'], functions: [['Voetboog ondersteunen', 'Supporting the foot arch'], ['Balans en grip met de tenen', 'Balance and toe grip']], match: ['voetspier', 'intrinsieke voet', 'foot intrinsic', 'teen-yoga', 'korte voet'] },
];

/**
 * Antagonists (tegenspelers): muscles that do the opposite movement. Information for balance in a
 * programme, not a stretch: a biceps curl does not stretch the triceps, it lets it relax.
 */
const ANTAGONIST_PAIRS: [string, string][] = [
  ['biceps', 'triceps'], ['brachialis', 'triceps'],
  ['polsstrekkers', 'polsbuigers'], ['supinator', 'pronator'],
  ['deltoideus', 'latissimus'], ['infraspinatus', 'subscapularis'],
  ['rectus_abdominis', 'erector_spinae'],
  ['iliopsoas', 'gluteus_maximus'], ['gluteus_medius', 'adductoren'],
  ['quadriceps', 'hamstrings'],
  ['tibialis_anterior', 'gastrocnemius'], ['tibialis_anterior', 'soleus'], ['peronei', 'tibialis_posterior'],
];
/** The antagonists of a muscle (both directions of each pair). */
export function antagonistsOf(key: string): string[] {
  return ANTAGONIST_PAIRS.flatMap(([a, b]) => (a === key ? [b] : b === key ? [a] : []));
}

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
/**
 * Target muscles of FP library exercises whose name or fields do not say it (rehab exercises carry
 * no muscle list). Used first; name matching adds the rest.
 */
const SOURCE_MUSCLES: Record<string, string[]> = {
  ex_heel_slide: ['quadriceps', 'hamstrings'],
  ex_terminal_knee_extension: ['quadriceps'],
  ex_iso_knie_extensie_90: ['quadriceps'],
  ex_clamshell: ['gluteus_medius', 'exorotatoren'],
  ex_iso_heup_abductie: ['gluteus_medius', 'gluteus_minimus'],
  ex_single_leg_balance: ['gluteus_medius', 'voetspieren', 'peronei'],
  ex_leg_press: ['quadriceps', 'gluteus_maximus'],
  ex_step_up: ['quadriceps', 'gluteus_maximus', 'gluteus_medius'],
  ex_single_leg_rdl: ['hamstrings', 'gluteus_maximus', 'gluteus_medius'],
  ex_split_squat_bulgarian: ['quadriceps', 'gluteus_maximus', 'gluteus_medius'],
  ex_side_plank: ['obliqui', 'quadratus_lumborum', 'gluteus_medius'],
  ex_dead_bug: ['transversus', 'rectus_abdominis', 'obliqui'],
  ex_cat_camel: ['erector_spinae', 'multifidus'],
  ex_kniebuiging_muur: ['soleus', 'gastrocnemius'],
  ex_pogo_hopping: ['gastrocnemius', 'soleus'],
  ex_lateral_bound: ['gluteus_medius', 'quadriceps', 'adductoren'],
  mb_child_pose: ['latissimus', 'erector_spinae'],
  mb_sleeper_stretch: ['infraspinatus', 'teres_minor'],
  mb_deep_squat_hold: ['adductoren', 'gluteus_maximus', 'soleus'],
  mb_world_greatest: ['iliopsoas', 'hamstrings', 'adductoren'],
  mb_90_90: ['exorotatoren', 'gluteus_maximus'],
  kt_zijlig_abductie: ['gluteus_medius', 'gluteus_minimus'],
  kt_step_down: ['quadriceps', 'gluteus_medius', 'gluteus_maximus'],
  kt_eenbenige_bilbrug: ['gluteus_maximus', 'gluteus_medius'],
  kt_bird_dog: ['multifidus', 'erector_spinae', 'transversus', 'gluteus_maximus'],
  kt_copenhagen_kort: ['adductoren', 'gracilis', 'obliqui'],
  kt_short_foot: ['voetspieren', 'tibialis_posterior'],
  kt_buiklig_y_t: ['trapezius', 'rhomboideus', 'infraspinatus'],
  kt_push_up_plus: ['serratus'],
  kt_open_book: ['erector_spinae', 'pectoralis_major'],
  kt_pols_excentrisch_strek: ['polsstrekkers'],
  kt_pols_excentrisch_buig: ['polsbuigers', 'fcu'],
  kt_peesglijden_hand: ['polsbuigers', 'fdp'],
  kt_heup_hinge: ['gluteus_maximus', 'hamstrings'],
  kt_muurzit: ['quadriceps'],
};

export function musclesOf(e: AtlasExerciseInput): string[] {
  const hay = norm([...e.muscles, e.name].join(' | '));
  const at = (m: Muscle) => Math.min(...m.match.map((w) => hay.indexOf(norm(w))).filter((i) => i >= 0));
  const byName = MUSCLES.filter((m) => m.match.some((w) => hay.includes(norm(w)))).sort((a, b) => at(a) - at(b)).map((m) => m.key);
  const known = (e.sourceKey && SOURCE_MUSCLES[e.sourceKey]) || [];
  return [...new Set([...known, ...byName])];
}

/**
 * LIKE patterns (lowercase, no accents) to find a muscle's exercises in the database, or a
 * nerve's: the muscles it drives and its own nerve-mobility exercises (by name).
 */
export const atlasMatch = {
  muscle: (key: string) => (muscleByKey(key)?.match ?? []).map((w) => `%${norm(w)}%`),
  nerve: (key: string) => {
    const n = nerveByKey(key);
    if (!n) return [];
    const words = [...n.match, ...MUSCLES.filter((m) => m.nerve === key).flatMap((m) => m.match)];
    return [...new Set(words)].map((w) => `%${norm(w)}%`);
  },
};

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
/** XP per first right answer, by quiz level. */
export const QUIZ_LEVEL_XP: Record<1 | 2, number> = { 1: 5, 2: 8 };
/** Share of level 1 to answer right before level 2 opens. */
export const LEVEL2_UNLOCK = 0.6;
/** Most correct answers that earn XP per day (so it stays a bonus, not a grind). */
export const QUIZ_DAILY_CAP = 10;

export type QuizQuestion = {
  id: string;
  level: 1 | 2;
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
const SAME: Partial<Record<NerveKey, NerveKey[]>> = { ischiadicus: ['tibialis', 'fibularis'], tibialis: ['ischiadicus', 'plantares'], plantares: ['tibialis', 'ischiadicus'], pudendus: ['plexus_sacralis'], plexus_sacralis: ['pudendus'], fibularis: ['ischiadicus'], femoralis: ['plexus_lumbalis'], plexus_lumbalis: ['femoralis', 'obturatorius'], obturatorius: ['plexus_lumbalis'] };
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

let builtQuestions: QuizQuestion[] | null = null;
/** All quiz questions; built once (the data never changes while the app runs). */
export function quizQuestions(): QuizQuestion[] {
  builtQuestions ??= buildQuestions();
  return builtQuestions;
}

/** "Also helped by …" for muscles with a second nerve, so the quiz answer is never the whole story. */
function alsoText(m: Muscle, lang: 'nl' | 'en') {
  const extra = (m.also ?? []).map((k) => nerveByKey(k)).filter(Boolean).map((x) => (lang === 'nl' ? x!.nl : x!.en));
  if (!extra.length) return '';
  return lang === 'nl' ? `Een deel krijgt ook signalen van de ${extra.join(' en ')}.` : `Part of it is also supplied by the ${extra.join(' and ')}.`;
}

function buildQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const m of MUSCLES) {
    const n = nerveByKey(m.nerve)!;
    // 1. What does it do? Distractors: main functions of muscles elsewhere in the body.
    const main = m.functions[0];
    // Wrong options come from other regions and are never something this muscle also does.
    // Level 1 only draws on level 1 muscles, so its questions stay about the basics.
    const others = pickOthers(MUSCLES.filter((x) => x.region !== m.region && (m.level || !x.level) && !doesIt(m, x.functions[0])), 3, m.key + 'f').map((x) => x.functions[0]);
    out.push({
      id: `${m.key}:functie`, level: m.level ?? 1, muscle: m.key, nerve: null,
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
      id: `${m.key}:zenuw`, level: m.level ?? 1, muscle: m.key, nerve: m.nerve,
      q: [`Welke zenuw stuurt de ${m.nl.toLowerCase()} (${m.latin}) aan?`, `Which nerve drives the ${m.en.toLowerCase()} (${m.latin})?`],
      options: shuffle([{ id: m.nerve, label: [n.nl, n.en] as Fn }, ...wrong.map((x) => ({ id: x.key, label: [x.nl, x.en] as Fn }))], m.key + 'no'),
      answer: m.nerve,
      explain: [
        [`De ${m.nl.toLowerCase()} wordt aangestuurd door de ${n.nl} (${n.areaNl}).`, alsoText(m, 'nl'), 'noteNl' in n ? n.noteNl : ''].filter(Boolean).join(' '),
        [`The ${m.en.toLowerCase()} is driven by the ${n.en} (${n.areaEn}).`, alsoText(m, 'en'), 'noteEn' in n ? n.noteEn : ''].filter(Boolean).join(' '),
      ],
    });
  }
  // 3. Per nerve with two or more muscles: which of these does it drive?
  for (const n of NERVES) {
    const own = MUSCLES.filter((m) => m.nerve === n.key && !m.level);
    if (own.length < 2) continue;
    const right = pickOthers(own, 1, n.key + 'r')[0];
    const wrong = pickOthers(MUSCLES.filter((m) => !nervesOf(m).includes(n.key)), 3, n.key + 'w');
    out.push({
      id: `zenuw:${n.key}`, level: 1, muscle: right.key, nerve: n.key,
      q: [`Welke spier wordt aangestuurd door de ${n.nl}?`, `Which muscle is driven by the ${n.en}?`],
      options: shuffle([{ id: right.key, label: [right.nl, right.en] as Fn }, ...wrong.map((m) => ({ id: m.key, label: [m.nl, m.en] as Fn }))], n.key + 'o'),
      answer: right.key,
      explain: [`De ${n.nl} stuurt onder andere: ${own.map((m) => m.nl.toLowerCase()).join(', ')}.`, `The ${n.en} drives among others: ${own.map((m) => m.en.toLowerCase()).join(', ')}.`],
    });
  }
  // 4. Antagonists (level 2): one question per pair, asked from its first muscle.
  const asked = new Set<string>();
  for (const [a, b] of ANTAGONIST_PAIRS) {
    if (asked.has(a)) continue;
    asked.add(a);
    const m = MUSCLES.find((x) => x.key === a)!;
    const right = MUSCLES.find((x) => x.key === b)!;
    const exclude = new Set([a, ...antagonistsOf(a)]);
    const wrong = pickOthers(MUSCLES.filter((x) => !exclude.has(x.key) && x.region !== m.region && !x.level), 3, a + 'ant');
    out.push({
      id: `tegen:${a}`, level: 2, muscle: a, nerve: null,
      q: [`Wat is de tegenspeler (antagonist) van de ${m.nl.toLowerCase()}?`, `What is the antagonist of the ${m.en.toLowerCase()}?`],
      options: shuffle([{ id: b, label: [right.nl, right.en] as Fn }, ...wrong.map((x) => ({ id: x.key, label: [x.nl, x.en] as Fn }))], a + 'anto'),
      answer: b,
      explain: [`De ${right.nl.toLowerCase()} doet de tegengestelde beweging: ${right.functions[0][0].toLowerCase()} tegenover ${m.functions[0][0].toLowerCase()}.`, `The ${right.en.toLowerCase()} does the opposite movement: ${right.functions[0][1].toLowerCase()} versus ${m.functions[0][1].toLowerCase()}.`],
    });
  }
  return [...out, ...LEVEL2_SPECIALS];
}

const opt = (id: string, nl: string, en: string) => ({ id, label: [nl, en] as Fn });
/**
 * Level 2: questions that connect muscles, nerves and complaints. Hand-written, with one clear
 * answer each (a wrong option is never also true).
 */
const LEVEL2_SPECIALS: QuizQuestion[] = [
  // Nerve sliders and the mobility self-tests (the app's own exercises and tests).
  {
    id: 'l2:slider_principe', level: 2, muscle: null, nerve: null,
    q: ['Wat is het idee van een zenuwslider?', 'What is the idea of a nerve slider?'],
    options: [opt('glijden', 'Aan de ene kant spanning, aan de andere kant los, zodat de zenuw glijdt', 'Tension at one end, slack at the other, so the nerve glides'), opt('rekken', 'De zenuw zo ver mogelijk rekken en vasthouden', 'Stretch the nerve as far as possible and hold'), opt('kracht', 'De spieren rond de zenuw sterker maken', 'Strengthen the muscles around the nerve'), opt('tintelen', 'Doorgaan tot het flink tintelt', 'Keep going until it tingles a lot')],
    answer: 'glijden',
    explain: ['Bij een slider beweeg je twee gewrichten tegelijk: het ene geeft de zenuw spanning, het andere geeft hem ruimte. Zo glijdt de zenuw met weinig rek. Vasthouden op spanning heet een tensioner. Tintelingen horen niet toe te nemen.', 'In a slider you move two joints at once: one tensions the nerve, the other gives it slack, so it glides with little stretch. Holding on tension is called a tensioner. Tingling should not increase.'],
  },
  {
    id: 'l2:slider_tibialis', level: 2, muscle: null, nerve: 'tibialis',
    q: ['Je trekt de voet naar je toe met de voetzool licht naar buiten. Welke zenuw krijgt dan vooral spanning?', 'You pull the foot up with the sole turned slightly out. Which nerve gets most of the tension?'],
    options: [opt('tibialis', 'n. tibialis', 'tibial nerve'), opt('fibularis', 'n. fibularis (peroneus)', 'fibular (peroneal) nerve'), opt('femoralis', 'n. femoralis', 'femoral nerve'), opt('obturatorius', 'n. obturatorius', 'obturator nerve')],
    answer: 'tibialis',
    explain: ['De n. tibialis loopt achter de binnenenkel naar de voetzool. Voet optrekken met de zool naar buiten geeft hem spanning; daarom zit dat in de tibialis slider. De n. fibularis krijgt juist spanning als je de voet strekt met de zool naar binnen.', 'The tibial nerve runs behind the inner ankle to the sole. Pulling the foot up with the sole turned out tensions it, which is why the tibial slider uses it. The fibular nerve is tensioned by pointing the foot with the sole turned in.'],
  },
  {
    id: 'l2:slider_fibularis', level: 2, muscle: null, nerve: 'fibularis',
    q: ['Bij welke voetstand krijgt de n. fibularis (peroneus) de meeste spanning?', 'Which foot position puts the most tension on the fibular (peroneal) nerve?'],
    options: [opt('punt_binnen', 'Voet strekken (punt) met de zool naar binnen', 'Foot pointed with the sole turned in'), opt('op_buiten', 'Voet optrekken met de zool naar buiten', 'Foot pulled up with the sole turned out'), opt('plat', 'Voet plat op de grond', 'Foot flat on the floor'), opt('tenen_op', 'Alleen de tenen optrekken', 'Only the toes pulled up')],
    answer: 'punt_binnen',
    explain: ['De n. fibularis loopt om het kuitbeenkopje naar de voorkant van het onderbeen en de voetrug. Strekken met de zool naar binnen rekt die route; voet optrekken met de zool naar buiten hoort bij de n. tibialis.', 'The fibular nerve winds around the head of the fibula to the front of the shin and the top of the foot. Pointing the foot with the sole turned in lengthens that path; pulling it up with the sole out belongs to the tibial nerve.'],
  },
  {
    id: 'l2:slider_femoralis', level: 2, muscle: 'quadriceps', nerve: 'femoralis',
    q: ['In zijlig breng je de hiel naar je bil en de knie naar achteren. Welke zenuw krijgt spanning?', 'Lying on your side you bring the heel to your buttock and the knee backwards. Which nerve is tensioned?'],
    options: [opt('femoralis', 'n. femoralis', 'femoral nerve'), opt('ischiadicus', 'n. ischiadicus', 'sciatic nerve'), opt('obturatorius', 'n. obturatorius', 'obturator nerve'), opt('tibialis', 'n. tibialis', 'tibial nerve')],
    answer: 'femoralis',
    explain: ['De n. femoralis loopt aan de voorkant van heup en bovenbeen. Knie buigen met de heup gestrekt geeft hem spanning. De n. ischiadicus loopt aan de achterkant en krijgt juist spanning bij een gestrekt been omhoog.', 'The femoral nerve runs at the front of the hip and thigh. Bending the knee with the hip straight tensions it. The sciatic nerve runs at the back and is tensioned by a straight leg raise.'],
  },
  {
    id: 'l2:test_knie_muur', level: 2, muscle: 'soleus', nerve: null,
    q: ['Wat meet de knie-tot-muur-test?', 'What does the knee-to-wall test measure?'],
    options: [opt('enkel', 'Hoe ver je enkel buigt met je gewicht erop', 'How far your ankle bends with weight on it'), opt('knie_strek', 'Hoe ver je knie strekt', 'How far your knee straightens'), opt('kuitkracht', 'Hoeveel kracht je kuit heeft', 'How strong your calf is'), opt('balans', 'Hoe lang je op één been staat', 'How long you stand on one leg')],
    answer: 'enkel',
    explain: ['Je meet de grootste afstand van grote teen tot muur waarbij de knie de muur raakt met de hiel op de grond. Dat is de enkelbuiging (dorsaalflexie) onder belasting, belangrijk voor squatten, traplopen en hardlopen.', 'You measure the largest distance from big toe to wall at which the knee touches the wall with the heel down. That is ankle bending (dorsiflexion) under load, important for squatting, stairs and running.'],
  },
  {
    id: 'l2:test_zelfde_manier', level: 2, muscle: null, nerve: null,
    q: ['Waarom meet je je mobiliteit steeds op dezelfde manier en rond hetzelfde moment van de dag?', 'Why measure your mobility the same way and around the same time of day each time?'],
    options: [opt('meetfout', 'Zodat een verschil echt verandering is en geen meetfout', 'So a difference is real change, not measurement error'), opt('xp', 'Omdat je anders geen XP krijgt', 'Because otherwise you get no XP'), opt('norm', 'Om je te vergelijken met de norm voor je leeftijd', 'To compare yourself with the norm for your age'), opt('sneller', 'Omdat je dan sneller soepeler wordt', 'Because then you get supple faster')],
    answer: 'meetfout',
    explain: ['Je bent in de ochtend vaak stijver dan na een wandeling, en een andere voetstand geeft al snel een paar centimeter verschil. Meet je steeds hetzelfde, dan zegt een verschil iets over jou.', 'You are often stiffer in the morning than after a walk, and a different foot position soon makes a few centimetres of difference. Measure the same way each time and a difference tells you something about yourself.'],
  },
  {
    id: 'l2:pes_anserinus', level: 2, muscle: 'gracilis', nerve: null,
    q: ['Welke spier hoort níet bij de pes anserinus (binnenkant knie)?', 'Which muscle is not part of the pes anserinus (inner knee)?'],
    options: [opt('sartorius', 'Kleermakersspier (m. sartorius)', 'Sartorius'), opt('bf', 'M. biceps femoris', 'Biceps femoris'), opt('gracilis', 'Slanke spier (m. gracilis)', 'Gracilis'), opt('st', 'M. semitendinosus', 'Semitendinosus')],
    answer: 'bf',
    explain: ['De pes anserinus is de gezamenlijke aanhechting van sartorius, gracilis en semitendinosus aan de binnenkant van de knie. De biceps femoris hecht aan de buitenkant aan.', 'The pes anserinus is the shared attachment of sartorius, gracilis and semitendinosus on the inner knee. The biceps femoris attaches on the outside.'],
  },
  {
    id: 'l2:twee_gewrichten', level: 2, muscle: 'gastrocnemius', nerve: null,
    q: ['Welke spier loopt over twee gewrichten?', 'Which muscle crosses two joints?'],
    options: [opt('gastrocnemius', 'Tweelingkuitspier (knie én enkel)', 'Gastrocnemius'), opt('soleus', 'Scholspier', 'Soleus'), opt('brachialis', 'Opperarmspier', 'Brachialis'), opt('gluteus_medius', 'Middelste bilspier', 'Gluteus medius')],
    answer: 'gastrocnemius',
    explain: ['De gastrocnemius loopt over knie en enkel; daarom rek je hem met een gestrekte knie en de soleus met een gebogen knie.', 'The gastrocnemius crosses knee and ankle; that is why you stretch it with a straight knee and the soleus with a bent knee.'],
  },
  {
    id: 'l2:carpaal', level: 2, muscle: 'thenar', nerve: 'medianus',
    q: ['Welke zenuw raakt bekneld bij een carpaletunnelsyndroom?', 'Which nerve is compressed in carpal tunnel syndrome?'],
    options: [opt('medianus', 'n. medianus', 'median nerve'), opt('ulnaris', 'n. ulnaris', 'ulnar nerve'), opt('radialis', 'n. radialis', 'radial nerve'), opt('musculocutaneus', 'n. musculocutaneus', 'musculocutaneous nerve')],
    answer: 'medianus',
    explain: ['De n. medianus loopt door de carpale tunnel in de pols. Klachten zitten vaak in duim, wijs- en middelvinger.', 'The median nerve runs through the carpal tunnel in the wrist. Symptoms are often in the thumb, index and middle finger.'],
  },
  {
    id: 'l2:radialis_uitval', level: 2, muscle: 'polsstrekkers', nerve: 'radialis',
    q: ['Welke beweging wordt moeilijk als de n. radialis niet goed werkt?', 'Which movement becomes hard when the radial nerve does not work well?'],
    options: [opt('pols_strekken', 'Pols en vingers strekken (hand omhoog)', 'Extending the wrist and fingers (hand up)'), opt('opponeren', 'Duim tegenover de vingers zetten', 'Bringing the thumb opposite the fingers'), opt('spreiden', 'Vingers spreiden', 'Spreading the fingers'), opt('schouder_op', 'Schouders optrekken', 'Shrugging the shoulders')],
    answer: 'pols_strekken',
    explain: ['De n. radialis stuurt de pols- en vingerstrekkers aan. Bij uitval hangt de hand slap naar beneden ("dropping hand").', 'The radial nerve drives the wrist and finger extensors. When it fails, the hand hangs down ("wrist drop").'],
  },
  {
    id: 'l2:telefoonbotje', level: 2, muscle: 'ulnaire_handspieren', nerve: 'ulnaris',
    q: ['Welke zenuw voel je als je je "telefoonbotje" bij de elleboog stoot?', 'Which nerve do you feel when you hit your "funny bone" at the elbow?'],
    options: [opt('ulnaris', 'n. ulnaris', 'ulnar nerve'), opt('medianus', 'n. medianus', 'median nerve'), opt('radialis', 'n. radialis', 'radial nerve'), opt('axillaris', 'n. axillaris', 'axillary nerve')],
    answer: 'ulnaris',
    explain: ['De n. ulnaris loopt vlak onder de huid aan de binnenkant van de elleboog; daarom tintelt je pinkzijde als je hem stoot.', 'The ulnar nerve runs just under the skin on the inner elbow; that is why your little-finger side tingles when you hit it.'],
  },
  {
    id: 'l2:klapvoet', level: 2, muscle: 'tibialis_anterior', nerve: 'fibularis',
    q: ['Bij uitval van de n. fibularis (peroneus) wordt vooral moeilijk:', 'When the fibular (peroneal) nerve fails, what mainly becomes hard?'],
    options: [opt('optrekken', 'De voet optrekken (klapvoet)', 'Lifting the foot (foot drop)'), opt('tenen_staan', 'Op de tenen staan', 'Standing on the toes'), opt('knie_strekken', 'De knie strekken', 'Straightening the knee'), opt('heup_buigen', 'De heup buigen', 'Bending the hip')],
    answer: 'optrekken',
    explain: ['De n. fibularis stuurt de voetheffers aan, zoals de tibialis anterior. Bij uitval sleept of klapt de voorvoet bij het lopen.', 'The fibular nerve drives the foot lifters such as tibialis anterior. When it fails, the forefoot drags or slaps when walking.'],
  },
  {
    id: 'l2:rotator_cuff', level: 2, muscle: 'supraspinatus', nerve: null,
    q: ['Welke spier hoort níet bij de rotator cuff?', 'Which muscle is not part of the rotator cuff?'],
    options: [opt('deltoideus', 'Deltaspier', 'Deltoid'), opt('supraspinatus', 'Bovengratspier', 'Supraspinatus'), opt('infraspinatus', 'Ondergratspier', 'Infraspinatus'), opt('subscapularis', 'Onderschouderbladspier', 'Subscapularis')],
    answer: 'deltoideus',
    explain: ['De rotator cuff bestaat uit supraspinatus, infraspinatus, teres minor en subscapularis. Ze houden de schouderkop in de kom; de deltaspier ligt eroverheen.', 'The rotator cuff is supraspinatus, infraspinatus, teres minor and subscapularis. They keep the shoulder head in its socket; the deltoid lies over them.'],
  },
  {
    id: 'l2:quadriceps_koppen', level: 2, muscle: 'quadriceps', nerve: null,
    q: ['Uit hoeveel spierkoppen bestaat de quadriceps?', 'How many heads does the quadriceps have?'],
    options: [opt('4', 'Vier', 'Four'), opt('2', 'Twee', 'Two'), opt('3', 'Drie', 'Three'), opt('5', 'Vijf', 'Five')],
    answer: '4',
    explain: ['Vier: rectus femoris, vastus lateralis, vastus medialis en vastus intermedius. Alleen de rectus femoris loopt ook over de heup.', 'Four: rectus femoris, vastus lateralis, vastus medialis and vastus intermedius. Only the rectus femoris also crosses the hip.'],
  },
];

/** Level 2 is open when enough of level 1 is answered right. */
export function level2Open(correct: readonly string[]): boolean {
  const l1 = quizQuestions().filter((q) => q.level === 1);
  const done = l1.filter((q) => correct.includes(q.id)).length;
  return done >= Math.ceil(l1.length * LEVEL2_UNLOCK);
}

export const questionById = (() => {
  let cache: Map<string, QuizQuestion> | null = null;
  return (id: string) => {
    cache ??= new Map(quizQuestions().map((q) => [q.id, q]));
    return cache.get(id) ?? null;
  };
})();

/** XP from right answers in the order given (oldest first): by level, at most QUIZ_DAILY_CAP per day. */
export function quizXp(answers: readonly { day: string; questionId: string }[]): number {
  const perDay = new Map<string, number>();
  let xp = 0;
  for (const a of answers) {
    const n = perDay.get(a.day) ?? 0;
    if (n >= QUIZ_DAILY_CAP) continue;
    perDay.set(a.day, n + 1);
    xp += QUIZ_LEVEL_XP[questionById(a.questionId)?.level ?? 1];
  }
  return xp;
}
