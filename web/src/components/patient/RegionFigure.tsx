/**
 * A calm line figure with one body region marked: what an exercise is for, shown where there is no
 * video or photo yet. A drawing, never a stand-in photo.
 */
const SPOT: Record<string, [number, number][]> = {
  cervical_spine: [[50, 21]],
  thoracic_spine: [[50, 34]],
  lumbar_spine: [[50, 48]],
  shoulder: [[36, 27], [64, 27]],
  elbow: [[30, 42], [70, 42]],
  wrist_hand: [[27, 56], [73, 56]],
  hip: [[43, 56], [57, 56]],
  knee: [[43, 74], [57, 74]],
  ankle_foot: [[43, 93], [57, 93]],
  full_body: [],
};

export function RegionFigure({ region, className }: { region: string; className?: string }) {
  const spots = SPOT[region] ?? [];
  return (
    <svg viewBox="0 0 100 104" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity={spots.length ? 0.45 : 0.7}>
        <circle cx="50" cy="11" r="7" />
        <path d="M50 20 V54" />
        <path d="M36 27 H64" />
        <path d="M36 27 L30 42 L27 56" />
        <path d="M64 27 L70 42 L73 56" />
        <path d="M43 56 H57" />
        <path d="M43 56 V74 L43 93" />
        <path d="M57 56 V74 L57 93" />
      </g>
      {spots.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="9" fill="#E3B655" opacity="0.35" />
          <circle cx={x} cy={y} r="4.5" fill="#E3B655" />
        </g>
      ))}
    </svg>
  );
}
