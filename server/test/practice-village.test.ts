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

  it('never shows another practice its patients, and is closed to patients', async () => {
    const A = await login('therapistA');
    const B = await login('therapistB');
    const a = (await A.get('/dashboard/village')).body.homes.map((h: { id: string }) => h.id);
    const b = (await B.get('/dashboard/village')).body.homes.map((h: { id: string }) => h.id);
    expect(a.filter((id: string) => b.includes(id))).toEqual([]);
    const P = await login('patientA');
    expect((await P.get('/dashboard/village')).status).toBe(403);
  });
});
