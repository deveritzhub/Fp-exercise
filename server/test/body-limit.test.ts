import { describe, it, expect, beforeAll } from 'vitest';
import { login, seedDb } from './helpers';
import { resetRateLimits } from '../src/lib/rateLimit';

beforeAll(async () => {
  await seedDb();
  resetRateLimits();
});

describe('request size limit', () => {
  it('refuses an oversized JSON body with 413, normal requests still work', async () => {
    const ther = await login('therapistA');
    const huge = { items: Array.from({ length: 400_000 }, () => ({ exerciseId: '00000000-0000-0000-0000-000000000000', sets: 3 })) };
    const r = await ther.post('/programs', huge);
    expect(r.status).toBe(413);
    expect(r.body.error).toBe('request_too_large');
    expect((await ther.get('/dashboard')).status).toBe(200);
  });
});
