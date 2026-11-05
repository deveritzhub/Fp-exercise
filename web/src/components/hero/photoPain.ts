import type { PhotoFit } from './photoFit';

const mix = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * Where each pain area sits on the hero photo (0–1 of the 3:4 image), from the measured pose
 * landmarks (MediaPipe numbering: 11/12 shoulders, 13/14 elbows, 15/16 wrists, 23/24 hips,
 * 25/26 knees, 27/28 ankles; odd = the person's left, which is on the viewer's right in a front
 * photo). The back view is the photo's silhouette mirrored, so the person's left is on the left.
 */
export function photoPainPoints(fit: PhotoFit): Record<string, [number, number]> {
  const p = fit.points;
  const shoulders = mix(p[11], p[12], 0.5);
  const hips = mix(p[23], p[24], 0.5);
  const ears = mix(p[7], p[8], 0.5);
  const mirror = (q: number[], dy = 0): [number, number] => [1 - q[0], q[1] + dy];
  const at = (q: number[]): [number, number] => [q[0], q[1]];
  return {
    // Front
    head: [p[0][0], (fit.headTop + p[0][1]) / 2],
    shoulder_r: at(p[12]),
    shoulder_l: at(p[11]),
    chest: at(mix(shoulders, hips, 0.28)),
    elbow_r: at(p[14]),
    elbow_l: at(p[13]),
    abdomen: at(mix(shoulders, hips, 0.72)),
    wrist_r: at(p[16]),
    wrist_l: at(p[15]),
    hip_r: at(p[24]),
    hip_l: at(p[23]),
    thigh_r: at(mix(p[24], p[26], 0.5)),
    thigh_l: at(mix(p[23], p[25], 0.5)),
    knee_r: at(p[26]),
    knee_l: at(p[25]),
    ankle_r: at(p[28]),
    ankle_l: at(p[27]),
    // Back (mirrored)
    neck: mirror(mix(shoulders, ears, 0.45)),
    upper_back: mirror(mix(shoulders, hips, 0.25)),
    lower_back: mirror(mix(shoulders, hips, 0.82)),
    buttock_l: mirror(p[23], 0.035),
    buttock_r: mirror(p[24], 0.035),
    hamstring_l: mirror(mix(p[23], p[25], 0.55)),
    hamstring_r: mirror(mix(p[24], p[26], 0.55)),
    calf_l: mirror(mix(p[25], p[27], 0.38)),
    calf_r: mirror(mix(p[26], p[28], 0.38)),
  };
}
