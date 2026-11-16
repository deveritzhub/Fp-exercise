import { useEffect, useRef, type MutableRefObject } from 'react';
import { VILLAGE_LAYOUT, type Vec } from './walk';

/**
 * The village seen from above, drawn on a canvas: roads, trees, every building as a landmark with its
 * own icon, the villagers, the hero and where the hero is heading. Used twice: as the round minimap
 * that turns with the view, and as the large world map. A tap on either walks the hero there.
 */
export type MapTrack = {
  x: number;
  z: number;
  facing: number;
  target?: Vec | null;
  /** Angle of the view, so the minimap can turn with it. */
  cam?: number;
  trees?: Vec[];
  roads?: { a: Vec; b: Vec; w: number }[];
  /** How far the village reaches from the square; the patient's village when left out. */
  bound?: number;
  people?: Vec[];
};
export type Landmark = { key: string; label: string; x: number; z: number; icon: string; color: string; alert?: boolean; wide?: boolean };

type View = { size: number; center: Vec; scale: number; rot: number; round: boolean; labels: boolean };

const TAU = Math.PI * 2;

function toScreen(v: View, p: Vec): [number, number] {
  const dx = (p.x - v.center.x) * v.scale;
  const dz = (p.z - v.center.z) * v.scale;
  const c = Math.cos(v.rot);
  const s = Math.sin(v.rot);
  return [v.size / 2 + dx * c - dz * s, v.size / 2 + dx * s + dz * c];
}

/** The point in the village under a tap on the canvas. */
export function toWorld(v: View, px: number, py: number): Vec {
  const dx = px - v.size / 2;
  const dy = py - v.size / 2;
  const c = Math.cos(-v.rot);
  const s = Math.sin(-v.rot);
  return { x: v.center.x + (dx * c - dy * s) / v.scale, z: v.center.z + (dx * s + dy * c) / v.scale };
}

export function drawVillageMap(g: CanvasRenderingContext2D, v: View, track: MapTrack, landmarks: Landmark[], now: number) {
  const S = v.size;
  g.save();
  g.clearRect(0, 0, S, S);
  if (v.round) {
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2, 0, TAU);
    g.clip();
  }
  // Hills all round, the meadow of the village in the middle.
  g.fillStyle = '#3f6a2e';
  g.fillRect(0, 0, S, S);
  g.save();
  g.translate(S / 2, S / 2);
  g.rotate(v.rot);
  g.scale(v.scale, v.scale);
  g.translate(-v.center.x, -v.center.z);
  const B = track.bound ?? VILLAGE_LAYOUT.bound;
  g.fillStyle = '#5f9440';
  g.beginPath();
  g.arc(0, 0, B + 1.2, 0, TAU);
  g.fill();
  g.fillStyle = '#6ba447';
  for (const [x, z, r] of [[-6, 5, 3.4], [6, 6, 3], [7, -6, 3.6], [-8, -6, 3], [0, 9, 2.6]]) {
    g.beginPath();
    g.arc(x, z, r, 0, TAU);
    g.fill();
  }
  // Roads: a dark edge with the dirt on top, then the square and the well.
  g.lineCap = 'round';
  for (const [color, grow] of [['#7d6a45', 0.45], ['#c2a06d', 0]] as const) {
    g.strokeStyle = color;
    for (const r of track.roads ?? []) {
      g.lineWidth = r.w + grow;
      g.beginPath();
      g.moveTo(r.a.x, r.a.z);
      g.lineTo(r.b.x, r.b.z);
      g.stroke();
    }
    g.fillStyle = color;
    g.beginPath();
    g.arc(0, 0, 3.2 + grow / 2, 0, TAU);
    g.fill();
  }
  g.fillStyle = '#8d8a82';
  g.beginPath();
  g.arc(0, 0, 0.75, 0, TAU);
  g.fill();
  g.fillStyle = '#58b7d6';
  g.beginPath();
  g.arc(0, 0, 0.48, 0, TAU);
  g.fill();
  // Trees: a dark crown with a lighter side.
  for (const t of track.trees ?? []) {
    g.fillStyle = '#2f6a30';
    g.beginPath();
    g.arc(t.x, t.z, 0.78, 0, TAU);
    g.fill();
    g.fillStyle = '#4f9a45';
    g.beginPath();
    g.arc(t.x - 0.18, t.z - 0.2, 0.46, 0, TAU);
    g.fill();
  }
  // Buildings: a roof in their own colour, turned to the square.
  g.lineWidth = 0.14;
  g.strokeStyle = '#1c2420';
  for (const l of landmarks) {
    g.save();
    g.translate(l.x, l.z);
    g.rotate(l.wide ? 0 : Math.atan2(l.z, l.x) + Math.PI / 2);
    const w = l.wide ? 6 : 2.7;
    const d = l.wide ? 2.5 : 2.2;
    g.fillStyle = l.color;
    g.beginPath();
    g.roundRect(-w / 2, -d / 2, w, d, 0.25);
    g.fill();
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.45)';
    g.beginPath();
    g.moveTo(-w / 2 + 0.2, 0);
    g.lineTo(w / 2 - 0.2, 0);
    g.stroke();
    g.strokeStyle = '#1c2420';
    g.restore();
  }
  // Villagers.
  for (const p of track.people ?? []) {
    g.fillStyle = '#cfe8ff';
    g.beginPath();
    g.arc(p.x, p.z, 0.36, 0, TAU);
    g.fill();
    g.stroke();
  }
  g.restore();

  // From here in screen space, so icons and letters stay upright whatever way the map is turned.
  const hero = toScreen(v, track);
  if (track.target) {
    const [tx, ty] = toScreen(v, track.target);
    g.strokeStyle = '#ffd76a';
    g.lineWidth = Math.max(2, S * 0.008);
    g.setLineDash([S * 0.02, S * 0.02]);
    g.beginPath();
    g.moveTo(hero[0], hero[1]);
    g.lineTo(tx, ty);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#ffd76a';
    g.strokeStyle = '#1c2420';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(tx, ty, S * (v.round ? 0.035 : 0.014) * (1 + 0.25 * Math.sin(now / 220)), 0, TAU);
    g.fill();
    g.stroke();
  }
  const badge = v.round ? S * 0.085 : S * 0.036;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const l of landmarks) {
    const [x, y] = toScreen(v, l);
    g.fillStyle = '#fffdf6';
    g.strokeStyle = l.color;
    g.lineWidth = Math.max(2, badge * 0.18);
    g.beginPath();
    g.arc(x, y, badge, 0, TAU);
    g.fill();
    g.stroke();
    g.font = `${Math.round(badge * 1.15)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    g.fillStyle = '#1c2420';
    g.fillText(l.icon, x, y + badge * 0.06);
    if (l.alert) {
      g.fillStyle = '#ffd21f';
      g.strokeStyle = '#1c2420';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x + badge * 0.85, y - badge * 0.85, badge * 0.5, 0, TAU);
      g.fill();
      g.stroke();
      g.fillStyle = '#1c2420';
      g.font = `900 ${Math.round(badge * 0.8)}px system-ui, sans-serif`;
      g.fillText('!', x + badge * 0.85, y - badge * 0.82);
    }
    if (v.labels) {
      g.font = `700 ${Math.round(S * 0.026)}px "Manrope Variable", "Inter Variable", system-ui, sans-serif`;
      g.lineWidth = S * 0.007;
      g.strokeStyle = '#fffdf6';
      g.strokeText(l.label, x, y + badge + S * 0.022);
      g.fillStyle = '#2a2114';
      g.fillText(l.label, x, y + badge + S * 0.022);
    }
  }
  // The hero: an arrow in the direction of walking.
  g.save();
  g.translate(hero[0], hero[1]);
  g.rotate(v.rot - track.facing);
  const a = v.round ? S * 0.085 : S * 0.03;
  g.fillStyle = '#9dff9a';
  g.strokeStyle = '#1c2420';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, a);
  g.lineTo(a * 0.65, -a * 0.65);
  g.lineTo(0, -a * 0.3);
  g.lineTo(-a * 0.65, -a * 0.65);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
  // North.
  const nr = v.round ? S / 2 - S * 0.07 : S * 0.44;
  const nx = S / 2 + Math.sin(v.rot) * nr;
  const ny = S / 2 - Math.cos(v.rot) * nr;
  g.fillStyle = '#1c2420';
  g.beginPath();
  g.arc(nx, ny, v.round ? S * 0.06 : S * 0.026, 0, TAU);
  g.fill();
  g.fillStyle = '#ffd76a';
  g.font = `800 ${Math.round(v.round ? S * 0.075 : S * 0.032)}px system-ui, sans-serif`;
  g.fillText('N', nx, ny + 1);
  g.restore();
}

type Props = {
  track: MutableRefObject<MapTrack>;
  landmarks: Landmark[];
  /** A tap on a landmark. */
  onPlace: (key: string) => void;
  /** A tap anywhere else in the village. */
  onWalk: (p: Vec) => void;
  label: string;
};

function useMap(kind: 'mini' | 'world', { track, landmarks }: Pick<Props, 'track' | 'landmarks'>) {
  const ref = useRef<HTMLCanvasElement>(null);
  const view = useRef<View | null>(null);
  // The latest landmarks, read at draw time: a new list on every render must not restart the timer.
  const marks = useRef(landmarks);
  marks.current = landmarks;
  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const draw = () => {
      const t = track.current;
      const S = c.width;
      const v: View = kind === 'mini'
        ? { size: S, center: { x: t.x, z: t.z }, scale: S / 2 / 10.5, rot: t.cam ?? 0, round: true, labels: false }
        : { size: S, center: { x: 0, z: -1.2 }, scale: S / 2 / ((t.bound ?? VILLAGE_LAYOUT.bound) + 2.6), rot: 0, round: false, labels: true };
      view.current = v;
      drawVillageMap(g, v, t, marks.current, Date.now());
    };
    draw();
    const id = window.setInterval(draw, kind === 'mini' ? 90 : 160);
    return () => window.clearInterval(id);
  }, [kind, track]);
  const pick = (e: React.MouseEvent<HTMLCanvasElement>): { place?: string; point?: Vec } => {
    const c = ref.current;
    const v = view.current;
    if (!c || !v) return {};
    const box = c.getBoundingClientRect();
    const p = toWorld(v, ((e.clientX - box.left) / box.width) * c.width, ((e.clientY - box.top) / box.height) * c.height);
    let best: Landmark | null = null;
    let bd = kind === 'mini' ? 2.4 : 2.0;
    for (const l of marks.current) {
      const d = Math.hypot(l.x - p.x, l.z - p.z);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    return best ? { place: best.key } : { point: p };
  };
  return { ref, pick };
}

/** Round map in the corner: the hero in the middle, the village turning with the view. */
export function Minimap(props: Props) {
  const { ref, pick } = useMap('mini', props);
  return (
    <canvas
      ref={ref}
      width={216}
      height={216}
      role="img"
      aria-label={props.label}
      data-testid="minimap"
      className="h-[96px] w-[96px] cursor-pointer rounded-full border-2 border-[#e4bc63] shadow-lift"
      onClick={(e) => {
        const hit = pick(e);
        if (hit.place) props.onPlace(hit.place);
        else if (hit.point) props.onWalk(hit.point);
      }}
    />
  );
}

/** The whole village on one sheet, north up, with every landmark named. */
export function WorldMap(props: Props) {
  const { ref, pick } = useMap('world', props);
  return (
    <canvas
      ref={ref}
      width={760}
      height={760}
      role="img"
      aria-label={props.label}
      data-testid="world-map"
      className="aspect-square w-full cursor-pointer rounded-xl border-4 border-[#6b4a2b] bg-[#3f6a2e] shadow-card"
      onClick={(e) => {
        const hit = pick(e);
        if (hit.place) props.onPlace(hit.place);
        else if (hit.point && Math.hypot(hit.point.x, hit.point.z) <= (props.track.current.bound ?? VILLAGE_LAYOUT.bound)) props.onWalk(hit.point);
      }}
    />
  );
}
