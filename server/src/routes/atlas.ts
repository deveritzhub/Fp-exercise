import { Hono } from 'hono';
import { z } from 'zod';
import { withUser, type Tx } from '../db';
import { requirePatient, type AppEnv } from '../middleware';
import { parse } from '../lib/validate';
import { badRequest } from '../lib/errors';
import { QUIZ_DAILY_CAP, QUIZ_LEVEL_XP, exerciseKind, level2Open, musclesOf, nerveOf, questionById, quizXp, type AtlasExerciseKind } from '../../../shared/muscleAtlas';

/**
 * Spierenatlas for the patient: the exercises they may see (central library and their own
 * practice, through RLS) linked to muscles and nerves, and the anatomy quiz. Answers are checked
 * here against the shared question data; the client is never trusted with XP.
 */
export const atlasPatient = new Hono<AppEnv>();

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });

async function quizState(tx: Tx, patientId: string) {
  const rows = (await tx.query(`SELECT question_id, to_char(day, 'YYYY-MM-DD') AS day FROM hero_quiz_answers WHERE patient_id = $1 ORDER BY created_at`, [patientId])).rows as { question_id: string; day: string }[];
  const correct = rows.map((r) => r.question_id);
  const todayCount = rows.filter((r) => r.day === today()).length;
  return {
    correct, todayCount, dailyCap: QUIZ_DAILY_CAP, xpPerAnswer: QUIZ_LEVEL_XP[1], xpPerLevel: QUIZ_LEVEL_XP,
    level2: level2Open(correct),
    xp: quizXp(rows.map((r) => ({ day: r.day, questionId: r.question_id }))),
  };
}

/** XP from the quiz, for the hero's level (used by heroState). */
export async function quizXpFor(tx: Tx, patientId: string) {
  return (await quizState(tx, patientId)).xp;
}

atlasPatient.get('/atlas', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(
    await withUser(user.id, async (tx) => {
      const rows = (
        await tx.query(
          `SELECT id, practice_id, name_nl, name_en, target_muscles, training_categories, movement_category, source_key, tags,
                  movement_nl, movement_en, instructions_nl, instructions_en
             FROM exercises WHERE archived_at IS NULL
            ORDER BY practice_id NULLS LAST, name_nl LIMIT 1500`,
        )
      ).rows;
      // A practice copy of a central exercise shows once (the practice's own wins: it is listed first).
      const seen = new Set<string>();
      const exercises: { id: string; nameNl: string; nameEn: string; kind: AtlasExerciseKind; muscles: string[]; nerve: string | null; movementNl: string; movementEn: string; instructionsNl: string; instructionsEn: string }[] = [];
      for (const r of rows) {
        const key = (r.name_nl as string).toLowerCase().trim();
        if (seen.has(key)) continue;
        const input = { name: `${r.name_nl} ${r.name_en}`, muscles: r.target_muscles ?? [], training: r.training_categories ?? [], movement: r.movement_category, sourceKey: r.source_key, tags: r.tags ?? [] };
        const muscles = musclesOf(input);
        const nerve = nerveOf(input);
        if (!muscles.length && !nerve) continue;
        seen.add(key);
        exercises.push({
          id: r.id, nameNl: r.name_nl, nameEn: r.name_en, kind: exerciseKind(input), muscles, nerve,
          movementNl: r.movement_nl ?? '', movementEn: r.movement_en ?? '', instructionsNl: r.instructions_nl ?? '', instructionsEn: r.instructions_en ?? '',
        });
      }
      return { exercises, quiz: await quizState(tx, patient.id) };
    }),
  );
});

/** Answer a quiz question. A first correct answer is stored and earns XP (up to the daily cap). */
atlasPatient.post('/atlas/quiz', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ questionId: z.string().min(3).max(60), answer: z.string().min(1).max(60) }), await c.req.json());
  const q = questionById(b.questionId);
  if (!q) throw badRequest('unknown_question');
  return c.json(
    await withUser(user.id, async (tx) => {
      const state = await quizState(tx, patient.id);
      if (q.level === 2 && !state.level2) throw badRequest('quiz_level_locked');
      const correct = b.answer === q.answer;
      let xp = 0;
      // Past today's cap a right answer is not stored, so it can still earn XP another day.
      if (correct && state.todayCount < QUIZ_DAILY_CAP) {
        const r = await tx.query('INSERT INTO hero_quiz_answers(patient_id, question_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [patient.id, q.id]);
        if (r.rowCount) xp = QUIZ_LEVEL_XP[q.level];
      }
      return { correct, answer: q.answer, explain: q.explain, xp, quiz: await quizState(tx, patient.id) };
    }),
  );
});
