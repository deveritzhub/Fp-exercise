import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

let s: Seed;
beforeAll(async () => {
  s = await seedDb(true);
  resetRateLimits();
});

describe('practice village (staff)', () => {
  it('gives a home with a number and a level per patient, and no names', async () => {
    const A = await login('therapistA');
    const r = await A.get('/dashboard/village');
    expect(r.status).toBe(200);
    const homes = r.body.homes as { id: string; no: number; level: number; progress: number; week: number }[];
    expect(homes.length).toBeGreaterThan(0);
    expect(homes.map((h) => h.id)).toContain(s.patients.emma);
    expect(homes.map((h) => h.no)).toEqual(homes.map((_, i) => i + 1));
    for (const h of homes) {
      expect(Object.keys(h).sort()).toEqual(['id', 'level', 'no', 'progress', 'week']);
      expect(h.level).toBeGreaterThanOrEqual(1);
    }
    // Nothing that identifies a person: only the fields above.
    expect(JSON.stringify(r.body)).not.toMatch(/Emma|Jong|@|first|last|name/i);
  });

  it('adds the names only when the member asks for them', async () => {
    const A = await login('therapistA');
    const r = await A.get('/dashboard/village?names=1');
    expect(r.status).toBe(200);
    const emma = r.body.homes.find((h: { id: string }) => h.id === s.patients.emma);
    expect(emma.name).toBe('Emma de Jong');
    // Asking for names never widens who is listed.
    const plain = (await A.get('/dashboard/village')).body.homes.map((h: { id: string }) => h.id);
    expect(r.body.homes.map((h: { id: string }) => h.id)).toEqual(plain);
  });

  it('never shows another practice its patients, and is closed to patients', async () => {
    const A = await login('therapistA');
    const B = await login('therapistB');
    const a = (await A.get('/dashboard/village')).body.homes.map((h: { id: string }) => h.id);
    const b = (await B.get('/dashboard/village')).body.homes.map((h: { id: string }) => h.id);
    expect(a.filter((id: string) => b.includes(id))).toEqual([]);
    const P = await login('patientA');
    expect((await P.get('/dashboard/village')).status).toBe(403);
  });

  it('lets the treating member look into a home: the furniture, and nothing about coins', async () => {
    const A = await login('therapistA');
    const r = await A.get(`/dashboard/village/${s.patients.emma}/home`);
    expect(r.status).toBe(200);
    expect(Object.keys(r.body)).toEqual(['layout']);
    expect(Array.isArray(r.body.layout)).toBe(true);
    // Another practice, a patient and a made-up id get nothing.
    const B = await login('therapistB');
    expect((await B.get(`/dashboard/village/${s.patients.emma}/home`)).status).toBe(404);
    const P = await login('patientA');
    expect((await P.get(`/dashboard/village/${s.patients.emma}/home`)).status).toBe(403);
    expect((await A.get('/dashboard/village/not-an-id/home')).status).toBe(404);
  });
});
