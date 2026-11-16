import { describe, expect, it } from 'vitest';
import { matchExercise, parseWorkoutText } from './workoutText';

const LIB = [
  { id: 'cp', nameNl: 'Chest press machine', nameEn: 'Machine chest press' },
  { id: 'bb', nameNl: 'Barbell row', nameEn: 'Barbell row' },
  { id: 'sc', nameNl: 'Seated cable row', nameEn: 'Seated cable row' },
  { id: 'dc', nameNl: 'Dumbbell curl', nameEn: 'Dumbbell curl' },
  { id: 'bp', nameNl: 'Barbell bench press', nameEn: 'Barbell bench press' },
  { id: 'sq', nameNl: 'Back squat', nameEn: 'Back squat' },
  { id: 'lp', nameNl: 'Leg press', nameEn: 'Leg press' },
  { id: 'pu', nameNl: 'Opdrukken', nameEn: 'Push-up' },
  { id: 'ca', nameNl: 'Staande kuitheffen', nameEn: 'Standing calf raise' },
];

describe('a workout typed in plain words', () => {
  it('reads the example sentence: cycling minutes, then three strength exercises', () => {
    const r = parseWorkoutText("Vandaag heb ik 5'min gefietst 3 sets chest press 3x row biceps curl", LIB);
    expect(r.cardio).toEqual([{ kind: 'cycle', minutes: 5, label: 'Fietsen' }]);
    expect(r.strength.map((s) => [s.candidates[0]?.id, s.sets])).toEqual([['cp', 3], ['bb', 3], ['dc', null]]);
    expect(r.unknown).toEqual([]);
  });
  it('reads sets, reps and weight in the usual ways', () => {
    const r = parseWorkoutText('3x10 bankdrukken 60 kg, leg press 4 sets 12 herhalingen 100kg, chest press 10x 40 kg', LIB);
    expect(r.strength.map((s) => [s.candidates[0]?.id, s.sets, s.reps, s.weightKg])).toEqual([
      ['bp', 3, 10, 60],
      ['lp', 4, 12, 100],
      ['cp', null, 10, 40],
    ]);
  });
  it('understands Dutch names, an hour, and other cardio', () => {
    const r = parseWorkoutText('half uur gewandeld en 1 uur zwemmen, 20 push ups, kuitheffen', LIB);
    expect(r.cardio.map((c) => [c.kind, c.minutes])).toEqual([['walk', 30], ['swim', 60]]);
    expect(r.strength.map((s) => s.candidates[0]?.id)).toEqual(['pu', 'ca']);
  });
  it('an exercise not in the library becomes one of your own; a lone stray word stays unknown', () => {
    const r = parseWorkoutText('3 sets zandzak tillen, 10x 20 kg, en hoppa', LIB);
    expect(r.strength.map((s) => [s.text, s.candidates.length, s.sets, s.reps, s.weightKg])).toEqual([['zandzak tillen', 0, 3, 10, 20]]);
    expect(r.unknown).toEqual(['hoppa']);
  });
  it('the example sentence still works with a library that has none of these exercises', () => {
    const r = parseWorkoutText("Vandaag heb ik 5'min gefietst 3 sets chest press 3x row biceps curl", []);
    expect(r.cardio.map((c) => c.minutes)).toEqual([5]);
    expect(r.strength.map((s) => [s.text, s.sets])).toEqual([['chest press', 3], ['row', 3], ['dumbbell curl', null]]);
  });
  it('a word like "dumbbell" alone names no exercise', () => {
    const lib = [{ id: 'ex', nameNl: 'Exorotatie in zijlig met dumbbell', nameEn: 'Side-lying external rotation with dumbbell' }];
    expect(parseWorkoutText('biceps curl', lib).strength.map((s) => [s.text, s.candidates.length])).toEqual([['dumbbell curl', 0]]);
  });
  it('a word that fits several exercises offers all of them', () => {
    expect(matchExercise('row', LIB).map((e) => e.id)).toEqual(['bb', 'sc']);
  });
});
