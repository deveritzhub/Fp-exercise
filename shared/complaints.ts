/**
 * Complaint guide ("klachtwijzer") for therapists: regions → complaints → a card with the kinetic
 * chain, compensation patterns to check (each with a quick test), red flags and an exercise
 * proposal built from the practice library via the muscle atlas. See docs/KLACHTWIJZER.md.
 *
 * Compensation patterns are clinical reasoning models: useful as a hypothesis to test, rarely the
 * only cause. The therapist decides; nothing here is a diagnosis. Own texts, to be reviewed.
 */
import type { MobilityTestKey } from './mobilityTests';
import { MUSCLES } from './muscleAtlas';

type Fn = readonly [nl: string, en: string];

export type RegionKey = 'nek' | 'schouder' | 'elleboog_pols' | 'bovenrug' | 'lage_rug' | 'heup' | 'knie' | 'enkel_voet';
export type ChainKey = 'lateraal_heup' | 'achter' | 'voor_romp' | 'schoudergordel' | 'nek_schouderblad' | 'arm_grijp';

export const REGIONS: readonly { key: RegionKey; name: Fn; redFlags: readonly Fn[] }[] = [
  { key: 'nek', name: ['Nek', 'Neck'], redFlags: [
    ['Toenemende krachtsvermindering of gevoelsverlies in arm of been', 'Increasing weakness or loss of feeling in arm or leg'],
    ['Na een ongeval: ernstige pijn, gevoelloosheid of niet durven bewegen', 'After an accident: severe pain, numbness or not daring to move'],
    ['Duizeligheid, dubbelzien, moeite met slikken of praten', 'Dizziness, double vision, trouble swallowing or speaking'],
    ['Onhandig lopen of onhandige handen (fijne motoriek)', 'Clumsy walking or clumsy hands (fine motor skills)'],
    ['Koorts, onverklaard gewichtsverlies of kanker in de voorgeschiedenis', 'Fever, unexplained weight loss or a history of cancer'],
  ] },
  { key: 'schouder', name: ['Schouder', 'Shoulder'], redFlags: [
    ['Na een val: arm niet meer kunnen heffen (mogelijke scheur of luxatie)', 'After a fall: unable to lift the arm (possible tear or dislocation)'],
    ['Rood, warm, gezwollen gewricht of koorts', 'Red, warm, swollen joint or fever'],
    ['Pijn met kortademigheid of druk op de borst', 'Pain with shortness of breath or chest pressure'],
    ['Een zwelling of knobbel die groeit', 'A lump or swelling that grows'],
  ] },
  { key: 'elleboog_pols', name: ['Elleboog en pols', 'Elbow and wrist'], redFlags: [
    ['Duidelijk minder kracht of dunner wordende duimmuis', 'Clearly less strength or a wasting thumb pad'],
    ['Na een val: zwelling en niet kunnen belasten (mogelijke breuk)', 'After a fall: swelling and unable to load (possible fracture)'],
    ['Rood, warm, gezwollen gewricht of koorts', 'Red, warm, swollen joint or fever'],
  ] },
  { key: 'bovenrug', name: ['Bovenrug', 'Upper back'], redFlags: [
    ['Pijn op de borst bij inspanning of kortademigheid', 'Chest pain on exertion or shortness of breath'],
    ['Nachtpijn die niet verandert met houding', 'Night pain that does not change with position'],
    ['Onverklaard gewichtsverlies, koorts of kanker in de voorgeschiedenis', 'Unexplained weight loss, fever or a history of cancer'],
    ['Na een val of bij botontkalking: plotselinge pijn (mogelijke inzakkingsbreuk)', 'After a fall or with osteoporosis: sudden pain (possible compression fracture)'],
  ] },
  { key: 'lage_rug', name: ['Lage rug en bekken', 'Low back and pelvis'], redFlags: [
    ['Gevoelloosheid rond het zitvlak of de schaamstreek, of problemen met plassen of ontlasting (direct naar arts)', 'Numbness around the buttocks or genitals, or trouble passing urine or stool (see a doctor at once)'],
    ['Toenemende krachtsvermindering in een been', 'Increasing weakness in a leg'],
    ['Na een val of bij botontkalking: plotselinge hevige pijn', 'After a fall or with osteoporosis: sudden severe pain'],
    ['Koorts, onverklaard gewichtsverlies, kanker in de voorgeschiedenis of nachtpijn', 'Fever, unexplained weight loss, a history of cancer or night pain'],
  ] },
  { key: 'heup', name: ['Heup en lies', 'Hip and groin'], redFlags: [
    ['Kind of jongere die mank loopt of liespijn heeft (mogelijke heupaandoening)', 'A child or teenager who limps or has groin pain (possible hip condition)'],
    ['Na een val bij een oudere: niet kunnen staan of lopen (mogelijke breuk)', 'After a fall in an older person: unable to stand or walk (possible fracture)'],
    ['Koorts of rood, warm gewricht', 'Fever or a red, warm joint'],
    ['Nachtpijn of onverklaard gewichtsverlies', 'Night pain or unexplained weight loss'],
  ] },
  { key: 'knie', name: ['Knie', 'Knee'], redFlags: [
    ['Na een ongeval: niet vier stappen kunnen lopen (mogelijke breuk)', 'After an injury: unable to walk four steps (possible fracture)'],
    ['Knie zit op slot of kan niet meer strekken', 'Knee locks or cannot straighten'],
    ['Rood, warm, gezwollen zonder ongeval, of koorts', 'Red, warm, swollen without an injury, or fever'],
    ['Gezwollen, pijnlijke kuit (mogelijke trombose)', 'Swollen, painful calf (possible thrombosis)'],
  ] },
  { key: 'enkel_voet', name: ['Onderbeen, enkel en voet', 'Lower leg, ankle and foot'], redFlags: [
    ['Na een verstuiking: niet vier stappen kunnen lopen of drukpijn op de botranden (mogelijke breuk)', 'After a sprain: unable to walk four steps or bone tenderness (possible fracture)'],
    ['Plotselinge knal in de kuit en niet op de tenen kunnen staan (mogelijke peesruptuur)', 'A sudden snap in the calf and unable to stand on tiptoe (possible tendon rupture)'],
    ['Gezwollen, warme, pijnlijke kuit (mogelijke trombose)', 'Swollen, warm, painful calf (possible thrombosis)'],
    ['Pijn die ook in rust en \'s nachts aanhoudt, of plekpijn op het bot bij hardlopers (mogelijke stressfractuur)', 'Pain that persists at rest and at night, or spot pain on the bone in runners (possible stress fracture)'],
  ] },
];

export const CHAINS: readonly { key: ChainKey; name: Fn; links: readonly string[]; what: Fn }[] = [
  { key: 'lateraal_heup', name: ['Laterale heupketen', 'Lateral hip chain'], links: ['voetspieren', 'tibialis_posterior', 'quadriceps', 'gluteus_medius', 'gluteus_minimus', 'tfl', 'adductoren'],
    what: ['Houdt bij staan op één been het bekken recht en de knie boven de voet. Werkt de heup niet goed mee, dan zakt de knie naar binnen en krijgen knie of buitenkant heup het zwaar.', 'Keeps the pelvis level and the knee over the foot when standing on one leg. If the hip does not work well, the knee drops inwards and the knee or outer hip takes the load.'] },
  { key: 'achter', name: ['Achterste keten', 'Posterior chain'], links: ['soleus', 'gastrocnemius', 'hamstrings', 'gluteus_maximus', 'erector_spinae', 'multifidus'],
    what: ['Duwt je vooruit en omhoog: afzetten, opstaan, tillen. Doet de bil te weinig, dan nemen hamstrings en lage rug het over.', 'Pushes you forward and up: push-off, standing up, lifting. If the buttock does too little, the hamstrings and low back take over.'] },
  { key: 'voor_romp', name: ['Voorste keten en romp', 'Anterior chain and trunk'], links: ['transversus', 'rectus_abdominis', 'obliqui', 'diafragma', 'iliopsoas', 'quadriceps'],
    what: ['Geeft de romp stevigheid zodat armen en benen kracht kunnen zetten. Zwakke diepe buikspieren laten de oppervlakkige rugspieren hard werken.', 'Gives the trunk stiffness so arms and legs can produce force. Weak deep abdominals make the superficial back muscles work hard.'] },
  { key: 'schoudergordel', name: ['Schoudergordel', 'Shoulder girdle'], links: ['serratus', 'trapezius', 'rhomboideus', 'supraspinatus', 'infraspinatus', 'teres_minor', 'subscapularis', 'deltoideus', 'pectoralis_minor'],
    what: ['Het schouderblad is de basis voor de arm. Draait het niet goed mee, dan raakt de schouder sneller overbelast bij heffen.', 'The shoulder blade is the base for the arm. If it does not rotate well, the shoulder is overloaded sooner when lifting the arm.'] },
  { key: 'nek_schouderblad', name: ['Nek en schouderblad', 'Neck and shoulder blade'], links: ['diepe_nekflexoren', 'scm', 'scalenus', 'levator_scapulae', 'trapezius', 'suboccipitaal'],
    what: ['De diepe nekspieren houden het hoofd in balans. Werken die weinig, dan doen oppervlakkige nek- en schouderspieren het werk en raken ze gespannen.', 'The deep neck muscles balance the head. If they work little, the superficial neck and shoulder muscles do the job and get tense.'] },
  { key: 'arm_grijp', name: ['Arm en grijpen', 'Arm and grip'], links: ['infraspinatus', 'biceps', 'triceps', 'polsstrekkers', 'polsbuigers', 'supinator', 'pronator'],
    what: ['Van schouder tot vingers: grijpen en tillen. Overbelasting zit vaak bij de pees aan de elleboog, terwijl schouder en pols mee moeten worden getraind.', 'From shoulder to fingers: gripping and lifting. Overload often sits in the tendon at the elbow, while shoulder and wrist need training too.'] },
];

export type Compensation = {
  key: string;
  name: Fn;
  chain: ChainKey;
  /** The weak or slow link (atlas muscle keys). */
  weak: readonly string[];
  /** What tends to take over (atlas muscle keys). */
  over: readonly string[];
  see: Fn;
  test: Fn;
  /** A mobility self-test that measures part of it. */
  mobilityTest?: MobilityTestKey;
  approach: Fn;
  cue: Fn;
  adjust: Fn;
  /** Words in exercise names that fit the approach best (ranked first in the proposal). */
  prefer: readonly string[];
  /** Words in exercise names that work against it for now (left out of the proposal). */
  avoid?: readonly string[];
  /** One plain sentence for the patient ("why this exercise"). */
  patientWhy: Fn;
};

export const COMPENSATIONS: readonly Compensation[] = [
  {
    key: 'tfl_gmed', name: ['TFL-overuse bij zwakke gluteus medius', 'TFL overuse with a weak gluteus medius'], chain: 'lateraal_heup',
    weak: ['gluteus_medius', 'gluteus_minimus'], over: ['tfl'],
    see: ['Bekken zakt aan de andere kant bij staan op één been, knie gaat naar binnen bij éénbenig buigen, pijn aan de buitenkant van heup of knie.', 'The pelvis drops on the other side in single-leg stance, the knee goes in on a single-leg squat, pain on the outside of hip or knee.'],
    test: ['Trendelenburg (30 s op één been). Zijlig heupabductie: buigt of draait de heup naar binnen tijdens het heffen, dan doet de TFL het werk.', 'Trendelenburg (30 s on one leg). Side-lying hip abduction: if the hip flexes or turns in while lifting, the TFL is doing the work.'],
    approach: ['Eerst de gluteus medius laten werken met de heup licht gestrekt en naar buiten gedraaid (zijlig abductie met de hiel voorop, clamshell, zijplank). Daarna functioneel: step-down en éénbenig staan met de knie boven de voet.', 'First get the gluteus medius working with the hip slightly extended and turned out (side-lying abduction leading with the heel, clamshell, side plank). Then functional: step-down and single-leg stance with the knee over the foot.'],
    cue: ['"Hiel iets naar achter en omhoog, tenen niet naar het plafond."', '"Heel slightly back and up, toes not towards the ceiling."'],
    adjust: ['Abductie met de heup gebogen (zittend, of met de tenen omhoog) laat juist de TFL werken; die even vermijden of aanpassen.', 'Abduction with the hip flexed (seated, or with the toes up) mainly works the TFL; avoid or adapt it for now.'],
    prefer: ['clam', 'zijlig', 'zijplank', 'side plank', 'abductie', 'step-down', 'step down', 'monster', 'éénbenig', 'eenbenig'],
    avoid: ['abductie machine', 'heupabductie machine', 'zittende abductie'],
    patientWhy: ['Deze oefening maakt je middelste bilspier sterker, zodat de spier aan de voorkant van je heup (TFL) minder hoeft over te nemen en je knie beter boven je voet blijft.', 'This exercise strengthens your middle buttock muscle, so the muscle at the front of your hip (TFL) has to take over less and your knee stays over your foot better.'],
  },
  {
    key: 'gmax_hamstring', name: ['Hamstrings en lage rug nemen de bil over', 'Hamstrings and low back take over from the glutes'], chain: 'achter',
    weak: ['gluteus_maximus'], over: ['hamstrings', 'erector_spinae'],
    see: ['Kramp in de hamstrings bij een bridge, holle onderrug bij heupstrekken, terugkerende hamstringklachten.', 'Hamstring cramp in a bridge, arched low back on hip extension, recurring hamstring complaints.'],
    test: ['Bridge: voel je het vooral in de hamstrings of de rug? Buiklig been heffen: begint de beweging in de rug?', 'Bridge: do you feel it mostly in the hamstrings or back? Prone leg lift: does the movement start in the back?'],
    approach: ['Bridge met de voeten dichter bij de billen (hamstrings werken dan minder), heup-hinge met een neutrale rug, daarna éénbenige bridge en deadlift-varianten.', 'Bridge with the feet closer to the buttocks (hamstrings work less), hip hinge with a neutral back, then single-leg bridge and deadlift variations.'],
    cue: ['"Eerst je billen aanspannen, dan pas omhoog. Ribben omlaag."', '"Squeeze your buttocks first, then lift. Ribs down."'],
    adjust: ['Bij kramp: voeten dichterbij en minder hoog; zware hamstringoefeningen pas als de bil goed meedoet.', 'With cramp: feet closer and less high; heavy hamstring work only once the glutes join in.'],
    prefer: ['bridge', 'brug', 'hinge', 'deadlift', 'hip thrust', 'heupstrek'],
    patientWhy: ['Deze oefening traint je grote bilspier, zodat je hamstrings en onderrug niet al het werk hoeven te doen.', 'This exercise trains your big buttock muscle, so your hamstrings and low back do not have to do all the work.'],
  },
  {
    key: 'psoas_lordose', name: ['Holle rug door stugge heupbuigers', 'Arched back from stiff hip flexors'], chain: 'voor_romp',
    weak: ['transversus', 'rectus_abdominis', 'gluteus_maximus'], over: ['iliopsoas', 'erector_spinae'],
    see: ['Bekken kantelt voorover bij staan, lage rug wordt moe bij lang staan of lopen, heup strekt weinig bij lopen.', 'The pelvis tilts forward in standing, the low back tires with long standing or walking, little hip extension when walking.'],
    test: ['Thomas-test: blijft het gestrekte been boven de tafel, dan zijn de heupbuigers stug.', 'Thomas test: if the straight leg stays above the table, the hip flexors are stiff.'],
    approach: ['Heupbuiger rekken in halve kniezit met het bekken recht (staartbeen omlaag), dan dead bug en bridge om de nieuwe ruimte te gebruiken.', 'Stretch the hip flexors in half-kneeling with the pelvis level (tailbone down), then dead bug and bridge to use the new range.'],
    cue: ['"Staartbeen omlaag, alsof je je riem omhoog trekt."', '"Tailbone down, as if pulling your belt up."'],
    adjust: ['Rekken zonder bekkencorrectie trekt vooral aan de lage rug; eerst het bekken recht.', 'Stretching without correcting the pelvis mainly pulls on the low back; level the pelvis first.'],
    prefer: ['heupbuiger', 'hip flexor', 'kniezit', 'dead bug', 'bridge', 'brug'],
    patientWhy: ['Deze oefening geeft je heupbuigers meer ruimte en leert je buik en billen het bekken recht te houden, zodat je onderrug minder hol trekt.', 'This exercise gives your hip flexors more room and teaches your belly and buttocks to keep the pelvis level, so your low back arches less.'],
  },
  {
    key: 'core_rug', name: ['Oppervlakkige rugspieren nemen de diepe buik over', 'Superficial back muscles take over from the deep core'], chain: 'voor_romp',
    weak: ['transversus', 'multifidus', 'diafragma'], over: ['erector_spinae', 'obliqui'],
    see: ['Stijf "op slot" bewegen, adem vasthouden bij inspanning, rugpijn bij kleine bewegingen.', 'Moving stiffly "locked", holding the breath on effort, back pain with small movements.'],
    test: ['Ruglig: rustig uitademen en de onderbuik licht intrekken zonder de rug plat te duwen of de adem vast te houden.', 'Supine: breathe out slowly and draw in the lower belly lightly without pressing the back flat or holding the breath.'],
    approach: ['Ademhaling met lichte buikspanning, dan dead bug en bird dog met rustige ademhaling, daarna belasten (dragen, tillen).', 'Breathing with light abdominal tension, then dead bug and bird dog with calm breathing, then loading (carrying, lifting).'],
    cue: ['"Blijf doorademen, spanning op 3 van de 10."', '"Keep breathing, tension at 3 out of 10."'],
    adjust: ['Niet alles aanspannen bij elke beweging: doel is soepel kunnen bewegen, niet vastzetten.', 'Do not brace for every movement: the goal is moving freely, not locking up.'],
    prefer: ['dead bug', 'bird dog', 'ademhaling', 'breath', 'plank', 'pallof', 'farmer'],
    patientWhy: ['Deze oefening leert je diepe buikspieren je rug te steunen, zodat je rugspieren zich kunnen ontspannen en je soepeler beweegt.', 'This exercise teaches your deep abdominal muscles to support your back, so your back muscles can relax and you move more freely.'],
  },
  {
    key: 'dnf_scm', name: ['Hoofd naar voren: oppervlakkige nekspieren nemen over', 'Forward head: superficial neck muscles take over'], chain: 'nek_schouderblad',
    weak: ['diepe_nekflexoren'], over: ['scm', 'scalenus', 'suboccipitaal'],
    see: ['Kin steekt naar voren, voelbare spieren aan de voorkant van de nek bij knikken, hoofdpijn vanuit de nek.', 'The chin pokes forward, front-of-neck muscles stand out when nodding, headache from the neck.'],
    test: ['Kin-intrekken in ruglig 10 seconden vasthouden zonder dat de voorste nekspieren aanspannen of de kin omhoog gaat.', 'Hold a chin tuck lying on your back for 10 seconds without the front neck muscles tensing or the chin lifting.'],
    approach: ['Kin-intrekken (knikken) in ruglig, opbouwen naar zit en tijdens werk, daarna houdingsuithouding met schouderbladoefeningen.', 'Chin tucks (nodding) lying down, building up to sitting and at work, then postural endurance with shoulder blade exercises.'],
    cue: ['"Knik ja, heel klein, alsof je een dubbele kin maakt."', '"Nod yes, very small, as if making a double chin."'],
    adjust: ['Grote nekbuigingen of zware nekoefeningen vermijden tot het kleine knikken goed lukt.', 'Avoid big neck curls or heavy neck work until the small nod is controlled.'],
    prefer: ['kin', 'chin', 'nek', 'neck', 'knik'],
    patientWhy: ['Deze oefening traint de diepe spieren die je hoofd in balans houden, zodat je nek- en schouderspieren minder gespannen raken.', 'This exercise trains the deep muscles that balance your head, so your neck and shoulder muscles get less tense.'],
  },
  {
    key: 'uppertrap', name: ['Schouder naar het oor: bovenste trapezius neemt over', 'Shoulder to the ear: upper trapezius takes over'], chain: 'schoudergordel',
    weak: ['serratus', 'rhomboideus'], over: ['trapezius', 'levator_scapulae'],
    see: ['Schouderblad gaat mee omhoog bij arm heffen, gespannen bovenkant van de schouders, pijn bij werken boven het hoofd.', 'The shoulder blade rises when lifting the arm, tense tops of the shoulders, pain working overhead.'],
    test: ['Arm heffen voor de spiegel: schiet de schouder naar het oor of komt het schouderblad los van de romp?', 'Lift the arm in front of a mirror: does the shoulder hike to the ear or the shoulder blade lift off the trunk?'],
    approach: ['Onderste trapezius en serratus activeren (buiklig Y en T, wall slide met de onderarmen tegen de muur, push-up plus), daarna heffen met controle.', 'Activate lower trapezius and serratus (prone Y and T, forearm wall slide, push-up plus), then lift with control.'],
    cue: ['"Schouders laag en breed, schouderbladen in je achterzak."', '"Shoulders low and wide, shoulder blades into your back pockets."'],
    adjust: ['Schouders ophalen (shrugs) en zwaar boven het hoofd drukken even beperken.', 'Limit shrugs and heavy overhead pressing for now.'],
    prefer: ['wall slide', 'serratus', 'push-up plus', 'buiklig y', 'buiklig', 'roeien', 'row', 'schouderblad'],
    avoid: ['shrug', 'schouders ophalen'],
    patientWhy: ['Deze oefening traint de spieren die je schouderblad goed laten meedraaien, zodat de bovenkant van je schouder ontspant en je arm makkelijker omhoog gaat.', 'This exercise trains the muscles that let your shoulder blade rotate well, so the top of your shoulder relaxes and your arm lifts more easily.'],
  },
  {
    key: 'cuff_deltoid', name: ['Rotator cuff te zwak: de deltaspier trekt de kop omhoog', 'Weak rotator cuff: the deltoid pulls the head up'], chain: 'schoudergordel',
    weak: ['infraspinatus', 'teres_minor', 'supraspinatus', 'subscapularis'], over: ['deltoideus'],
    see: ['Pijn bij arm heffen tussen schouderhoogte en half omhoog, pijn bij liggen op de schouder.', 'Pain lifting the arm between halfway and shoulder height, pain lying on the shoulder.'],
    test: ['Exorotatie tegen weerstand met de elleboog langs het lichaam; pijnlijke boog bij heffen.', 'External rotation against resistance with the elbow at the side; painful arc on lifting.'],
    approach: ['Isometrie bij pijn, dan exorotatie met elastiek, daarna heffen in het vlak van het schouderblad en boven het hoofd.', 'Isometrics when painful, then external rotation with a band, then lifting in the plane of the shoulder blade and overhead.'],
    cue: ['"Elleboog tegen je zij, handdoekje ertussen, draai alleen de onderarm naar buiten."', '"Elbow against your side, a towel in between, only turn the forearm out."'],
    adjust: ['Zwaar heffen boven het hoofd en pijnlijke eindstanden tijdelijk vermijden; pijn tot 3–4 van 10 is meestal acceptabel.', 'Avoid heavy overhead lifting and painful end ranges for a while; pain up to 3–4 out of 10 is usually acceptable.'],
    prefer: ['exorotatie', 'external rotation', 'isometr', 'rotator', 'scaptie', 'scaption'],
    patientWhy: ['Deze oefening maakt de kleine spieren rond je schouder sterker, zodat ze de kop van je bovenarm goed op zijn plek houden en heffen minder pijn doet.', 'This exercise strengthens the small muscles around your shoulder, so they keep the head of your upper arm in place and lifting hurts less.'],
  },
  {
    key: 'enkel_beperkt', name: ['Beperkte enkel: knie en voet compenseren', 'Stiff ankle: knee and foot compensate'], chain: 'achter',
    weak: ['soleus', 'gastrocnemius'], over: ['quadriceps', 'tibialis_anterior'],
    see: ['Knie naar binnen of hielen omhoog bij squatten, voet rolt in, klachten aan knie of achillespees.', 'The knee goes in or heels lift when squatting, the foot rolls in, knee or Achilles complaints.'],
    test: ['Knie-tot-muur-test, links en rechts vergelijken.', 'Knee-to-wall test, compare left and right.'], mobilityTest: 'knee_to_wall',
    approach: ['Kuit en soleus rekken met gebogen knie, enkelmobilisatie met de knie richting muur, daarna squat met hielen aan de grond.', 'Stretch calf and soleus with a bent knee, mobilise the ankle with the knee towards a wall, then squat with heels down.'],
    cue: ['"Knie over de tweede teen naar voren, hiel blijft liggen."', '"Knee forward over the second toe, heel stays down."'],
    adjust: ['Squatten met een verhoging onder de hielen mag tijdelijk, terwijl de enkelmobiliteit beter wordt.', 'Squatting with a lift under the heels is fine for a while, as ankle mobility improves.'],
    prefer: ['kuit', 'calf', 'soleus', 'enkel', 'ankle', 'knie naar muur', 'knee to wall', 'squat'],
    patientWhy: ['Deze oefening maakt je enkel beweeglijker, zodat je knie en voet niet hoeven te compenseren als je buigt of squat.', 'This exercise makes your ankle more mobile, so your knee and foot do not have to compensate when you bend or squat.'],
  },
  {
    key: 'voetboog', name: ['Zakkende voetboog', 'Collapsing arch'], chain: 'lateraal_heup',
    weak: ['tibialis_posterior', 'voetspieren'], over: ['peronei'],
    see: ['Voetboog zakt bij staan of landen, knie draait naar binnen, pijn aan de binnenkant van de enkel of voetzool.', 'The arch drops when standing or landing, the knee turns in, pain at the inner ankle or sole.'],
    test: ['Éénbenige hielheffing: komt de hiel recht omhoog (licht naar binnen) en lukt 15–20 keer?', 'Single-leg heel raise: does the heel rise straight (slightly in) and can you do 15–20?'],
    approach: ['Voetboog actief maken (short foot), hielheffing met een balletje tussen de hielen, daarna éénbenige balans en landen.', 'Activate the arch (short foot), heel raises with a ball between the heels, then single-leg balance and landing.'],
    cue: ['"Maak je voet korter zonder je tenen te krullen."', '"Shorten your foot without curling your toes."'],
    adjust: ['Veel springen of hardlopen even afbouwen tot de hielheffing goed gaat.', 'Reduce jumping or running for a while until the heel raise is controlled.'],
    prefer: ['short foot', 'voetboog', 'hielheff', 'heel raise', 'calf raise', 'teen', 'balans', 'balance'],
    patientWhy: ['Deze oefening traint de spieren die je voetboog dragen, zodat je voet en knie beter uitgelijnd blijven.', 'This exercise trains the muscles that hold your arch, so your foot and knee stay better aligned.'],
  },
  {
    key: 'quad_heup', name: ['Zwakke quadriceps: heup en romp nemen over', 'Weak quadriceps: hip and trunk take over'], chain: 'voor_romp',
    weak: ['quadriceps'], over: ['gluteus_maximus', 'erector_spinae'],
    see: ['Romp gaat ver voorover bij opstaan of traplopen, het andere been neemt het over, knie wordt niet helemaal gestrekt.', 'The trunk leans far forward when standing up or on stairs, the other leg takes over, the knee does not fully straighten.'],
    test: ['Éénbenig opstaan van een stoel en langzaam step-down: links en rechts vergelijken.', 'Single-leg sit-to-stand and slow step-down: compare left and right.'],
    approach: ['Quadriceps aanzetten (statisch, terminal knee extension), dan squat en step-down met de romp rechtop, daarna éénbenig en sneller.', 'Switch on the quadriceps (static, terminal knee extension), then squat and step-down with an upright trunk, then single-leg and faster.'],
    cue: ['"Borst omhoog, knie mag over de tenen, duw de vloer weg."', '"Chest up, the knee may go over the toes, push the floor away."'],
    adjust: ['Alleen heupdominante oefeningen (bridge, deadlift) houden het probleem in stand; de knie moet ook buigen onder belasting.', 'Only hip-dominant exercises (bridge, deadlift) keep the problem going; the knee needs to bend under load too.'],
    prefer: ['quadriceps', 'quad', 'step-down', 'step down', 'squat', 'kniebuig', 'uitval', 'lunge', 'leg extension', 'wall sit', 'muurzit'],
    patientWhy: ['Deze oefening maakt je bovenbeen sterker, zodat je knie het werk weer zelf doet en je heup en rug minder hoeven te compenseren.', 'This exercise strengthens your thigh, so your knee does the work itself again and your hip and back compensate less.'],
  },
  {
    key: 'bovenrug_stijf', name: ['Stijve bovenrug: nek en schouder compenseren', 'Stiff upper back: neck and shoulder compensate'], chain: 'nek_schouderblad',
    weak: ['rhomboideus', 'trapezius'], over: ['levator_scapulae', 'erector_spinae'],
    see: ['Holle lage rug of schouderpijn bij reiken boven het hoofd, ronde bovenrug, nekklachten bij beeldschermwerk.', 'An arched low back or shoulder pain when reaching overhead, a rounded upper back, neck complaints at a screen.'],
    test: ['Zittende romprotatie met de armen gekruist, links en rechts vergelijken; armen boven het hoofd tegen de muur zonder holle rug.', 'Seated trunk rotation with arms crossed, compare left and right; arms overhead against a wall without an arched back.'],
    approach: ['Bovenrug strekken en draaien (open book, over een rol), daarna roeien en wall slides om de nieuwe ruimte te gebruiken.', 'Extend and rotate the upper back (open book, over a roller), then rows and wall slides to use the new range.'],
    cue: ['"Draai vanuit je borstbeen, je bekken blijft stil."', '"Turn from your breastbone, your pelvis stays still."'],
    adjust: ['Bij reiken boven het hoofd niet compenseren met een holle rug; ribben omlaag.', 'Do not compensate overhead with an arched back; ribs down.'],
    prefer: ['thoracaal', 'thoracic', 'open book', 'bovenrug', 'rotatie', 'rotation', 'roeien', 'row', 'wall slide'],
    patientWhy: ['Deze oefening maakt je bovenrug beweeglijker, zodat je nek en schouders niet hoeven te compenseren als je reikt of draait.', 'This exercise makes your upper back more mobile, so your neck and shoulders do not have to compensate when you reach or turn.'],
  },
  {
    key: 'heup_rug', name: ['Beperkte heup: de lage rug beweegt mee', 'Stiff hip: the low back moves instead'], chain: 'achter',
    weak: ['exorotatoren', 'gluteus_maximus'], over: ['erector_spinae', 'quadratus_lumborum'],
    see: ['De lage rug draait of strekt mee bij lopen, draaien of bukken; rugklachten bij sporten met draaien (golf, tennis).', 'The low back twists or extends when walking, turning or bending; back complaints in rotational sports (golf, tennis).'],
    test: ['Heup-endorotatie in zit, links en rechts vergelijken; heup-hinge zonder dat de rug buigt.', 'Seated hip internal rotation, compare left and right; a hip hinge without the back bending.'],
    approach: ['Heupmobiliteit (90/90, endorotatie), dan heup-hinge en rotatie vanuit de heup met een stille romp.', 'Hip mobility (90/90, internal rotation), then hip hinge and rotation from the hip with a still trunk.'],
    cue: ['"Draai vanuit je heup, je navel blijft naar voren wijzen."', '"Turn from your hip, your belly button keeps facing forward."'],
    adjust: ['Rugrotatie-oefeningen pas uitbreiden als de heup meer beweegt.', 'Only expand back rotation exercises once the hip moves more.'],
    prefer: ['90/90', 'heup', 'hip', 'endorotatie', 'internal rotation', 'hinge', 'piriformis'],
    patientWhy: ['Deze oefening maakt je heup beweeglijker, zodat je onderrug niet steeds hoeft mee te draaien.', 'This exercise makes your hip more mobile, so your low back does not have to keep twisting along.'],
  },
  {
    key: 'adductor_lies', name: ['Lies: adductoren te zwak voor de belasting', 'Groin: adductors too weak for the load'], chain: 'lateraal_heup',
    weak: ['adductoren', 'gracilis', 'pectineus'], over: ['iliopsoas', 'rectus_abdominis'],
    see: ['Pijn in de lies bij sprinten, schieten of zijwaarts bewegen; minder kracht bij knijpen.', 'Groin pain when sprinting, kicking or moving sideways; less strength when squeezing.'],
    test: ['Knijptest met een bal tussen de knieën (pijn en kracht, links en rechts).', 'Squeeze test with a ball between the knees (pain and strength, left and right).'],
    approach: ['Isometrisch knijpen, dan Copenhagen-progressie (van korte naar lange hefboom), daarna sportspecifiek zijwaarts.', 'Isometric squeezing, then a Copenhagen progression (short to long lever), then sport-specific lateral work.'],
    cue: ['"Bekken recht, rustig opbouwen; pijn tot 3–4 van 10 is meestal acceptabel."', '"Pelvis level, build up slowly; pain up to 3–4 out of 10 is usually acceptable."'],
    adjust: ['Diepe zijwaartse uitvallen en schieten even afbouwen.', 'Reduce deep lateral lunges and kicking for a while.'],
    prefer: ['copenhagen', 'adductor', 'adductie', 'knijp', 'squeeze', 'zijwaarts', 'lateral'],
    patientWhy: ['Deze oefening maakt de spieren aan de binnenkant van je bovenbeen sterker, zodat je lies de belasting van sport weer aankan.', 'This exercise strengthens the muscles on the inside of your thigh, so your groin can handle the load of sport again.'],
  },
];

export type Complaint = {
  key: string;
  region: RegionKey;
  name: Fn;
  synonyms: readonly string[];
  what: Fn;
  chains: readonly ChainKey[];
  compensations: readonly string[];
  mobilityTests?: readonly MobilityTestKey[];
  /** Words in a practice programme title (template) that fit this complaint. */
  templateHint?: readonly string[];
  /** Extra muscles to train or calm, besides those of the compensations. */
  train?: readonly string[];
  calm?: readonly string[];
  /** Nerves with a slider that fits (radiating complaints). */
  nerves?: readonly string[];
  /** Words in exercise names to leave out for this complaint, and why (shown on the card). */
  avoid?: { words: readonly string[]; why: Fn; /** Stretches of these muscles are left out too. */ stretchMuscles?: readonly string[] };
};

export const COMPLAINTS: readonly Complaint[] = [
  // Neck
  { key: 'nekpijn', region: 'nek', name: ['Aspecifieke nekpijn', 'Non-specific neck pain'], synonyms: ['nek', 'stijve nek', 'neck pain'], what: ['Nekpijn zonder aanwijsbare oorzaak, vaak met spanning in nek en schouders.', 'Neck pain without an identifiable cause, often with tension in neck and shoulders.'], chains: ['nek_schouderblad', 'schoudergordel'], compensations: ['dnf_scm', 'uppertrap', 'bovenrug_stijf'], templateHint: ['nek'] },
  { key: 'nek_uitstraling', region: 'nek', name: ['Nek met uitstraling naar de arm', 'Neck pain radiating to the arm'], synonyms: ['cervicale radiculopathie', 'hernia nek', 'tintelingen arm'], what: ['Pijn, tintelingen of minder kracht in de arm vanuit een geprikkelde zenuwwortel in de nek.', 'Pain, tingling or weakness in the arm from an irritated nerve root in the neck.'], chains: ['nek_schouderblad'], compensations: ['dnf_scm', 'bovenrug_stijf'], templateHint: ['uitstraling naar de arm', 'nek'], nerves: ['medianus', 'radialis', 'ulnaris'] },
  { key: 'whiplash', region: 'nek', name: ['Whiplash', 'Whiplash'], synonyms: ['wad', 'kop-staartbotsing', 'whiplash associated disorder'], what: ['Nekklachten na een plotselinge beweging van het hoofd, bijvoorbeeld bij een aanrijding.', 'Neck complaints after a sudden head movement, for example in a car accident.'], chains: ['nek_schouderblad'], compensations: ['dnf_scm', 'uppertrap'] },
  { key: 'hoofdpijn_nek', region: 'nek', name: ['Hoofdpijn vanuit de nek', 'Headache from the neck'], synonyms: ['spanningshoofdpijn', 'cervicogene hoofdpijn', 'tension headache'], what: ['Hoofdpijn die vanuit de nek komt of door spanning in nek en schouders wordt verergerd.', 'Headache that comes from the neck or is made worse by tension in neck and shoulders.'], chains: ['nek_schouderblad'], compensations: ['dnf_scm', 'uppertrap'] },
  // Shoulder
  { key: 'saps', region: 'schouder', name: ['Subacromiaal pijnsyndroom', 'Subacromial pain syndrome'], synonyms: ['impingement', 'inklemming', 'schouderpijn bij heffen', 'saps'], what: ['Pijn aan de voorkant of zijkant van de schouder bij heffen, vaak door overbelasting van de rotator cuff.', 'Pain at the front or side of the shoulder when lifting, often from overload of the rotator cuff.'], chains: ['schoudergordel'], compensations: ['cuff_deltoid', 'uppertrap', 'bovenrug_stijf'], templateHint: ['subacromiaal', 'schouder'] },
  { key: 'frozen', region: 'schouder', name: ['Frozen shoulder', 'Frozen shoulder'], synonyms: ['capsulitis', 'adhesieve capsulitis', 'bevroren schouder'], what: ['Pijnlijke, steeds stijvere schouder in alle richtingen, vooral naar buiten draaien. Herstelt meestal langzaam vanzelf.', 'A painful, increasingly stiff shoulder in all directions, mostly turning out. Usually recovers slowly by itself.'], chains: ['schoudergordel'], compensations: ['uppertrap', 'bovenrug_stijf'], mobilityTests: ['back_scratch'], templateHint: ['schouder en bovenrug'] },
  { key: 'schouder_instabiel', region: 'schouder', name: ['Instabiele schouder', 'Unstable shoulder'], synonyms: ['luxatie', 'subluxatie', 'uit de kom', 'instabiliteit'], what: ['Gevoel dat de schouder uit de kom schiet of los zit, vaak na een luxatie of door losse banden.', 'A feeling that the shoulder slips out or is loose, often after a dislocation or from loose ligaments.'], chains: ['schoudergordel'], compensations: ['cuff_deltoid', 'uppertrap'] },
  { key: 'rotator_cuff', region: 'schouder', name: ['Rotator cuff-klachten (ook na operatie)', 'Rotator cuff complaints (also after surgery)'], synonyms: ['cuffruptuur', 'supraspinatus', 'peesscheur schouder', 'tendinopathie schouder'], what: ['Pijn of krachtverlies door een geïrriteerde of gescheurde pees van de rotator cuff. Na een operatie: volg het protocol van de chirurg.', 'Pain or weakness from an irritated or torn rotator cuff tendon. After surgery: follow the surgeon\'s protocol.'], chains: ['schoudergordel'], compensations: ['cuff_deltoid', 'uppertrap'], templateHint: ['rotator cuff'] },
  // Elbow and wrist
  { key: 'tennisarm', region: 'elleboog_pols', name: ['Tennisarm', 'Tennis elbow'], synonyms: ['laterale epicondylalgie', 'epicondylitis lateralis', 'muisarm'], what: ['Pijn aan de buitenkant van de elleboog bij grijpen en tillen, door overbelasting van de polsstrekkers.', 'Pain on the outside of the elbow when gripping and lifting, from overload of the wrist extensors.'], chains: ['arm_grijp', 'schoudergordel'], compensations: ['cuff_deltoid'], train: ['polsstrekkers', 'supinator'] },
  { key: 'golfersarm', region: 'elleboog_pols', name: ['Golfersarm', 'Golfer\'s elbow'], synonyms: ['mediale epicondylalgie', 'epicondylitis medialis'], what: ['Pijn aan de binnenkant van de elleboog bij grijpen en draaien, door overbelasting van de pols- en vingerbuigers.', 'Pain on the inside of the elbow when gripping and turning, from overload of the wrist and finger flexors.'], chains: ['arm_grijp'], compensations: ['cuff_deltoid'], train: ['polsbuigers', 'fcu', 'pronator'] },
  { key: 'cts', region: 'elleboog_pols', name: ['Carpaletunnelklachten', 'Carpal tunnel complaints'], synonyms: ['carpaletunnelsyndroom', 'cts', 'tintelende vingers', 'medianus'], what: ['Tintelingen of doof gevoel in duim, wijs- en middelvinger, vaak \'s nachts, door druk op de n. medianus in de pols.', 'Tingling or numbness in thumb, index and middle finger, often at night, from pressure on the median nerve at the wrist.'], chains: ['arm_grijp'], compensations: [], train: ['thenar'], nerves: ['medianus'] },
  // Upper back
  { key: 'bovenrug', region: 'bovenrug', name: ['Stijve bovenrug en houdingsklachten', 'Stiff upper back and postural complaints'], synonyms: ['thoracale klachten', 'ronde rug', 'beeldschermwerk', 'houding'], what: ['Stijfheid of pijn tussen de schouderbladen, vaak bij lang zitten; nek en schouders doen vaak mee.', 'Stiffness or pain between the shoulder blades, often with long sitting; neck and shoulders often join in.'], chains: ['nek_schouderblad', 'schoudergordel'], compensations: ['bovenrug_stijf', 'uppertrap', 'dnf_scm'], templateHint: ['bureaupauze', 'schouder en bovenrug'] },
  // Low back
  { key: 'lage_rugpijn', region: 'lage_rug', name: ['Aspecifieke lage rugpijn', 'Non-specific low back pain'], synonyms: ['lage rug', 'spit', 'lumbago', 'rugpijn'], what: ['Pijn in de lage rug zonder aanwijsbare oorzaak; bewegen en geleidelijk belasten helpen het meest.', 'Low back pain without an identifiable cause; moving and gradual loading help most.'], chains: ['voor_romp', 'achter'], compensations: ['core_rug', 'gmax_hamstring', 'heup_rug', 'psoas_lordose'], mobilityTests: ['fingertip_floor'], templateHint: ['heupen en onderrug', 'lage rug'] },
  { key: 'rug_uitstraling', region: 'lage_rug', name: ['Lage rug met uitstraling naar het been', 'Low back pain radiating to the leg'], synonyms: ['ischias', 'hernia', 'radiculair syndroom', 'lumbosacraal radiculair'], what: ['Pijn of tintelingen in het been vanuit een geprikkelde zenuwwortel in de lage rug.', 'Pain or tingling in the leg from an irritated nerve root in the low back.'], chains: ['achter', 'voor_romp'], compensations: ['core_rug', 'gmax_hamstring'], templateHint: ['uitstraling naar het been', 'lage rug'], nerves: ['ischiadicus', 'femoralis'] },
  { key: 'bekkenpijn', region: 'lage_rug', name: ['Bekkenpijn', 'Pelvic girdle pain'], synonyms: ['si-gewricht', 'bekkeninstabiliteit', 'zwangerschap bekken', 'symfyse'], what: ['Pijn rond het SI-gewricht of het schaambeen, bijvoorbeeld tijdens of na de zwangerschap.', 'Pain around the SI joint or pubic bone, for example during or after pregnancy.'], chains: ['lateraal_heup', 'voor_romp'], compensations: ['tfl_gmed', 'core_rug', 'adductor_lies'] },
  // Hip and groin
  { key: 'heupartrose', region: 'heup', name: ['Heupartrose', 'Hip osteoarthritis'], synonyms: ['artrose heup', 'slijtage heup', 'coxartrose'], what: ['Pijn en stijfheid in de lies of heup bij lopen en opstaan; oefentherapie en geleidelijk belasten helpen goed.', 'Pain and stiffness in the groin or hip on walking and standing up; exercise therapy and gradual loading help well.'], chains: ['lateraal_heup', 'achter'], compensations: ['tfl_gmed', 'heup_rug', 'gmax_hamstring'], mobilityTests: ['chair_sit_reach'], templateHint: ['heupen en onderrug', 'heup en schouder', 'heup'] },
  { key: 'gluteale_tendinopathie', region: 'heup', name: ['Pijn aan de buitenkant van de heup', 'Lateral hip pain'], synonyms: ['gluteale tendinopathie', 'trochanter', 'bursitis', 'slijmbeursontsteking heup'], what: ['Pijn op de buitenkant van de heup bij liggen op die kant, traplopen en op één been staan; meestal de pees van de gluteus medius.', 'Pain on the outside of the hip when lying on that side, climbing stairs and standing on one leg; usually the gluteus medius tendon.'], chains: ['lateraal_heup'], compensations: ['tfl_gmed'],
    avoid: { words: ['tfl en buitenkant heup rekken', 'gekruist', 'piriformis'], stretchMuscles: ['tfl', 'gluteus_medius', 'gluteus_minimus'], why: ['Geen rek met het been over de middellijn (gekruist): dat drukt de pezen tegen het bot. Ook niet op die kant liggen of met gekruiste benen zitten.', 'No stretching with the leg across the midline (crossed): that compresses the tendons against the bone. Also avoid lying on that side or sitting with crossed legs.'] } },
  { key: 'lies', region: 'heup', name: ['Liesklachten bij sporters', 'Groin pain in athletes'], synonyms: ['adductor', 'liesblessure', 'pubalgie'], what: ['Pijn in de lies bij sprinten, schieten en zijwaarts bewegen, vaak bij voetbal en hockey.', 'Groin pain when sprinting, kicking and moving sideways, often in football and hockey.'], chains: ['lateraal_heup', 'voor_romp'], compensations: ['adductor_lies', 'core_rug'] },
  // Knee
  { key: 'pfps', region: 'knie', name: ['Patellofemorale pijn', 'Patellofemoral pain'], synonyms: ['pfps', 'pijn achter de knieschijf', 'chondropathie', 'runners knee'], what: ['Pijn rond of achter de knieschijf bij traplopen, squatten en lang zitten.', 'Pain around or behind the kneecap on stairs, squatting and long sitting.'], chains: ['lateraal_heup', 'voor_romp'], compensations: ['tfl_gmed', 'quad_heup', 'enkel_beperkt', 'voetboog'], mobilityTests: ['knee_to_wall'] },
  { key: 'itbs', region: 'knie', name: ['Loperknie (ITBS)', 'Iliotibial band syndrome (ITBS)'], synonyms: ['itbs', 'iliotibiaal', 'tractus iliotibialis', 'loperknie'], what: ['Pijn aan de buitenkant van de knie bij hardlopen of fietsen, vaak na een vaste afstand.', 'Pain on the outside of the knee when running or cycling, often after a fixed distance.'], chains: ['lateraal_heup'], compensations: ['tfl_gmed', 'voetboog'], calm: ['tfl'], templateHint: ['return to run', 'hardlopen'] },
  { key: 'patellapees', region: 'knie', name: ['Patellapeesklachten', 'Patellar tendinopathy'], synonyms: ['jumpers knee', 'springersknie', 'patellatendinopathie'], what: ['Pijn net onder de knieschijf bij springen en squatten; de pees wil geleidelijk zwaarder belast worden.', 'Pain just below the kneecap when jumping and squatting; the tendon needs gradually heavier loading.'], chains: ['voor_romp', 'achter'], compensations: ['quad_heup', 'enkel_beperkt'], mobilityTests: ['knee_to_wall'], templateHint: ['patellapees'] },
  { key: 'knieartrose', region: 'knie', name: ['Knieartrose', 'Knee osteoarthritis'], synonyms: ['artrose knie', 'slijtage knie', 'gonartrose'], what: ['Pijn en stijfheid in de knie bij lopen en traplopen; spierkracht en blijven bewegen helpen het meest.', 'Pain and stiffness in the knee when walking and on stairs; muscle strength and keeping active help most.'], chains: ['voor_romp', 'lateraal_heup'], compensations: ['quad_heup', 'tfl_gmed'] },
  { key: 'vkb', region: 'knie', name: ['VKB-revalidatie', 'ACL rehabilitation'], synonyms: ['voorste kruisband', 'acl', 'kruisband'], what: ['Revalidatie na een voorste-kruisbandletsel, met of zonder operatie; criteria bepalen de volgende fase.', 'Rehabilitation after an anterior cruciate ligament injury, with or without surgery; criteria decide the next phase.'], chains: ['voor_romp', 'lateraal_heup', 'achter'], compensations: ['quad_heup', 'tfl_gmed', 'gmax_hamstring'], templateHint: ['vkb', 'kruisband'] },
  { key: 'meniscus', region: 'knie', name: ['Meniscusklachten', 'Meniscus complaints'], synonyms: ['meniscus', 'meniscusletsel', 'scheurtje meniscus'], what: ['Pijn aan de binnen- of buitenkant van de knie bij draaien en diep buigen, soms met haperen.', 'Pain on the inside or outside of the knee when twisting and bending deeply, sometimes with catching.'], chains: ['voor_romp', 'lateraal_heup'], compensations: ['quad_heup', 'tfl_gmed'] },
  // Lower leg, ankle, foot
  { key: 'achilles', region: 'enkel_voet', name: ['Achillespeesklachten', 'Achilles tendinopathy'], synonyms: ['achillespees', 'achillestendinopathie', 'hielpees'], what: ['Pijn en ochtendstijfheid in de achillespees; geleidelijk opbouwend belasten werkt het best.', 'Pain and morning stiffness in the Achilles tendon; gradually increasing load works best.'], chains: ['achter'], compensations: ['enkel_beperkt', 'voetboog', 'gmax_hamstring'], mobilityTests: ['knee_to_wall'], templateHint: ['achilles'] },
  { key: 'enkelverstuiking', region: 'enkel_voet', name: ['Enkelverstuiking en instabiele enkel', 'Ankle sprain and unstable ankle'], synonyms: ['verstuiking', 'enkelband', 'zwikken', 'inversietrauma'], what: ['Pijn en zwelling na het verzwikken; balans en kracht trainen voorkomt dat het vaker gebeurt.', 'Pain and swelling after a sprain; training balance and strength prevents it from happening again.'], chains: ['lateraal_heup', 'achter'], compensations: ['enkel_beperkt', 'tfl_gmed'], mobilityTests: ['knee_to_wall'], train: ['peronei'], templateHint: ['enkel'] },
  { key: 'fasciitis', region: 'enkel_voet', name: ['Fasciitis plantaris', 'Plantar fasciitis'], synonyms: ['hielspoor', 'peesplaat voet', 'plantaire fasciopathie', 'hielpijn'], what: ['Pijn onder de hiel, vooral bij de eerste stappen in de ochtend.', 'Pain under the heel, especially with the first steps in the morning.'], chains: ['achter'], compensations: ['enkel_beperkt', 'voetboog'], mobilityTests: ['knee_to_wall'] },
  { key: 'mtss', region: 'enkel_voet', name: ['Scheenbeenvliesklachten', 'Shin splints'], synonyms: ['mtss', 'shin splints', 'scheenbeenvliesontsteking'], what: ['Pijn langs de binnenrand van het scheenbeen bij hardlopen; belasting tijdelijk aanpassen en kuit en voet sterker maken.', 'Pain along the inner edge of the shin when running; adjust the load for a while and strengthen calf and foot.'], chains: ['achter', 'lateraal_heup'], compensations: ['voetboog', 'enkel_beperkt', 'tfl_gmed'] },
];

/** Practice programmes (templates) whose title fits a complaint, best match first. */
export function templatesFor<T extends { title: string }>(c: Complaint, templates: T[]): T[] {
  const hints = (c.templateHint ?? []).map(norm);
  if (!hints.length) return [];
  return templates.filter((x) => hints.some((h) => norm(x.title).includes(h))).sort((a, b) => hints.findIndex((h) => norm(a.title).includes(h)) - hints.findIndex((h) => norm(b.title).includes(h)));
}

/** The guide region for a pain-map area (patient body map). */
const AREA_REGION: Record<string, RegionKey> = {
  head: 'nek', neck: 'nek', shoulder_l: 'schouder', shoulder_r: 'schouder', chest: 'bovenrug', upper_back: 'bovenrug',
  elbow_l: 'elleboog_pols', elbow_r: 'elleboog_pols', wrist_l: 'elleboog_pols', wrist_r: 'elleboog_pols',
  abdomen: 'lage_rug', lower_back: 'lage_rug', buttock_l: 'heup', buttock_r: 'heup', hip_l: 'heup', hip_r: 'heup',
  thigh_l: 'knie', thigh_r: 'knie', hamstring_l: 'heup', hamstring_r: 'heup', knee_l: 'knie', knee_r: 'knie',
  calf_l: 'enkel_voet', calf_r: 'enkel_voet', ankle_l: 'enkel_voet', ankle_r: 'enkel_voet',
};
export const regionForArea = (area: string): RegionKey | null => AREA_REGION[area] ?? null;

export const regionOf = (key: string) => REGIONS.find((r) => r.key === key) ?? null;
export const chainOf = (key: string) => CHAINS.find((c) => c.key === key) ?? null;
export const compensationOf = (key: string) => COMPENSATIONS.find((c) => c.key === key) ?? null;
export const complaintOf = (key: string) => COMPLAINTS.find((c) => c.key === key) ?? null;
export const complaintsIn = (region: RegionKey) => COMPLAINTS.filter((c) => c.region === region);

/** Where a muscle shows up: its chains, the patterns where it is the weak link or takes over, and the complaints. */
export function muscleInChains(muscle: string) {
  const asWeak = COMPENSATIONS.filter((c) => c.weak.includes(muscle));
  const asOver = COMPENSATIONS.filter((c) => c.over.includes(muscle));
  const keys = new Set([...asWeak, ...asOver].map((c) => c.key));
  return {
    chains: CHAINS.filter((c) => c.links.includes(muscle)),
    asWeak,
    asOver,
    complaints: COMPLAINTS.filter((c) => c.compensations.some((k) => keys.has(k)) || (c.train ?? []).includes(muscle) || (c.calm ?? []).includes(muscle)),
  };
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Search complaints by name or synonym (Dutch or English), e.g. "loperknie", "tennis", "ischias". */
export function searchComplaints(q: string) {
  const n = norm(q);
  if (n.length < 2) return [];
  return COMPLAINTS.filter((c) => [c.name[0], c.name[1], ...c.synonyms].some((s) => norm(s).includes(n)));
}

/** Muscles to strengthen and to calm for a complaint (from its compensations plus its own extras). */
export function complaintMuscles(c: Complaint) {
  const comps = c.compensations.map(compensationOf).filter((x): x is Compensation => !!x);
  const train = [...new Set([...(c.train ?? []), ...comps.flatMap((x) => x.weak)])];
  const calm = [...new Set([...comps.flatMap((x) => x.over), ...(c.calm ?? [])])].filter((m) => !train.includes(m));
  return { train, calm };
}

export type ProposalExercise = { id: string; nameNl: string; nameEn: string; kind: string; muscles: string[]; nerve?: string | null };
export type ProposalBlock = 'calm' | 'activate' | 'function';

/**
 * The exercise proposal for a complaint from the practice library (exercises already linked to
 * atlas muscles): calm/mobilise what takes over, activate and strengthen the weak link, and
 * functional work. Exercises whose name fits a compensation's approach come first.
 */
export type GuidePhase = 'prikkelbaar' | 'opbouw' | 'sport';

/** Phases of loading, with general dosing guidance (the therapist sets the actual dose). */
export const GUIDE_PHASES: readonly { key: GuidePhase; name: Fn; when: Fn; dose: Fn }[] = [
  { key: 'prikkelbaar', name: ['Prikkelbaar', 'Irritable'], when: ['Veel pijn, net begonnen of snel opvlammend.', 'A lot of pain, just started or flaring easily.'],
    dose: ['Rustig: isometrie (bijv. 5× 30–45 s) en ontlasten, dagelijks. Pijn tijdens max 3 van 10 en niet meer pijn de volgende ochtend. Nog geen springen of snelheid.', 'Gentle: isometrics (e.g. 5× 30–45 s) and offloading, daily. Pain during at most 3 out of 10 and no more pain the next morning. No jumping or speed yet.'] },
  { key: 'opbouw', name: ['Opbouwen', 'Building up'], when: ['Pijn is rustiger; tijd om sterker te worden.', 'Pain has settled; time to get stronger.'],
    dose: ['Kracht: 3× 8–15 herhalingen, 2–3 keer per week. Zwaarder als de laatste set makkelijk gaat. Pijn max 3–4 van 10, de volgende ochtend weer rustig.', 'Strength: 3× 8–15 reps, 2–3 times a week. Heavier when the last set is easy. Pain at most 3–4 out of 10, settled by the next morning.'] },
  { key: 'sport', name: ['Terug naar sport of werk', 'Back to sport or work'], when: ['Kracht is goed; nu snelheid, springen en de echte beweging.', 'Strength is good; now speed, jumping and the real movement.'],
    dose: ['Functioneel en explosief: springen, landen, richting wisselen. Kwaliteit voor hoeveelheid, tussen sessies 48 uur. Geen toename van pijn of zwelling de volgende dag.', 'Functional and explosive: jumping, landing, changing direction. Quality over quantity, 48 hours between sessions. No increase in pain or swelling the next day.'] },
];

const ISO = ['isometr', 'statisch', 'muurzit', 'wall sit', 'plank', 'hold', 'vasthouden', 'tegen muur', 'tegen deurpost', 'kin intrekken'];
const UPPER_REGIONS: readonly string[] = ['nek', 'schouder', 'elleboog_pols', 'bovenrug'];
const UPPER_FUNCTIONAL = ['opdruk', 'push-up', 'overhead', 'schouderdrukken', 'row', 'roei', 'pull-up', 'pulldown', 'farmer', 'carry', 'dragen'];
const OVERHEAD = ['overhead', 'schouderdrukken', 'boven het hoofd', 'pull-up'];
const PLYO = ['sprong', 'spring', 'hop', 'bound', 'pogo', 'landing', 'jump', 'copenhagen', 'lateral', 'zijwaarts'];

export function proposeExercises(c: Complaint, exercises: ProposalExercise[], perBlock = 5, phase: GuidePhase = 'opbouw') {
  const { train, calm } = complaintMuscles(c);
  const comps = c.compensations.map(compensationOf).filter((x): x is Compensation => !!x);
  // The first compensation of a complaint is the main one: its words and muscles weigh most.
  const fits = (e: ProposalExercise) =>
    comps.reduce((sum, x, i) => sum + (comps.length - i) * x.prefer.map(norm).filter((p) => norm(e.nameNl).includes(p) || norm(e.nameEn).includes(p)).length, 0);
  const hits = (e: ProposalExercise, list: string[]) => e.muscles.reduce((sum, m) => (list.includes(m) ? sum + (list.length - list.indexOf(m)) : sum), 0);
  // A complaint's own muscles (e.g. the wrist extensors for tennis elbow) come before the chain.
  const ownHits = (e: ProposalExercise, own: readonly string[]) => e.muscles.filter((m) => own.includes(m)).length;
  // The phase moves exercises up: isometrics when irritable, jumping and landing for sport.
  const has = (e: ProposalExercise, words: string[]) => words.some((w) => norm(e.nameNl).includes(w) || norm(e.nameEn).includes(w));
  const phaseBonus = (e: ProposalExercise) => (phase === 'prikkelbaar' ? (has(e, ISO) ? 1 : 0) : phase === 'sport' ? (has(e, PLYO) ? 1 : 0) : 0);
  const rank = (list: ProposalExercise[], target: string[], own: readonly string[] = c.train ?? []) =>
    [...list].sort((a, b) => phaseBonus(b) - phaseBonus(a) || ownHits(b, own) - ownHits(a, own) || fits(b) - fits(a) || hits(b, target) - hits(a, target) || a.nameNl.localeCompare(b.nameNl));
  const avoid = [...comps.flatMap((x) => x.avoid ?? []), ...(c.avoid?.words ?? [])].map(norm);
  const noStretch = c.avoid?.stretchMuscles ?? [];
  const used = new Set<string>(
    exercises
      .filter((e) => avoid.some((w) => norm(e.nameNl).includes(w) || norm(e.nameEn).includes(w)) || (e.kind === 'rek' && e.muscles.some((m) => noStretch.includes(m))))
      .map((e) => e.id),
  );
  const take = (list: ProposalExercise[]) => {
    const out: ProposalExercise[] = [];
    for (const e of list) {
      if (out.length >= perBlock) break;
      if (used.has(e.id)) continue;
      used.add(e.id);
      out.push(e);
    }
    return out;
  };
  const functional = ['step', 'squat', 'uitval', 'lunge', 'hinge', 'deadlift', 'eenbenig', 'eenbeens', 'balans', 'balance', 'opstaan', 'traplop', 'landing', 'hop', 'reik', 'farmer', 'carry'];
  const isFunctional = (e: ProposalExercise) => functional.some((w) => norm(e.nameNl).includes(w) || norm(e.nameEn).includes(w));
  const activate = take(rank(exercises.filter((e) => (e.kind === 'kracht' || e.kind === 'revalidatie') && hits(e, train) > 0 && !isFunctional(e)), train));
  // Calm and mobilise: stretches for what takes over, plus nerve sliders for radiating complaints.
  const sliders = exercises.filter((e) => e.kind === 'zenuw' && !!e.nerve && (c.nerves ?? []).includes(e.nerve));
  const calmList = take([...sliders, ...rank(exercises.filter((e) => e.kind === 'rek' && hits(e, [...calm, ...train]) > 0), calm, c.calm ?? [])]);
  // Irritable: no jumping; functional work is limited to calm balance and control.
  // Upper body: whole pushing, pulling and carrying movements are the functional step. Activation
  // picks first, so a row that already trains the weak link stays there. Not overhead while irritable.
  const upper = UPPER_REGIONS.includes(c.region);
  const isUpperFunctional = (e: ProposalExercise) => upper && has(e, UPPER_FUNCTIONAL);
  const funcPool = exercises.filter((e) => (e.kind === 'kracht' || e.kind === 'revalidatie') && (isFunctional(e) || isUpperFunctional(e) || (phase === 'sport' && has(e, PLYO))) && hits(e, train) > 0 && !(phase === 'prikkelbaar' && (has(e, PLYO) || has(e, OVERHEAD))));
  const func = take(rank(funcPool, train)).slice(0, phase === 'prikkelbaar' ? 2 : perBlock);
  return { calm: calmList, activate, function: func, train, calmMuscles: calm };
}

const muscleName = (k: string, nl: boolean) => {
  const m = MUSCLES.find((x) => x.key === k);
  return m ? (nl ? m.nl : m.en).toLowerCase() : k;
};
const list = (xs: string[], nl: boolean) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${nl ? 'en' : 'and'} ${xs[xs.length - 1]}`);

/**
 * "Why this exercise?" in plain words for the patient, pre-filled as the exercise note when a
 * programme is made from the complaint guide (the therapist can change it).
 */
export function whyFor(c: Complaint, e: ProposalExercise, block: ProposalBlock, nl: boolean): string {
  const comps = c.compensations.map(compensationOf).filter((x): x is Compensation => !!x);
  if (e.kind === 'zenuw') {
    return nl
      ? 'Deze oefening laat de zenuw rustig heen en weer glijden, zodat tintelingen en uitstraling kunnen afnemen. Het mag licht trekken, niet meer gaan tintelen.'
      : 'This exercise lets the nerve glide gently back and forth, so tingling and radiating pain can settle. A light pull is fine, more tingling is not.';
  }
  if (block === 'calm') {
    const comp = comps.find((x) => x.over.some((m) => e.muscles.includes(m))) ?? comps[0];
    const freed = e.muscles.filter((m) => comp?.over.includes(m) || (c.calm ?? []).includes(m)).map((m) => muscleName(m, nl));
    const weak = (comp?.weak ?? []).slice(0, 2).map((m) => muscleName(m, nl));
    if (freed.length && weak.length) {
      return nl
        ? `Deze oefening geeft je ${list(freed, true)} meer ruimte, zodat je ${list(weak, true)} het werk weer ${weak.length > 1 ? 'kunnen' : 'kan'} doen.`
        : `This exercise gives your ${list(freed, false)} more room, so your ${list(weak, false)} can do the work again.`;
    }
    return nl ? 'Deze oefening maakt je soepeler, zodat de volgende oefeningen beter gaan.' : 'This exercise makes you more supple, so the next exercises go better.';
  }
  const comp = comps.find((x) => x.weak.some((m) => e.muscles.includes(m)));
  if (block === 'function') {
    return nl
      ? 'Hier oefen je de beweging zelf, met wat je net hebt getraind. Let op je houding: dat is belangrijker dan zwaar of snel.'
      : 'Here you practise the movement itself, with what you just trained. Mind your form: that matters more than heavy or fast.';
  }
  if (comp) return nl ? comp.patientWhy[0] : comp.patientWhy[1];
  const own = e.muscles.filter((m) => (c.train ?? []).includes(m)).map((m) => muscleName(m, nl));
  return own.length
    ? nl ? `Deze oefening maakt je ${list(own, true)} sterker, zodat die de belasting weer aankan.` : `This exercise strengthens your ${list(own, false)}, so it can handle the load again.`
    : nl ? 'Deze oefening maakt de spieren rond je klacht sterker.' : 'This exercise strengthens the muscles around your complaint.';
}

/** The complaints an exercise fits in the guide, and in which block (for the exercise page). */
export function complaintsForExercise(e: ProposalExercise) {
  const out: { complaint: Complaint; block: ProposalBlock; score: number }[] = [];
  for (const c of COMPLAINTS) {
    const p = proposeExercises(c, [e]);
    const block: ProposalBlock | null = p.activate.length ? 'activate' : p.calm.length ? 'calm' : p.function.length ? 'function' : null;
    if (!block) continue;
    // Most relevant first: the exercise works the complaint's main muscle (first in its list).
    const list = block === 'calm' ? [...p.calmMuscles, ...p.train] : p.train;
    const at = Math.min(...e.muscles.map((m) => list.indexOf(m)).filter((i) => i >= 0), 99);
    out.push({ complaint: c, block, score: at });
  }
  return out.sort((a, b) => a.score - b.score).map(({ complaint, block }) => ({ complaint, block }));
}
