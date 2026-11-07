import { describe, expect, it } from 'vitest';
import { openSeal, parseDailyRollup, pkcePair, rollupBody, seal } from '../src/lib/googleHealth';

describe('Google Health steps', () => {
  it('reads a daily rollup and ignores a bad count', () => {
    const rows = parseDailyRollup({
      rollupDataPoints: [
        { civilStartTime: { date: { year: 2026, month: 11, day: 1 } }, steps: { countSum: '8430' } },
        { civilStartTime: { date: { year: 2026, month: 11, day: 2 } }, steps: { countSum: 'nope' } },
      ],
    });
    expect(rows).toEqual([{ day: '2026-11-01', steps: 8430 }]);
  });

  it('asks for a closed-open week ending the day after today', () => {
    expect(rollupBody('2026-11-01', 7).range).toMatchObject({
      start: { date: { year: 2026, month: 10, day: 26 } },
      end: { date: { year: 2026, month: 11, day: 2 } },
    });
  });

  it('seals tokens so the database does not hold them in clear text', () => {
    const secret = 'access-token-value';
    const sealed = seal(secret);
    expect(sealed).not.toContain(secret);
    expect(openSeal(sealed)).toBe(secret);
    expect(pkcePair().challenge).not.toBe(pkcePair().verifier);
  });
});
