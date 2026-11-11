import type { FigureLook } from './HumanFigure';

/** Body proportions for a body type and build (all positions in the 200 × 420 frame). */
export function figureGeometry(look: Pick<FigureLook, 'frame' | 'build' | 'body'>) {
  const f = look.frame === 'f';
  const b = { slim: 0.9, average: 1, athletic: 1.04, full: 1.16 }[look.build ?? 'average'] ?? 1;
  let shoulder = (f ? 31 : 36) * (look.build === 'athletic' ? 1.1 : look.build === 'full' ? 1.08 : b);
  let chest = (f ? 28 : 31) * b;
  let waist = (f ? 21 : 26) * (look.build === 'full' ? 1.32 : look.build === 'athletic' ? 0.96 : b);
  let hip = (f ? 31 : 27) * (look.build === 'full' ? 1.2 : b);
  let neck = (f ? 6.5 : 8) * (look.build === 'athletic' ? 1.12 : b);
  let limbW = look.build === 'full' ? 1.2 : look.build === 'athletic' ? 1.12 : b;
  let armW = limbW;
  let legW = limbW;
  let belly = look.build === 'full' ? 0.12 : 0;
  // Own measurements win: fat mostly widens waist and hips, muscle mostly shoulders, neck and limbs.
  if (look.body) {
    const fat = Math.min(1, Math.max(0, look.body.fat));
    const mus = Math.min(1, Math.max(0, look.body.muscle));
    shoulder = (f ? 31 : 36) * (0.86 + 0.42 * mus + 0.1 * fat);
    chest = (f ? 28 : 31) * (0.84 + 0.3 * mus + 0.42 * fat);
    waist = (f ? 21 : 26) * (0.78 + 0.02 * mus + 1.3 * fat);
    hip = (f ? 31 : 27) * (0.84 + 0.05 * mus + 0.6 * fat);
    neck = (f ? 6.5 : 8) * (0.86 + 0.5 * mus + 0.25 * fat);
    limbW = 0.82 + 0.45 * mus + 0.5 * fat;
    armW = 0.76 + 0.75 * mus + 0.45 * fat;
    legW = 0.8 + 0.42 * mus + 0.75 * fat;
    belly = 0.45 * fat;
  }
  const legX = hip * 0.52 + 1;
  return {
    f, b, shoulder, chest, waist, hip, neck, limbW, armW, legW, belly, legX,
    armX: (side: -1 | 1, y: number) => 100 + side * (shoulder - 3 + (y - 92) * 0.14),
    /** Where each body-map area sits on this figure. */
    points: {
      head: [100, 34], neck: [100, 66],
      shoulder_r: [100 - shoulder + 4, 94], shoulder_l: [100 + shoulder - 4, 94],
      chest: [100, 118], upper_back: [100, 116],
      elbow_r: [100 - shoulder - 7, 152], elbow_l: [100 + shoulder + 7, 152],
      abdomen: [100, 166], lower_back: [100, 176],
      wrist_r: [100 - shoulder - 12, 214], wrist_l: [100 + shoulder + 12, 214],
      hip_r: [100 - hip + 6, 206], hip_l: [100 + hip - 6, 206],
      buttock_l: [100 - legX, 222], buttock_r: [100 + legX, 222],
      thigh_r: [100 - legX, 256], thigh_l: [100 + legX, 256],
      hamstring_l: [100 - legX, 262], hamstring_r: [100 + legX, 262],
      knee_r: [100 - legX * 0.82, 300], knee_l: [100 + legX * 0.82, 300],
      calf_l: [100 - legX * 0.8, 340], calf_r: [100 + legX * 0.8, 340],
      ankle_r: [100 - legX * 0.8, 388], ankle_l: [100 + legX * 0.8, 388],
    } as Record<string, [number, number]>,
  };
}

