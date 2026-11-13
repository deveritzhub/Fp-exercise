/**
 * The patient's own home in the village. Outside it grows with the hero's level, from a camp to a
 * villa (the same six homes as in the practice village). Inside, the patient furnishes one room with
 * pieces bought with coins: the coins already earned by training and from the day chest.
 */
export type DecorKind = 'floor' | 'seat' | 'table' | 'bed' | 'storage' | 'light' | 'green' | 'sport' | 'wall';
export type DecorItem = {
  key: string;
  nl: string;
  en: string;
  price: number;
  kind: DecorKind;
  /** How much floor it takes: the radius of the circle the hero walks round. 0 = can be walked over. */
  r: number;
  /** Hero level from which the shop sells it. */
  level: number;
};

/** Keys match hero_purchases.item (lower case and underscores only). */
export const DECOR: DecorItem[] = [
  { key: 'home_rug', nl: 'Vloerkleed', en: 'Rug', price: 15, kind: 'floor', r: 0, level: 1 },
  { key: 'home_stool', nl: 'Krukje', en: 'Stool', price: 15, kind: 'seat', r: 0.3, level: 1 },
  { key: 'home_plant', nl: 'Plant', en: 'Plant', price: 20, kind: 'green', r: 0.35, level: 1 },
  { key: 'home_chair', nl: 'Stoel', en: 'Chair', price: 25, kind: 'seat', r: 0.35, level: 1 },
  { key: 'home_lamp', nl: 'Staande lamp', en: 'Floor lamp', price: 30, kind: 'light', r: 0.3, level: 2 },
  { key: 'home_table', nl: 'Tafel', en: 'Table', price: 40, kind: 'table', r: 0.6, level: 2 },
  { key: 'home_mat', nl: 'Oefenmat', en: 'Exercise mat', price: 40, kind: 'sport', r: 0, level: 2 },
  { key: 'home_bed', nl: 'Bed', en: 'Bed', price: 60, kind: 'bed', r: 0.8, level: 3 },
  { key: 'home_shelf', nl: 'Boekenkast', en: 'Bookcase', price: 60, kind: 'storage', r: 0.55, level: 4 },
  { key: 'home_weights', nl: 'Halterrek', en: 'Dumbbell rack', price: 70, kind: 'sport', r: 0.55, level: 5 },
  { key: 'home_sofa', nl: 'Bank', en: 'Sofa', price: 90, kind: 'seat', r: 0.8, level: 6 },
  { key: 'home_chest', nl: 'Schatkist', en: 'Treasure chest', price: 100, kind: 'storage', r: 0.45, level: 8 },
  { key: 'home_fireplace', nl: 'Open haard', en: 'Fireplace', price: 150, kind: 'light', r: 0.7, level: 10 },
  { key: 'home_statue', nl: 'Gouden beeld', en: 'Golden statue', price: 250, kind: 'wall', r: 0.4, level: 15 },
];
export const DECOR_KEYS = new Set(DECOR.map((d) => d.key));
export const decorItem = (key: string) => DECOR.find((d) => d.key === key) ?? null;

/** The room, in its own coordinates: x from west to east, z from north (back wall) to south. */
export const HOME_ROOM = { x0: -2.8, x1: 2.8, z0: -2.05, z1: 2.1 } as const;
/** Where the door is; nothing may stand in front of it. */
export const HOME_DOOR = { x: -2.55, z: 1.7 } as const;
export const DOOR_CLEAR = 1.0;

export type Placed = { key: string; x: number; z: number; rot: number };

/** Quarter turns only: 0, 90, 180 or 270 degrees. */
export const turn = (rot: number) => (((Math.round(rot / 90) * 90) % 360) + 360) % 360;

/**
 * A layout the server accepts: only owned pieces, each at most once, inside the room, clear of the
 * door. Pieces that take floor may not stand in one another; rugs and mats may lie under anything.
 * Returns the cleaned layout, or the reason it is refused.
 */
export function checkLayout(items: Placed[], owned: ReadonlySet<string>): { ok: true; items: Placed[] } | { ok: false; reason: 'unknown' | 'not_owned' | 'twice' | 'outside' | 'door' | 'overlap' } {
  const seen = new Set<string>();
  const clean: Placed[] = [];
  for (const it of items) {
    const d = decorItem(it.key);
    if (!d) return { ok: false, reason: 'unknown' };
    if (!owned.has(it.key)) return { ok: false, reason: 'not_owned' };
    if (seen.has(it.key)) return { ok: false, reason: 'twice' };
    seen.add(it.key);
    const pad = Math.max(0.3, d.r);
    if (!(it.x >= HOME_ROOM.x0 + pad - 0.01 && it.x <= HOME_ROOM.x1 - pad + 0.01 && it.z >= HOME_ROOM.z0 + pad - 0.01 && it.z <= HOME_ROOM.z1 - pad + 0.01)) return { ok: false, reason: 'outside' };
    if (d.r > 0 && Math.hypot(it.x - HOME_DOOR.x, it.z - HOME_DOOR.z) < DOOR_CLEAR + d.r) return { ok: false, reason: 'door' };
    clean.push({ key: it.key, x: Math.round(it.x * 100) / 100, z: Math.round(it.z * 100) / 100, rot: turn(it.rot) });
  }
  for (let i = 0; i < clean.length; i++) {
    for (let j = i + 1; j < clean.length; j++) {
      const a = decorItem(clean[i].key)!;
      const b = decorItem(clean[j].key)!;
      if (a.r > 0 && b.r > 0 && Math.hypot(clean[i].x - clean[j].x, clean[i].z - clean[j].z) < (a.r + b.r) * 0.85) return { ok: false, reason: 'overlap' };
    }
  }
  return { ok: true, items: clean };
}

/** A free spot for a new piece: the first place on a grid that the rules allow. */
export function freeSpot(key: string, placed: Placed[], owned: ReadonlySet<string>): Placed | null {
  for (let z = HOME_ROOM.z0 + 0.6; z <= HOME_ROOM.z1 - 0.5; z += 0.45) {
    for (let x = HOME_ROOM.x1 - 0.6; x >= HOME_ROOM.x0 + 0.6; x -= 0.45) {
      const next = [...placed.filter((p) => p.key !== key), { key, x, z, rot: 0 }];
      if (checkLayout(next, owned).ok) return { key, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, rot: 0 };
    }
  }
  return null;
}
