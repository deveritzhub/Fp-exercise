import { describe, expect, it } from 'vitest';
import { ATLAS_REGIONS, MUSCLES, NERVES, QUIZ_DAILY_CAP, QUIZ_XP, exerciseKind, musclesOf, nerveOf, nervesOf, questionById, quizQuestions, quizXp } from './muscleAtlas';

const ex = (p: Partial<Parameters<typeof musclesOf>[0]>) => ({ name: '', muscles: [], training: [], movement: null, sourceKey: null, tags: [], ...p });

describe('spierenatlas data', () => {
  it('every muscle has a known region and nerve, and unique keys', () => {
    const regions = new Set(ATLAS_REGIONS.map((r) => r.key));
    const nerves = new Set(NERVES.map((n) => n.key));
    expect(new Set(MUSCLES.map((m) => m.key)).size).toBe(MUSCLES.length);
    expect(MUSCLES.length).toBeGreaterThanOrEqual(40);
    for (const m of MUSCLES) {
      expect(regions.has(m.region), m.key).toBe(true);
      for (const n of nervesOf(m)) expect(nerves.has(n), `${m.key} ${n}`).toBe(true);
      expect(m.functions.length, m.key).toBeGreaterThan(0);
      expect(m.match.length, m.key).toBeGreaterThan(0);
    }
  });
  it('textbook facts the quiz relies on', () => {
    const m = (k: string) => MUSCLES.find((x) => x.key === k)!;
    expect(m('biceps').nerve).toBe('musculocutaneus');
    expect(m('biceps').functions.map((f) => f[0]).join(' ')).toMatch(/supinatie/);
    expect(m('triceps').nerve).toBe('radialis');
    expect(m('deltoideus').nerve).toBe('axillaris');
    expect(m('quadriceps').nerve).toBe('femoralis');
    expect(m('gluteus_maximus').nerve).toBe('gluteus_inferior');
    expect(m('tibialis_anterior').nerve).toBe('fibularis');
  });
  it('links exercises by their target muscles and sorts them by purpose', () => {
    expect(musclesOf(ex({ muscles: ['m. quadriceps femoris', 'm. gluteus maximus'] }))).toEqual(expect.arrayContaining(['quadriceps', 'gluteus_maximus']));
    expect(musclesOf(ex({ muscles: ['quadriceps, bilspieren'] }))).toEqual(expect.arrayContaining(['quadriceps', 'gluteus_maximus']));
    expect(musclesOf(ex({ name: 'Biceps curl' }))).toContain('biceps');
    expect(exerciseKind(ex({ training: ['strength'] }))).toBe('kracht');
    expect(exerciseKind(ex({ movement: 'stretch' }))).toBe('rek');
    expect(exerciseKind(ex({ sourceKey: 'nd_radial_slider', name: 'Radialis slider' }))).toBe('zenuw');
    expect(nerveOf(ex({ sourceKey: 'nd_radial_slider', name: 'Radialis slider', training: ['neurodynamics'] }))).toBe('radialis');
    expect(nerveOf(ex({ sourceKey: 'nd_slump_slider', name: 'Slump slider', training: ['neurodynamics'] }))).toBe('ischiadicus');
  });
});

describe('quiz', () => {
  const qs = quizQuestions();
  it('has stable, unique questions with four distinct options including the answer', () => {
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
    expect(qs.length).toBeGreaterThanOrEqual(80);
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.id)).size, q.id).toBe(4);
      expect(new Set(q.options.map((o) => o.label[0])).size, q.id).toBe(4);
      expect(q.options.some((o) => o.id === q.answer), q.id).toBe(true);
    }
    expect(quizQuestions().map((q) => q.options.map((o) => o.id))).toEqual(qs.map((q) => q.options.map((o) => o.id)));
  });
  it('a wrong option is never also true', () => {
    for (const q of qs) {
      if (q.id.endsWith(':zenuw')) {
        const m = MUSCLES.find((x) => x.key === q.muscle)!;
        for (const o of q.options) if (o.id !== q.answer) expect(nervesOf(m), q.id).not.toContain(o.id);
      } else if (q.id.startsWith('zenuw:')) {
        for (const o of q.options) if (o.id !== q.answer) expect(nervesOf(MUSCLES.find((x) => x.key === o.id)!), q.id).not.toContain(q.nerve);
      } else {
        const m = MUSCLES.find((x) => x.key === q.muscle)!;
        for (const o of q.options) if (o.id !== q.answer) expect(m.functions.map((f) => f[0]), q.id).not.toContain(o.label[0]);
      }
    }
  });
  it('XP: once per question, capped per day', () => {
    expect(quizXp([3])).toBe(3 * QUIZ_XP);
    expect(quizXp([QUIZ_DAILY_CAP + 7, 2])).toBe((QUIZ_DAILY_CAP + 2) * QUIZ_XP);
    expect(questionById('biceps:zenuw')?.answer).toBe('musculocutaneus');
    expect(questionById('nope')).toBeNull();
  });
});
