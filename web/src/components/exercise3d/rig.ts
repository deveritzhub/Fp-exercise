import * as THREE from 'three';

/**
 * Poses the hero's skeleton for exercise demonstrations, in the figure's own space: +y up, +z the way
 * the figure faces, +x its left. A pose is described the way a movement is thought of (where the
 * pelvis is and how far it leans, where each foot stands, which way the arms point) and worked out
 * from there: the legs by two-bone IK, every bone turned from its rest direction to the wanted one.
 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const X = V(1, 0, 0);
export type Side = 'l' | 'r';
const SIDES: Side[] = ['l', 'r'];
export const sign = (s: Side) => (s === 'l' ? 1 : -1);

export type LegPose = {
  /** Where the ankle is. */
  ankle: THREE.Vector3;
  /** Which way the knee points (need not be exact: only the part square to the leg counts). */
  knee?: THREE.Vector3;
  /** Which way the foot points, heel to toes. Flat and forward by default. */
  foot?: THREE.Vector3;
};
export type ArmPose = { upper: THREE.Vector3; lower?: THREE.Vector3 };
export type Pose = {
  /** The pelvis: where its middle is, and how far it tips forward (radians; -π/2 lies the figure on its back). */
  pelvis: THREE.Vector3;
  pitch?: number;
  /** Bending of the back on top of the pelvis (forward is positive). */
  spine?: number;
  /** The head: tips back against the lean, so the eyes stay level (radians, on top of the trunk). */
  head?: number;
  legs: Record<Side, LegPose>;
  arms?: Partial<Record<Side, ArmPose>>;
};

type Bones = Record<string, THREE.Object3D>;
const NAMES = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head', ...SIDES.flatMap((s) => [`thigh_${s}`, `calf_${s}`, `foot_${s}`, `ball_${s}`, `clavicle_${s}`, `upperarm_${s}`, `lowerarm_${s}`, `hand_${s}`])];

export class Rig {
  readonly bones: Bones = {};
  private rest = new Map<THREE.Object3D, { q: THREE.Quaternion; p: THREE.Vector3 }>();
  /** Measured in the rest pose, in figure space. */
  readonly hipHeight: number;
  readonly hipWidth: number;
  readonly ankleHeight: number;
  readonly thigh: number;
  readonly shin: number;
  readonly footLen: number;
  /** Pelvis to the base of the neck. */
  readonly trunk: number;
  /** From the middle of the pelvis down to the hip joints. */
  readonly pelvisDrop: number;
  readonly ankle: Record<Side, THREE.Vector3>;
  /** The ball of each foot, and the direction of the foot (ankle to ball), standing. */
  readonly ball: Record<Side, THREE.Vector3>;
  readonly footDir: THREE.Vector3;

  /** `model` stands in `space` (the group the poses are given in), unposed. */
  constructor(model: THREE.Object3D, private space: THREE.Object3D) {
    for (const n of NAMES) {
      const b = model.getObjectByName(n);
      if (!b) throw new Error(`bone ${n} missing`);
      this.bones[n] = b;
    }
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) this.rest.set(o, { q: o.quaternion.clone(), p: o.position.clone() });
    });
    space.updateMatrixWorld(true);
    const at = (n: string) => this.at(n);
    this.hipHeight = (at('thigh_l').y + at('thigh_r').y) / 2;
    this.hipWidth = Math.abs(at('thigh_l').x - at('thigh_r').x);
    this.ankleHeight = (at('foot_l').y + at('foot_r').y) / 2;
    this.thigh = at('thigh_l').distanceTo(at('calf_l'));
    this.shin = at('calf_l').distanceTo(at('foot_l'));
    this.footLen = at('foot_l').distanceTo(at('ball_l'));
    this.trunk = at('pelvis').distanceTo(at('neck_01'));
    this.pelvisDrop = at('pelvis').y - this.hipHeight;
    this.ankle = { l: at('foot_l'), r: at('foot_r') };
    this.ball = { l: at('ball_l'), r: at('ball_r') };
    this.footDir = this.ball.l.clone().sub(this.ankle.l).setX(0).normalize();
  }

  /** A bone's place, in figure space. */
  at(name: string): THREE.Vector3 {
    return this.space.worldToLocal(this.bones[name].getWorldPosition(V()));
  }

  private refresh() {
    this.space.updateMatrixWorld(true);
  }

  /** The direction `dir` of figure space, in world space. */
  private toWorld(dir: THREE.Vector3) {
    return dir.clone().transformDirection(this.space.matrixWorld);
  }

  /** Turns a bone by a rotation given in world space. */
  private turnWorld(bone: THREE.Object3D, q: THREE.Quaternion) {
    const pq = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.premultiply(pq.clone().invert().multiply(q).multiply(pq));
    this.refresh();
  }

  /** Turns a bone about an axis of figure space. */
  twist(name: string, axis: THREE.Vector3, angle: number) {
    if (!angle) return;
    this.turnWorld(this.bones[name], new THREE.Quaternion().setFromAxisAngle(this.toWorld(axis).normalize(), angle));
  }

  /** Points a bone (towards its `child`) along `dir` of figure space, by the shortest turn. */
  aim(name: string, child: string, dir: THREE.Vector3) {
    const b = this.bones[name];
    const from = this.bones[child].getWorldPosition(V()).sub(b.getWorldPosition(V())).normalize();
    const to = this.toWorld(dir).normalize();
    this.turnWorld(b, new THREE.Quaternion().setFromUnitVectors(from, to));
  }

  /** Back to the unposed figure. */
  reset() {
    for (const [b, r] of this.rest) {
      b.quaternion.copy(r.q);
      b.position.copy(r.p);
    }
    this.refresh();
  }

  apply(pose: Pose) {
    this.reset();
    const { pelvis } = this.bones;
    // The pelvis: tipped first (about its own middle), then put in its place.
    this.twist('pelvis', X, pose.pitch ?? 0);
    const want = this.space.localToWorld(pose.pelvis.clone());
    pelvis.position.copy(pelvis.parent!.worldToLocal(want));
    this.refresh();
    // The back bends over its three joints; the head goes against it.
    if (pose.spine) for (const n of ['spine_01', 'spine_02', 'spine_03']) this.twist(n, X, pose.spine / 3);
    if (pose.head) {
      this.twist('neck_01', X, pose.head * 0.5);
      this.twist('head', X, pose.head * 0.5);
    }
    for (const s of SIDES) {
      const leg = pose.legs[s];
      const hip = this.at(`thigh_${s}`);
      const to = leg.ankle.clone().sub(hip);
      const reach = this.thigh + this.shin;
      const d = Math.min(reach * 0.999, Math.max(Math.abs(this.thigh - this.shin) + 0.01, to.length()));
      const along = to.clone().normalize();
      // The knee: on the circle where the thigh and the shin meet, on the side the hint points to.
      const a = (this.thigh * this.thigh - this.shin * this.shin + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, this.thigh * this.thigh - a * a));
      const hint = (leg.knee ?? V(0, 0, 1)).clone();
      const side = hint.sub(along.clone().multiplyScalar(hint.dot(along)));
      if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
      side.normalize();
      const knee = hip.clone().add(along.clone().multiplyScalar(a)).add(side.multiplyScalar(h));
      this.aim(`thigh_${s}`, `calf_${s}`, knee.clone().sub(hip));
      this.aim(`calf_${s}`, `foot_${s}`, hip.clone().add(along.multiplyScalar(d)).sub(knee));
      this.aim(`foot_${s}`, `ball_${s}`, leg.foot ?? this.footDir);
      const arm = pose.arms?.[s] ?? { upper: V(sign(s) * 0.1, -1, 0.02) };
      this.aim(`upperarm_${s}`, `lowerarm_${s}`, arm.upper);
      this.aim(`lowerarm_${s}`, `hand_${s}`, arm.lower ?? arm.upper.clone().add(V(0, 0, 0.12)));
    }
  }
}
