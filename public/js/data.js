// Spelinhoud: oefeningen, herstelpaden, klassen, monsters, zones en winkelitems.

export const STATS = {
  kracht: { label: 'Kracht', icon: '💪' },
  mobiliteit: { label: 'Mobiliteit', icon: '🌀' },
  balans: { label: 'Balans', icon: '⚖️' },
  stabiliteit: { label: 'Stabiliteit', icon: '🛡️' },
};

// type 'reps': herhalingen tellen. type 'hold': elke herhaling is een aanspanning van `hold` seconden.
export const EXERCISES = {
  quadSet: {
    name: 'Quadriceps aanspannen', icon: '🦵', stat: 'kracht', type: 'hold',
    sets: 2, reps: 10, hold: 5, rest: 30, xp: 30,
    how: 'Lig of zit met je been gestrekt. Duw je knieholte in de ondergrond en span je bovenbeen aan. Houd vast en ontspan rustig.',
  },
  heelSlide: {
    name: 'Hakglijden', icon: '🦶', stat: 'mobiliteit', type: 'reps',
    sets: 2, reps: 12, rest: 30, xp: 30,
    how: 'Lig op je rug. Schuif je hak langzaam naar je billen zodat je knie buigt, en weer terug. Blijf binnen een acceptabel pijngevoel.',
  },
  slr: {
    name: 'Gestrekt been heffen', icon: '📐', stat: 'kracht', type: 'reps',
    sets: 3, reps: 10, rest: 45, xp: 40,
    how: 'Lig op je rug, één knie gebogen. Span het gestrekte been aan en til het tot de hoogte van je andere knie. Langzaam laten zakken.',
  },
  bridge: {
    name: 'Bruggetje', icon: '🌉', stat: 'stabiliteit', type: 'reps',
    sets: 3, reps: 12, rest: 45, xp: 40,
    how: 'Lig op je rug met gebogen knieën. Span je billen aan en til je bekken op tot schouders, heupen en knieën op één lijn liggen.',
  },
  miniSquat: {
    name: 'Mini-squat', icon: '🪑', stat: 'kracht', type: 'reps',
    sets: 3, reps: 12, rest: 60, xp: 45,
    how: 'Sta op heupbreedte, eventueel met steun. Zak een klein stukje door je knieën alsof je gaat zitten. Knieën boven je tenen.',
  },
  calfRaise: {
    name: 'Op de tenen staan', icon: '🩰', stat: 'kracht', type: 'reps',
    sets: 3, reps: 15, rest: 45, xp: 35,
    how: 'Sta rechtop met lichte steun. Kom zo hoog mogelijk op je tenen en zak gecontroleerd terug.',
  },
  singleLeg: {
    name: 'Op één been staan', icon: '🦩', stat: 'balans', type: 'hold',
    sets: 2, reps: 3, hold: 30, rest: 30, xp: 40,
    how: 'Sta op één been naast een stevig steunpunt. Houd je evenwicht. Te makkelijk? Doe je ogen dicht of sta op een kussen.',
  },
  pelvicTilt: {
    name: 'Bekken kantelen', icon: '🔄', stat: 'mobiliteit', type: 'reps',
    sets: 2, reps: 12, rest: 30, xp: 30,
    how: 'Lig op je rug met gebogen knieën. Druk je onderrug in de grond door je bekken te kantelen, en ontspan weer.',
  },
  catCow: {
    name: 'Kat en koe', icon: '🐈', stat: 'mobiliteit', type: 'reps',
    sets: 2, reps: 10, rest: 30, xp: 30,
    how: 'Op handen en knieën. Maak je rug rond als een kat, daarna hol als een koe. Beweeg rustig mee met je ademhaling.',
  },
  birdDog: {
    name: 'Vogel-hond', icon: '🐕', stat: 'stabiliteit', type: 'reps',
    sets: 3, reps: 8, rest: 45, xp: 45,
    how: 'Op handen en knieën. Strek tegelijk je rechterarm en linkerbeen uit, houd je rug stil. Wissel af.',
  },
  kneeToChest: {
    name: 'Knieën naar borst', icon: '🤗', stat: 'mobiliteit', type: 'hold',
    sets: 2, reps: 5, hold: 15, rest: 30, xp: 30,
    how: 'Lig op je rug en trek beide knieën rustig naar je borst. Voel een lichte rek in je onderrug.',
  },
  plank: {
    name: 'Plank', icon: '🪵', stat: 'stabiliteit', type: 'hold',
    sets: 3, reps: 1, hold: 30, rest: 60, xp: 50,
    how: 'Steun op onderarmen en tenen (of knieën). Lichaam in één rechte lijn, buik aangespannen. Blijf doorademen.',
  },
  pendulum: {
    name: 'Pendeloefening', icon: '🕰️', stat: 'mobiliteit', type: 'hold',
    sets: 2, reps: 2, hold: 30, rest: 30, xp: 25,
    how: 'Leun voorover met steun op een tafel. Laat je arm ontspannen hangen en maak kleine cirkeltjes door je lichaam te bewegen.',
  },
  scapSqueeze: {
    name: 'Schouderbladen knijpen', icon: '🦋', stat: 'stabiliteit', type: 'hold',
    sets: 2, reps: 10, hold: 5, rest: 30, xp: 30,
    how: 'Zit of sta rechtop. Trek je schouderbladen naar achteren en omlaag naar elkaar toe. Houd vast en ontspan.',
  },
  wallSlide: {
    name: 'Muurglijden', icon: '🧱', stat: 'mobiliteit', type: 'reps',
    sets: 2, reps: 10, rest: 30, xp: 35,
    how: 'Sta met je rug of onderarmen tegen de muur. Schuif je armen langzaam omhoog en weer omlaag, zonder op te trekken.',
  },
  extRotation: {
    name: 'Buitenwaartse rotatie (elastiek)', icon: '🎗️', stat: 'kracht', type: 'reps',
    sets: 3, reps: 12, rest: 45, xp: 40,
    how: 'Elleboog 90° tegen je zij. Draai je onderarm naar buiten tegen de weerstand van het elastiek in en langzaam terug.',
  },
  wallPushup: {
    name: 'Push-up tegen de muur', icon: '🙌', stat: 'kracht', type: 'reps',
    sets: 3, reps: 10, rest: 45, xp: 40,
    how: 'Handen op schouderhoogte tegen de muur. Buig je armen tot je neus bijna de muur raakt en duw terug.',
  },
  ankleAlphabet: {
    name: 'Enkel-alfabet', icon: '🔤', stat: 'mobiliteit', type: 'reps',
    sets: 2, reps: 1, rest: 20, xp: 25,
    how: 'Zit met je voet los van de grond. Schrijf met je grote teen het hele alfabet in de lucht. Eén alfabet = één herhaling.',
  },
  heelToe: {
    name: 'Koorddansen', icon: '🎪', stat: 'balans', type: 'reps',
    sets: 2, reps: 20, rest: 30, xp: 35,
    how: 'Loop in een rechte lijn en zet je hak telkens direct voor de tenen van je andere voet. Eén stap = één herhaling.',
  },
  eversion: {
    name: 'Enkel naar buiten (elastiek)', icon: '➰', stat: 'kracht', type: 'reps',
    sets: 3, reps: 12, rest: 30, xp: 35,
    how: 'Zit met een elastiek om je voorvoet. Draai je voet naar buiten tegen de weerstand in en langzaam terug.',
  },
  squat: {
    name: 'Squat', icon: '🏋️', stat: 'kracht', type: 'reps',
    sets: 3, reps: 12, rest: 60, xp: 50,
    how: 'Voeten op heupbreedte. Zak met je billen naar achteren alsof je op een stoel gaat zitten. Borst omhoog, hielen op de grond.',
  },
  lunge: {
    name: 'Uitvalspas', icon: '🚶', stat: 'balans', type: 'reps',
    sets: 3, reps: 10, rest: 60, xp: 50,
    how: 'Stap naar voren en zak tot beide knieën ongeveer 90° buigen. Duw terug. Wissel van been.',
  },
};

export const PROGRAMS = {
  knie: {
    name: 'Pad van de Knie', icon: '🦵', desc: 'Herstel na een knieblessure of operatie (bijv. kruisband).',
    exercises: ['quadSet', 'heelSlide', 'slr', 'bridge', 'miniSquat', 'singleLeg'],
  },
  rug: {
    name: 'Pad van de Rug', icon: '🧘', desc: 'Mobiliteit en stabiliteit bij lage rugklachten.',
    exercises: ['pelvicTilt', 'catCow', 'kneeToChest', 'bridge', 'birdDog', 'plank'],
  },
  schouder: {
    name: 'Pad van de Schouder', icon: '🤾', desc: 'Beweeglijkheid en kracht rond de schouder.',
    exercises: ['pendulum', 'scapSqueeze', 'wallSlide', 'extRotation', 'wallPushup'],
  },
  enkel: {
    name: 'Pad van de Enkel', icon: '🦶', desc: 'Na een verstuikte enkel: bewegen, kracht en balans.',
    exercises: ['ankleAlphabet', 'calfRaise', 'eversion', 'singleLeg', 'heelToe'],
  },
  fit: {
    name: 'Pad van de Kampioen', icon: '🏆', desc: 'Algemene kracht en stabiliteit voor als je weer fit bent.',
    exercises: ['squat', 'lunge', 'bridge', 'birdDog', 'plank', 'calfRaise'],
  },
};

export const CLASSES = {
  ridder: { name: 'Ridder', icon: '🛡️', hero: '🤺', bonus: 'kracht', desc: '+20% XP op krachtoefeningen' },
  woudloper: { name: 'Woudloper', icon: '🏹', hero: '🧝', bonus: 'balans', desc: '+20% XP op balansoefeningen' },
  magier: { name: 'Magiër', icon: '🔮', hero: '🧙', bonus: 'mobiliteit', desc: '+20% XP op mobiliteitsoefeningen' },
  bewaker: { name: 'Bewaker', icon: '🏰', hero: '💂', bonus: 'stabiliteit', desc: '+20% XP op stabiliteitsoefeningen' },
};

export const MONSTERS = [
  { name: 'Stijfheidsslijm', icon: '🟢', taunt: 'Blijf lekker stil zitten...' },
  { name: 'Pijngoblin', icon: '👺', taunt: 'Morgen begin je wel, toch?' },
  { name: 'Bankhangtrol', icon: '🧌', taunt: 'Nog één aflevering...' },
  { name: 'Zwellingdraak', icon: '🐉', taunt: 'Ik blaas je knie op!' },
  { name: 'Uitstelspook', icon: '👻', taunt: 'Oefenen? Straks hoor.' },
  { name: 'Krampkrab', icon: '🦀', taunt: 'Knijp, knijp!' },
  { name: 'Slaapsfinx', icon: '😴', taunt: 'Gaaap...' },
  { name: 'Wiebelwolf', icon: '🐺', taunt: 'Ik blaas je omver!' },
];

// Zones van de wereldkaart, ontgrendeld per level.
export const ZONES = [
  { from: 1, name: 'Het Herstelbos', icon: '🌲' },
  { from: 4, name: 'Mobiliteitsmoeras', icon: '🌾' },
  { from: 8, name: 'Balansbergen', icon: '⛰️' },
  { from: 12, name: 'Krachtkasteel', icon: '🏰' },
  { from: 17, name: 'Woestijn van Volharding', icon: '🏜️' },
  { from: 23, name: 'Top van Topvorm', icon: '🌋' },
];

export const SLOTS = { head: 'Hoofd', weapon: 'Wapen', shield: 'Schild', pet: 'Huisdier' };

export const ITEMS = {
  pet_kip: { name: 'Kuiken', icon: '🐥', slot: 'pet', price: 40 },
  helm_pet: { name: 'Petje', icon: '🧢', slot: 'head', price: 50 },
  zwaard_hout: { name: 'Houten zwaard', icon: '🗡️', slot: 'weapon', price: 60 },
  schild_hout: { name: 'Houten schild', icon: '🪵', slot: 'shield', price: 60 },
  pet_hond: { name: 'Trouwe hond', icon: '🐶', slot: 'pet', price: 120 },
  helm_ridder: { name: 'Ridderhelm', icon: '⛑️', slot: 'head', price: 150 },
  boog: { name: 'Elfenboog', icon: '🏹', slot: 'weapon', price: 180 },
  schild_ijzer: { name: 'IJzeren schild', icon: '🛡️', slot: 'shield', price: 200 },
  hoed_mag: { name: 'Tovenaarshoed', icon: '🎩', slot: 'head', price: 220 },
  staf: { name: 'Toverstaf', icon: '🪄', slot: 'weapon', price: 260 },
  pet_uil: { name: 'Wijze uil', icon: '🦉', slot: 'pet', price: 300 },
  kroon: { name: 'Gouden kroon', icon: '👑', slot: 'head', price: 600 },
  bijl: { name: 'Strijdbijl', icon: '🪓', slot: 'weapon', price: 450 },
  pet_draak: { name: 'Babydraak', icon: '🐲', slot: 'pet', price: 900 },
  schild_kristal: { name: 'Kristalschild', icon: '💎', slot: 'shield', price: 800 },
};

export const ACHIEVEMENTS = {
  first: { name: 'Eerste stap', icon: '👣', desc: 'Voltooi je eerste oefening.' },
  boss1: { name: 'Monsterjager', icon: '⚔️', desc: 'Versla je eerste dagmonster.' },
  streak3: { name: 'Op dreef', icon: '🔥', desc: '3 dagen op rij geoefend.' },
  streak7: { name: 'Weekstrijder', icon: '📅', desc: '7 dagen op rij geoefend.' },
  streak30: { name: 'Onverzettelijk', icon: '🗿', desc: '30 dagen op rij geoefend.' },
  lvl5: { name: 'Avonturier', icon: '🎒', desc: 'Bereik level 5.' },
  lvl10: { name: 'Held', icon: '🦸', desc: 'Bereik level 10.' },
  reps500: { name: 'Herhalingsheld', icon: '🔁', desc: '500 herhalingen in totaal.' },
  shopper: { name: 'Uitgedost', icon: '🛍️', desc: 'Koop je eerste item.' },
};
