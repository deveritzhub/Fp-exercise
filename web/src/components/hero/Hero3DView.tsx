import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import type { Group } from 'three';
import { hero3DAttachments, buildProportions, skinHex, type HeirloomKind } from '@shared/hero3d';
import { useI18n } from '@/lib/i18n';

export type Hero3DProps = {
  build?: string;
  bodyKind?: string | null;
  skin: string;
  equipped: readonly string[];
  aids?: readonly string[];
  operatedSide?: 'left' | 'right' | null;
  heirloom?: { kind: HeirloomKind; tier: number } | null;
  victory?: boolean;
};

const CLOTH = '#29483c';
const CLOTH_DARK = '#1d362d';

function Mannequin({ props, reduce }: { props: Hero3DProps; reduce: boolean }) {
  const root = useRef<Group>(null);
  const hips = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const started = useRef<number | null>(null);
  const body = buildProportions(props.build, props.bodyKind);
  const skin = skinHex(props.skin);
  const attach = hero3DAttachments({
    equipped: props.equipped,
    aids: props.aids,
    operatedSide: props.operatedSide,
    heirloom: props.heirloom,
  });
  const sign = attach.brace.side === 'left' ? 1 : -1;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (props.victory && started.current === null) started.current = t;
    const phase = started.current === null ? 99 : t - started.current;
    const raise = !reduce && phase < 1.8 ? Math.sin(Math.min(phase, 1.2) / 1.2 * Math.PI) : 0;
    const swing = reduce ? 0 : Math.sin(t * 1.5) * 0.18 * (1 - raise);
    if (armL.current) armL.current.rotation.x = swing - raise * 2.4;
    if (armR.current) armR.current.rotation.x = -swing - raise * 2.4;
    if (hips.current) hips.current.position.y = reduce ? 0.9 : 0.9 + Math.sin(t * 2) * 0.015;
  });

  const glow = attach.heirloom;
  const skinMat = <meshStandardMaterial color={skin} roughness={0.72} />;
  const clothMat = <meshStandardMaterial color={CLOTH} roughness={0.8} />;

  return (
    <group ref={root} scale={[body.shoulder, body.height, (body.hip + body.shoulder) / 2]} position={[0, -0.95, 0]}>
      <group ref={hips} position={[0, 0.92, 0]}>
        <mesh>
          <boxGeometry args={[0.28, 0.16, 0.18]} />
          <meshStandardMaterial color={CLOTH_DARK} />
        </mesh>
        <group position={[0, 0.28, 0]}>
          <mesh>
            <boxGeometry args={[0.34, 0.4, 0.18]} />
            {clothMat}
          </mesh>
          <mesh position={[0, 0.34, 0]}>
            <sphereGeometry args={[0.13, 12, 10]} />
            {skinMat}
          </mesh>
          {glow?.bone === 'chest' && (
            <mesh position={[0, 0.02, 0.11]}>
              <sphereGeometry args={[0.045 + glow.tier * 0.004, 10, 8]} />
              <meshStandardMaterial color={glow.color} emissive={glow.color} emissiveIntensity={glow.intensity} metalness={0.55} roughness={0.3} />
            </mesh>
          )}
          <group ref={armL} position={[0.21, 0.14, 0]}>
            <mesh position={[0, -0.14, 0]}>
              <boxGeometry args={[0.08, 0.28, 0.08]} />
              {skinMat}
            </mesh>
            <group position={[0, -0.28, 0]}>
              <mesh position={[0, -0.12, 0]}>
                <boxGeometry args={[0.07, 0.24, 0.07]} />
                {skinMat}
              </mesh>
              {glow?.bone === 'forearmL' && (
                <mesh position={[0, -0.08, 0.05]}>
                  <boxGeometry args={[0.16, 0.2, 0.025]} />
                  <meshStandardMaterial color={glow.color} emissive={glow.color} emissiveIntensity={glow.intensity} metalness={0.45} roughness={0.35} />
                </mesh>
              )}
            </group>
          </group>
          <group ref={armR} position={[-0.21, 0.14, 0]}>
            <mesh position={[0, -0.14, 0]}>
              <boxGeometry args={[0.08, 0.28, 0.08]} />
              {skinMat}
            </mesh>
            <group position={[0, -0.28, 0]}>
              <mesh position={[0, -0.12, 0]}>
                <boxGeometry args={[0.07, 0.24, 0.07]} />
                {skinMat}
              </mesh>
              {glow?.bone === 'handR' && (
                <mesh position={[0, -0.22, 0.02]}>
                  <boxGeometry args={[0.04, 0.32, 0.04]} />
                  <meshStandardMaterial color={glow.color} emissive={glow.color} emissiveIntensity={glow.intensity} metalness={0.5} roughness={0.32} />
                </mesh>
              )}
            </group>
          </group>
          {attach.crutches && [-0.32, 0.32].map((x) => (
            <mesh key={x} position={[x, -0.35, 0.04]}>
              <cylinderGeometry args={[0.018, 0.018, 1.15, 6]} />
              <meshStandardMaterial color="#c4a574" roughness={0.55} />
            </mesh>
          ))}
        </group>
        {([-1, 1] as const).map((s) => {
          const side = s === 1 ? 'left' : 'right';
          return (
            <group key={s} position={[s * 0.08, -0.08, 0]}>
              <mesh position={[0, -0.2, 0]}>
                <boxGeometry args={[0.11, 0.4, 0.11]} />
                {clothMat}
              </mesh>
              <group position={[0, -0.4, 0]}>
                <mesh position={[0, -0.18, 0]}>
                  <boxGeometry args={[0.09, 0.36, 0.09]} />
                  {skinMat}
                </mesh>
                {attach.brace.side === side && (
                  <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.07, 0.016, 6, 14]} />
                    <meshStandardMaterial color="#b7c0c4" metalness={0.7} roughness={0.3} />
                  </mesh>
                )}
              </group>
            </group>
          );
        })}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[0.7, 24]} />
        <meshStandardMaterial color="#d5e0cf" />
      </mesh>
      <group name={`brace-${attach.brace.side}`} position={[sign * 0.2, 0.5, 0]} />
    </group>
  );
}

/** Proof-of-concept mannequin. Procedural meshes only; no downloaded models. */
export default function Hero3DView(props: Hero3DProps) {
  const { t } = useI18n();
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const spin = useRef<Group>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!spin.current) return;
      if (e.key === 'ArrowLeft') { spin.current.rotation.y -= 0.18; e.preventDefault(); }
      if (e.key === 'ArrowRight') { spin.current.rotation.y += 0.18; e.preventDefault(); }
      if (e.key === 'ArrowUp') { spin.current.rotation.x = Math.max(-0.4, spin.current.rotation.x - 0.08); e.preventDefault(); }
      if (e.key === 'ArrowDown') { spin.current.rotation.x = Math.min(0.3, spin.current.rotation.x + 0.08); e.preventDefault(); }
    };
    const el = document.getElementById('hero-3d-stage');
    el?.addEventListener('keydown', onKey);
    return () => el?.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div
      id="hero-3d-stage"
      tabIndex={0}
      role="application"
      aria-label={t('Driedimensionale held. Sleep of gebruik de pijltjestoetsen om te draaien.', 'Three-dimensional hero. Drag or use the arrow keys to turn.')}
      className="mt-3 h-[320px] w-full overflow-hidden rounded-2xl border border-line bg-[#e7efe3] outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Canvas
        dpr={[1, 1.25]}
        camera={{ position: [0, 0.9, 2.4], fov: 35 }}
        gl={{ antialias: false, powerPreference: 'low-power', alpha: false }}
      >
        <color attach="background" args={['#e7efe3']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 2]} intensity={0.9} />
        <group ref={spin}>
          <Mannequin props={props} reduce={reduce} />
        </group>
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.8} maxPolarAngle={1.6} />
      </Canvas>
    </div>
  );
}
