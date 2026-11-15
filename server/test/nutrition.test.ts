import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

beforeAll(async () => {
  await seedDb(true);
  resetRateLimits();
});

describe('nutrition: what was eaten, with its protein in the protein log', () => {
  it('computes the values of known foods itself, links the protein, and a removed item takes its protein along', async () => {
    const p = await login('patientA');
    const saved = await p.post('/patient/food', {
      meal: 'ontbijt',
      items: [
        // The client sends silly values for a known food: the server ignores them.
        { foodKey: 'kwark', name: 'Magere kwark', grams: 250, kcal: 999, protein: 300 },
        { foodKey: 'banaan', name: 'Banaan', grams: 100 },
        { name: 'Zelfgebakken muffin', grams: 80, kcal: 320, protein: 5, carbs: 40, fat: 15 },
      ],
    });
    expect(saved.status).toBe(201);
    expect(saved.body.items).toHaveLength(3);
    expect(saved.body.items[0]).toMatchObject({ kcal: 150, protein: 25 });
    expect(saved.body.totals.protein).toBeCloseTo(25 + 1.1 + 5, 1);

    const day = (await p.get('/patient/food')).body;
    expect(day.items.map((i: { name: string }) => i.name)).toEqual(['Magere kwark', 'Banaan', 'Zelfgebakken muffin']);
    expect(day.recent.map((r: { name: string }) => r.name)).toContain('Magere kwark');

    // Removing the quark: the meal's protein entry is written again with what is left.
    const after = await p.del(`/patient/food/${day.items[0].id}`);
    expect(after.status).toBe(200);
    expect(after.body.items).toHaveLength(2);
    expect(after.body.totals.protein).toBeCloseTo(6.1, 1);
  });

  it('refuses an unknown food key and an empty meal', async () => {
    const p = await login('patientA');
    expect((await p.post('/patient/food', { meal: 'lunch', items: [{ foodKey: 'drakenvlees', name: 'x', grams: 10 }] })).body.error).toBe('unknown_food');
    expect((await p.post('/patient/food', { meal: 'lunch', items: [] })).status).toBe(400);
  });

  it('saves a week plan with known recipes only; another patient cannot see it', async () => {
    const p = await login('patientA');
    const plan = { items: [{ day: 0, meal: 'diner', recipe: 'kip_rijst_broccoli', servings: 3 }], checked: ['kipfilet'], goal: 'spiergroei' };
    expect((await p.put('/patient/meal-plan', plan)).body).toEqual({ ...plan, extras: [] });
    expect((await p.put('/patient/meal-plan', { ...plan, items: [{ day: 0, meal: 'diner', recipe: 'gif', servings: 1 }] })).status).toBe(400);
    const other = await login('patientB');
    expect((await other.get('/patient/meal-plan')).body.items).toEqual([]);
    expect((await other.get('/patient/food')).body.items).toEqual([]);
  });
});

describe('nutrition, step two', () => {
  it('a profile gives a daily guide; own products count by their own values; favourites and earlier days work', async () => {
    const p = await login('patientA');
    // Weight and height come from the body metrics the hero already keeps.
    const db = (await import('pg')).default;
    const owner = new db.Client({ connectionString: process.env.DATABASE_OWNER_URL });
    await owner.connect();
    const [pt] = (await owner.query(`SELECT id FROM patients WHERE email = 'patient@praktijk-a.test'`)).rows;
    await owner.query(
      `INSERT INTO patient_body_metrics(patient_id, practice_id, weight_kg, height_cm) VALUES ($1, (SELECT practice_id FROM patients WHERE id = $1), 70, 170)
       ON CONFLICT (patient_id) DO UPDATE SET weight_kg = 70, height_cm = 170`,
      [pt.id],
    );
    const prof = await p.put('/patient/nutrition/profile', { sex: 'v', birthYear: 1991, activity: 'licht', goal: 'onderhoud', hideKcal: true, diet: 'vegetarisch' });
    expect(prof.status).toBe(200);
    expect(prof.body.targets.kcal).toBeGreaterThan(1800);
    expect(prof.body.profile).toMatchObject({ hideKcal: true, diet: 'vegetarisch' });
    expect(prof.body.proteinGoal).toBe(112);

    const own = await p.post('/patient/food/own', { name: 'Oma’s erwtensoep', kcal: 90, protein: 6, carbs: 10, fat: 3, portionG: 300 });
    expect(own.status).toBe(201);
    const id = own.body.ownFoods[0].id;
    expect((await p.post('/patient/food/own', { name: 'Onmogelijk', kcal: 500, protein: 60, carbs: 50, fat: 10, portionG: 100 })).status).toBe(400);

    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    const logged = await p.post('/patient/food', { meal: 'diner', day: yesterday, items: [{ ownFoodId: id, name: 'x', grams: 300 }] });
    expect(logged.status).toBe(201);
    expect(logged.body.day).toBe(yesterday);
    expect(logged.body.items[0]).toMatchObject({ name: 'Oma’s erwtensoep', kcal: 270, protein: 18 });
    const longAgo = new Date(Date.now() - 20 * 86400_000).toISOString().slice(0, 10);
    expect((await p.post('/patient/food', { meal: 'diner', day: longAgo, items: [{ foodKey: 'appel', name: 'Appel', grams: 150 }] })).body.error).toBe('day_out_of_range');

    const fav = await p.post('/patient/food/favorites', { name: 'Mijn ontbijt', meal: 'ontbijt', items: [{ foodKey: 'kwark', name: 'Kwark', grams: 250 }] });
    expect(fav.body.favorites.map((f: { name: string }) => f.name)).toContain('Mijn ontbijt');

    const week = (await p.get('/patient/food/week')).body;
    expect(week.days).toHaveLength(7);
    expect(week.days.find((d: { day: string }) => d.day === yesterday).mainMeals).toBeGreaterThanOrEqual(1);
    expect(week.hideKcal).toBe(true);

    const plan = await p.put('/patient/meal-plan', { items: [], checked: ['x-1'], goal: null, extras: [{ id: 'x-1', text: 'Koffie' }] });
    expect(plan.body.extras).toEqual([{ id: 'x-1', text: 'Koffie' }]);
    await owner.end();
  });
});
