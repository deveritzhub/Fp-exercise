import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb, type Seed } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import pg from 'pg';
import { appPool } from '../src/db';

const ownerQuery = async (sql: string, params: unknown[] = []) => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  try {
    return await db.query(sql, params);
  } finally {
    await db.end();
  }
};

let s: Seed;
beforeAll(async () => {
  s = await seedDb();
  resetRateLimits();
});

const LOOK = { frame: 'f', build: 'athletic', skin: 's3', hair: 'long', hairColor: 'blond', eyeColor: 'blue', beard: 'none', glasses: 'none', outfit: 'forest', sport: 'running' };

describe('hero friends (opt-in)', () => {
  it('is off by default, needs a hero, and needs both sides to share and accept', async () => {
    const emma = await login('patientA'); // practice A
    const noah = await login('patientB'); // practice B: friends may be at another practice

    // Without a hero there is nothing to share.
    expect((await emma.put('/patient/hero/sharing', { enabled: true })).body.error).toBe('hero_required');
    await emma.put('/patient/hero', { ...LOOK, heroName: 'Emma' });
    await noah.put('/patient/hero', { ...LOOK, heroName: 'Noah', frame: 'm' });

    // Off by default: no code, no list.
    const off = (await emma.get('/patient/hero/friends')).body;
    expect(off).toMatchObject({ hasHero: true, sharing: { enabled: false, code: null }, friends: [] });

    const on = (await emma.put('/patient/hero/sharing', { enabled: true })).body;
    expect(on.sharing.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const emmaCode = on.sharing.code as string;
    // Switching on again keeps the same code.
    expect((await emma.put('/patient/hero/sharing', { enabled: true })).body.sharing.code).toBe(emmaCode);

    // Noah does not share yet: cannot send requests.
    expect((await noah.post('/patient/hero/friends', { code: emmaCode })).body.error).toBe('sharing_off');
    const noahCode = (await noah.put('/patient/hero/sharing', { enabled: true })).body.sharing.code as string;

    expect((await noah.post('/patient/hero/friends', { code: 'ZZZZ-ZZZZ' })).body.error).toBe('friend_code_not_found');
    expect((await noah.post('/patient/hero/friends', { code: noahCode })).body.error).toBe('friend_self');
    // Lowercase and spaces are fine.
    const sent = await noah.post('/patient/hero/friends', { code: ` ${emmaCode.toLowerCase()} ` });
    expect(sent.status).toBe(201);
    expect((await noah.post('/patient/hero/friends', { code: emmaCode })).body.error).toBe('friend_exists');

    // Pending: Emma sees the request with name and look, but no stats either way.
    const out = (await noah.get('/patient/hero/friends')).body.friends;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'outgoing', heroName: 'Emma', stats: null });
    const inc = (await emma.get('/patient/hero/friends')).body.friends;
    expect(inc[0]).toMatchObject({ kind: 'incoming', heroName: 'Noah', stats: null });
    expect(inc[0].look.frame).toBe('m');

    // Only the addressee can accept.
    expect((await noah.post(`/patient/hero/friends/${inc[0].id}/accept`)).status).toBe(404);
    expect((await emma.post(`/patient/hero/friends/${inc[0].id}/accept`)).status).toBe(200);

    // Friends: level, total level and each skill as a level or a lock. Nothing else.
    await noah.get('/patient/hero'); // refreshes Noah's own card
    const friend = (await emma.get('/patient/hero/friends')).body.friends[0];
    expect(friend.kind).toBe('friend');
    expect(Object.keys(friend.stats).sort()).toEqual(['gearScore', 'level', 'skills', 'totalLevel']);
    expect(Object.keys(friend.stats.skills)).toHaveLength(10);
    expect(Object.values(friend.stats.skills as Record<string, { locked: boolean }>).some((s) => s.locked)).toBe(true);
    expect(friend.stats.skills.knowledge).toMatchObject({ locked: true, reason: 'soon', level: null });
    const noahState = (await noah.get('/patient/hero')).body;
    expect(friend.stats.level).toBe(noahState.level.level);
    expect(friend.stats.totalLevel).toBe(noahState.totalLevel);
    const json = JSON.stringify(friend);
    for (const secret of ['pain', 'program', 'practice', 'therapist', 'session', 'email', 'Mulder', 'kg']) expect(json.toLowerCase()).not.toContain(secret.toLowerCase());

    // The hero table itself stays closed: Emma cannot read Noah's hero or body map.
    expect((await emma.get(`/patients/${s.patients.noah}/hero`)).status).toBe(403);

    // The export lists the friends and the sharing setting.
    const exp = (await emma.get('/patient/export')).body;
    expect(exp.heroSharing.share_with_friends).toBe(true);
    // Shop purchases and day chests are part of the patient's own export.
    expect(Array.isArray(exp.heroShop.purchases)).toBe(true);
    expect(Array.isArray(exp.heroShop.dayChests)).toBe(true);
    expect(Array.isArray(exp.gymRoutines)).toBe(true);
    expect(exp.heroFriends).toEqual([expect.objectContaining({ kind: 'friend', heroName: 'Noah' })]);

    // Therapists cannot see friends: no route, and the database refuses the table outright.
    const ther = await login('therapistA');
    expect((await ther.get('/patient/hero/friends')).status).toBe(403);

    // Switching sharing off ends every friendship and removes code and card.
    const offAgain = (await noah.put('/patient/hero/sharing', { enabled: false })).body;
    expect(offAgain).toMatchObject({ sharing: { enabled: false, code: null }, friends: [] });
    expect((await emma.get('/patient/hero/friends')).body.friends).toEqual([]);
    expect((await emma.post('/patient/hero/friends', { code: noahCode })).body.error).toBe('friend_code_not_found');
    const row = (await ownerQuery('SELECT friend_code, shared_stats FROM patient_heroes WHERE patient_id = $1', [s.patients.noah])).rows[0];
    expect(row).toEqual({ friend_code: null, shared_stats: null });
    expect((await ownerQuery('SELECT count(*)::int AS n FROM hero_friendships')).rows[0].n).toBe(0);
  });

  it('removing works from either side; requests crossing each other become a friendship', async () => {
    const emma = await login('patientA');
    const noah = await login('patientB');
    const noahCode = (await noah.put('/patient/hero/sharing', { enabled: true })).body.sharing.code as string;
    const emmaCode = (await emma.put('/patient/hero/sharing', { enabled: true })).body.sharing.code as string;
    expect((await emma.post('/patient/hero/friends', { code: noahCode })).status).toBe(201);
    // Noah sends a request back instead of accepting: that accepts Emma's request.
    const back = await noah.post('/patient/hero/friends', { code: emmaCode });
    expect(back.status).toBe(200);
    expect(back.body.result).toBe('accepted');
    const f = (await noah.get('/patient/hero/friends')).body.friends[0];
    expect(f.kind).toBe('friend');
    expect((await emma.del(`/patient/hero/friends/${f.id}`)).status).toBe(200);
    expect((await noah.get('/patient/hero/friends')).body.friends).toEqual([]);
    expect((await noah.del(`/patient/hero/friends/${f.id}`)).status).toBe(404);
  });

  it('the application role cannot touch friendships directly, nor act for another patient', async () => {
    const c = await appPool.connect();
    try {
      await c.query('BEGIN');
      await expect(c.query('SELECT * FROM hero_friendships')).rejects.toThrow(/permission denied/);
      await c.query('ROLLBACK');
      await c.query('BEGIN');
      await c.query("SELECT set_config('app.user_id', $1, true)", [s.users.patientA]);
      expect((await c.query('SELECT * FROM app.hero_friends($1)', [s.patients.noah])).rowCount).toBe(0);
      await expect(c.query('SELECT app.hero_friend_request($1, $2)', [s.patients.noah, 'AAAA-AAAA'])).rejects.toThrow(/forbidden/);
    } finally {
      await c.query('ROLLBACK');
      c.release();
    }
  });

  it('cheers: pre-chosen only, between friends, once per friend per day; gone when the friendship ends', async () => {
    const emma = await login('patientA');
    const noah = await login('patientB');
    const noahCode = (await noah.put('/patient/hero/sharing', { enabled: true })).body.sharing.code as string;
    await emma.put('/patient/hero/sharing', { enabled: true });
    await emma.post('/patient/hero/friends', { code: noahCode });
    const pending = (await emma.get('/patient/hero/friends')).body.friends[0];
    // Not friends yet (pending): no cheers.
    expect((await emma.post(`/patient/hero/friends/${pending.id}/cheer`, { cheer: 'go' })).status).toBe(404);
    await noah.post(`/patient/hero/friends/${pending.id}/accept`, {});
    const f = (await emma.get('/patient/hero/friends')).body.friends[0];
    expect(f.kind).toBe('friend');
    // Only the fixed cheers.
    expect((await emma.post(`/patient/hero/friends/${f.id}/cheer`, { cheer: 'je bent stom' })).status).toBe(400);
    const sent = await emma.post(`/patient/hero/friends/${f.id}/cheer`, { cheer: 'go' });
    expect(sent.body.result).toBe('sent');
    expect(sent.body.cheeredToday).toContain(f.id);
    expect((await emma.post(`/patient/hero/friends/${f.id}/cheer`, { cheer: 'proud' })).body.result).toBe('limit');
    const got = (await noah.get('/patient/hero/friends')).body;
    expect(got.cheers).toEqual([expect.objectContaining({ heroName: 'Emma', cheer: 'go' })]);
    // Ending the friendship removes the cheers.
    await emma.del(`/patient/hero/friends/${f.id}`);
    expect((await noah.get('/patient/hero/friends')).body.cheers).toEqual([]);
  });

  it('the application role cannot read or write cheers directly, nor cheer for someone else', async () => {
    const c = await appPool.connect();
    try {
      await c.query('BEGIN');
      await expect(c.query('SELECT * FROM hero_cheers')).rejects.toThrow(/permission denied/);
      await c.query('ROLLBACK');
      await c.query('BEGIN');
      await c.query("SELECT set_config('app.user_id', $1, true)", [s.users.patientA]);
      expect((await c.query('SELECT * FROM app.hero_cheers($1)', [s.patients.noah])).rowCount).toBe(0);
      await expect(c.query('SELECT app.hero_cheer_send($1, gen_random_uuid(), $2)', [s.patients.noah, 'go'])).rejects.toThrow(/forbidden/);
    } finally {
      await c.query('ROLLBACK');
      c.release();
    }
  });
});
