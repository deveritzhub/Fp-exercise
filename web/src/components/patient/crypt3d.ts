import * as THREE from 'three';
import type { Crypt, Rect } from '@shared/dungeon';
import type { Obstacle, Vec } from './walk';

/**
 * A crypt in 3D (shared/dungeon.ts): stone floors in the rooms and corridors, walls wherever a room's
 * edge has nothing beyond it, torches on the walls, chests, the stairs up in the first room and a red
 * runner with banners in the boss room. Built round `at` (the crypt's middle in the world).
 */
export function cryptModel(crypt: Crypt, at: Vec) {
  const group = new THREE.Group();
  group.position.set(at.x, 0, at.z);
  const obstacles: Obstacle[] = [];
  const rects: Rect[] = [...crypt.rooms, ...crypt.corridors];
  const m = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...o });
  const floorM = m(0x4a4640);
  const seamM = m(0x35322d);
  const wallM = m(0x6b655b);
  const capM = m(0x56514a);
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, y, z);
    b.castShadow = true;
    b.receiveShadow = true;
    group.add(b);
    return b;
  };
  // Floors, with a faint grid of flagstones.
  for (const r of rects) {
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    box(w, 0.1, d, floorM, (r.x0 + r.x1) / 2, -0.05, (r.z0 + r.z1) / 2).castShadow = false;
    for (let x = r.x0 + 1.2; x < r.x1; x += 1.2) box(0.03, 0.012, d, seamM, x, 0.006, (r.z0 + r.z1) / 2).castShadow = false;
    for (let z = r.z0 + 1.2; z < r.z1; z += 1.2) box(w, 0.012, 0.03, seamM, (r.x0 + r.x1) / 2, 0.006, z).castShadow = false;
  }
  const inside = (x: number, z: number) => rects.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
  // Walls: every stretch of an edge with no floor beyond it.
  const torches: Vec[] = [];
  for (const r of rects) {
    const edges: [number, number, number, number, number, number][] = [
      [r.x0, r.z0, r.x1, r.z0, 0, -1],
      [r.x0, r.z1, r.x1, r.z1, 0, 1],
      [r.x0, r.z0, r.x0, r.z1, -1, 0],
      [r.x1, r.z0, r.x1, r.z1, 1, 0],
    ];
    for (const [ax, az, bx, bz, nx, nz] of edges) {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 0.25));
      let start = -1;
      for (let i = 0; i <= n; i++) {
        const t = (i + 0.5) / n;
        const px = ax + (bx - ax) * t;
        const pz = az + (bz - az) * t;
        const open = i < n && !inside(px + nx * 0.15, pz + nz * 0.15);
        if (open && start < 0) start = i;
        if ((!open || i === n) && start >= 0) {
          const t0 = start / n;
          const t1 = i / n;
          const sl = (t1 - t0) * len;
          if (sl > 0.05) {
            const sx0 = ax + (bx - ax) * t0;
            const sz0 = az + (bz - az) * t0;
            const sx1 = ax + (bx - ax) * t1;
            const sz1 = az + (bz - az) * t1;
            const along = nz !== 0;
            const cx = (sx0 + sx1) / 2 + nx * 0.2;
            const cz = (sz0 + sz1) / 2 + nz * 0.2;
            box(along ? sl + 0.4 : 0.4, 2.8, along ? 0.4 : sl + 0.4, wallM, cx, 1.4, cz);
            box(along ? sl + 0.5 : 0.5, 0.16, along ? 0.5 : sl + 0.5, capM, cx, 2.86, cz);
            for (let s2 = 0; s2 <= sl; s2 += 0.4) obstacles.push({ x: at.x + sx0 + ((sx1 - sx0) * s2) / sl - nx * 0.05, z: at.z + sz0 + ((sz1 - sz0) * s2) / sl - nz * 0.05, r: 0.28 });
            // A torch on every long stretch of wall.
            if (sl > 3.5) torches.push({ x: (sx0 + sx1) / 2 - nx * 0.12, z: (sz0 + sz1) / 2 - nz * 0.12 });
          }
          start = -1;
        }
      }
    }
  }
  const flames: THREE.Mesh[] = [];
  const flameM = new THREE.MeshBasicMaterial({ color: 0xffb347, toneMapped: false });
  for (const tp of torches) {
    box(0.08, 0.5, 0.08, m(0x3a2a1c), tp.x, 1.6, tp.z);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 7), flameM);
    f.position.set(tp.x, 1.98, tp.z);
    group.add(f);
    flames.push(f);
  }
  // The stairs up, in the first room.
  const s = crypt.rooms[0];
  for (let i = 0; i < 5; i++) box(1.6, 0.18 * (i + 1), 0.4, capM, (s.x0 + s.x1) / 2, 0.09 * (i + 1), s.z0 + 0.3 + i * 0.4);
  obstacles.push({ x: at.x + (s.x0 + s.x1) / 2, z: at.z + s.z0 + 1, r: 0.9 });
  // Chests: dark wood with gold bands; the lid opens (see `openChest`).
  const lids: THREE.Object3D[] = [];
  const woodM = m(0x6b4422);
  const goldM = m(0xe4bc63, { metalness: 0.7, roughness: 0.35 });
  crypt.chests.forEach((c) => {
    box(0.9, 0.5, 0.6, woodM, c.x, 0.25, c.z);
    for (const dx of [-0.32, 0.32]) box(0.06, 0.52, 0.62, goldM, c.x + dx, 0.26, c.z);
    const lid = new THREE.Group();
    lid.position.set(c.x, 0.5, c.z - 0.3);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12, 1, false, 0, Math.PI), woodM);
    top.rotation.set(0, 0, Math.PI / 2);
    top.position.z = 0.3;
    lid.add(top);
    group.add(lid);
    lids.push(lid);
    obstacles.push({ x: at.x + c.x, z: at.z + c.z, r: 0.6 });
  });
  // The boss room: a red runner and two banners.
  const b = crypt.rooms.find((r) => r.kind === 'boss')!;
  box(1.4, 0.02, b.z1 - b.z0 - 1, m(0x7a1f1f), (b.x0 + b.x1) / 2, 0.01, (b.z0 + b.z1) / 2).castShadow = false;
  for (const dx of [-2.6, 2.6]) {
    box(0.7, 1.4, 0.04, m(0x7a1f1f), (b.x0 + b.x1) / 2 + dx, 1.7, b.z0 + 0.25);
    box(0.06, 0.06, 0.9, goldM, (b.x0 + b.x1) / 2 + dx, 2.42, b.z0 + 0.3);
  }
  const bounds = rects.reduce((a, r) => ({ x0: Math.min(a.x0, r.x0), x1: Math.max(a.x1, r.x1), z0: Math.min(a.z0, r.z0), z1: Math.max(a.z1, r.z1) }), { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });
  return {
    group,
    obstacles,
    rect: { x0: at.x + bounds.x0 + 0.3, x1: at.x + bounds.x1 - 0.3, z0: at.z + bounds.z0 + 0.3, z1: at.z + bounds.z1 - 0.3 },
    /** Torches flicker. */
    tick: (t: number) => flames.forEach((f, i) => { f.scale.set(1, 0.85 + Math.sin(t * 13 + i * 1.7) * 0.15, 1); }),
    openChest: (i: number) => { if (lids[i]) lids[i].rotation.x = -1.2; },
  };
}
