/**
 * Controlled vocabularies for the exercise library. Stored as stable keys in the database,
 * labelled per locale in the UI. Adding a key here is backwards compatible.
 */
export type Locale = 'nl' | 'en';
export type Labelled = { key: string; nl: string; en: string };

export const BODY_REGIONS: Labelled[] = [
  { key: 'cervical_spine', nl: 'Cervicale wervelkolom', en: 'Cervical spine' },
  { key: 'thoracic_spine', nl: 'Thoracale wervelkolom', en: 'Thoracic spine' },
  { key: 'lumbar_spine', nl: 'Lumbale wervelkolom', en: 'Lumbar spine' },
  { key: 'shoulder', nl: 'Schouder', en: 'Shoulder' },
  { key: 'elbow', nl: 'Elleboog', en: 'Elbow' },
  { key: 'wrist_hand', nl: 'Pols en hand', en: 'Wrist and hand' },
  { key: 'hip', nl: 'Heup', en: 'Hip' },
  { key: 'knee', nl: 'Knie', en: 'Knee' },
  { key: 'ankle_foot', nl: 'Enkel en voet', en: 'Ankle and foot' },
  { key: 'full_body', nl: 'Totale lichaam', en: 'Full body' },
];

export const TRAINING_CATEGORIES: Labelled[] = [
  { key: 'mobility', nl: 'Mobiliteit', en: 'Mobility' },
  { key: 'strength', nl: 'Kracht', en: 'Strength' },
  { key: 'motor_control', nl: 'Motorische controle', en: 'Motor control' },
  { key: 'balance', nl: 'Balans', en: 'Balance' },
  { key: 'plyometrics', nl: 'Plyometrie', en: 'Plyometrics' },
  { key: 'sport_specific', nl: 'Sportspecifieke revalidatie', en: 'Sport-specific rehabilitation' },
  { key: 'isometric', nl: 'Isometrische training', en: 'Isometric training' },
  { key: 'eccentric', nl: 'Excentrische training', en: 'Eccentric training' },
  { key: 'concentric', nl: 'Concentrische training', en: 'Concentric training' },
  { key: 'neuromuscular', nl: 'Neuromusculaire oefeningen', en: 'Neuromuscular exercises' },
  { key: 'neurodynamics', nl: 'Neurodynamiek', en: 'Neurodynamics' },
  { key: 'conditioning', nl: 'Algemene conditie', en: 'General conditioning' },
];

export const MOVEMENT_CATEGORIES: Labelled[] = [
  { key: 'squat', nl: 'Squat / kniebuiging', en: 'Squat' },
  { key: 'hinge', nl: 'Heupscharnier', en: 'Hinge' },
  { key: 'lunge', nl: 'Lunge / uitvalspas', en: 'Lunge' },
  { key: 'push', nl: 'Duwen', en: 'Push' },
  { key: 'pull', nl: 'Trekken', en: 'Pull' },
  { key: 'rotation', nl: 'Rotatie', en: 'Rotation' },
  { key: 'carry', nl: 'Dragen', en: 'Carry' },
  { key: 'core_stability', nl: 'Rompstabiliteit', en: 'Core stability' },
  { key: 'raise', nl: 'Heffen', en: 'Raise' },
  { key: 'stretch', nl: 'Rekken', en: 'Stretch' },
  { key: 'jump', nl: 'Springen / landen', en: 'Jump / land' },
  { key: 'gait', nl: 'Lopen', en: 'Gait' },
];

export const EQUIPMENT: Labelled[] = [
  { key: 'none', nl: 'Geen materiaal', en: 'No equipment' },
  { key: 'resistance_band', nl: 'Weerstandsband', en: 'Resistance band' },
  { key: 'dumbbell', nl: 'Dumbbell', en: 'Dumbbell' },
  { key: 'kettlebell', nl: 'Kettlebell', en: 'Kettlebell' },
  { key: 'barbell', nl: 'Halter (barbell)', en: 'Barbell' },
  { key: 'cable', nl: 'Kabelapparaat', en: 'Cable machine' },
  { key: 'exercise_ball', nl: 'Fitbal', en: 'Exercise ball' },
  { key: 'balance', nl: 'Balansmateriaal', en: 'Balance equipment' },
  { key: 'bench', nl: 'Bank', en: 'Bench' },
  { key: 'gym_machine', nl: 'Fitnessapparaat', en: 'Gym machine' },
  { key: 'step', nl: 'Step / traptree', en: 'Step' },
  { key: 'wall', nl: 'Muur', en: 'Wall' },
  { key: 'towel', nl: 'Handdoek', en: 'Towel' },
  { key: 'pullup_bar', nl: 'Optrekstang', en: 'Pull-up bar' },
];

export const WEEKDAYS: Labelled[] = [
  { key: '1', nl: 'ma', en: 'Mon' },
  { key: '2', nl: 'di', en: 'Tue' },
  { key: '3', nl: 'wo', en: 'Wed' },
  { key: '4', nl: 'do', en: 'Thu' },
  { key: '5', nl: 'vr', en: 'Fri' },
  { key: '6', nl: 'za', en: 'Sat' },
  { key: '7', nl: 'zo', en: 'Sun' },
];

const byKey = (list: Labelled[]) => Object.fromEntries(list.map((l) => [l.key, l]));
const maps = {
  region: byKey(BODY_REGIONS),
  training: byKey(TRAINING_CATEGORIES),
  movement: byKey(MOVEMENT_CATEGORIES),
  equipment: byKey(EQUIPMENT),
};

export function label(kind: keyof typeof maps, key: string | null | undefined, locale: Locale): string {
  if (!key) return '';
  return maps[kind][key]?.[locale] ?? key;
}

export const isKey = (kind: keyof typeof maps, key: string) => key in maps[kind];
