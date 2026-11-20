/**
 * Builds server/db/seed-data/fp-mobiliteit-v4.json from shared/flexibilityPaths.ts plus the new
 * exercises below, so the phased programmes and their criteria have one source.
 * Run: npx tsx scripts/build-mobility-v4.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { FLEX_PATHS } from '../shared/flexibilityPaths';

const DOSE = 'conventie: gangbare dosering (30 seconden vasthouden of rustige herhalingen), nog niet individueel getoetst';
const ex = (id: string, naam: string, regio: string, dosering: string, cues: string, tags: string[], niveau = 'basis') => ({ id, naam, regio, dosering, cues, tags, dosis_status: DOSE, niveau });

export const NEW_EXERCISES = [
  ex('mb4_spreidzit_rechtop', 'Rechtop zitten in spreidzit', 'heup', '3 sets van 30 sec, dagelijks',
    'Zit op de grond met je benen gestrekt en zo ver uit elkaar als ontspannen lukt, knieschijven naar het plafond. Kantel je bekken naar voren tot je op de voorkant van je zitbotjes zit en je onderrug hol wordt. Handen naast je, niet achter je. Lukt dat niet, zit dan op een opgevouwen handdoek of kussen',
    ['spreidzit', 'adductoren', 'hamstrings', 'pancake']),
  ex('mb4_adductor_rock_back', 'Adductor rock-back in kniestand', 'heup', '2 sets van 8 per kant',
    'Ga op handen en knieën en zet je rechterbeen gestrekt opzij, voet plat op de grond. Schuif met een lange rug je billen rustig naar achteren richting je linkerhiel tot je rek voelt aan de binnenkant van je rechterbovenbeen. Kom terug en herhaal; elke keer iets verder als dat zonder pijn gaat',
    ['adductoren', 'lies', 'pancake', 'spagaat zijwaarts']),
  ex('mb4_pancake_pnf', 'Pancake aanspannen-ontspannen (PNF)', 'heup', '3 rondes van 3 keer aanspannen',
    'Zit in spreidzit en kantel met een lange rug naar voren tot je rek voelt. Duw je hielen en de achterkant van je benen 5 seconden licht in de grond, met ongeveer een kwart van je kracht. Ontspan, adem uit en kantel 5 tot 10 seconden iets verder naar voren. Herhaal 3 keer. Nooit verder dan een rek zonder pijn',
    ['pancake', 'pnf', 'aanspannen-ontspannen', 'adductoren', 'hamstrings'], 'gevorderd'),
  ex('mb4_straddle_good_morning', 'Good morning in brede stand', 'heup', '3 sets van 8',
    'Sta met je voeten breed, tenen iets naar buiten, een stok of licht gewicht op je schouders. Knieën bijna gestrekt. Schuif je billen naar achteren en kantel met een lange rug naar voren tot je rek voelt aan de binnen- en achterkant van je benen. Kom omhoog door je bilspieren aan te spannen. Langzaam omlaag, rustig omhoog',
    ['pancake', 'kracht in de lengte', 'hamstrings', 'adductoren']),
  ex('mb4_spreidzit_beentil', 'Been optillen in spreidzit (actief)', 'heup', '3 sets van 8 per been',
    'Zit rechtop in spreidzit met je handen naast je heupen. Span de voorkant van je dij aan en til één gestrekt been een paar centimeter van de grond, knieschijf naar boven. Houd 2 seconden vast en zet het rustig neer. Niet achterover leunen; een paar centimeter is genoeg',
    ['pancake', 'actieve lenigheid', 'heupbuigers', 'kracht in de eindstand'], 'gevorderd'),
  ex('mb4_pancake_gewicht', 'Pancake met licht gewicht', 'heup', '3 sets van 30 sec',
    'Zit in spreidzit en houd een licht gewicht (bijvoorbeeld 2 tot 5 kilo) tegen je borst. Kantel met een lange rug naar voren en laat het gewicht je bij elke uitademing iets verder helpen. Leg het gewicht weg voordat je weer rechtop komt. Geen scherpe pijn in lies of knieholte',
    ['pancake', 'rekken onder belasting', 'adductoren', 'hamstrings'], 'gevorderd'),
  ex('mb4_halve_spagaat_pnf', 'Halve spagaat aanspannen-ontspannen (PNF)', 'heup', '3 rondes van 3 keer per kant',
    'Ga in de halve spagaat met je voorste been gestrekt. Duw je voorste hiel 5 seconden licht in de grond, alsof je je knie wilt buigen, met ongeveer een kwart van je kracht. Ontspan, adem uit en kantel met een lange rug iets verder naar voren. Herhaal 3 keer',
    ['spagaat', 'pnf', 'hamstrings'], 'gevorderd'),
  ex('mb4_lunge_diep', 'Diepe uitvalspas met armen omhoog', 'heup', '2 sets van 30 sec per kant',
    'Kniel met je rechterknie op een kussen, linkervoet ver voor je. Span je rechterbil aan, schuif je heup naar voren en breng beide armen recht omhoog zonder je rug hol te trekken. Je voelt rek voor in je rechterheup tot in je buik. Wissel van kant',
    ['heupbuigers', 'iliopsoas', 'spagaat']),
  ex('mb4_glijdende_spagaat', 'Glijdende spagaat met steun', 'heup', '3 sets van 5 per kant',
    'Zet een blok of stoel aan elke kant en leg een handdoek onder je voorste hiel op een gladde vloer. Glijd met je handen op de steun langzaam in de spagaat, alleen zo ver als je je gewicht met je handen kunt dragen, en glijd gecontroleerd terug. Bekken recht naar voren. Nooit veren',
    ['spagaat', 'controle', 'hamstrings', 'heupbuigers'], 'gevorderd'),
  ex('mb4_actief_been_heffen', 'Gestrekt been actief heffen (staand)', 'heup', '3 sets van 8 per been',
    'Sta rechtop, eventueel met één hand licht aan een stoel. Span je voorste dijspier aan en til je gestrekte been voor je zo hoog als lukt zonder achterover te leunen, tenen omhoog. Houd 2 seconden vast en zet het langzaam neer',
    ['actieve lenigheid', 'spagaat', 'hamstrings', 'heupbuigers', 'kracht in de eindstand']),
  ex('mb4_paardenstand', 'Paardenstand vasthouden', 'heup', '3 sets van 30 sec',
    'Zet je voeten breed, tenen iets naar buiten. Zak door je knieën tot je dijen bijna horizontaal zijn, knieën recht boven je tenen en romp rechtop. Houd vast en adem rustig door. Te zwaar? Zak minder diep',
    ['adductoren', 'spagaat zijwaarts', 'kracht in de eindstand']),
  ex('mb4_v_muur_pnf', 'Benen in V tegen de muur, aanspannen-ontspannen', 'heup', '3 rondes van 3 keer',
    'Lig met je billen tegen de muur en je benen in een V omhoog tegen de muur. Leg je handen aan de binnenkant van je knieën en duw je benen 5 seconden licht naar elkaar toe tegen je handen. Ontspan, adem uit en laat je benen iets verder uit elkaar zakken. Herhaal 3 keer',
    ['adductoren', 'pnf', 'spagaat zijwaarts']),
  ex('mb4_zijspagaat_steun', 'Spagaat zijwaarts met steun', 'heup', '3 sets van 30 sec',
    'Sta tussen twee stoelen of met je handen op blokken. Schuif je voeten langzaam naar buiten, knieschijven naar voren, en draag je gewicht met je handen. Ga alleen zo ver als je ontspannen kunt ademen. Kom terug door je voeten weer naar elkaar te schuiven. Knellend gevoel in de heup: minder ver',
    ['spagaat zijwaarts', 'adductoren'], 'gevorderd'),
  ex('mb4_cossack_gewicht', 'Cossack squat met gewicht', 'heup', '3 sets van 6 per kant',
    'Houd een kettlebell of dumbbell tegen je borst. Zak zijwaarts in de cossack squat, hiel van het gebogen been aan de grond, het andere been gestrekt met de tenen omhoog. Zak gecontroleerd zo diep als lukt en duw terug naar het midden',
    ['adductoren', 'spagaat zijwaarts', 'kracht in de lengte'], 'gevorderd'),
  ex('mb4_hamstring_pnf', 'Hamstring aanspannen-ontspannen op de rug (PNF)', 'heup', '3 rondes van 3 keer per been',
    'Lig op je rug met een band om je voet en til je gestrekte been op tot je rek voelt. Duw je hiel 5 seconden licht tegen de band, met ongeveer een kwart van je kracht. Ontspan, adem uit en trek je been rustig iets verder naar je toe. Herhaal 3 keer',
    ['hamstrings', 'pnf', 'tenen aantikken']),
  ex('mb4_zittend_vooroverbuigen', 'Zittend vooroverbuigen', 'heup', '3 sets van 30 sec',
    'Zit met je benen gestrekt voor je, tenen omhoog, eventueel op een kussen. Kantel met een lange rug vanuit je heupen naar voren en schuif je handen langs je benen naar je tenen. Laat op het eind je rug ontspannen rond worden. Rustig uitademen',
    ['hamstrings', 'rug', 'tenen aantikken']),
];

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const DONE = 'Doel bereikt';

const programmas = FLEX_PATHS.map((p) => ({
  id: p.series,
  naam: p.name[0],
  doel: clip(p.intro[0], 500),
  fases: p.phases.map((f) => ({
    naam: clip(f.name[0], 60),
    weken: f.weeks,
    doel: clip(f.goal[0], 500),
    oefeningen: f.items.map((i) => ({
      exercise_id: i.ex,
      sets: i.sets,
      ...(i.reps ? { reps: i.reps } : {}),
      ...(i.holdS ? { hold_sec: i.holdS } : {}),
      frequentie_per_week: f.perWeek,
      ...(i.note ? { opmerking: i.note[0] } : {}),
    })),
  })),
  criteria_per_fase: p.phases.map((f, i) => ({
    van: clip(f.name[0], 60),
    naar: clip(p.phases[i + 1]?.name[0] ?? DONE, 80),
    criteria: f.criteria.map((c) => ({ criterium: clip(c.text[0], 300), ...(c.how ? { meetmethode: clip(c.how[0], 200) } : {}) })),
  })),
}));

const file = {
  _meta: {
    versie: 'fp-mobiliteit-v4',
    toelichting:
      'Opbouw in fases voor pancake, spagaat voorwaarts, spagaat zijwaarts en tenen aantikken, met criteria per fase. Eigen tekst. Statisch 30 seconden (Medeiros 2016), 5 minuten per spiergroep per week (Thomas 2018), aanspannen-ontspannen (Sharman 2006), kracht in de volledige lengte (Afonso 2021). Nog niet individueel klinisch getoetst.',
  },
  seed_data: {
    mobiliteit: {
      _toelichting: {
        dosering_richtlijn:
          'De eerste weken komt de winst vooral uit rektolerantie. 30 seconden vasthouden geeft vergelijkbare winst als 60 seconden (Medeiros 2016); minstens 5 minuten per spiergroep per week, 5 of meer dagen, hangt samen met meer winst (Thomas 2018). Aanspannen-ontspannen geeft evenveel of iets meer (Sharman 2006). Krachttraining door de volledige bewegingsuitslag geeft vergelijkbare winst (Afonso 2021). Ga pas naar de volgende fase als alle criteria gehaald zijn.',
      },
      oefeningen: NEW_EXERCISES,
      programmas,
    },
  },
};

const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'server', 'db', 'seed-data', 'fp-mobiliteit-v4.json');
fs.writeFileSync(out, JSON.stringify(file, null, 1) + '\n');
console.log(`wrote ${out}: ${NEW_EXERCISES.length} exercises, ${programmas.length} programmes`);
