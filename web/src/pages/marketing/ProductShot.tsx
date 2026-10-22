import { Check, GripVertical, Search } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';

/** Static product illustration built from real UI primitives with synthetic data (no screenshots of real patients). */
export function ProductShot({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  // Real (central-library) exercise videos, cycled in the phone. Falls back to a static screen.
  const showcase = useQuery({
    queryKey: ['showcase'],
    queryFn: () => api.get<{ items: { mediaId: string; nameNl: string; nameEn: string }[] }>('/public/showcase'),
    staleTime: 300_000,
  });
  const vids = showcase.data?.items ?? [];
  const [vi, setVi] = useState(0);
  const cur = vids.length ? vids[vi % vids.length] : null;
  const video = cur ? { src: `/api/public/media/${cur.mediaId}`, name: locale === 'nl' ? cur.nameNl : cur.nameEn } : null;
  const onVideoEnd = () => setVi((x) => x + 1);
  const lib = [
    [t('Spaanse squat', 'Spanish squat'), t('Knie · Isometrisch', 'Knee · Isometric')],
    [t('Excentrisch hielzakken', 'Eccentric heel drop'), t('Enkel · Excentrisch', 'Ankle · Eccentric')],
    [t('Exorotatie met band', 'Band external rotation'), t('Schouder · Kracht', 'Shoulder · Strength')],
    [t('Bekkenbrug', 'Glute bridge'), t('Heup · Kracht', 'Hip · Strength')],
  ];
  const prog = [
    [t('Spaanse squat', 'Spanish squat'), '5 × 45 s', 'ma wo vr'],
    [t('Muurzit', 'Wall sit'), '5 × 45 s', 'di do za'],
    [t('Opstappen', 'Step-up'), '3 × 10', 'ma wo vr'],
  ];
  return (
    <div className={cn('relative', className)} aria-hidden>
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-20px_rgba(45,40,25,.22)]">
        <div className="flex items-center gap-1.5 border-b border-line bg-ink-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" /><span className="h-2.5 w-2.5 rounded-full bg-ink-200" /><span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <span className="ml-3 rounded-md bg-white px-3 py-0.5 text-[11px] text-ink-500">app.fp-exercise.nl/programmas/nieuw</span>
        </div>
        <div className="grid grid-cols-[200px_1fr] text-left sm:grid-cols-[240px_1fr]">
          <div className="border-r border-line bg-[#f7f5f0] p-3">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] text-ink-500"><Search className="h-3 w-3" />{t('Zoek oefening…', 'Search exercise…')}</div>
            <div className="mt-3 space-y-1.5">
              {lib.map(([n, s], i) => (
                <div key={n} className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5', i === 0 && 'bg-accent-soft')}>
                  <div className="h-7 w-7 rounded-md bg-gradient-to-br from-[#e9e4db] to-[#d3cfb9]" />
                  <div className="min-w-0"><div className="truncate text-[11px] font-medium text-ink-900">{n}</div><div className="truncate text-[10px] text-ink-500">{s}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="text-[10px] text-ink-500">Emma de Jong</div>
            <div className="text-[14px] font-semibold text-ink-950">{t('Knie — patellapees opbouw', 'Knee — patellar tendon loading')}</div>
            <div className="mt-3 space-y-2">
              {prog.map(([n, d, days], i) => (
                <div key={n} className="flex items-center gap-2.5 rounded-xl border border-line bg-white p-2.5 shadow-xs">
                  <GripVertical className="h-3 w-3 text-ink-300" />
                  <span className="text-[10px] font-semibold text-ink-500">{i + 1}</span>
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#e9e4db] to-[#d3cfb9]" />
                  <div className="min-w-0 flex-1"><div className="truncate text-[11.5px] font-semibold">{n}</div><div className="text-[10px] text-ink-500">{d} · {days}</div></div>
                  <div className="hidden gap-1 sm:flex">{['3', '10', '45s'].map((v) => <span key={v} className="rounded-md border border-line px-1.5 py-0.5 text-[10px] tabular-nums text-ink-600">{v}</span>)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <span className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink-700">{t('Concept', 'Draft')}</span>
              <span className="rounded-lg bg-accent px-2.5 py-1 text-[11px] font-medium text-white">{t('Opslaan & toewijzen', 'Save & assign')}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-12 -right-2 hidden w-[200px] rounded-[30px] border-[6px] border-ink-900 bg-canvas shadow-pop sm:block lg:-right-10">
        {video ? (
          <div className="overflow-hidden rounded-t-[24px]">
            <video key={video.src} src={video.src} autoPlay muted playsInline onEnded={onVideoEnd} className="aspect-video w-full bg-ink-900 object-cover" />
          </div>
        ) : null}
        <div className="p-3">
          <div className="text-[9px] font-medium uppercase tracking-wide text-accent">{t('Vandaag', 'Today')}</div>
          <div className="text-[12px] font-semibold leading-tight">{video ? video.name : t('Knie — patellapees', 'Knee — patellar tendon')}</div>
          {video ? (
            <div className="mt-2 flex gap-1">
              {[['Sets', '3'], [t('Herh.', 'Reps'), '12'], [t('Rust', 'Rest'), '45s']].map(([k, v]) => (
                <div key={k} className="flex-1 rounded-md bg-white px-1.5 py-1"><div className="text-[7.5px] text-ink-500">{k}</div><div className="text-[11px] font-semibold">{v}</div></div>
              ))}
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              {prog.map(([n], i) => (
                <div key={n} className="flex items-center gap-1.5 rounded-lg bg-white p-1.5">
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded-full', i === 0 ? 'bg-ok text-white' : 'border border-line')}>{i === 0 && <Check className="h-2.5 w-2.5" />}</span>
                  <span className="truncate text-[9.5px] font-medium">{n}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-accent py-1.5 text-[10px] font-semibold text-white"><Check className="h-2.5 w-2.5" />{t('Oefening gedaan', 'Exercise done')}</div>
        </div>
      </div>
    </div>
  );
}
