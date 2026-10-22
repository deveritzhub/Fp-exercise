import { useState } from 'react';
import { PersonStanding, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { mediaUrl } from '@/lib/api';
import { useLabels } from '@/lib/meta';

const REGION_TINT: Record<string, string> = {
  cervical_spine: 'from-[#ece8df] to-[#dcd6c6]',
  thoracic_spine: 'from-[#eae6dc] to-[#d6d3bf]',
  lumbar_spine: 'from-[#ede6da] to-[#dccfbb]',
  shoulder: 'from-[#e8e7dc] to-[#cfcdb6]',
  elbow: 'from-[#ece5da] to-[#d9cbb6]',
  wrist_hand: 'from-[#ebe7de] to-[#d8d2c1]',
  hip: 'from-[#e6e5da] to-[#c9c7ae]',
  knee: 'from-[#e9e6dc] to-[#d3cfb9]',
  ankle_foot: 'from-[#ede7dc] to-[#dbd1bd]',
  full_body: 'from-[#e9e4db] to-[#d5cfbf]',
};

/**
 * Exercise thumbnail. When no real media exists we show a neutral, clearly-labelled placeholder
 * (never a fake photo/video).
 */
export function ExerciseThumb({ thumbnailId, videoId, region, className, showRegion = false, rounded = 'rounded-lg' }: { thumbnailId: string | null; videoId?: string | null; region: string; className?: string; showRegion?: boolean; rounded?: string }) {
  const L = useLabels();
  const [failed, setFailed] = useState(false);
  const src = mediaUrl(thumbnailId);
  const videoSrc = mediaUrl(videoId);
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', REGION_TINT[region] ?? REGION_TINT.full_body, rounded, className)}>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : videoSrc && !failed ? (
        // No thumbnail: show a frame of the video itself (the #t fragment makes browsers, incl. iOS, render it).
        <video src={`${videoSrc}#t=1`} muted playsInline preload="metadata" className="h-full w-full object-cover" onError={() => setFailed(true)} aria-hidden />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <PersonStanding className="h-[38%] w-[38%] min-h-5 min-w-5 text-brand-olive/40" strokeWidth={1.5} aria-hidden />
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
