import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import { serve } from '@hono/node-server';
import WebSocket from 'ws';
import { login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import { createApp } from '../src/app';
import { attachLive } from '../src/live';

const LOOK = { frame: 'f', build: 'athletic', skin: 's3', hair: 'long', hairColor: 'blond', eyeColor: 'blue', beard: 'none', glasses: 'none', outfit: 'forest', sport: 'running' };
let server: ReturnType<typeof serve>;
let port = 0;

beforeAll(async () => {
  await seedDb(true);
  resetRateLimits();
  server = serve({ fetch: createApp().fetch, port: 0 });
  attachLive(server as unknown as import('node:http').Server);
  await new Promise((r) => setTimeout(r, 50));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => server.close());

/** A live link for a logged-in patient, collecting every message. */
async function connect(cookie: string) {
  const got: Record<string, unknown>[] = [];
  const ws = new WebSocket(`ws://127.0.0.1:${port}/api/live`, { headers: { cookie } });
  ws.on('message', (d) => got.push(JSON.parse(d.toString())));
  await new Promise<void>((ok, bad) => {
    ws.once('open', () => ok());
    ws.once('unexpected-response', (_req, res) => bad(new Error(`status ${res.statusCode}`)));
    ws.once('error', bad);
  });
  return { ws, got };
}
const until = async (check: () => boolean) => {
  for (let i = 0; i < 60 && !check(); i++) await new Promise((r) => setTimeout(r, 25));
  return check();
};

describe('playing together with friends (live)', () => {
  it('only friends who share see each other walk and wave; others never connect or hear', async () => {
    const emma = await login('patientA');
    const noah = await login('patientB');
    await emma.put('/patient/hero', { ...LOOK, heroName: 'Emma' });
    await noah.put('/patient/hero', { ...LOOK, heroName: 'Noah', frame: 'm' });

    // Not sharing: no live link at all.
    await expect(connect(emma.cookie!)).rejects.toThrow('status 403');
    // No session: refused.
    await expect(connect('fp_session=nope')).rejects.toThrow('status 401');

    const emmaCode = (await emma.put('/patient/hero/sharing', { enabled: true })).body.sharing.code as string;
    await noah.put('/patient/hero/sharing', { enabled: true });
    // Sharing, but not friends yet: connected, alone.
    const a = await connect(emma.cookie!);
    const b0 = await connect(noah.cookie!);
    expect(await until(() => a.got.some((m) => m.t === 'hello'))).toBe(true);
    b0.ws.send(JSON.stringify({ t: 'pos', x: 1, z: 2, f: 0, zone: 'village', w: 1 }));
    await new Promise((r) => setTimeout(r, 150));
    expect(a.got.filter((m) => m.t === 'pos')).toHaveLength(0);
    b0.ws.close();

    // Friends.
    expect((await noah.post('/patient/hero/friends', { code: emmaCode })).status).toBe(201);
    const fid = ((await emma.get('/patient/hero/friends')).body.friends[0].id) as string;
    expect((await emma.post(`/patient/hero/friends/${fid}/accept`, {})).status).toBeLessThan(300);
    a.ws.close();
    const a2 = await connect(emma.cookie!);
    const b = await connect(noah.cookie!);
    // Emma hears Noah arrive, named by the friendship, with his hero's name and look (no patient id).
    expect(await until(() => a2.got.some((m) => m.t === 'join'))).toBe(true);
    const joined = a2.got.find((m) => m.t === 'join')!;
    expect(joined).toMatchObject({ id: fid, name: 'Noah', look: { frame: 'm' } });
    expect(JSON.stringify(joined)).not.toMatch(/patient/i);

    // Walking: Noah's steps reach Emma; nonsense does not.
    b.ws.send(JSON.stringify({ t: 'pos', x: 3.456, z: -7, f: 1.2, zone: 'village', w: 2, act: 'strike' }));
    b.ws.send(JSON.stringify({ t: 'pos', x: 'far', z: 0, f: 0, zone: 'village' }));
    b.ws.send(JSON.stringify({ t: 'pos', x: 1, z: 0, f: 0, zone: 'DROP TABLE' }));
    expect(await until(() => a2.got.some((m) => m.t === 'pos'))).toBe(true);
    await new Promise((r) => setTimeout(r, 100));
    const steps = a2.got.filter((m) => m.t === 'pos');
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ id: fid, x: 3.46, z: -7, zone: 'village', w: 2, act: 'strike' });

    // Saying something: only the fixed sayings.
    b.ws.send(JSON.stringify({ t: 'say', k: 'hi' }));
    b.ws.send(JSON.stringify({ t: 'say', k: 'anything I like' }));
    expect(await until(() => a2.got.some((m) => m.t === 'say'))).toBe(true);
    await new Promise((r) => setTimeout(r, 100));
    expect(a2.got.filter((m) => m.t === 'say')).toEqual([{ t: 'say', id: fid, k: 'hi' }]);

    // Noah leaves: Emma hears it.
    b.ws.close();
    expect(await until(() => a2.got.some((m) => m.t === 'leave'))).toBe(true);
    a2.ws.close();
    await emma.put('/patient/hero/sharing', { enabled: false });
    await noah.put('/patient/hero/sharing', { enabled: false });
  });
});
