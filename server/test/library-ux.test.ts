import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

const names = (r: any) => r.body.items.map((e: any) => e.nameNl);

describe('library search', () => {
  it('finds exercises by English and Dutch names and by synonyms', async () => {
    const c = await login('therapistA');
    expect(names(await c.get('/exercises?q=glute bridge'))[0]).toBe('Bekkenbrug');
    expect(names(await c.get('/exercises?q=bekkenbrug'))[0]).toBe('Bekkenbrug');
    // synonyms: "calf" (EN) → kuit/hielheffen (NL), "elastiek" → band exercises
    expect(names(await c.get('/exercises?q=calf'))).toContain('Hielheffen staand');
    expect(names(await c.get('/exercises?q=bridge'))).toContain('Bekkenbrug');
    expect(names(await c.get('/exercises?q=elastiek')).some((n: string) => /band/i.test(n))).toBe(true);
  });

  it('ranks names that start with the search term first', async () => {
    const c = await login('therapistA');
    expect(names(await c.get('/exercises?q=dead'))[0]).toBe('Dead bug');
  });

  it('pages through results with offset', async () => {
    const c = await login('therapistA');
    const a = await c.get('/exercises?limit=10&offset=0');
    const b = await c.get('/exercises?limit=10&offset=10');
    expect(a.body.total).toBeGreaterThan(20);
    expect(names(a).filter((n: string) => names(b).includes(n))).toEqual([]);
  });
});

describe('quick add to a programme', () => {
  it('appends one exercise with its dose, versions the programme and notifies the patient', async () => {
    const c = await login('therapistA');
    const ex = (await c.get('/exercises?q=dead bug')).body.items[0];
    const before = (await c.get(`/programs/${s.programs.emma}`)).body;
    const r = await c.post(`/programs/${s.programs.emma}/items`, { exerciseId: ex.id, sets: 2, reps: 8, holdS: null, restS: 30, days: [1, 3, 5] });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ items: before.items.length + 1, notifiedPatient: true });
    const after = (await c.get(`/programs/${s.programs.emma}`)).body;
    expect(after.version).toBe(before.version + 1);
    // Existing items keep their ids (logs stay linked); the new one is last with the chosen dose.
    expect(after.items.slice(0, -1).map((i: any) => i.id)).toEqual(before.items.map((i: any) => i.id));
    expect(after.items.at(-1)).toMatchObject({ exerciseId: ex.id, sets: 2, reps: 8, restS: 30, days: [1, 3, 5] });
    const versions = (await c.get(`/programs/${s.programs.emma}/versions`)).body.items;
    expect(versions[0].changeNote).toBe('Oefening toegevoegd: Dead bug');
  });

  it('is refused for programmes of another practice and validates the dose', async () => {
    const other = await login('therapistB');
    const ex = (await other.get('/exercises?q=dead bug')).body.items[0];
    expect((await other.post(`/programs/${s.programs.emma}/items`, { exerciseId: ex.id })).status).toBe(404);
    const c = await login('therapistA');
    expect((await c.post(`/programs/${s.programs.emma}/items`, { exerciseId: ex.id, sets: 99 })).status).toBe(400);
  });
});
