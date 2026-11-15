import { Hono } from 'hono';
import { z } from 'zod';
import { withUser, type Tx } from '../db';
import { requirePatient, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { badRequest, notFound } from '../lib/errors';
import { FOOD_BY_KEY, MEALS, macrosOf, sumMacros } from '../../../shared/foods';
import { GOALS, RECIPE_BY_KEY } from '../../../shared/recipes';
import { PROTEIN } from '../../../shared/patientLogs';

/**
 * Nutrition for the patient: what was eaten (with its values), and a week plan with a shopping list.
 * Private to the patient. The protein of a saved meal also goes into the protein log, so the protein
 * meter, buffs and XP stay one story.
 */
export const nutrition = new Hono<AppEnv>();

const MAX_ITEMS_PER_SAVE = 30;
const MAX_ITEMS_PER_DAY = 120;
const dayRe = /^\d{4}-\d{2}-\d{2}$/;

const itemBody = z.object({
  foodKey: z.string().max(40).nullable().optional(),
  name: z.string().trim().min(1).max(80),
  grams: z.number().int().min(1).max(3000),
  // Only for something not in the food list; for a known food the server computes the values.
  kcal: z.number().min(0).max(5000).optional(),
  protein: z.number().min(0).max(400).optional(),
  carbs: z.number().min(0).max(800).optional(),
  fat: z.number().min(0).max(400).optional(),
});

async function dayView(tx: Tx, patientId: string, day: string | null) {
  const d = day ?? ((await tx.query('SELECT now()::date::text AS d')).rows[0].d as string);
  const rows = (
    await tx.query(
      `SELECT id, meal, name, food_key, grams, kcal, protein_g, carbs_g, fat_g, created_at FROM food_logs
        WHERE patient_id = $1 AND day = $2 ORDER BY created_at`,
      [patientId, d],
    )
  ).rows.map((r) => ({ id: r.id as string, meal: r.meal as string, name: r.name as string, foodKey: r.food_key as string | null, grams: Number(r.grams), kcal: Number(r.kcal), protein: Number(r.protein_g), carbs: Number(r.carbs_g), fat: Number(r.fat_g) }));
  const totals = sumMacros(rows);
  // What the patient eats often, for one-tap buttons: the most logged foods of the last month.
  const recent = (
    await tx.query(
      `SELECT name, food_key, round(avg(grams))::int AS grams, count(*)::int AS n FROM food_logs
        WHERE patient_id = $1 AND day > now()::date - 30 GROUP BY name, food_key ORDER BY n DESC, max(created_at) DESC LIMIT 10`,
      [patientId],
    )
  ).rows.map((r) => ({ name: r.name as string, foodKey: r.food_key as string | null, grams: Number(r.grams) }));
  const goal = (await tx.query('SELECT grams FROM protein_goals WHERE patient_id = $1', [patientId])).rows[0];
  return { day: d, items: rows, totals, recent, proteinGoal: goal ? Number(goal.grams) : null };
}

nutrition.get('/food', async (c) => {
  const { user, patient } = requirePatient(c);
  const day = c.req.query('day');
  if (day && !dayRe.test(day)) throw badRequest('invalid_input');
  return c.json(await withUser(user.id, (tx) => dayView(tx, patient.id, day ?? null)));
});

nutrition.post('/food', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ meal: z.enum(MEALS), items: z.array(itemBody).min(1).max(MAX_ITEMS_PER_SAVE) }), await c.req.json());
  const items = b.items.map((it) => {
    const food = it.foodKey ? FOOD_BY_KEY[it.foodKey] : undefined;
    if (it.foodKey && !food) throw badRequest('unknown_food');
    const m = food ? macrosOf(food, it.grams) : { kcal: Math.round(it.kcal ?? 0), protein: it.protein ?? 0, carbs: it.carbs ?? 0, fat: it.fat ?? 0 };
    return { ...it, foodKey: food?.key ?? null, ...m };
  });
  return c.json(
    await withUser(user.id, async (tx) => {
      const n = (await tx.query('SELECT count(*)::int AS n FROM food_logs WHERE patient_id = $1 AND day = now()::date', [patient.id])).rows[0].n as number;
      if (n + items.length > MAX_ITEMS_PER_DAY) throw badRequest('too_many_food');
      // One protein entry for the whole meal (the protein log allows a dozen a day).
      const protein = Math.round(items.reduce((s, i) => s + i.protein, 0));
      let proteinLogId: string | null = null;
      if (protein >= PROTEIN.perEntryMin) {
        const count = (await tx.query('SELECT count(*)::int AS n FROM protein_logs WHERE patient_id = $1 AND day = now()::date', [patient.id])).rows[0].n as number;
        if (count < PROTEIN.maxEntriesPerDay) {
          const label = b.meal.charAt(0).toUpperCase() + b.meal.slice(1);
          proteinLogId = (
            await tx.query(
              `INSERT INTO protein_logs(patient_id, practice_id, day, grams, label) VALUES ($1, app.patient_practice($1), now()::date, $2, $3) RETURNING id`,
              [patient.id, Math.min(PROTEIN.perEntryMax, protein), label],
            )
          ).rows[0].id;
        }
      }
      for (const i of items) {
        await tx.query(
          `INSERT INTO food_logs(patient_id, practice_id, day, meal, name, food_key, grams, kcal, protein_g, carbs_g, fat_g, protein_log_id)
           VALUES ($1, app.patient_practice($1), now()::date, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [patient.id, b.meal, i.name, i.foodKey, i.grams, Math.min(5000, i.kcal), Math.min(400, i.protein), Math.min(800, i.carbs), Math.min(400, i.fat), proteinLogId],
        );
      }
      return dayView(tx, patient.id, null);
    }),
    201,
  );
});

/** Remove one item. Its meal's protein entry is written again without it. */
nutrition.delete('/food/:id', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(
    await withUser(user.id, async (tx) => {
      const row = (await tx.query('SELECT protein_log_id, day::text AS day FROM food_logs WHERE id = $1 AND patient_id = $2', [id, patient.id])).rows[0];
      if (!row) throw notFound();
      await tx.query('DELETE FROM food_logs WHERE id = $1', [id]);
      if (row.protein_log_id) {
        const left = (await tx.query('SELECT id, protein_g FROM food_logs WHERE protein_log_id = $1', [row.protein_log_id])).rows;
        const old = (await tx.query('SELECT label FROM protein_logs WHERE id = $1', [row.protein_log_id])).rows[0];
        await tx.query('DELETE FROM protein_logs WHERE id = $1', [row.protein_log_id]);
        const grams = Math.round(left.reduce((s, r) => s + Number(r.protein_g), 0));
        if (left.length && grams >= PROTEIN.perEntryMin) {
          const nid = (
            await tx.query(
              `INSERT INTO protein_logs(patient_id, practice_id, day, grams, label) VALUES ($1, app.patient_practice($1), $2, $3, $4) RETURNING id`,
              [patient.id, row.day, Math.min(PROTEIN.perEntryMax, grams), old?.label ?? null],
            )
          ).rows[0].id;
          await tx.query('UPDATE food_logs SET protein_log_id = $1 WHERE protein_log_id IS NULL AND id = ANY($2)', [nid, left.map((r) => r.id)]);
        }
      }
      return dayView(tx, patient.id, row.day);
    }),
  );
});

// ---- The week plan and its shopping list ----
const planBody = z.object({
  items: z
    .array(z.object({ day: z.number().int().min(0).max(6), meal: z.enum(MEALS), recipe: z.string().max(40), servings: z.number().int().min(1).max(8) }))
    .max(56)
    .refine((xs) => xs.every((x) => RECIPE_BY_KEY[x.recipe]), 'unknown_recipe'),
  checked: z.array(z.string().max(40)).max(200),
  goal: z.enum(GOALS).nullable(),
});

const planView = async (tx: Tx, patientId: string) => {
  const r = (await tx.query('SELECT items, checked, goal FROM meal_plans WHERE patient_id = $1', [patientId])).rows[0];
  return { items: r?.items ?? [], checked: r?.checked ?? [], goal: r?.goal ?? null };
};

nutrition.get('/meal-plan', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(await withUser(user.id, (tx) => planView(tx, patient.id)));
});

nutrition.put('/meal-plan', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(planBody, await c.req.json());
  return c.json(
    await withUser(user.id, async (tx) => {
      await tx.query(
        `INSERT INTO meal_plans(patient_id, practice_id, items, checked, goal) VALUES ($1, app.patient_practice($1), $2::jsonb, $3::jsonb, $4)
         ON CONFLICT (patient_id) DO UPDATE SET items = EXCLUDED.items, checked = EXCLUDED.checked, goal = EXCLUDED.goal, updated_at = now()`,
        [patient.id, JSON.stringify(b.items), JSON.stringify(b.checked), b.goal],
      );
      return planView(tx, patient.id);
    }),
  );
});
