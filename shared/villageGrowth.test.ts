import { describe, expect, it } from 'vitest';
import { villageChanges, villageGrowth } from './villageGrowth';

describe('village growth', () => {
  it('starts empty and points to the first cottage', () => {
    const g = villageGrowth({ workouts: 0, bossesDefeated: 0, level: 1 });
    expect(g).toMatchObject({ houses: 0, pennants: 0, windmill: false, fields: false, statue: false, lighthouse: false });
    expect(g.next).toEqual({ kind: 'house', workouts: 5 });
  });

  it('grows with workouts, bosses and level, within limits', () => {
    const g = villageGrowth({ workouts: 32, bossesDefeated: 12, level: 12 });
    expect(g).toMatchObject({ houses: 6, pennants: 8, windmill: true, fields: true, statue: true, lighthouse: false });
    expect(g.next).toEqual({ kind: 'house', workouts: 3 });
    expect(villageGrowth({ workouts: 500, bossesDefeated: 0, level: 25 })).toMatchObject({ houses: 10, lighthouse: true, next: null });
  });

  it('the windmill comes before the next cottage when it is nearer', () => {
    expect(villageGrowth({ workouts: 14, bossesDefeated: 0, level: 3 }).next).toEqual({ kind: 'windmill', workouts: 1 });
  });

  it('never goes negative', () => {
    expect(villageGrowth({ workouts: -3, bossesDefeated: -1, level: 0 })).toMatchObject({ houses: 0, pennants: 0 });
  });

  it('names what a workout added to the village', () => {
    const a = villageGrowth({ workouts: 14, bossesDefeated: 1, level: 9 });
    const b = villageGrowth({ workouts: 15, bossesDefeated: 2, level: 10 });
    expect(villageChanges(a, b).map((x) => x.nl)).toEqual(['een nieuw huisje', 'een bazenvlag', 'de molen', 'een standbeeld van je held']);
    expect(villageChanges(b, b)).toEqual([]);
  });
});
