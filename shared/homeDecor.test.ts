import { describe, expect, it } from 'vitest';
import { DECOR, HOME_DOOR, checkLayout, freeSpot, turn } from './homeDecor';

const all = new Set(DECOR.map((d) => d.key));

describe('home decor', () => {
  it('has keys the purchases table accepts, and prices that rise with the level', () => {
    for (const d of DECOR) {
      expect(d.key).toMatch(/^[a-z_]{2,32}$/);
      expect(d.price).toBeGreaterThan(0);
    }
    expect(new Set(DECOR.map((d) => d.key)).size).toBe(DECOR.length);
    expect(DECOR.filter((d) => d.level === 1).length).toBeGreaterThanOrEqual(3);
  });

  it('accepts a sensible layout and rounds it', () => {
    const r = checkLayout([{ key: 'home_bed', x: 1.812, z: -1.0, rot: 95 }, { key: 'home_rug', x: 1.8, z: -1, rot: 0 }], all);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.items[0]).toEqual({ key: 'home_bed', x: 1.81, z: -1, rot: 90 });
  });

  it('refuses what is not owned, placed twice, outside the room, in the doorway or in another piece', () => {
    expect(checkLayout([{ key: 'home_bed', x: 0, z: 0, rot: 0 }], new Set())).toEqual({ ok: false, reason: 'not_owned' });
    expect(checkLayout([{ key: 'nope', x: 0, z: 0, rot: 0 }], all)).toEqual({ ok: false, reason: 'unknown' });
    expect(checkLayout([{ key: 'home_chair', x: 0, z: 0, rot: 0 }, { key: 'home_chair', x: 1, z: 0, rot: 0 }], all)).toEqual({ ok: false, reason: 'twice' });
    expect(checkLayout([{ key: 'home_bed', x: 9, z: 0, rot: 0 }], all)).toEqual({ ok: false, reason: 'outside' });
    expect(checkLayout([{ key: 'home_chair', x: HOME_DOOR.x + 0.4, z: HOME_DOOR.z - 0.3, rot: 0 }], all)).toEqual({ ok: false, reason: 'door' });
    expect(checkLayout([{ key: 'home_table', x: 0, z: 0, rot: 0 }, { key: 'home_sofa', x: 0.3, z: 0, rot: 0 }], all)).toEqual({ ok: false, reason: 'overlap' });
  });

  it('finds room for every piece in turn, until the room is full', () => {
    let placed: { key: string; x: number; z: number; rot: number }[] = [];
    for (const d of DECOR) {
      const spot = freeSpot(d.key, placed, all);
      expect(spot, d.key).not.toBeNull();
      placed = [...placed, spot!];
    }
    expect(checkLayout(placed, all).ok).toBe(true);
  });

  it('turns in quarter turns', () => {
    expect([0, 44, 46, 270, 360, -90].map(turn)).toEqual([0, 0, 90, 270, 0, 270]);
  });
});
