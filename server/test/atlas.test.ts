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
