import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';
import { nextItems } from '../../shared/karate';

beforeAll(async () => {
  await seedDb(true);
  resetRateLimits();
});

describe('karate in the dojo', () => {
  it('ticks the list for the next belt and earns it with the exam', async () => {
    const P = await login('patientA');
    expect((await P.get('/patient/hero/karate')).body).toEqual({ belt: 0, done: [], examReady: false });
    expect((await P.post('/patient/hero/karate/exam')).status).toBe(400);
    // Not an item, and not the list being worked for.
    expect((await P.put('/patient/hero/karate/item', { key: '9:9', done: true })).status).toBe(400);
    expect((await P.put('/patient/hero/karate/item', { key: '2:0', done: true })).status).toBe(400);
    const list = nextItems(0);
    for (const key of list) expect((await P.put('/patient/hero/karate/item', { key, done: true })).status).toBe(200);
    expect((await P.put('/patient/hero/karate/item', { key: list[0], done: false })).body.examReady).toBe(false);
    expect((await P.put('/patient/hero/karate/item', { key: list[0], done: true })).body.examReady).toBe(true);
    expect((await P.post('/patient/hero/karate/exam')).body).toMatchObject({ belt: 1, examReady: false });
    // The earned belt's list is closed; the next one is open.
    expect((await P.put('/patient/hero/karate/item', { key: list[0], done: false })).status).toBe(400);
    expect((await P.put('/patient/hero/karate/item', { key: '2:0', done: true })).status).toBe(200);
    const T = await login('therapistA');
    expect((await T.get('/patient/hero/karate')).status).toBe(403);
  });
});
