import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

const update = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../db/seed-data/fp-app-update.json'), 'utf8'));
let s: Seed;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

const templates = async (c: Awaited<ReturnType<typeof login>>) => (await c.get('/programs/templates')).body.items as any[];

describe('phased programmes with criteria (revalidatie, kracht, mobiliteit)', () => {
  let phase1: any;
  let programId: string;

  it('imports all three modules from the app update file', async () => {
    const owner = await login('ownerA');
    const r = await owner.post('/practice/library-import', update);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ exercises: 68, templates: 22 });
    const list = await templates(owner);
    const modules = new Set(list.filter((p) => p.practiceId).map((p) => p.module));
    expect([...modules].sort()).toEqual(['kracht', 'mobiliteit', 'revalidatie']);
  });

  it('templates carry series, phase, criteria with test and threshold, red flags and warnings', async () => {
    const owner = await login('ownerA');
    const achilles = (await templates(owner)).filter((p) => p.series?.key === 'tpl_achilles_12w').sort((a, b) => a.series.phaseNo - b.series.phaseNo);
    expect(achilles.map((p) => p.series.phaseName)).toEqual(['Fase 1', 'Fase 2', 'Fase 3']);
    phase1 = achilles[0];
    expect(phase1.series).toMatchObject({ phaseNo: 1, phaseCount: 3, weeks: '1-4', title: 'Achillespees belastingsprogramma' });
    expect(phase1.criteria[0].to).toBe('Fase 2');
    expect(phase1.criteria[0].items[0]).toEqual({ label: 'Pijn tijdens isometrie', threshold: 'Max 4 op 10, binnen 24 uur terug naar uitgangsniveau', test: 'VAS en dagboek', source: 'Praktijkcriterium, gebaseerd op isometrie-literatuur' });
    expect(phase1.redFlags).toContain('Plotselinge scheur of knap gevoel');

    const acl = (await templates(owner)).filter((p) => p.series?.key === 'tpl_acl_postop_criteria');
    const last = acl.find((p) => p.series.phaseNo === 4);
    // Criteria beyond the listed phases (Fase 5) stay attached to the last phase.
    expect(last.criteria.map((g: any) => g.to)).toEqual(['Fase 5 (terugkeer naar sport)', 'Volledige terugkeer en ontslag']);
    expect(last.warnings[0]).toMatch(/chirurgisch protocol/);

    const shoulder = (await templates(owner)).find((p) => p.series?.key === 'tpl_schouder_sapps_12w');
    expect(shoulder.warnings.join(' ')).toMatch(/praktijkcriteria/);

    const ppl3 = (await templates(owner)).find((p) => p.title === 'Push Pull Legs, 3 dagen per week');
    expect(ppl3.module).toBe('kracht');
    expect(ppl3.warnings.join(' ')).toMatch(/10-setdrempel|Onder de 10/);
    expect(ppl3.criteria[0].title).toMatch(/Voorwaarden om te starten/);
    const ppl = (await owner.get(`/programs/${ppl3.id}`)).body;
    expect(ppl.items[0]).toMatchObject({ sets: 4, reps: 8, restS: 180, days: [1], notes: 'Push A · 5-8 herhalingen · RPE 8' });

    const mob = (await templates(owner)).find((p) => p.title === 'Dagelijkse mobiliteit, 10 minuten');
    expect(mob.module).toBe('mobiliteit');
    expect(mob.warnings.join(' ')).toMatch(/Statisch rekken niet direct/);
  });

  it('a programme made from a phase template keeps phase and criteria; criteria are ticked with name and date', async () => {
    const therapist = await login('therapistA');
    const tpl = (await therapist.get(`/programs/${phase1.id}`)).body;
    const r = await therapist.post('/programs', {
      title: tpl.title, patientId: s.patients.emma, status: 'active', sourceTemplateId: tpl.id, description: tpl.description,
      patientInstructions: tpl.patientInstructions,
      items: tpl.items.map((i: any) => ({ exerciseId: i.exerciseId, sets: i.sets, reps: i.reps, holdS: i.holdS, restS: i.restS, days: i.days, notes: i.notes })),
    });
    expect(r.status).toBe(201);
    programId = r.body.id;
    const p = (await therapist.get(`/programs/${programId}`)).body;
    expect(p.series).toMatchObject({ key: 'tpl_achilles_12w', phaseNo: 1 });
    expect(p.criteria).toEqual(tpl.criteria);
    expect(p.criteriaChecks).toEqual([]);

    const tick = await therapist.put(`/programs/${programId}/criteria/0.1`, { note: '3x15 zonder opvlamming' });
    expect(tick.status).toBe(200);
    expect(tick.body.items[0]).toMatchObject({ key: '0.1', label: 'Zware kuitheffen tweebenig', note: '3x15 zonder opvlamming', checkedBy: 'Joris Bakker' });
    expect((await therapist.put(`/programs/${programId}/criteria/9.9`, {})).status).toBe(404);
    expect((await therapist.put(`/programs/${phase1.id}/criteria/0.0`, {})).body.error).toBe('not_a_patient_program');
    const undo = await therapist.del(`/programs/${programId}/criteria/0.1`);
    expect(undo.body.items).toEqual([]);
    await therapist.put(`/programs/${programId}/criteria/0.0`, {});

    const next = (await therapist.get(`/programs/${programId}/next-phase`)).body.next;
    expect(next).toMatchObject({ phaseName: 'Fase 2', weeks: '5-8' });
  });

  it('other practices cannot see or tick the checklist', async () => {
    const other = await login('therapistB');
    expect((await other.put(`/programs/${programId}/criteria/0.2`, {})).status).toBe(404);
    expect((await other.get(`/programs/${programId}`)).status).toBe(404);
  });

  it('patients never receive criteria, evidence, warnings or the internal description', async () => {
    const patient = await login('patientA');
    const p = (await patient.get(`/patient/programs/${programId}`)).body;
    expect(p.title).toMatch(/Achillespees/);
    for (const k of ['criteria', 'evidence', 'warnings', 'description', 'indication', 'criteriaChecks']) expect(p).not.toHaveProperty(k);
    const home = (await patient.get('/patient/home')).body;
    const mine = home.programs.find((x: any) => x.id === programId);
    for (const k of ['criteria', 'evidence', 'warnings', 'description']) expect(mine).not.toHaveProperty(k);
    expect(JSON.stringify(home)).not.toMatch(/VAS en dagboek/);
  });
});
