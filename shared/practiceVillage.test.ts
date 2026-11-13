import { describe, expect, it } from 'vitest';
import { HOME_STAGES, homeStage, levelsToNextHome, plotPosition } from './practiceVillage';

describe('practice village', () => {
  it('grows a home from camp to villa with the level', () => {
    expect(HOME_STAGES[homeStage(1)].key).toBe('camp');
    expect(HOME_STAGES[homeStage(3)].key).toBe('hut');
    expect(HOME_STAGES[homeStage(4)].key).toBe('cottage');
    expect(HOME_STAGES[homeStage(10)].key).toBe('house');
    expect(HOME_STAGES[homeStage(15)].key).toBe('manor');
    expect(HOME_STAGES[homeStage(40)].key).toBe('villa');
    expect(HOME_STAGES[homeStage(0)].key).toBe('camp');
  });

  it('says how many levels the next home is away', () => {
    expect(levelsToNextHome(1)).toBe(1);
    expect(levelsToNextHome(4)).toBe(3);
    expect(levelsToNextHome(16)).toBeNull();
  });

  it('gives eighty homes their own plot, clear of the square', () => {
    const plots = Array.from({ length: 80 }, (_, i) => plotPosition(i));
    plots.forEach((a, i) => {
      expect(Math.hypot(a.x, a.z)).toBeGreaterThan(8);
      plots.forEach((b, j) => {
        if (i !== j) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(4.2);
      });
    });
  });
});
