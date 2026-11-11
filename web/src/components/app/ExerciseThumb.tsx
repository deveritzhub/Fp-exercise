import { memo, useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { mediaUrl } from '@/lib/api';
import { useLabels } from '@/lib/meta';

// Calm sage tints (a few with a hint of sand) while there is no image.
const REGION_TINT: Record<string, string> = {
  cervical_spine: 'from-[#eef3ef] to-[#dbe5de]',
  thoracic_spine: 'from-[#edf2ee] to-[#d8e3db]',
  lumbar_spine: 'from-[#f1f1ea] to-[#e0dccd]',
  shoulder: 'from-[#ecf2ee] to-[#d5e1d8]',
  elbow: 'from-[#f2f0ea] to-[#e2dacb]',
  wrist_hand: 'from-[#eef2ee] to-[#dae3dc]',
  hip: 'from-[#ebf1ec] to-[#d2dfd5]',
  knee: 'from-[#eef3ef] to-[#d9e4dc]',
  ankle_foot: 'from-[#f2f1ea] to-[#e1dbcc]',
  full_body: 'from-[#edf2ee] to-[#d6e1d9]',
};

// ---------------------------------------------------------------------------------------------
// Video posters. Most exercises only have a video, no separate thumbnail image. Rendering dozens of
// <video> elements to show a frame is heavy (iOS limits them, each one fetches data), so we grab one
// frame per video once, keep it as a small JPEG and reuse it everywhere (memory + localStorage).
// ---------------------------------------------------------------------------------------------
const POSTER_KEY = 'fp.posters.v1';
const posters = new Map<string, string>();
try {
  for (const [k, v] of JSON.parse(localStorage.getItem(POSTER_KEY) ?? '[]') as [string, string][]) posters.set(k, v);
} catch {
  /* no storage */
}
function savePoster(id: string, data: string) {
  posters.set(id, data);
  try {
    // Media ids are immutable, so a poster never goes stale. Keep the 80 most recent.
    localStorage.setItem(POSTER_KEY, JSON.stringify([...posters.entries()].slice(-80)));
  } catch {
    /* quota: memory cache still works */
  }
}

/** Queue so only a couple of videos are decoded at the same time while scrolling. */
let active = 0;
const waiting: (() => void)[] = [];
const acquire = () => new Promise<void>((res) => (active < 2 ? (active++, res()) : waiting.push(() => (active++, res()))));
const release = () => {
  active--;
  waiting.shift()?.();
};

function capturePoster(id: string, src: string): Promise<string | null> {
  return acquire().then(
    () =>
      new Promise<string | null>((resolve) => {
        const v = document.createElement('video');
        let done = false;
        const finish = (out: string | null) => {
          if (done) return;
          done = true;
          v.removeAttribute('src');
          v.load();
          release();
          resolve(out);
        };
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        v.crossOrigin = 'anonymous';
        v.addEventListener('loadeddata', () => {
          v.currentTime = Math.min(1, (v.duration || 2) / 3);
        });
        v.addEventListener('seeked', () => {
          try {
            const w = 360;
            const h = Math.round((w * (v.videoHeight || 9)) / (v.videoWidth || 16));
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            c.getContext('2d')!.drawImage(v, 0, 0, w, h);
            const data = c.toDataURL('image/jpeg', 0.72);
            if (data.length > 2000) savePoster(id, data);
            finish(data.length > 2000 ? data : null);
          } catch {
            finish(null);
          }
        });
        v.addEventListener('error', () => finish(null));
        setTimeout(() => finish(null), 12000);
        v.src = src;
      }),
  );
}

/** True once the element has come near the viewport (then stays true). */
function useNearViewport<T extends Element>(enabled: boolean) {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(!enabled || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (near || !ref.current) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '300px 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [near]);
  return [ref, near] as const;
}

/** Short, recognisable letters for exercises without any media (e.g. "Nordic hamstring" → "NH"). */
const monogram = (name?: string) =>
  (name ?? '')
    .replace(/\(.*?\)/g, '')
    .split(/[\s—–-]+/)
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

type Props = {
  thumbnailId: string | null;
  videoId?: string | null;
  region: string;
  name?: string;
  className?: string;
  showRegion?: boolean;
  rounded?: string;
  /** Desktop: play the video (muted) while the pointer is over it. Only one plays at a time. */
  hoverPlay?: boolean;
  /** Hide the small play badge (e.g. when the caller shows its own preview button). */
  hideBadge?: boolean;
  /** Controlled hover-play: the parent decides when the video plays (e.g. hovering the whole card). */
  active?: boolean;
};

/**
 * Exercise thumbnail: the practice's/library's image, otherwise a frame of the exercise video,
 * otherwise a calm placeholder with the exercise's initials (never a fake photo).
 * Media is only requested when the card is near the viewport.
 */
export const ExerciseThumb = memo(function ExerciseThumb({ thumbnailId, videoId, region, name, className, showRegion = false, rounded = 'rounded-lg', hoverPlay = false, hideBadge = false, active }: Props) {
  const L = useLabels();
  const [box, near] = useNearViewport<HTMLDivElement>(true);
  const img = mediaUrl(thumbnailId);
  const videoSrc = mediaUrl(videoId);
  const [poster, setPoster] = useState<string | null>(() => (videoId ? posters.get(videoId) ?? null : null));
  const [imgFailed, setImgFailed] = useState(false);
  const [captureFailed, setCaptureFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hoverSelf, setHovering] = useState(false);
  const hovering = active ?? hoverSelf;
  const [playing, setPlaying] = useState(false);
  const vref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!near || !videoId || !videoSrc || poster || captureFailed || (img && !imgFailed)) return;
    let alive = true;
    capturePoster(videoId, videoSrc).then((p) => alive && (p ? setPoster(p) : setCaptureFailed(true)));
    return () => {
      alive = false;
    };
  }, [near, videoId, videoSrc, poster, captureFailed, img, imgFailed]);

  useEffect(() => {
    if (hovering) vref.current?.play().then(() => setPlaying(true)).catch(() => {});
    else setPlaying(false);
  }, [hovering]);

  const still = img && !imgFailed ? img : poster;
  const canHover = hoverPlay && !!videoSrc;
  return (
    <div
      ref={box}
      className={cn('relative overflow-hidden bg-gradient-to-br', REGION_TINT[region] ?? REGION_TINT.full_body, rounded, className)}
      onMouseEnter={canHover ? () => setHovering(true) : undefined}
      onMouseLeave={canHover ? () => (setHovering(false), setPlaying(false)) : undefined}
    >
      {near && still ? (
        <img
          src={still}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setImgFailed(true)}
          className={cn('h-full w-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
      ) : near && videoSrc && captureFailed ? (
        // Frame grab not possible on this device: let the browser render a frame (#t) itself.
        <video src={`${videoSrc}#t=1`} muted playsInline preload="metadata" className="h-full w-full object-cover" aria-hidden />
      ) : !videoSrc && !(img && !imgFailed) ? (
        <div className="flex h-full w-full items-center justify-center" aria-hidden>
          <span className="font-display text-[clamp(14px,30%,40px)] font-semibold tracking-wide text-brand-forest/35">{monogram(name)}</span>
        </div>
      ) : null}
      {hovering && videoSrc && (
        <video ref={vref} src={videoSrc} muted loop playsInline preload="auto" className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-200', playing ? 'opacity-100' : 'opacity-0')} aria-hidden />
      )}
      {videoId && !playing && !hideBadge && (
        <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink-950/65 text-white backdrop-blur-sm">
          <Play className="ml-px h-3 w-3 fill-current" aria-hidden />
        </span>
      )}
      {showRegion && <span className="absolute left-2 top-2 rounded-md bg-white/85 px-1.5 py-0.5 text-2xs font-medium text-ink-700 backdrop-blur">{L.region(region)}</span>}
    </div>
  );
});
