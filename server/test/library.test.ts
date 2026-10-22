import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

const file = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../db/seed-data/fp-library.json'), 'utf8'));
const phases = file.programmas.reduce((n: number, p: any) => n + p.fases.length, 0);

let s: Awaited<ReturnType<typeof seedDb>>;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

describe('importing a practice library (Functional Performance JSON)', () => {
  it('only owners/admins can import; invalid files are rejected', async () => {
    const therapist = await login('therapistA');
    expect((await therapist.post('/practice/library-import', file)).status).toBe(403);
    const owner = await login('ownerA');
    expect((await owner.post('/practice/library-import', { oefeningen: [] })).status).toBe(400);
    expect((await owner.post('/practice/library-import', { oefeningen: [{ id: 'x' }] })).status).toBe(400);
  });

  it('imports all exercises and one template per phase, as practice-owned content', async () => {
    const owner = await login('ownerA');
    const r = await owner.post('/practice/library-import', file);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ exercises: 39, created: 39, updated: 0, templates: phases });

    const list = (await owner.get('/exercises?scope=practice&limit=100')).body.items;
    const achilles = list.find((e: any) => e.nameNl === 'Isometrisch kuitheffen staand');
    expect(achilles).toMatchObject({ scope: 'practice', bodyRegion: 'ankle_foot', nameEn: 'Standing isometric calf raise', reviewStatus: 'reviewed' });
    expect(list.find((e: any) => e.nameNl === 'Leg press').reviewStatus).toBe('needs_clinical_review');
    expect(list.find((e: any) => e.nameNl === 'Medianus slider').trainingCategories).toContain('neurodynamics');

    const detail = (await owner.get(`/exercises/${achilles.id}`)).body;
    expect(detail.instructionsNl).toMatch(/Pijnregel: Pijn max 4 op 10/);
    expect(detail.defaults).toMatchObject({ sets: 5, reps: 1, holdS: 45 });
    expect(detail.clinicalNotes).toMatch(/Onderbouwing dosering: gecheckt/);

    const templates = (await owner.get('/programs/templates?q=Achillespees belastingsprogramma')).body.items;
    expect(templates.map((t: any) => t.title)).toEqual(
      expect.arrayContaining(['Achillespees belastingsprogramma — Fase 1 (wk 1-4)', 'Achillespees belastingsprogramma — Fase 3 (wk 9-12)']),
    );
    const fase1 = templates.find((t: any) => t.title.includes('Fase 1'));
    const tpl = (await owner.get(`/programs/${fase1.id}`)).body;
    expect(tpl.description).toMatch(/Criteria voor Fase 2:\n☐ Pijn tijdens isometrie/);
    expect(tpl.patientInstructions).toMatch(/Stop en neem contact op/);
    expect(tpl.items[0]).toMatchObject({ sets: 5, reps: 1, holdS: 45, days: [1, 2, 3, 4, 5, 6, 7], frequency: '7× per week' });
    expect(tpl.items[1].days).toEqual([1, 3, 5]);
    // Remarks from the file are clinical: kept in the internal description, not in patient-facing notes.
    expect(tpl.items.every((i: any) => i.notes === '')).toBe(true);
    expect(tpl.description).toMatch(/Per oefening:\n• Isometrisch kuitheffen staand: Dagelijks[^]*\n• Kuitheffen op twee benen: Alfredson/);
  });

  it('patients never receive the internal programme description', async () => {
    const owner = await login('ownerA');
    await owner.put(`/programs/${s.programs.emma}`, {
      ...(await owner.get(`/programs/${s.programs.emma}`)).body,
      description: 'Intern: criteria fase 2, rode vlaggen',
    });
    const patient = await login('patientA');
    const p = (await patient.get(`/patient/programs/${s.programs.emma}`)).body;
    expect(p.title).toBeTruthy();
    expect(p).not.toHaveProperty('description');
    expect(JSON.stringify(p)).not.toMatch(/Intern: criteria/);
  });

  it('is invisible to other practices', async () => {
    const other = await login('therapistB');
    const list = (await other.get('/exercises?limit=100&q=Isometrisch kuitheffen')).body.items;
    expect(list.find((e: any) => e.nameNl === 'Isometrisch kuitheffen staand')).toBeUndefined();
    const t = (await other.get('/programs/templates?q=Achillespees belastingsprogramma')).body.items;
    expect(t).toHaveLength(0);
  });

  it('a second import updates instead of duplicating', async () => {
    const owner = await login('ownerA');
    const changed = structuredClone(file);
    changed.oefeningen[0].instructie = 'Nieuwe uitleg van de praktijk.';
    const r = await owner.post('/practice/library-import', changed);
    expect(r.body).toMatchObject({ created: 0, updated: 39, templates: phases });
    const list = (await owner.get('/exercises?scope=practice&limit=100')).body.items;
    expect(list.filter((e: any) => e.nameNl === 'Quadriceps isometrisch')).toHaveLength(1);
    const t = (await owner.get('/programs/templates?q=VKB postoperatief')).body.items;
    expect(t).toHaveLength(file.programmas[1].fases.length);
  });
});
