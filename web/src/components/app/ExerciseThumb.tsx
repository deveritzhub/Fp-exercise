import { useState } from 'react';
import { PersonStanding, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { mediaUrl } from '@/lib/api';
import { useLabels } from '@/lib/meta';

const REGION_TINT: Record<string, string> = {
  cervical_spine: 'from-[#e6eef0] to-[#d8e4e8]',
  thoracic_spine: 'from-[#e9ebf1] to-[#dcdfe9]',
  lumbar_spine: 'from-[#ece9e3] to-[#e2ddd3]',
  shoulder: 'from-[#e5ece6] to-[#d6e2d9]',
  elbow: 'from-[#efe9e6] to-[#e5dbd6]',
  wrist_hand: 'from-[#ebe8ef] to-[#dfdbe8]',
  hip: 'from-[#e7ebe4] to-[#dae1d4]',
  knee: 'from-[#e4ecec] to-[#d4e2e1]',
  ankle_foot: 'from-[#ece8e1] to-[#e3dccf]',
  full_body: 'from-[#e8eaeb] to-[#dadfe1]',
};

/**
 * Exercise thumbnail. When no real media exists we show a neutral, clearly-labelled placeholder
 * (never a fake photo/video).
 */
export function ExerciseThumb({ thumbnailId, videoId, region, className, showRegion = false, rounded = 'rounded-lg' }: { thumbnailId: string | null; videoId?: string | null; region: string; className?: string; showRegion?: boolean; rounded?: string }) {
  const L = useLabels();
  const [failed, setFailed] = useState(false);
  const src = mediaUrl(thumbnailId);
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', REGION_TINT[region] ?? REGION_TINT.full_body, rounded, className)}>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <PersonStanding className="h-[38%] w-[38%] min-h-5 min-w-5 text-ink-900/25" strokeWidth={1.5} aria-hidden />
        </div>
      )}
      {videoId && (
        <span className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-950/70 text-white">
          <Play className="h-2.5 w-2.5 fill-current" aria-hidden />
        </span>
      )}
      {showRegion && <span className="absolute left-2 top-2 rounded-md bg-white/85 px-1.5 py-0.5 text-2xs font-medium text-ink-700 backdrop-blur">{L.region(region)}</span>}
    </div>
  );
}
