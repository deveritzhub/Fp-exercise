/**
 * Search synonyms for the exercise library: everyday Dutch, English and clinical terms that
 * therapists type. Each group is matched as word prefixes, so "kuit" also finds "kuitheffen".
 * Keep entries lower case and without accents.
 */
export const SYNONYM_GROUPS: string[][] = [
  ['brug', 'bridge', 'bekkenbrug', 'bilbrug', 'glute bridge', 'heupbrug'],
  ['kuit', 'calf', 'hielheffen', 'kuitheffen', 'heel raise', 'calf raise', 'soleus', 'gastrocnemius'],
  ['achilles', 'achillespees', 'achilles tendon', 'kuit', 'calf'],
  ['squat', 'hurken', 'kniebuiging', 'zitten naar stoel', 'sit to stand'],
  ['lunge', 'uitvalspas', 'split squat', 'bulgarian'],
  ['deadlift', 'rdl', 'romp heup', 'heupscharnier', 'hinge'],
  ['plank', 'zijplank', 'side plank', 'planken'],
  ['band', 'elastiek', 'theraband', 'weerstandsband', 'resistance band'],
  ['hamstring', 'hamstrings', 'nordic', 'achterkant bovenbeen'],
  ['quadriceps', 'quad', 'bovenbeen', 'dijbeen', 'knie extensie', 'knee extension'],
  ['bil', 'bilspier', 'glute', 'gluteus', 'heupabductie', 'abductie', 'clamshell', 'schelp'],
  ['nek', 'neck', 'cervicaal', 'cervical', 'kin intrekken', 'kinintrekking', 'chin tuck'],
  ['rug', 'back', 'lage rug', 'low back', 'lumbaal', 'lumbar'],
  ['thoracaal', 'thoracic', 'bovenrug', 'upper back', 'borstwervel'],
  ['schouder', 'shoulder', 'rotator', 'rotatorcuff', 'rotator cuff', 'cuff', 'saps', 'subacromiaal'],
  ['schouderblad', 'scapula', 'scapulair', 'retractie', 'retraction'],
  ['knie', 'knee', 'patella', 'patellapees', 'vkb', 'acl', 'kruisband'],
  ['heup', 'hip', 'lies', 'groin', 'heupflexor', 'hip flexor', 'iliopsoas'],
  ['enkel', 'ankle', 'voet', 'foot', 'dorsaalflexie', 'dorsiflexion', 'tibialis', 'teen', 'toe'],
  ['balans', 'balance', 'evenwicht', 'stabiliteit', 'eenbeensstand', 'single leg', 'eenbenig'],
  ['sprong', 'springen', 'jump', 'hop', 'hoppen', 'pogo', 'bound', 'plyometrie', 'plyometric'],
  ['rek', 'rekken', 'stretch', 'stretching', 'mobiliteit', 'mobility', 'lenigheid'],
  ['isometrisch', 'isometric', 'isometrie', 'statisch', 'vasthouden'],
  ['excentrisch', 'eccentric', 'remmend'],
  ['zenuw', 'nerve', 'neurodynamiek', 'neurodynamics', 'slider', 'tensioner', 'ischias', 'sciatic', 'medianus', 'median', 'ulnaris', 'ulnar', 'slump'],
  ['romp', 'core', 'buik', 'abdominal', 'dead bug', 'bird dog', 'viervoetsstand'],
  ['opstappen', 'step up', 'step-up', 'traplopen', 'trede'],
  ['elleboog', 'elbow', 'tennisarm', 'golfarm', 'epicondyl'],
  ['pols', 'wrist', 'hand', 'grip', 'knijpen'],
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** All synonyms (single words) for a search word: groups where any entry starts with the word, or vice versa. */
export function synonymsFor(word: string): string[] {
  const w = norm(word);
  if (w.length < 3) return [];
  const out = new Set<string>();
  for (const g of SYNONYM_GROUPS) {
    if (g.some((term) => term.split(/[\s-]+/).some((part) => part.startsWith(w) || (part.length >= 4 && w.startsWith(part))))) {
      for (const term of g) for (const part of term.split(/[\s-]+/)) if (part.length >= 3 && part !== w) out.add(part);
    }
  }
  return [...out].slice(0, 24);
}
