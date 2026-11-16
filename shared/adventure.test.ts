import { describe, it, expect } from 'vitest';
import { BOSSES, bossOfWeek, LIGHT, isShadow, lightFrom, CREATURES, ZONES, zoneAt, COOKING, DAILY_QUESTS, dailyQuest, adventureLevel, blow, boxingXp, CREATURE_KINDS, DROPS, LOOT, rollDrops, weaponAt, weaponByKey } from './adventure';

describe('adventure', () => {
  it('levels: 60 XP for the first, 30 more for each next', () => {
    expect(adventureLevel(0)).toEqual({ level: 1, from: 0, to: 60 });
    expect(adventureLevel(59).level).toBe(1);
    expect(adventureLevel(60)).toEqual({ level: 2, from: 60, to: 150 });
    expect(adventureLevel(150).level).toBe(3);
    expect(adventureLevel(-5).level).toBe(1);
  });
  it('a creature takes a double blow when its ailment was put right today', () => {
    expect(blow('imp', new Set())).toBe(1);
    expect(blow('imp', new Set(['hydrated']))).toBe(2);
    expect(blow('slime', new Set(['hydrated']))).toBe(1);
  });
  it('weapons come with the level and add to every blow', () => {
    expect(weaponAt(1)).toMatchObject({ weapon: { key: 'fists' }, next: { key: 'staff' } });
    expect(weaponAt(2).weapon.key).toBe('staff');
    expect(weaponAt(9)).toMatchObject({ weapon: { key: 'sword' }, next: { key: 'axe' } });
    expect(weaponAt(40)).toMatchObject({ weapon: { key: 'hero_sword' }, next: null });
    expect(boxingXp(9)).toBe(18);
    expect(boxingXp(999)).toBe(28);
    expect(blow('slime', new Set(), 2)).toBe(3);
    expect(blow('slime', new Set(['moving']), 2)).toBe(6);
  });
  it('a weapon is found by key, and fists stand in for none', () => {
    expect(weaponByKey('sword')).toMatchObject({ power: 4, price: 200 });
    expect(weaponByKey(null).key).toBe('fists');
    expect(weaponByKey('laser').key).toBe('fists');
  });
  it('a beaten creature drops what its table says, within its bounds', () => {
    // A cow always leaves a hide and a bone; meat only when the roll is low enough.
    expect(rollDrops('cow', () => 0.99)).toEqual([{ item: 'hide', n: 1 }, { item: 'bone', n: 1 }]);
    expect(rollDrops('cow', () => 0)).toEqual([{ item: 'hide', n: 1 }, { item: 'bone', n: 1 }, { item: 'meat', n: 1 }]);
    for (const k of CREATURE_KINDS) {
      expect(DROPS[k].length).toBeGreaterThan(0);
      for (const d of DROPS[k]) expect(LOOT[d.item]).toBeTruthy();
      for (const d of rollDrops(k, () => 0.999)) expect(d.n).toBeLessThanOrEqual(DROPS[k].find((x) => x.item === d.item)!.max);
    }
  });
});

describe('fighting back and the hero life', async () => {
  const { ATTACKS, CREATURES, heroMaxHp, hitOnHero, isAlpha, rollDrops } = await import('./adventure');
  it('the hero has more life with a higher adventure level and after a real workout', () => {
    expect(heroMaxHp(1, false)).toBe(40);
    expect(heroMaxHp(5, false)).toBe(80);
    expect(heroMaxHp(1, true)).toBe(50);
  });
  it('prey never hits back; the Alpha attacks by itself, hits hardest and can beat a new hero', () => {
    expect(hitOnHero('chicken', false)).toBe(0);
    expect(hitOnHero('cow', false)).toBe(0);
    expect(isAlpha('alpha_boar')).toBe(true);
    expect(ATTACKS.alpha_boar.aggressive).toBe(true);
    // Hardest of everything in town; the wolves and bears outside the wall are for stronger adventurers.
    for (const k of Object.keys(ATTACKS) as (keyof typeof ATTACKS)[]) if (k !== 'alpha_boar' && CREATURES[k].level < 6) expect(ATTACKS[k].damage).toBeLessThan(ATTACKS.alpha_boar.damage);
    expect(ATTACKS.bear.damage).toBeGreaterThan(ATTACKS.wolf.damage);
    // Fists (1 per blow, about one blow a second) cannot finish 60 life before 40 life is gone.
    const secondsToLose = (heroMaxHp(1, false) / hitOnHero('alpha_boar', false)) * (ATTACKS.alpha_boar.everyMs / 1000);
    expect(secondsToLose).toBeLessThan(CREATURES.alpha_boar.hp);
  });
  it('a workout today softens every blow, but a blow always does at least 1', () => {
    expect(hitOnHero('alpha_boar', true)).toBeLessThan(hitOnHero('alpha_boar', false));
    expect(hitOnHero('slime', true)).toBe(1);
  });
  it('the Alpha always drops its own tusk', () => {
    expect(rollDrops('alpha_boar', () => 0.99).map((x) => x.item)).toContain('alpha_tusk');
  });
});

describe('berries and tools', async () => {
  const { ATTACKS, isHarvest, rollDrops, toolFor, TOOLS } = await import('./adventure');
  it('a bush is picked like a harvest, never fights back and gives berries', () => {
    expect(isHarvest('bush')).toBe(true);
    expect(ATTACKS.bush.damage).toBe(0);
    expect(rollDrops('bush', () => 0).map((x) => x.item)).toEqual(['berries']);
  });
  it('the hatchet is for the oak, the pickaxe for the rock; a bush needs no tool', () => {
    expect(toolFor('oak')?.key).toBe('hatchet');
    expect(toolFor('rock')?.key).toBe('pickaxe');
    expect(toolFor('bush')).toBeNull();
    expect(TOOLS.every((t) => t.price > 0)).toBe(true);
  });
  it('cooks loot into food and picks one task a day, the same all day', () => {
    for (const d of COOKING) {
      expect(LOOT[d.key]).toBeTruthy();
      for (const k of Object.keys(d.needs)) expect(LOOT[k as keyof typeof LOOT]).toBeTruthy();
    }
    expect(dailyQuest('2026-11-15', 'a')).toBe(dailyQuest('2026-11-15', 'a'));
    const seen = new Set(Array.from({ length: 60 }, (_, i) => dailyQuest(`2026-11-${String((i % 28) + 1).padStart(2, '0')}`, `p${i}`).key));
    expect(seen.size).toBeGreaterThan(3);
    for (const q of DAILY_QUESTS) expect(CREATURE_KINDS).toContain(q.kind);
  });
});

describe('hunting grounds', () => {
  it('each creature outside the wall lives in a ground of its level', () => {
    expect(zoneAt(3, 39.5)?.key).toBe('wolfwood');
    expect(zoneAt(0, 0)).toBeNull();
    expect(ZONES.find((z) => z.key === 'wolfwood')?.level).toBe(CREATURES.wolf.level);
    expect(ZONES.find((z) => z.key === 'bearhill')?.level).toBe(CREATURES.bear.level);
    for (const k of ['wolf', 'bear'] as const) expect(DROPS[k].length).toBeGreaterThan(0);
  });
});

describe('the light side', () => {
  it('each helper comes from one shadow creature, the Shame lord gives the light itself', () => {
    expect(new Set(LIGHT.map((l) => l.from)).size).toBe(LIGHT.length);
    for (const l of LIGHT) expect(CREATURES[l.from]).toBeTruthy();
    expect(lightFrom('shame_lord')?.key).toBe('enlightenment');
    expect(lightFrom('cow')).toBeNull();
    expect(isShadow('guilt')).toBe(true);
    expect(isShadow('wolf')).toBe(false);
  });
});

describe('the boss board', () => {
  it('has the same boss all week and a different one the next week', () => {
    expect(bossOfWeek('2026-11-16')).toBe(bossOfWeek('2026-11-22'));
    expect(bossOfWeek('2026-11-23')).not.toBe(bossOfWeek('2026-11-16'));
    const seen = new Set(Array.from({ length: BOSSES.length }, (_, i) => bossOfWeek(new Date(Date.UTC(2026, 10, 16 + i * 7)).toISOString().slice(0, 10))));
    expect(seen.size).toBe(BOSSES.length);
  });
});
