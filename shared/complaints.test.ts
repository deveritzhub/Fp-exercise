import { describe, it, expect } from 'vitest';
import { BODY_AREAS } from './hero';
import { CHAINS, COMPENSATIONS, COMPLAINTS, REGIONS, regionForArea, complaintsForExercise, templatesFor, complaintMuscles, complaintsIn, muscleInChains, proposeExercises, searchComplaints, whyFor, type ProposalExercise } from './complaints';
import { MUSCLES, NERVES, quizQuestions } from './muscleAtlas';
import { MOBILITY_TESTS } from './mobilityTests';

const muscle = (k: string) => MUSCLES.some((m) => m.key === k);

describe('complaint guide data', () => {
  it('every reference points to something that exists', () => {
    for (const c of CHAINS) for (const m of c.links) expect(muscle(m), `${c.key}: ${m}`).toBe(true);
    for (const x of COMPENSATIONS) {
      for (const m of [...x.weak, ...x.over]) expect(muscle(m), `${x.key}: ${m}`).toBe(true);
      expect(CHAINS.some((c) => c.key === x.chain), x.key).toBe(true);
      if (x.mobilityTest) expect(MOBILITY_TESTS.some((t) => t.key === x.mobilityTest)).toBe(true);
      // Never the same muscle as weak and as taking over.
      expect(x.weak.filter((m) => x.over.includes(m)), x.key).toEqual([]);
    }
    for (const c of COMPLAINTS) {
      expect(REGIONS.some((r) => r.key === c.region), c.key).toBe(true);
      for (const k of c.chains) expect(CHAINS.some((x) => x.key === k), `${c.key}: ${k}`).toBe(true);
      for (const k of c.compensations) expect(COMPENSATIONS.some((x) => x.key === k), `${c.key}: ${k}`).toBe(true);
      for (const m of [...(c.train ?? []), ...(c.calm ?? [])]) expect(muscle(m), `${c.key}: ${m}`).toBe(true);
      for (const n of c.nerves ?? []) expect(NERVES.some((x) => x.key === n), `${c.key}: ${n}`).toBe(true);
      for (const t of c.mobilityTests ?? []) expect(MOBILITY_TESTS.some((x) => x.key === t)).toBe(true);
    }
  });

  it('covers every region with at least one complaint and red flags, in both languages', () => {
    for (const r of REGIONS) {
      expect(complaintsIn(r.key).length, r.key).toBeGreaterThan(0);
      expect(r.redFlags.length, r.key).toBeGreaterThanOrEqual(3);
    }
    const keys = COMPLAINTS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of COMPLAINTS) expect(c.name[0] && c.name[1] && c.what[0] && c.what[1], c.key).toBeTruthy();
    for (const x of COMPENSATIONS) for (const f of [x.name, x.see, x.test, x.approach, x.cue, x.adjust, x.patientWhy]) expect(f[0] && f[1], x.key).toBeTruthy();
  });

  it('finds complaints by everyday words and synonyms', () => {
    expect(searchComplaints('loperknie').map((c) => c.key)).toContain('itbs');
    expect(searchComplaints('tennis').map((c) => c.key)).toContain('tennisarm');
    expect(searchComplaints('ischias').map((c) => c.key)).toContain('rug_uitstraling');
    expect(searchComplaints('Achilles').map((c) => c.key)).toContain('achilles');
    expect(searchComplaints('a')).toEqual([]);
  });

  it('TFL overuse: train the gluteus medius, calm the TFL', () => {
    const itbs = COMPLAINTS.find((c) => c.key === 'itbs')!;
    const m = complaintMuscles(itbs);
    expect(m.train).toContain('gluteus_medius');
    expect(m.calm).toContain('tfl');
    expect(m.train).not.toContain('tfl');
  });

  it('lateral hip pain: no compressive stretch with the leg crossed', () => {
    const ex = (id: string, nameNl: string, kind: string, muscles: string[]): ProposalExercise => ({ id, nameNl, nameEn: nameNl, kind, muscles });
    const p = proposeExercises(COMPLAINTS.find((c) => c.key === 'gluteale_tendinopathie')!, [ex('a', 'TFL en buitenkant heup rekken in stand', 'rek', ['tfl']), ex('b', 'Zijlig heupabductie met de hiel voorop', 'kracht', ['gluteus_medius'])]);
    expect([...p.calm, ...p.activate, ...p.function].map((e) => e.id)).toEqual(['b']);
  });

  it('builds a proposal: fitting names first, each exercise once, sliders for radiating pain', () => {
    const ex = (id: string, nameNl: string, kind: string, muscles: string[], nerve: string | null = null): ProposalExercise => ({ id, nameNl, nameEn: nameNl, kind, muscles, nerve });
    const lib = [
      ex('1', 'Heupabductie staand met band', 'kracht', ['gluteus_medius', 'tfl']),
      ex('2', 'Clamshell', 'kracht', ['gluteus_medius']),
      ex('3', 'Step-down', 'kracht', ['quadriceps', 'gluteus_medius']),
      ex('4', 'TFL rekken', 'rek', ['tfl']),
      ex('5', 'Biceps curl', 'kracht', ['biceps']),
      ex('6', 'Ischiadicus slider', 'zenuw', [], 'ischiadicus'),
    ];
    const itbs = proposeExercises(COMPLAINTS.find((c) => c.key === 'itbs')!, lib);
    expect(itbs.activate.map((e) => e.id)[0]).toBe('2');
    expect(itbs.function.map((e) => e.id)).toEqual(['3']);
    expect(itbs.calm.map((e) => e.id)).toEqual(['4']);
    expect([...itbs.activate, ...itbs.function, ...itbs.calm].map((e) => e.id)).not.toContain('5');
    const back = proposeExercises(COMPLAINTS.find((c) => c.key === 'rug_uitstraling')!, lib);
    expect(back.calm.map((e) => e.id)).toContain('6');
  });
});

describe('plain words for the patient', () => {
  const ex = (nameNl: string, kind: string, muscles: string[]): ProposalExercise => ({ id: nameNl, nameNl, nameEn: nameNl, kind, muscles });
  const itbs = COMPLAINTS.find((c) => c.key === 'itbs')!;
  it('explains why, per block, without jargon', () => {
    expect(whyFor(itbs, ex('Clamshell', 'kracht', ['gluteus_medius']), 'activate', true)).toMatch(/middelste bilspier sterker/);
    expect(whyFor(itbs, ex('TFL rekken', 'rek', ['tfl']), 'calm', true)).toBe('Deze oefening geeft je spanner van de brede peesplaat meer ruimte, zodat je middelste bilspier en kleine bilspier het werk weer kunnen doen.');
    expect(whyFor(itbs, ex('Step-down', 'kracht', ['quadriceps']), 'function', false)).toMatch(/practise the movement/);
    expect(whyFor(COMPLAINTS.find((c) => c.key === 'rug_uitstraling')!, { ...ex('Slider', 'zenuw', []), nerve: 'ischiadicus' }, 'calm', true)).toMatch(/zenuw rustig/);
  });
  it('knows where a muscle plays a part', () => {
    const g = muscleInChains('gluteus_medius');
    expect(g.asWeak.map((c) => c.key)).toContain('tfl_gmed');
    expect(g.complaints.map((c) => c.key)).toEqual(expect.arrayContaining(['itbs', 'pfps']));
    expect(muscleInChains('tfl').asOver.map((c) => c.key)).toEqual(['tfl_gmed']);
  });
});




describe('phases and the pain map', () => {
  const ex = (id: string, nameNl: string, muscles: string[]): ProposalExercise => ({ id, nameNl, nameEn: nameNl, kind: 'kracht', muscles });
  const lib = [ex('iso', 'Isometrische heupabductie tegen muur', ['gluteus_medius']), ex('side', 'Zijlig heupabductie', ['gluteus_medius']), ex('jump', 'Laterale sprong met landing', ['gluteus_medius']), ex('step', 'Step-down', ['gluteus_medius'])];
  const itbs = COMPLAINTS.find((c) => c.key === 'itbs')!;
  it('irritable: isometrics first and no jumping; sport: jumping first', () => {
    const calm = proposeExercises(itbs, lib, 5, 'prikkelbaar');
    expect(calm.activate[0].id).toBe('iso');
    expect([...calm.activate, ...calm.function].map((e) => e.id)).not.toContain('jump');
    const sport = proposeExercises(itbs, lib, 5, 'sport');
    expect(sport.function[0].id).toBe('jump');
  });
  it('shoulder: pushing and pulling are the functional step, but not overhead while irritable', () => {
    const saps = COMPLAINTS.find((c) => c.key === 'saps')!;
    const { train } = proposeExercises(saps, []);
    const m = [train[0]];
    const sh = [ex('er', 'Externe rotatie met band', m), ex('ohp', 'Overhead press', m)];
    // Activation takes the rotator exercise first; the press is left for the functional block.
    expect(proposeExercises(saps, sh, 1).function.map((e) => e.id)).toEqual(['ohp']);
    expect(proposeExercises(saps, sh, 1, 'prikkelbaar').function).toEqual([]);
  });
  it('every pain-map area leads to a guide region', () => {
    for (const a of BODY_AREAS) expect(regionForArea(a.key), a.key).toBeTruthy();
  });
});


describe('exercise → complaints', () => {
  it('a glute medius exercise fits ITBS as strengthening; a TFL stretch as offloading', () => {
    const fits = complaintsForExercise({ id: 'x', nameNl: 'Zijlig heupabductie', nameEn: 'Side-lying abduction', kind: 'kracht', muscles: ['gluteus_medius'] });
    expect(fits.find((f) => f.complaint.key === 'itbs')?.block).toBe('activate');
    const tfl = complaintsForExercise({ id: 'y', nameNl: 'TFL rekken', nameEn: 'TFL stretch', kind: 'rek', muscles: ['tfl'] });
    expect(tfl.find((f) => f.complaint.key === 'itbs')?.block).toBe('calm');
    // Never for lateral hip pain (compressive stretch).
    expect(tfl.find((f) => f.complaint.key === 'gluteale_tendinopathie')).toBeUndefined();
  });
});


describe('existing practice programmes', () => {
  it('finds templates whose title fits, best hint first', () => {
    const list = [{ title: 'Patellapees — belastingsopbouw' }, { title: 'Achillespees — belastingsopbouw' }, { title: 'Nek — mobiliteit en kracht' }];
    expect(templatesFor(COMPLAINTS.find((c) => c.key === 'achilles')!, list).map((x) => x.title)).toEqual(['Achillespees — belastingsopbouw']);
    expect(templatesFor(COMPLAINTS.find((c) => c.key === 'patellapees')!, list).map((x) => x.title)).toEqual(['Patellapees — belastingsopbouw']);
    expect(templatesFor(COMPLAINTS.find((c) => c.key === 'pfps')!, list)).toEqual([]);
  });
});


describe('compensation quiz', () => {
  it('one level 2 question per pattern; the answer is what takes over, no other option is', () => {
    const qs = quizQuestions().filter((q) => q.id.startsWith('comp:'));
    expect(qs.length).toBe(COMPENSATIONS.length);
    for (const q of qs) {
      const c = COMPENSATIONS.find((x) => `comp:${x.key}` === q.id)!;
      expect(q.level).toBe(2);
      expect(q.answer).toBe(c.over[0]);
      const related = new Set(COMPENSATIONS.filter((x) => x.weak.includes(c.weak[0])).flatMap((x) => [...x.over, ...x.weak]));
      for (const o of q.options) if (o.id !== q.answer) expect(related.has(o.id), q.id + ' ' + o.id).toBe(false);
    }
    expect(qs.find((q) => q.id === 'comp:tfl_gmed')!.q[0]).toBe('Als je middelste bilspier zwak is, welke spier neemt dan vaak het werk over?');
  });
});
