/**
 * Mobility self-tests: simple, published field tests a person can do at home with a tape measure,
 * so they can follow their mobility over time. Every test is measured in centimetres.
 *
 * Only tests with published reliability are included. Results are compared with the person's own
 * earlier results (and left with right), not with norms: norms differ by age, sex and sport.
 */

export type MobilityTestKey = 'knee_to_wall' | 'fingertip_floor' | 'back_scratch' | 'chair_sit_reach';
export type MobilitySide = 'left' | 'right' | 'none';
type Fn = readonly [nl: string, en: string];

export type MobilityTest = {
  key: MobilityTestKey;
  name: Fn;
  /** What it says something about. */
  measures: Fn;
  /** True when one side at a time is measured (left and right). */
  sides: boolean;
  /** What "left" means for this test. */
  sideNote?: Fn;
  /** Allowed values in cm (negative = not reached, for tests that can overshoot). */
  min: number;
  max: number;
  /** For tests that can come short or reach past: what minus and plus mean (entered as a choice). */
  sign?: { minus: Fn; plus: Fn };
  /** Higher or lower is more mobile. */
  better: 'higher' | 'lower';
  /** Smallest change that is more than measurement error (cm), only where it is published. */
  realChange?: number;
  steps: readonly Fn[];
  howToRead: Fn;
  source: string;
  /** Who should not do it without asking their physiotherapist first. */
  caution: Fn;
};

export const MOBILITY_TESTS: readonly MobilityTest[] = [
  {
    key: 'knee_to_wall',
    name: ['Knie-tot-muur-test (enkel)', 'Knee-to-wall test (ankle)'],
    measures: ['Hoe ver je enkel buigt met je gewicht erop: belangrijk voor squatten, traplopen en hardlopen.', 'How far your ankle bends with weight on it: important for squatting, stairs and running.'],
    sides: true,
    sideNote: ['Kant = de voet vooraan.', 'Side = the front foot.'],
    min: 0,
    max: 25,
    better: 'higher',
    realChange: 1.5,
    steps: [
      ['Leg een meetlint op de grond, haaks op een muur. Doe je schoen uit.', 'Put a tape measure on the floor, at right angles to a wall. Take your shoe off.'],
      ['Zet je voet met de grote teen bij het lint, een paar centimeter van de muur. Het andere been staat erachter.', 'Place your foot with the big toe on the tape, a few centimetres from the wall. The other leg stands behind.'],
      ['Buig de voorste knie naar de muur. De hiel blijft op de grond en de knie gaat recht over de tweede teen.', 'Bend the front knee towards the wall. The heel stays down and the knee goes straight over the second toe.'],
      ['Raakt de knie de muur? Schuif de voet een stukje naar achteren en probeer opnieuw.', 'Does the knee touch the wall? Move the foot back a little and try again.'],
      ['Noteer de grootste afstand van grote teen tot muur waarbij de knie de muur nog raakt met de hiel op de grond.', 'Note the largest distance from big toe to wall at which the knee still touches the wall with the heel down.'],
    ],
    howToRead: ['Meer centimeters is een beweeglijkere enkel. Vergelijk links met rechts.', 'More centimetres is a more mobile ankle. Compare left with right.'],
    source: 'Bennell e.a. 1998; Powden e.a. 2015 (systematische review)',
    caution: ['Niet doen bij een verse enkelblessure of als je niet op het been mag steunen.', 'Do not do it with a fresh ankle injury or if you may not bear weight on the leg.'],
  },
  {
    key: 'fingertip_floor',
    name: ['Vinger-vloerafstand (rug en hamstrings)', 'Fingertip-to-floor (back and hamstrings)'],
    measures: ['Hoe ver je voorover buigt: rug en achterkant van de benen samen.', 'How far you bend forward: back and the back of the legs together.'],
    sides: false,
    min: 0,
    max: 60,
    better: 'lower',
    steps: [
      ['Sta op blote voeten, voeten bij elkaar, knieën gestrekt.', 'Stand barefoot, feet together, knees straight.'],
      ['Buig rustig voorover en laat je armen en hoofd hangen, zo ver als comfortabel. Niet veren.', 'Bend forward slowly and let your arms and head hang, as far as comfortable. Do not bounce.'],
      ['Laat iemand de afstand meten van de punt van je middelvinger tot de grond.', 'Have someone measure the distance from the tip of your middle finger to the floor.'],
      ['Raak je de grond? Vul 0 in.', 'Touching the floor? Enter 0.'],
    ],
    howToRead: ['Minder centimeters is beter: 0 betekent dat je de grond raakt.', 'Fewer centimetres is better: 0 means you touch the floor.'],
    source: 'Perret e.a. 2001',
    caution: ['Niet doen als voorover buigen je is afgeraden, bijvoorbeeld kort na een heup- of rugoperatie of bij botontkalking.', 'Do not do it if bending forward has been advised against, for example shortly after hip or back surgery or with osteoporosis.'],
  },
  {
    key: 'back_scratch',
    name: ['Rugkrabtest (schouders)', 'Back scratch test (shoulders)'],
    measures: ['Hoe ver je schouders draaien en heffen, bijvoorbeeld om je rug te wassen of een jas aan te trekken.', 'How far your shoulders turn and lift, for example to wash your back or put on a coat.'],
    sides: true,
    sideNote: ['Kant = de arm die over je schouder gaat.', 'Side = the arm that goes over your shoulder.'],
    min: -40,
    max: 30,
    sign: { minus: ['Gat ertussen', 'Gap between'], plus: ['Overlap', 'Overlap'] },
    better: 'higher',
    steps: [
      ['Sta rechtop. Breng één hand over dezelfde schouder naar beneden op je rug, handpalm naar je rug.', 'Stand upright. Bring one hand over the same shoulder down your back, palm towards your back.'],
      ['Breng de andere hand van onderen omhoog op je rug, handrug tegen je rug.', 'Bring the other hand up your back from below, back of the hand against your back.'],
      ['Schuif de middelvingers zo dicht mogelijk naar elkaar toe. Niet trekken.', 'Slide the middle fingers as close together as you can. Do not pull.'],
      ['Laat iemand de afstand tussen de middelvingers meten. Een gat vul je in als min (bijvoorbeeld -8), overlap als plus (bijvoorbeeld 3), net raken is 0.', 'Have someone measure the distance between the middle fingers. Enter a gap as minus (for example -8), an overlap as plus (for example 3); just touching is 0.'],
    ],
    howToRead: ['Hoger is beter. Verschil tussen links en rechts is heel gewoon; volg vooral je eigen verloop.', 'Higher is better. A difference between left and right is very common; mainly follow your own trend.'],
    source: 'Rikli & Jones, Senior Fitness Test (1999, 2001)',
    caution: ['Niet doen kort na een schouderoperatie of bij een schouder die uit de kom is geweest, tenzij je fysiotherapeut het goed vindt.', 'Do not do it shortly after shoulder surgery or after a dislocated shoulder, unless your physiotherapist agrees.'],
  },
  {
    key: 'chair_sit_reach',
    name: ['Stoel-zit-en-reiktest (achterkant been)', 'Chair sit-and-reach (back of the leg)'],
    measures: ['Hoe soepel de achterkant van je been en je onderrug zijn, zittend gemeten.', 'How supple the back of your leg and your lower back are, measured seated.'],
    sides: true,
    sideNote: ['Kant = het gestrekte been.', 'Side = the straight leg.'],
    min: -40,
    max: 30,
    sign: { minus: ['Niet tot je tenen', 'Short of your toes'], plus: ['Voorbij je tenen', 'Past your toes'] },
    better: 'higher',
    steps: [
      ['Zet een stevige stoel tegen de muur. Ga op het voorste deel van de zitting zitten.', 'Put a sturdy chair against the wall. Sit on the front part of the seat.'],
      ['Strek één been naar voren, hiel op de grond en tenen omhoog. Het andere been is gebogen met de voet plat.', 'Stretch one leg forward, heel on the floor and toes up. The other leg is bent with the foot flat.'],
      ['Leg de handen op elkaar en reik rustig langs het gestrekte been naar je tenen. Houd 2 tellen vast; de knie blijft gestrekt.', 'Put your hands on top of each other and reach slowly along the straight leg towards your toes. Hold for 2 counts; the knee stays straight.'],
      ['Laat iemand de afstand meten van je vingertoppen tot je tenen. Kom je er niet: min (bijvoorbeeld -6). Voorbij je tenen: plus. Net raken is 0.', 'Have someone measure from your fingertips to your toes. Not reaching: minus (for example -6). Past your toes: plus. Just touching is 0.'],
    ],
    howToRead: ['Hoger is beter. Vergelijk links met rechts en volg je eigen verloop.', 'Higher is better. Compare left with right and follow your own trend.'],
    source: 'Rikli & Jones, Senior Fitness Test (1999, 2001)',
    caution: ['Niet doen kort na een heupoperatie of als voorover buigen je is afgeraden.', 'Do not do it shortly after hip surgery or if bending forward has been advised against.'],
  },
] as const;

export const MOBILITY_TEST_KEYS = MOBILITY_TESTS.map((x) => x.key) as [MobilityTestKey, ...MobilityTestKey[]];

export const mobilityTest = (key: string) => MOBILITY_TESTS.find((x) => x.key === key) ?? null;

/** Values are stored to the half centimetre: a tape measure is not more precise at home. */
export const roundCm = (v: number) => Math.round(v * 2) / 2;

export function validMobilityValue(key: MobilityTestKey, side: MobilitySide, cm: number) {
  const t = mobilityTest(key);
  if (!t || !Number.isFinite(cm)) return false;
  if (t.sides ? side === 'none' : side !== 'none') return false;
  return cm >= t.min && cm <= t.max;
}

export type MobilityResult = { test: MobilityTestKey; side: MobilitySide; day: string; cm: number };

export type MobilityTrend = {
  side: MobilitySide;
  points: { day: string; cm: number }[];
  latest: number | null;
  first: number | null;
  /** Latest minus first, signed so that positive is always "more mobile". */
  gain: number | null;
  /** 'better' / 'worse' only when the change is larger than the published measurement error. */
  verdict: 'better' | 'worse' | 'same' | 'unknown';
};

/** Per side: the results in time order, the change since the first measurement and what it means. */
export function mobilityTrends(test: MobilityTest, results: MobilityResult[]): MobilityTrend[] {
  const sides: MobilitySide[] = test.sides ? ['left', 'right'] : ['none'];
  return sides.map((side) => {
    const points = results.filter((r) => r.test === test.key && r.side === side).sort((a, b) => a.day.localeCompare(b.day)).map((r) => ({ day: r.day, cm: r.cm }));
    const first = points[0]?.cm ?? null;
    const latest = points.at(-1)?.cm ?? null;
    const raw = first !== null && latest !== null && points.length > 1 ? latest - first : null;
    const gain = raw === null ? null : roundCm(test.better === 'higher' ? raw : -raw);
    let verdict: MobilityTrend['verdict'] = 'unknown';
    if (gain !== null && test.realChange) verdict = gain >= test.realChange ? 'better' : gain <= -test.realChange ? 'worse' : 'same';
    return { side, points, latest, first, gain, verdict };
  });
}

/** Difference between left and right on the latest measurements (cm, absolute), or null. */
export function sideDifference(trends: MobilityTrend[]) {
  const l = trends.find((x) => x.side === 'left')?.latest;
  const r = trends.find((x) => x.side === 'right')?.latest;
  return l == null || r == null ? null : roundCm(Math.abs(l - r));
}
