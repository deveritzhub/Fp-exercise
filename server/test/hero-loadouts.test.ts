import { beforeAll, describe, expect, it } from 'vitest';
import { appPool } from '../src/db';
import { Client, login, seedDb, type Seed } from './helpers';
import { GEAR } from '../../shared/hero';

let s: Seed;
let patient: Client;
let bought = '';

const LOOK = {
  heroName: 'Testheld', frame: 'f', build: 'athletic', skin: 's4', hair: 'long',
  hairColor: 'brown', eyeColor: 'brown', beard: 'none', glasses: 'none',
  outfit: 'forest', sport: 'running',
};

beforeAll(async () => {
  s = await seedDb();
  patient = await login('patientA');
  await patient.put('/patient/hero', LOOK);
});

describe('private, persistent MMORPG wardrobe presets', () => {
  it('starts empty and accepts only three valid slots', async () => {
    expect((await patient.get('/patient/hero/loadouts')).body).toEqual({ presets: [] });
    expect((await patient.put('/patient/hero/loadouts/0', { equipped: [] })).status).toBe(400);
    expect((await patient.put('/patient/hero/loadouts/4', { equipped: [] })).status).toBe(400);
    expect((await patient.put('/patient/hero/loadouts/not-a-number', { equipped: [] })).status).toBe(400);
    expect((await patient.put('/patient/hero/loadouts/1', { equipped: ['healing_potion'] })).body.error).toBe('unknown_gear');
    expect((await patient.put('/patient/hero/loadouts/1', { equipped: ['crown'] })).body.error).toBe('gear_not_owned');
  });

  it('persists an owned outfit across API reads and uses the existing guarded equip route', async () => {
    const before = (await patient.get('/patient/hero')).body.gear;
    const affordable = GEAR.find(g => g.tier === 1 && !before.owned.includes(g.key) && g.price <= before.coins);
    expect(affordable).toBeDefined();
    bought = affordable!.key;
    expect((await patient.post('/patient/hero/shop', { item: bought })).status).toBe(201);
    const response = await patient.put('/patient/hero/loadouts/2', { equipped: [bought] });
    expect(response.status).toBe(200);
    expect(response.body.preset).toMatchObject({ slot: 2, gear: [bought] });
    expect((await patient.get('/patient/hero/loadouts')).body.presets).toEqual([expect.objectContaining({ slot: 2, gear: [bought] })]);
    expect((await patient.put('/patient/hero/gear', { equipped: [] })).status).toBe(200);
    expect((await patient.put('/patient/hero/gear', { equipped: [bought] })).status).toBe(200);
    expect((await patient.get('/patient/hero')).body.gear.equipped).toEqual([bought]);
  });

  it('can replace a preset with a deliberately empty look', async () => {
    expect((await patient.put('/patient/hero/loadouts/2', { equipped: [] })).status).toBe(200);
    expect((await patient.get('/patient/hero/loadouts')).body.presets[0]).toMatchObject({ slot: 2, gear: [] });
    expect((await patient.put('/patient/hero/loadouts/2', { equipped: [bought, bought] })).status).toBe(400);
  });

  it('does not expose another patient’s outfits to patients or therapists', async () => {
    const other = await login('patientB');
    expect((await other.get('/patient/hero/loadouts')).body).toEqual({ presets: [] });
    expect((await (await login('therapistA')).get('/patient/hero/loadouts')).status).toBe(403);
    const client = await appPool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.user_id', $1, true)", [s.users.therapistA]);
      expect((await client.query('SELECT * FROM hero_loadouts')).rows).toEqual([]);
      await expect(client.query(
        'INSERT INTO hero_loadouts (patient_id, slot, gear) VALUES ($1, 1, $2)',
        [s.patients.emma, [bought]],
      )).rejects.toThrow(/row-level security/);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('includes cosmetic presets in the patient’s own GDPR export, not in friend cards', async () => {
    const exported = (await patient.get('/patient/export')).body;
    expect(exported.heroShop.wardrobePresets).toEqual([expect.objectContaining({ slot: 2, gear: [] })]);
    const staff = await login('therapistA');
    const visible = (await staff.get(`/patients/${s.patients.emma}/hero`)).body;
    expect(JSON.stringify(visible)).not.toContain('wardrobePresets');
    expect(JSON.stringify(visible)).not.toContain('hero_loadouts');
  });
});
