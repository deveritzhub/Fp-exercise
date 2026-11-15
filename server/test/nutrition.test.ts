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
    expect((await p.put('/patient/meal-plan', plan)).body).toEqual(plan);
    expect((await p.put('/patient/meal-plan', { ...plan, items: [{ day: 0, meal: 'diner', recipe: 'gif', servings: 1 }] })).status).toBe(400);
    const other = await login('patientB');
    expect((await other.get('/patient/meal-plan')).body.items).toEqual([]);
    expect((await other.get('/patient/food')).body.items).toEqual([]);
  });
});
