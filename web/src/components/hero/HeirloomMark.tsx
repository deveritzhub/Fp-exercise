/** Cosmetic heirloom. Five forms; the tier only ever rises. */
export function HeirloomMark({ kind, tier, className }: { kind: 'weapon' | 'shield' | 'amulet'; tier: 1 | 2 | 3 | 4 | 5; className?: string }) {
  const gold = ['#c4b49a', '#b08a4f', '#c9a227', '#e0b84a', '#f3d27a'][tier - 1];
  const ink = '#343F2A';
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#F4F1E8" />
      {kind === 'shield' && <path d="M32 8 l16 6 v16 c0 12 -8 20 -16 24 c-8 -4 -16 -12 -16 -24 V14 z" fill={gold} stroke={ink} strokeWidth="2" />}
      {kind === 'weapon' && (
        <>
          <path d="M30 8 h4 v34 h-4 z" fill={gold} stroke={ink} strokeWidth="2" />
          <path d="M22 40 h20 v4 h-20 z" fill={ink} />
          <path d="M30 44 h4 v10 h-4 z" fill="#8a6a3a" />
        </>
      )}
      {kind === 'amulet' && (
        <>
          <path d="M20 16 h24" stroke={ink} strokeWidth="2" fill="none" />
          <circle cx="32" cy="36" r={8 + tier} fill={gold} stroke={ink} strokeWidth="2" />
        </>
      )}
      {tier >= 3 && <circle cx="46" cy="16" r="3" fill="#F7F4EC" stroke={ink} />}
      {tier >= 5 && <path d="M32 18 l1.2 2.4 2.6.4 -1.9 1.8.5 2.6 L32 24.2 29.6 25.2 l.5 -2.6 -1.9 -1.8 2.6 -.4 z" fill="#fff8e8" />}
    </svg>
  );
}
