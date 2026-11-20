/**
 * The therapist's view of the "what holds you back" check (shared/flexibilityCheck.ts): the same
 * questions and scoring, with the clinical name of each test, how to do and read it, and how to
 * interpret and confirm each limiter. A clinical reasoning aid, not a diagnosis. Own texts, to be reviewed.
 */
import type { CheckGoal, LimiterKey } from './flexibilityCheck';

type Fn = readonly [nl: string, en: string];
export type ExamTest = { name: Fn; how: Fn };

const NEURO: ExamTest = {
  name: ['Neurologische symptomen tijdens de tests', 'Neurological symptoms during the tests'],
  how: [
    'Paresthesie, gevoelsverlies of uitstralende pijn tijdens de differentiatie: stop met rekken, doe een neurologisch onderzoek (kracht, sensibiliteit, reflexen) en verwijs bij progressieve uitval.',
    'Paraesthesia, loss of sensation or radiating pain during differentiation: stop stretching, do a neurological examination (strength, sensation, reflexes) and refer with progressive deficit.',
  ],
};
const HEAD = (where: Fn, nerve: Fn): ExamTest => ({
  name: [`Structurele differentiatie: cervicale flexie en extensie (${where[0]})`, `Structural differentiation: cervical flexion and extension (${where[1]})`],
  how: [
    `Voeg in de eindstand cervicale extensie en daarna flexie toe. Verandert de klacht distaal, dan wijst dat op neurodynamische sensitiviteit van ${nerve[0]}: spierlengte verandert niet met de stand van de nek.`,
    `At end range add cervical extension, then flexion. A distal change in symptoms points at neurodynamic sensitivity of ${nerve[1]}: muscle length does not change with neck position.`,
  ],
});

export const EXAM: Record<CheckGoal, Record<string, ExamTest>> = {
  tenen: {
    waar: { name: ['Lokalisatie van de rek bij staande voorwaartse flexie', 'Location of the stretch in standing forward flexion'], how: ['Staand voorover tot de eerste weerstand; laat de plek aanwijzen. Let op compensatie: knieflexie, gewicht naar achteren, lumbale flexie zonder heupflexie.', 'Standing forward bend to first resistance; ask where it is felt. Watch for compensation: knee flexion, weight shifting back, lumbar flexion without hip flexion.'] },
    knieen: { name: ['Differentiatie met knieflexie', 'Differentiation with knee flexion'], how: ['Herhaal met flinke knieflexie. Duidelijk meer reikwijdte: structuren over de knie (hamstrings, gastrocnemius, n. ischiadicus/tibialis). Geen verschil: eerder lumbale flexie, gluteus of de heup.', 'Repeat with marked knee flexion. Clearly more reach: structures crossing the knee (hamstrings, gastrocnemius, sciatic/tibial nerve). No difference: rather lumbar flexion, gluteus or the hip.'] },
    hoofd: HEAD(['voorwaartse flexie', 'forward bend'], ['de n. ischiadicus', 'the sciatic nerve']),
    voet: { name: ['Differentiatie met enkel-dorsaalflexie', 'Differentiation with ankle dorsiflexion'], how: ['Voorvoeten op een verhoging (dorsaalflexie) tegenover hielen op een verhoging. Toename met dorsaalflexie: gastrocnemius of n. tibialis; combineer met de cervicale differentiatie om spier van zenuw te scheiden.', 'Forefeet on a step (dorsiflexion) versus heels on a step. Increase with dorsiflexion: gastrocnemius or tibial nerve; combine with cervical differentiation to separate muscle from nerve.'] },
    kat: { name: ['Segmentale lumbale flexie', 'Segmental lumbar flexion'], how: ['Viervoetsstand, actieve flexie van de wervelkolom. Blijft de lumbale lordose staan, dan is de lumbale flexie beperkt; objectiveer met de (aangepaste) Schober-test.', 'Quadruped, active spinal flexion. If the lumbar lordosis persists, lumbar flexion is limited; quantify with the (modified) Schober test.'] },
    knieborst: { name: ['Passieve heupflexie met gebogen knie', 'Passive hip flexion with a bent knee'], how: ['Ruglig, passieve heupflexie met knieflexie. Rek posterolateraal in de bil: gluteus maximus of posterieure heup. Knel anterieur in de lies: denk aan femoro-acetabulaire impingement, FADIR overwegen.', 'Supine, passive hip flexion with knee flexion. Posterolateral buttock stretch: gluteus maximus or posterior hip. Anterior groin pinch: consider femoroacetabular impingement, FADIR test.'] },
    tintel: NEURO,
  },
  pancake: {
    waar: { name: ['Lokalisatie van de rek in spreidzit', 'Location of the stretch in a straddle'], how: ['Zittend in abductie met gestrekte knieën, voorwaarts kantelen vanuit de heup. Mediaal: adductoren. Posterieur: hamstrings of adductor magnus. Knieholte: hamstrings of n. ischiadicus.', 'Seated in abduction with straight knees, folding forward from the hip. Medial: adductors. Posterior: hamstrings or adductor magnus. Back of the knee: hamstrings or sciatic nerve.'] },
    knieen: { name: ['Differentiatie met knieflexie in abductie', 'Differentiation with knee flexion in abduction'], how: ['Herhaal met lichte knieflexie. Duidelijk meer abductie of flexie: tweegewrichtsspieren (gracilis, mediale hamstrings). Geen verschil: eengewrichts adductoren (longus, brevis, deel van magnus) of articulair.', 'Repeat with slight knee flexion. Clearly more abduction or flexion: two-joint muscles (gracilis, medial hamstrings). No difference: one-joint adductors (longus, brevis, part of magnus) or articular.'] },
    rechtop: { name: ['Actieve anterieure bekkenkanteling in abductie', 'Active anterior pelvic tilt in abduction'], how: ['Kan de patiënt in spreidzit zonder steun rechtop zitten met anterieure bekkenkanteling? Zo niet: hamstrings of adductor magnus te kort, of te weinig heupflexorkracht in verkorte positie.', 'Can the patient sit upright in a straddle without support with an anterior pelvic tilt? If not: hamstrings or adductor magnus too short, or too little hip flexor strength in a shortened position.'] },
    hoofd: HEAD(['spreidzit', 'straddle'], ['de n. obturatorius (mediaal) of de n. ischiadicus (posterieur)', 'the obturator nerve (medial) or sciatic nerve (posterior)']),
    actief: { name: ['Actief-passief verschil (active compression)', 'Active-passive gap (active compression)'], how: ['Rechtop in spreidzit één gestrekt been heffen. Lukt dat niet terwijl de passieve uitslag ruim is: krachtstekort in de eindstand (heupflexoren en adductoren in verlengde positie).', 'Lift one straight leg upright in a straddle. If that fails while passive range is ample: end-range strength deficit (hip flexors and adductors at length).'] },
    tintel: NEURO,
  },
  spagaat_voor: {
    waar: { name: ['Lokalisatie in halve spagaat of lage lunge', 'Location in a half split or low lunge'], how: ['Voorste been: hamstrings, kuit of n. ischiadicus. Achterste been: iliopsoas (anterieur heup) of rectus femoris (anterieur dij). Liesknel: articulair.', 'Front leg: hamstrings, calf or sciatic nerve. Back leg: iliopsoas (anterior hip) or rectus femoris (anterior thigh). Groin pinch: articular.'] },
    thomas: { name: ['Aangepaste Thomastest', 'Modified Thomas test'], how: ['Ruglig aan de rand van de bank, contralaterale knie naar de borst zodat de lordose afvlakt. Komt het hangende bovenbeen omhoog: verkorte iliopsoas.', 'Supine at the edge of the plinth, contralateral knee to chest to flatten the lordosis. If the hanging thigh lifts: shortened iliopsoas.'] },
    knie: { name: ['Thomastest met knieflexie (rectus femoris)', 'Thomas test with knee flexion (rectus femoris)'], how: ['In dezelfde positie passieve knieflexie. Neemt de heupflexie toe of blijft knieflexie onder ongeveer 80 graden: verkorte rectus femoris (bevestig met de Ely-test).', 'In the same position passive knee flexion. If hip flexion increases or knee flexion stays below about 80 degrees: shortened rectus femoris (confirm with the Ely test).'] },
    hoofd: HEAD(['halve spagaat, voorste been', 'half split, front leg'], ['de n. ischiadicus', 'the sciatic nerve']),
    femoraal: HEAD(['couch stretch of zijlig-slump, achterste been', 'couch stretch or side-lying slump, back leg'], ['de n. femoralis', 'the femoral nerve']),
    actief: { name: ['Actieve gestrekte beenheffing staand', 'Active straight-leg raise standing'], how: ['Actief heffen tot ongeveer 90 graden heupflexie. Groot verschil met de passieve SLR: krachtstekort van de heupflexoren in verkorte positie of onvoldoende controle.', 'Active lift to about 90 degrees of hip flexion. A large gap with the passive SLR: hip flexor strength deficit in a shortened position or insufficient control.'] },
    tintel: NEURO,
  },
  spagaat_zij: {
    waar: { name: ['Lokalisatie in spreidstand', 'Location in a wide stance'], how: ['Mediaal: adductoren. Posterieur of knieholte: gracilis en mediale hamstrings. Knel in de lies of lateraal: articulair, denk aan de vorm van acetabulum en collum femoris.', 'Medial: adductors. Posterior or back of the knee: gracilis and medial hamstrings. Groin or lateral pinch: articular, consider acetabular and femoral neck morphology.'] },
    knieen: { name: ['Gestrekte tegenover gebogen knieën in abductie', 'Straight versus bent knees in abduction'], how: ['Spreidstand met gestrekte knieën tegenover paardenstand. Duidelijk meer abductie met gebogen knieën: gracilis en mediale hamstrings. Geen verschil: eengewrichts adductoren of articulair.', 'Wide stance with straight knees versus horse stance. Clearly more abduction with bent knees: gracilis and medial hamstrings. No difference: one-joint adductors or articular.'] },
    kikker: { name: ['Abductie in 90 graden heupflexie (kikker)', 'Abduction in 90 degrees hip flexion (frog)'], how: ['Rek mediaal: adductoren. Anterieure of laterale knel: articulaire beperking; FABER overwegen.', 'Medial stretch: adductors. Anterior or lateral pinch: articular limitation; consider FABER.'] },
    hoofd: HEAD(['spreidzit', 'straddle'], ['de n. obturatorius', 'the obturator nerve']),
    actief: { name: ['Laterale lunge (cossack) zonder steun', 'Lateral lunge (cossack) unsupported'], how: ['Excentrische controle van de adductoren en mobiliteit van enkel en heup in de diepe laterale lunge. Lukt het alleen met steun: krachtstekort in de eindstand; kracht van de adductoren eventueel met de squeeze-test.', 'Eccentric control of the adductors and ankle and hip mobility in the deep lateral lunge. Only with support: end-range strength deficit; adductor strength with the squeeze test if useful.'] },
    tintel: NEURO,
  },
};

/** How to read and confirm each limiter, for the therapist. */
export const LIMITER_CLINICAL: Record<LimiterKey, Fn> = {
  kuit: ['Verkorte gastrocnemius of soleus. Objectiveer met de knie-tot-muurtest (soleus) en dorsaalflexie met gestrekte knie (gastrocnemius).', 'Shortened gastrocnemius or soleus. Quantify with the knee-to-wall test (soleus) and dorsiflexion with a straight knee (gastrocnemius).'],
  hamstrings: ['Verkorte hamstrings of verminderde rektolerantie. Objectiveer met de active knee extension test (90/90) of een passieve SLR zonder neurologische verandering.', 'Shortened hamstrings or reduced stretch tolerance. Quantify with the active knee extension test (90/90) or a passive SLR without neural change.'],
  zenuw_ischiadicus: ['Neurodynamische sensitiviteit van de n. ischiadicus of tibialis. Bevestig met SLR met dorsaal- tegenover plantairflexie en de slump-test met structurele differentiatie. Behandel met sliders vóór tensioners; agressief rekken kan klachten verergeren.', 'Neurodynamic sensitivity of the sciatic or tibial nerve. Confirm with SLR with dorsiflexion versus plantarflexion and the slump test with structural differentiation. Treat with sliders before tensioners; aggressive stretching can aggravate symptoms.'],
  rug: ['Beperkte lumbale flexie. Objectiveer met de (aangepaste) Schober-test; let bij pijn op discogene of facetgebonden klachten.', 'Limited lumbar flexion. Quantify with the (modified) Schober test; with pain consider discogenic or facet-related complaints.'],
  bil: ['Verkorte gluteus maximus of posterieure heupstructuren: passieve heupflexie met knieflexie en flexie-adductie.', 'Shortened gluteus maximus or posterior hip structures: passive hip flexion with knee flexion and flexion-adduction.'],
  heupgewricht: ['Articulaire beperking: anterieure knel bij flexie of rotatie, of een benig eindgevoel. FADIR en FABER overwegen; bij aanhoudende klachten beeldvorming of verwijzing. Niet doorrekken.', 'Articular limitation: anterior pinch in flexion or rotation, or a bony end-feel. Consider FADIR and FABER; with persistent complaints imaging or referral. Do not stretch through it.'],
  adductoren: ['Verkorte eengewrichts adductoren. Objectiveer met abductie in heupflexie met gebogen knie; kracht met de adductor squeeze-test.', 'Shortened one-joint adductors. Quantify with abduction in hip flexion with a bent knee; strength with the adductor squeeze test.'],
  binnen_tweegewricht: ['Verkorte gracilis en mediale hamstrings: abductie neemt duidelijk toe bij knieflexie.', 'Shortened gracilis and medial hamstrings: abduction increases clearly with knee flexion.'],
  zenuw_obturatorius: ['Neurodynamische sensitiviteit van de n. obturatorius: mediale klachtverandering bij cervicale flexie in abductie. Sliders, niet rekken.', 'Neurodynamic sensitivity of the obturator nerve: medial change in symptoms with cervical flexion in abduction. Sliders, not stretching.'],
  heupbuigers: ['Verkorte iliopsoas: positieve aangepaste Thomastest.', 'Shortened iliopsoas: positive modified Thomas test.'],
  rectus_femoris: ['Verkorte rectus femoris: Thomastest met knieflexie of de Ely-test.', 'Shortened rectus femoris: Thomas test with knee flexion or the Ely test.'],
  zenuw_femoralis: ['Neurodynamische sensitiviteit van de n. femoralis: prone knee bend of zijlig-slump met structurele differentiatie.', 'Neurodynamic sensitivity of the femoral nerve: prone knee bend or side-lying slump with structural differentiation.'],
  controle: ['Actief-passief tekort: train kracht in de eindstand (actieve lenigheid), isometrisch in verlengde positie en excentrisch.', 'Active-passive gap: train end-range strength (active flexibility), isometrics at length and eccentrics.'],
};
