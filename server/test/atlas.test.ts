import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';
import { login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import { QUIZ_DAILY_CAP, QUIZ_XP, quizQuestions } from '../../shared/muscleAtlas';

const ownerQuery = async (sql: string, params: unknown[] = []) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return await db.query(sql, params);
  } finally {
    await db.end();
  }
};

beforeAll(async () => {
  await seedDb();
  resetRateLimits();
});

describe('spierenatlas', () => {
  it('links visible exercises to muscles; staff and anonymous get nothing', async () => {
    const emma = await login('patientA');
    const r = await emma.get('/patient/atlas');
    expect(r.status).toBe(200);
    expect(r.body.exercises.length).toBeGreaterThan(5);
    const quad = r.body.exercises.filter((e: { muscles: string[] }) => e.muscles.includes('quadriceps'));
    expect(quad.length).toBeGreaterThan(0);
    expect(r.body.quiz).toMatchObject({ correct: [], todayCount: 0, dailyCap: QUIZ_DAILY_CAP, xp: 0 });
    expect((await (await login('therapistA')).get('/patient/atlas')).status).toBe(403);
  });

  it('a right answer earns XP once; a wrong one costs nothing; past the daily cap nothing is used up', async () => {
    const emma = await login('patientA');
    const qs = quizQuestions();
    const xp0 = (await emma.get('/patient/hero')).body.level.xp as number;
    const wrongOpt = qs[0].options.find((o) => o.id !== qs[0].answer)!.id;
    const wrong = (await emma.post('/patient/atlas/quiz', { questionId: qs[0].id, answer: wrongOpt })).body;
    expect(wrong).toMatchObject({ correct: false, xp: 0, answer: qs[0].answer });
    expect(wrong.explain[0]).toBeTruthy();
    const right = (await emma.post('/patient/atlas/quiz', { questionId: qs[0].id, answer: qs[0].answer })).body;
    expect(right).toMatchObject({ correct: true, xp: QUIZ_XP });
    expect((await emma.post('/patient/atlas/quiz', { questionId: qs[0].id, answer: qs[0].answer })).body.xp).toBe(0);
    expect((await emma.get('/patient/hero')).body.level.xp).toBe(xp0 + QUIZ_XP);

    for (const q of qs.slice(1, QUIZ_DAILY_CAP)) await emma.post('/patient/atlas/quiz', { questionId: q.id, answer: q.answer });
    const over = qs[QUIZ_DAILY_CAP];
    const capped = (await emma.post('/patient/atlas/quiz', { questionId: over.id, answer: over.answer })).body;
    expect(capped).toMatchObject({ correct: true, xp: 0 });
    expect(capped.quiz.correct).not.toContain(over.id);
    expect(capped.quiz.todayCount).toBe(QUIZ_DAILY_CAP);
    expect((await emma.post('/patient/atlas/quiz', { questionId: 'nope:nope', answer: 'a' })).body.error).toBe('unknown_question');
    // Level 2 stays closed until most of level 1 is right.
    const l2 = qs.find((q) => q.level === 2)!;
    expect((await emma.post('/patient/atlas/quiz', { questionId: l2.id, answer: l2.answer })).body.error).toBe('quiz_level_locked');
  });

  it('answers are private to the patient', async () => {
    const noah = await login('patientB');
    expect((await noah.get('/patient/atlas')).body.quiz.correct).toEqual([]);
    const rows = (await ownerQuery('SELECT count(*)::int AS n FROM hero_quiz_answers')).rows[0].n;
    expect(rows).toBeGreaterThan(0);
  });
});

describe('spierenatlas for professionals', () => {
  it('lists the library linked to muscles; patients cannot use it', async () => {
    const pro = await login('therapistA');
    const r = await pro.get('/atlas');
    expect(r.status).toBe(200);
    expect(r.body.exercises.some((e: { muscles: string[] }) => e.muscles.includes('quadriceps'))).toBe(true);
    expect((await (await login('patientA')).get('/atlas')).status).toBe(403);
  });

  it('the library filters on an atlas muscle or nerve', async () => {
    const pro = await login('therapistA');
    const all = (await pro.get('/exercises?limit=100')).body.total as number;
    const quad = (await pro.get('/exercises?muscle=quadriceps&limit=100')).body;
    expect(quad.total).toBeGreaterThan(0);
    expect(quad.total).toBeLessThan(all);
    for (const e of quad.items) expect(JSON.stringify([e.targetMuscles, e.nameNl, e.nameEn]).toLowerCase()).toMatch(/quadriceps|vastus|rectus femoris|dijspier|quads/);
    expect((await pro.get('/exercises?nerve=femoralis&limit=100')).body.total).toBeGreaterThan(0);
    expect((await pro.get('/exercises?muscle=nope')).body.error).toBe('unknown_muscle');
  });
});

describe('sending a muscle card to a patient', () => {
  it('a professional sends it to their own patient; it arrives as a notification that opens the card', async () => {
    resetRateLimits();
    const pro = await login('therapistA');
    const pid = (await ownerQuery(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-a.test'`)).rows[0].id;
    const r = await pro.post('/atlas/send', { patientId: pid, muscle: 'gluteus_medius', note: 'Deze trainen we met de schelp.' });
    expect(r.body).toEqual({ ok: true, delivered: true });
    const home = (await (await login('patientA')).get('/patient/home')).body;
    const n = home.notifications.find((x: { link: string }) => x.link === '/p/spieren?tab=spieren&open=gluteus_medius');
    expect(n).toMatchObject({ title: 'Lees over de middelste bilspier', body: 'Deze trainen we met de schelp.' });
    expect((await pro.post('/atlas/send', { patientId: pid, muscle: 'nope' })).body.error).toBe('unknown_muscle');
  });

  it('not to a patient of another practice, and not by a patient', async () => {
    resetRateLimits();
    const other = (await ownerQuery(`SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'patient@praktijk-b.test'`)).rows[0].id;
    expect((await (await login('therapistA')).post('/atlas/send', { patientId: other, muscle: 'biceps' })).status).toBe(404);
    expect((await (await login('patientA')).post('/atlas/send', { patientId: other, muscle: 'biceps' })).status).toBe(403);
  });
});

describe('skills from the quiz and the strength log', () => {
  it('a right quiz answer opens Kennis; a logged set gives Strength XP', async () => {
    resetRateLimits();
    const noah = await login('patientB');
    const skill = async (k: string) => (await noah.get('/patient/hero')).body.skills.find((s: { key: string }) => s.key === k);
    expect((await skill('knowledge')).locked).toBe(true);
    const q = quizQuestions().find((x) => x.level === 1)!;
    await noah.post('/patient/atlas/quiz', { questionId: q.id, answer: q.answer });
    const k = await skill('knowledge');
    expect(k.locked).toBe(false);
    expect(k.xp).toBeGreaterThan(0);
    const before = (await skill('strength')).xp as number;
    expect((await noah.post('/patient/gym/sets', { exerciseName: 'Atlas test press', weightKg: 20, reps: 8 })).status).toBe(201);
    expect((await skill('strength')).xp).toBe(before + 5);
  });
});
