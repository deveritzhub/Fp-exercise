import { Hono } from 'hono';
import { z } from 'zod';
import { withUser, type Tx } from '../db';
import { requirePatient, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { badRequest, notFound } from '../lib/errors';
import { FOOD_BY_KEY, MEALS, macrosOf, sumMacros } from '../../../shared/foods';
import { GOALS, RECIPE_BY_KEY } from '../../../shared/recipes';
import { PROTEIN } from '../../../shared/patientLogs';
import { ACTIVITY, PLAN_GOALS, nutritionTargets, type NutritionProfile } from '../../../shared/nutritionTargets';

/**
 * Nutrition for the patient: what was eaten (with its values), a daily guide from a small profile,
 * own products and favourite meals, a week overview, and a week plan with a shopping list. Private to
 * the patient. The protein of a saved meal also goes into the protein log, so the protein meter,
 * buffs and XP stay one story.
 */
export const nutrition = new Hono<AppEnv>();

const MAX_ITEMS_PER_SAVE = 30;
const MAX_ITEMS_PER_DAY = 120;
/** Logging is possible for today and the six days before (a forgotten day can be filled in). */
const DAYS_BACK = 6;
const dayRe = /^\d{4}-\d{2}-\d{2}$/;

const itemBody = z.object({
  foodKey: z.string().max(40).nullable().optional(),
  ownFoodId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(80),
  grams: z.number().int().min(1).max(3000),
  // Only for something in neither list; for a known food the server computes the values.
  kcal: z.number().min(0).max(5000).optional(),
  protein: z.number().min(0).max(400).optional(),
  carbs: z.number().min(0).max(800).optional(),
  fat: z.number().min(0).max(400).optional(),
});
type ItemIn = z.infer<typeof itemBody>;

const today = async (tx: Tx) => (await tx.query('SELECT now()::date::text AS d')).rows[0].d as string;
/** A day the patient may log for: today or up to six days back, never in the future. */
async function loggableDay(tx: Tx, day: string | undefined) {
  if (!day) return today(tx);
  if (!dayRe.test(day)) throw badRequest('invalid_input');
  const ok = (await tx.query('SELECT $1::date BETWEEN now()::date - $2::int AND now()::date AS ok', [day, DAYS_BACK])).rows[0].ok;
  if (!ok) throw badRequest('day_out_of_range');
  return day;
}

async function profileOf(tx: Tx, patientId: string) {
  const p = (await tx.query('SELECT sex, birth_year, activity, goal, hide_kcal, diet FROM nutrition_profiles WHERE patient_id = $1', [patientId])).rows[0];
  const body = (await tx.query('SELECT weight_kg, height_cm FROM patient_body_metrics WHERE patient_id = $1', [patientId])).rows[0];
  const profile: NutritionProfile & { diet: string } = {
    sex: p?.sex ?? null,
    birthYear: p?.birth_year ?? null,
    activity: p?.activity ?? 'licht',
    goal: p?.goal ?? 'onderhoud',
    hideKcal: !!p?.hide_kcal,
    diet: p?.diet ?? 'alles',
  };
  const weightKg = body?.weight_kg ? Number(body.weight_kg) : null;
  const heightCm = body?.height_cm ? Number(body.height_cm) : null;
  const targets = weightKg && heightCm ? nutritionTargets(profile, weightKg, heightCm) : null;
  return { profile, weightKg, heightCm, targets };
}

async function dayView(tx: Tx, patientId: string, day: string | null) {
  const d = day ?? (await today(tx));
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
  const own = (await tx.query('SELECT id, name, kcal, protein_g, carbs_g, fat_g, portion_g FROM own_foods WHERE patient_id = $1 ORDER BY name', [patientId])).rows.map((r) => ({
    id: r.id as string, name: r.name as string, kcal: Number(r.kcal), protein: Number(r.protein_g), carbs: Number(r.carbs_g), fat: Number(r.fat_g), portionG: Number(r.portion_g),
  }));
  const favorites = (await tx.query('SELECT id, name, meal, items FROM meal_favorites WHERE patient_id = $1 ORDER BY created_at', [patientId])).rows.map((r) => ({ id: r.id as string, name: r.name as string, meal: r.meal as string, items: r.items as ItemIn[] }));
  const { profile, weightKg, heightCm, targets } = await profileOf(tx, patientId);
  return {
    day: d, today: await today(tx), daysBack: DAYS_BACK, items: rows, totals, recent,
    proteinGoal: targets?.protein ?? (goal ? Number(goal.grams) : null),
    profile, weightKg, heightCm, targets, ownFoods: own, favorites,
  };
}

nutrition.get('/food', async (c) => {
  const { user, patient } = requirePatient(c);
  const day = c.req.query('day');
  if (day && !dayRe.test(day)) throw badRequest('invalid_input');
  return c.json(await withUser(user.id, (tx) => dayView(tx, patient.id, day ?? null)));
});

/** The last seven days: energy, protein and how many main meals were logged, per day. */
nutrition.get('/food/week', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(
    await withUser(user.id, async (tx) => {
      const rows = (
        await tx.query(
          `SELECT d::date::text AS day, coalesce(sum(f.kcal), 0)::int AS kcal, coalesce(sum(f.protein_g), 0)::float AS protein,
                  count(DISTINCT f.meal) FILTER (WHERE f.meal IN ('ontbijt', 'lunch', 'diner'))::int AS main_meals
             FROM generate_series(now()::date - 6, now()::date, interval '1 day') AS d
             LEFT JOIN food_logs f ON f.patient_id = $1 AND f.day = d::date
            GROUP BY d ORDER BY d`,
          [patient.id],
        )
      ).rows.map((r) => ({ day: r.day as string, kcal: Number(r.kcal), protein: Math.round(Number(r.protein) * 10) / 10, mainMeals: Number(r.main_meals) }));
      const { targets, profile } = await profileOf(tx, patient.id);
      return { days: rows, targets, hideKcal: profile.hideKcal };
    }),
  );
});

nutrition.post('/food', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ meal: z.enum(MEALS), day: z.string().optional(), items: z.array(itemBody).min(1).max(MAX_ITEMS_PER_SAVE) }), await c.req.json());
  return c.json(
    await withUser(user.id, async (tx) => {
      const day = await loggableDay(tx, b.day);
      const ownIds = b.items.map((i) => i.ownFoodId).filter(Boolean) as string[];
      const own = new Map(
        ownIds.length
          ? (await tx.query('SELECT id, name, kcal, protein_g, carbs_g, fat_g FROM own_foods WHERE patient_id = $1 AND id = ANY($2)', [patient.id, ownIds])).rows.map((r) => [r.id as string, r])
          : [],
      );
      const items = b.items.map((it) => {
        const food = it.foodKey ? FOOD_BY_KEY[it.foodKey] : undefined;
        if (it.foodKey && !food) throw badRequest('unknown_food');
        const mine = it.ownFoodId ? own.get(it.ownFoodId) : undefined;
        if (it.ownFoodId && !mine) throw badRequest('unknown_food');
        const k = it.grams / 100;
        const m = food
          ? macrosOf(food, it.grams)
          : mine
            ? { kcal: Math.round(Number(mine.kcal) * k), protein: Math.round(Number(mine.protein_g) * k * 10) / 10, carbs: Math.round(Number(mine.carbs_g) * k * 10) / 10, fat: Math.round(Number(mine.fat_g) * k * 10) / 10 }
            : { kcal: Math.round(it.kcal ?? 0), protein: it.protein ?? 0, carbs: it.carbs ?? 0, fat: it.fat ?? 0 };
        return { ...it, name: mine ? (mine.name as string) : it.name, foodKey: food?.key ?? null, ...m };
      });
      const n = (await tx.query('SELECT count(*)::int AS n FROM food_logs WHERE patient_id = $1 AND day = $2', [patient.id, day])).rows[0].n as number;
      if (n + items.length > MAX_ITEMS_PER_DAY) throw badRequest('too_many_food');
      // One protein entry for the whole meal (the protein log allows a dozen a day).
      const protein = Math.round(items.reduce((s, i) => s + i.protein, 0));
      let proteinLogId: string | null = null;
      if (protein >= PROTEIN.perEntryMin) {
        const count = (await tx.query('SELECT count(*)::int AS n FROM protein_logs WHERE patient_id = $1 AND day = $2', [patient.id, day])).rows[0].n as number;
        if (count < PROTEIN.maxEntriesPerDay) {
          const label = b.meal.charAt(0).toUpperCase() + b.meal.slice(1);
          proteinLogId = (
            await tx.query(
              `INSERT INTO protein_logs(patient_id, practice_id, day, grams, label) VALUES ($1, app.patient_practice($1), $2, $3, $4) RETURNING id`,
              [patient.id, day, Math.min(PROTEIN.perEntryMax, protein), label],
            )
          ).rows[0].id;
        }
      }
      for (const i of items) {
        await tx.query(
          `INSERT INTO food_logs(patient_id, practice_id, day, meal, name, food_key, grams, kcal, protein_g, carbs_g, fat_g, protein_log_id)
           VALUES ($1, app.patient_practice($1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [patient.id, day, b.meal, i.name, i.foodKey, i.grams, Math.min(5000, i.kcal), Math.min(400, i.protein), Math.min(800, i.carbs), Math.min(400, i.fat), proteinLogId],
        );
      }
      return dayView(tx, patient.id, day);
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

// ---- Profile for the daily guide ----
nutrition.put('/nutrition/profile', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(
    z.object({
      sex: z.enum(['m', 'v']).nullable(),
      birthYear: z.number().int().min(1900).max(2020).nullable(),
      activity: z.enum(ACTIVITY.map((a) => a.key) as [string, ...string[]]),
      goal: z.enum(PLAN_GOALS.map((g) => g.key) as [string, ...string[]]),
      hideKcal: z.boolean(),
      diet: z.enum(['alles', 'vegetarisch', 'veganistisch']),
      // Weight and height live with the hero's body metrics; filled in here they are kept there too.
      weightKg: z.number().min(30).max(300).nullable().optional(),
      heightCm: z.number().min(100).max(230).nullable().optional(),
    }),
    await c.req.json(),
  );
  return c.json(
    await withUser(user.id, async (tx) => {
      await tx.query(
        `INSERT INTO nutrition_profiles(patient_id, practice_id, sex, birth_year, activity, goal, hide_kcal, diet)
         VALUES ($1, app.patient_practice($1), $2, $3, $4, $5, $6, $7)
         ON CONFLICT (patient_id) DO UPDATE SET sex = EXCLUDED.sex, birth_year = EXCLUDED.birth_year, activity = EXCLUDED.activity,
           goal = EXCLUDED.goal, hide_kcal = EXCLUDED.hide_kcal, diet = EXCLUDED.diet, updated_at = now()`,
        [patient.id, b.sex, b.birthYear, b.activity, b.goal, b.hideKcal, b.diet],
      );
      if (b.weightKg || b.heightCm) {
        await tx.query(
          `INSERT INTO patient_body_metrics(patient_id, practice_id, weight_kg, height_cm) VALUES ($1, app.patient_practice($1), $2, $3)
           ON CONFLICT (patient_id) DO UPDATE SET weight_kg = coalesce($2, patient_body_metrics.weight_kg), height_cm = coalesce($3, patient_body_metrics.height_cm), updated_at = now()`,
          [patient.id, b.weightKg ?? null, b.heightCm ?? null],
        );
      }
      return dayView(tx, patient.id, null);
    }),
  );
});

// ---- Own products ----
nutrition.post('/food/own', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(
    z.object({
      name: z.string().trim().min(2).max(60),
      kcal: z.number().min(0).max(900),
      protein: z.number().min(0).max(100),
      carbs: z.number().min(0).max(100),
      fat: z.number().min(0).max(100),
      portionG: z.number().int().min(1).max(1000),
    }).refine((x) => x.protein + x.carbs + x.fat <= 100, 'per_100_g'),
    await c.req.json(),
  );
  return c.json(
    await withUser(user.id, async (tx) => {
      const n = (await tx.query('SELECT count(*)::int AS n FROM own_foods WHERE patient_id = $1', [patient.id])).rows[0].n as number;
      if (n >= 200) throw badRequest('too_many_own_foods');
      await tx.query(
        `INSERT INTO own_foods(patient_id, practice_id, name, kcal, protein_g, carbs_g, fat_g, portion_g) VALUES ($1, app.patient_practice($1), $2, $3, $4, $5, $6, $7)`,
        [patient.id, b.name, Math.round(b.kcal), b.protein, b.carbs, b.fat, b.portionG],
      );
      return dayView(tx, patient.id, null);
    }),
    201,
  );
});
nutrition.delete('/food/own/:id', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(
    await withUser(user.id, async (tx) => {
      const r = await tx.query('DELETE FROM own_foods WHERE id = $1 AND patient_id = $2', [id, patient.id]);
      if (!r.rowCount) throw notFound();
      return dayView(tx, patient.id, null);
    }),
  );
});

// ---- Favourite meals ----
nutrition.post('/food/favorites', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ name: z.string().trim().min(2).max(40), meal: z.enum(MEALS), items: z.array(itemBody).min(1).max(MAX_ITEMS_PER_SAVE) }), await c.req.json());
  return c.json(
    await withUser(user.id, async (tx) => {
      const n = (await tx.query('SELECT count(*)::int AS n FROM meal_favorites WHERE patient_id = $1', [patient.id])).rows[0].n as number;
      if (n >= 30) throw badRequest('too_many_favorites');
      await tx.query('INSERT INTO meal_favorites(patient_id, practice_id, name, meal, items) VALUES ($1, app.patient_practice($1), $2, $3, $4::jsonb)', [patient.id, b.name, b.meal, JSON.stringify(b.items)]);
      return dayView(tx, patient.id, null);
    }),
    201,
  );
});
nutrition.delete('/food/favorites/:id', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(
    await withUser(user.id, async (tx) => {
      const r = await tx.query('DELETE FROM meal_favorites WHERE id = $1 AND patient_id = $2', [id, patient.id]);
      if (!r.rowCount) throw notFound();
      return dayView(tx, patient.id, null);
    }),
  );
});

// ---- The week plan and its shopping list ----
const planBody = z.object({
  items: z
    .array(z.object({ day: z.number().int().min(0).max(6), meal: z.enum(MEALS), recipe: z.string().max(40), servings: z.number().int().min(1).max(8) }))
    .max(56)
    .refine((xs) => xs.every((x) => RECIPE_BY_KEY[x.recipe]), 'unknown_recipe'),
  checked: z.array(z.string().max(60)).max(200),
  goal: z.enum(GOALS).nullable(),
  // Own lines on the shopping list ("wc-papier", "koffie").
  extras: z.array(z.object({ id: z.string().max(40), text: z.string().trim().min(1).max(60) })).max(40).optional(),
});

const planView = async (tx: Tx, patientId: string) => {
  const r = (await tx.query('SELECT items, checked, goal, extras FROM meal_plans WHERE patient_id = $1', [patientId])).rows[0];
  return { items: r?.items ?? [], checked: r?.checked ?? [], goal: r?.goal ?? null, extras: r?.extras ?? [] };
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
        `INSERT INTO meal_plans(patient_id, practice_id, items, checked, goal, extras) VALUES ($1, app.patient_practice($1), $2::jsonb, $3::jsonb, $4, $5::jsonb)
         ON CONFLICT (patient_id) DO UPDATE SET items = EXCLUDED.items, checked = EXCLUDED.checked, goal = EXCLUDED.goal, extras = EXCLUDED.extras, updated_at = now()`,
        [patient.id, JSON.stringify(b.items), JSON.stringify(b.checked), b.goal, JSON.stringify(b.extras ?? [])],
      );
      return planView(tx, patient.id);
    }),
  );
});
