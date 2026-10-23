import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, Film, Layers, Lock, Pencil, Plus, ShieldAlert, Shuffle, TrendingDown, TrendingUp, Undo2, VideoOff } from 'lucide-react';
import { api, ApiError, mediaUrl, qs } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { fmtDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useDocumentMeta, useLabels } from '@/lib/meta';
import { Badge, Button, ButtonLink, Card, Dialog, ErrorState, Notice, Skeleton, useToast } from '@/components/ui';
import { MediaUpload } from './ExerciseFormPage';
import { ExerciseThumb } from '@/components/app/ExerciseThumb';
import { Difficulty } from '@/components/app/StatusBadge';
import { FavoriteToggle as FavoriteButton, QuickAddSheet } from '@/components/app/QuickAdd';
import { libraryHref } from '@/components/app/ExerciseSearch';
import type { Exercise } from '@/lib/types';

export function ExerciseDetailPage() {
  const { id = '' } = useParams();
  const { t, locale } = useI18n();
  const { user, practice } = useSession();
  const L = useLabels();
  const [adding, setAdding] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const q = useQuery({ queryKey: ['exercise', id], queryFn: () => api.get<Exercise>(`/exercises/${id}`) });
  const e0 = q.data;
  const similar = useQuery({
    queryKey: ['exercises', 'similar', id, e0?.bodyRegion, e0?.trainingCategories[0]],
    queryFn: () => api.get<{ items: Exercise[] }>(`/exercises${qs({ region: e0!.bodyRegion, category: e0!.trainingCategories[0], limit: 9 })}`),
    enabled: !!e0,
    staleTime: 60_000,
  });
  useDocumentMeta(e0 ? (locale === 'nl' ? e0.nameNl : e0.nameEn) : t('Oefening', 'Exercise'));
  if (q.isLoading) return <DetailSkeleton />;
  if (q.isError || !q.data) return <Card><ErrorState error={q.error} /></Card>;
  const e = q.data;
  const nl = locale === 'nl';
  const name = nl ? e.nameNl : e.nameEn;
  const canEdit = e.scope === 'practice' && (e.createdBy === user?.id || practice?.role !== 'therapist');
  const video = mediaUrl(e.videoMediaId);
  const sections = [
    [t('Startpositie', 'Starting position'), nl ? e.startingPositionNl : e.startingPositionEn],
    [t('Uitvoering', 'Movement'), nl ? e.movementNl : e.movementEn],
    [t('Aandachtspunten', 'Key points'), nl ? e.instructionsNl : e.instructionsEn],
  ].filter(([, v]) => v);
  const d = e.defaults;
  const params = [
    [t('Sets', 'Sets'), d.sets],
    [t('Herhalingen', 'Reps'), d.reps],
    [t('Vasthouden', 'Hold'), d.holdS ? `${d.holdS} s` : null],
    [t('Rust', 'Rest'), d.restS != null ? `${d.restS} s` : null],
    [t('Tempo', 'Tempo'), d.tempo],
    [t('Frequentie', 'Frequency'), d.frequency],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');
  const rel = e.relations ?? [];
  const relIds = new Set(rel.map((r) => r.id));
  const more = (similar.data?.items ?? []).filter((x) => x.id !== e.id && !relIds.has(x.id)).slice(0, 6);
  const kindLabel = (k: string) => (k === 'progression' ? t('Progressie', 'Progression') : k === 'regression' ? t('Regressie', 'Regression') : t('Alternatief', 'Alternative'));

  return (
    <div className="pb-24 lg:pb-0">
      <Link to={libraryHref()} className="tap mb-3 inline-flex h-9 items-center gap-1 rounded-lg pr-2 text-[13.5px] font-medium text-ink-500 hover:text-ink-900">
        <ChevronLeft className="h-4 w-4" />
        {t('Oefenbibliotheek', 'Exercise library')}
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-5 lg:col-span-3">
          <header className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-[24px] font-semibold leading-tight sm:text-[28px]">{name}</h1>
              <p className="mt-1 text-[13.5px] text-ink-500">{[nl ? e.nameEn : e.nameNl, ...e.altNames].filter((x) => x && x !== name).join(' · ')}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge>{L.region(e.bodyRegion)}</Badge>
                {e.trainingCategories.map((c) => <Badge key={c}>{L.training(c)}</Badge>)}
                <Badge tone="outline">{L.equipmentList(e.equipment)}</Badge>
                {e.scope === 'practice' && <Badge tone="accent">{t('Praktijk', 'Practice')}</Badge>}
              </div>
            </div>
            <FavoriteButton e={e} size="lg" className="border border-line bg-white" />
          </header>

          <div className="hidden flex-wrap gap-2 lg:flex">
            <Button size="lg" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>{t('Toevoegen aan programma', 'Add to programme')}</Button>
            <ButtonLink to={`/app/oefeningen/nieuw?van=${e.id}`} size="lg" variant="secondary" icon={<Copy className="h-4 w-4" />}>{t('Dupliceren', 'Duplicate')}</ButtonLink>
            {canEdit && <ButtonLink to={`/app/oefeningen/${e.id}/bewerken`} size="lg" variant="secondary" icon={<Pencil className="h-4 w-4" />}>{t('Bewerken', 'Edit')}</ButtonLink>}
            <Button size="lg" variant="ghost" icon={<Film className="h-4 w-4" />} onClick={() => setMediaOpen(true)}>{t('Media beheren', 'Manage media')}</Button>
          </div>

          {params.length > 0 && (
            <section aria-labelledby="params-title">
              <h2 id="params-title" className="sr-only">{t('Standaarddosering', 'Default dosage')}</h2>
              <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {params.map(([k, v]) => (
                  <div key={String(k)} className="rounded-xl border border-line bg-white px-3 py-2.5 text-center shadow-xs">
                    <dd className={cn('truncate font-semibold tabular-nums text-ink-950', String(v).length > 6 ? 'text-[14px] leading-[25px]' : 'text-[17px]')} title={String(v)}>{v}</dd>
                    <dt className="text-[11.5px] text-ink-500">{k}</dt>
                  </div>
                ))}
              </dl>
            </section>
          )}


          {/* Real media only; when there is none, say so compactly instead of a large placeholder. */}
          {video ? (
            <div className="-mx-4 overflow-hidden bg-ink-950 sm:mx-0 sm:rounded-xl sm:border sm:border-line">
              <video key={video} src={`${video}#t=0.1`} controls autoPlay muted loop playsInline preload="auto" className="aspect-video w-full" poster={mediaUrl(e.thumbnailMediaId) ?? undefined} aria-label={t(`Video: ${name}`, `Video: ${name}`)} />
            </div>
          ) : e.thumbnailMediaId ? (
            <div className="space-y-2">
              <img src={mediaUrl(e.thumbnailMediaId)!} alt={name} className="aspect-video w-full rounded-xl border border-line object-cover" />
              <MissingMedia what="video" onManage={() => setMediaOpen(true)} />
            </div>
          ) : (
            <MissingMedia what="all" onManage={() => setMediaOpen(true)} />
          )}

          <ReviewBanner e={e} />

          <Card className="divide-y divide-line">
            {sections.map(([title, text], i) => (
              <section key={title} className="flex gap-3 px-5 py-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">{i + 1}</span>
                <div className="min-w-0">
                  <h2 className="font-sans text-[13px] font-semibold uppercase tracking-wide text-ink-500">{title}</h2>
                  <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-800">{text}</p>
                </div>
              </section>
            ))}
            {!sections.length && <p className="px-5 py-4 text-[14px] text-ink-500">{t('Nog geen instructies.', 'No instructions yet.')}</p>}
          </Card>

          {rel.length > 0 && (
            <section>
              <h2 className="mb-2 font-sans text-[15px] font-semibold text-ink-900">{t('Regressies en progressies', 'Regressions and progressions')}</h2>
              <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
                {rel.map((r) => (
                  <Link key={r.kind + r.id} to={`/app/oefeningen/${r.id}`} className="tap w-40 shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-white shadow-xs transition-shadow hover:shadow-card sm:w-auto">
                    <ExerciseThumb thumbnailId={r.thumbnailMediaId} videoId={r.videoMediaId} region={r.bodyRegion} name={nl ? r.nameNl : r.nameEn} className="aspect-[16/10] w-full" rounded="rounded-none" hideBadge />
                    <div className="p-2.5">
                      <span className={cn('inline-flex items-center gap-1 text-[11.5px] font-semibold', r.kind === 'progression' ? 'text-accent' : r.kind === 'regression' ? 'text-info' : 'text-ink-500')}>
                        {r.kind === 'progression' ? <TrendingUp className="h-3.5 w-3.5" /> : r.kind === 'regression' ? <TrendingDown className="h-3.5 w-3.5" /> : <Shuffle className="h-3.5 w-3.5" />}
                        {kindLabel(r.kind)}
                      </span>
                      <div className="mt-0.5 line-clamp-2 text-[13.5px] font-medium leading-snug text-ink-900">{nl ? r.nameNl : r.nameEn}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <Variants e={e} />
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-2">
          {e.clinicalNotes !== undefined && e.clinicalNotes && (
            <Card className="border-warn/25 bg-warn-soft/40 p-5">
              <h2 className="flex items-center gap-1.5 font-sans text-[13px] font-semibold text-ink-900"><Lock className="h-3.5 w-3.5" />{t('Klinische notities', 'Clinical notes')}</h2>
              <p className="mt-0.5 text-[12px] text-ink-500">{t('Alleen zichtbaar voor zorgprofessionals.', 'Only visible to professionals.')}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-800">{e.clinicalNotes}</p>
            </Card>
          )}
          <Card className="p-5">
            <dl className="space-y-3 text-sm">
              <Row k={t('Doelspieren', 'Target muscles')} v={e.targetMuscles.join(', ') || '—'} />
              <Row k={t('Bewegingspatroon', 'Movement')} v={L.movement(e.movementCategory) || '—'} />
              <Row k={t('Materiaal', 'Equipment')} v={L.equipmentList(e.equipment)} />
              <Row k={t('Niveau', 'Level')} v={<Difficulty value={e.difficulty} />} />
              {e.tags.length > 0 && <Row k={t('Trefwoorden', 'Tags')} v={<span className="flex flex-wrap gap-1">{e.tags.map((x) => <Badge key={x} tone="outline">{x}</Badge>)}</span>} />}
              <Row k={t('Bron', 'Source')} v={e.scope === 'global' ? t('Centrale bibliotheek', 'Central library') : t('Praktijk', 'Practice')} />
            </dl>
          </Card>
          {more.length > 0 && (
            <Card>
              <h2 className="border-b border-line px-5 py-3 font-sans text-[13px] font-semibold text-ink-900">{t('Vergelijkbare oefeningen', 'Similar exercises')}</h2>
              <ul className="divide-y divide-line">
                {more.map((x) => (
                  <li key={x.id}>
                    <Link to={`/app/oefeningen/${x.id}`} className="tap flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-ink-50/60 active:bg-ink-50">
                      <ExerciseThumb thumbnailId={x.thumbnailMediaId} videoId={x.videoMediaId} region={x.bodyRegion} name={nl ? x.nameNl : x.nameEn} className="h-11 w-11 shrink-0" hideBadge />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-ink-900">{nl ? x.nameNl : x.nameEn}</span>
                        <span className="block truncate text-[12px] text-ink-500">{x.trainingCategories.map(L.training).slice(0, 2).join(' · ')}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-ink-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <div className="flex flex-wrap gap-2 lg:hidden">
            <ButtonLink to={`/app/oefeningen/nieuw?van=${e.id}`} variant="secondary" className="flex-1" icon={<Copy className="h-4 w-4" />}>{t('Dupliceren', 'Duplicate')}</ButtonLink>
            {canEdit && <ButtonLink to={`/app/oefeningen/${e.id}/bewerken`} variant="secondary" className="flex-1" icon={<Pencil className="h-4 w-4" />}>{t('Bewerken', 'Edit')}</ButtonLink>}
            <Button variant="secondary" className="flex-1" icon={<Film className="h-4 w-4" />} onClick={() => setMediaOpen(true)}>{t('Media beheren', 'Manage media')}</Button>
          </div>
        </div>
      </div>

      {/* Phones: the main action stays under the thumb. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur lg:hidden">
        <Button size="lg" className="w-full" icon={<Plus className="h-5 w-5" />} onClick={() => setAdding(true)}>{t('Toevoegen aan programma', 'Add to programme')}</Button>
      </div>
      <QuickAddSheet exercise={e} open={adding} onClose={() => setAdding(false)} />
      <Dialog open={mediaOpen} onClose={() => setMediaOpen(false)} title={t('Media beheren', 'Manage media')} description={t('Video en afbeelding van je praktijk voor deze oefening.', 'Your practice’s video and image for this exercise.')} size="md">
        <PracticeMediaCard e={e} onSaved={() => setMediaOpen(false)} />
      </Dialog>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <Skeleton className="-mx-4 aspect-video rounded-none sm:mx-0 sm:rounded-xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="grid grid-cols-3 gap-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      </div>
      <Skeleton className="h-64 rounded-xl lg:col-span-2" />
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3">
      <dt className="break-words text-ink-500">{k}</dt>
      <dd className="min-w-0 break-words text-ink-900">{v}</dd>
    </div>
  );
}

/** Upload the practice's own video/thumbnail for this exercise (also for central library exercises). */
function PracticeMediaCard({ e, onSaved }: { e: Exercise; onSaved?: () => void }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const own = e.scope === 'practice' || e.practiceMedia;
  const [video, setVideo] = useState<string | null>(own ? e.videoMediaId : null);
  const [thumb, setThumb] = useState<string | null>(own ? e.thumbnailMediaId : null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setVideo(own ? e.videoMediaId : null);
    setThumb(own ? e.thumbnailMediaId : null);
  }, [e.videoMediaId, e.thumbnailMediaId, own]);
  const dirty = video !== (own ? e.videoMediaId : null) || thumb !== (own ? e.thumbnailMediaId : null);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] text-ink-600">
          {e.scope === 'global'
            ? t('Alleen jouw praktijk en haar patiënten zien deze video bij deze oefening.', 'Only your practice and its patients see this video with this exercise.')
            : t('Wordt getoond aan de patiënten van je praktijk.', 'Shown to your practice’s patients.')}
        </p>
      </div>
      <MediaUpload kind="video" value={video} onChange={setVideo} />
      <MediaUpload kind="image" value={thumb} onChange={setThumb} />
      <Button
        className="w-full"
        disabled={!dirty}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api.put(`/exercises/${e.id}/media`, { videoMediaId: video, thumbnailMediaId: thumb });
            toast(t('Media opgeslagen', 'Media saved'));
            onSaved?.();
            qc.invalidateQueries({ queryKey: ['exercise', e.id] });
            qc.invalidateQueries({ queryKey: ['exercises'] });
          } catch (err) {
            toast(errorMessage(err instanceof ApiError ? err.code : undefined, locale), 'bad');
          } finally {
            setBusy(false);
          }
        }}
      >
        {t('Opslaan', 'Save')}
      </Button>
      <p className="text-[12px] text-ink-600">{t('Tip: liggend filmen, 10–20 seconden, 2–3 rustige herhalingen. Zie de filmchecklist.', 'Tip: film in landscape, 10–20 seconds, 2–3 calm repetitions. See the filming checklist.')}</p>
    </div>
  );
}

/** Clinical review status for this practice, with approve / undo actions. */
function ReviewBanner({ e }: { e: Exercise }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const act = async (approve: boolean) => {
    setBusy(true);
    try {
      if (approve) await api.post(`/exercises/${e.id}/review`);
      else await api.del(`/exercises/${e.id}/review`);
      toast(approve ? t('Oefening goedgekeurd', 'Exercise approved') : t('Goedkeuring ingetrokken', 'Approval withdrawn'));
      qc.invalidateQueries({ queryKey: ['exercise', e.id] });
      qc.invalidateQueries({ queryKey: ['exercises'] });
    } catch (err) {
      toast(errorMessage(err instanceof ApiError ? err.code : undefined, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  if (e.reviewStatus === 'reviewed') {
    return (
      <Notice tone="ok" icon={<CheckCircle2 className="h-4 w-4" />} title={t('Klinisch goedgekeurd', 'Clinically approved')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {e.reviewedBy
              ? t(`Goedgekeurd door ${e.reviewedBy} op ${fmtDate(e.reviewedAt, locale)}.`, `Approved by ${e.reviewedBy} on ${fmtDate(e.reviewedAt, locale)}.`)
              : t('Inhoud is gecontroleerd.', 'Content has been reviewed.')}
          </span>
          {e.reviewedBy && (
            <Button size="sm" variant="ghost" icon={<Undo2 className="h-3.5 w-3.5" />} loading={busy} onClick={() => act(false)}>
              {t('Intrekken', 'Withdraw')}
            </Button>
          )}
        </div>
      </Notice>
    );
  }
  return (
    <Notice tone="warn" icon={<ShieldAlert className="h-4 w-4" />} title={t('Nog niet klinisch gecontroleerd', 'Not yet clinically reviewed')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{t('Controleer startpositie, uitvoering, aandachtspunten en video. Klopt alles? Keur de oefening dan goed voor je praktijk.', 'Check starting position, movement, key points and video. All correct? Approve the exercise for your practice.')}</span>
        <Button size="sm" icon={<CheckCircle2 className="h-3.5 w-3.5" />} loading={busy} onClick={() => act(true)}>
          {t('Goedkeuren', 'Approve')}
        </Button>
      </div>
    </Notice>
  );
}

/** Compact, explicit note that real media is missing (no stand-in video is ever shown). */
function MissingMedia({ what, onManage }: { what: 'video' | 'all'; onManage: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-ink-300 bg-white px-4 py-3">
      <VideoOff className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
      <p className="min-w-0 flex-1 text-[13.5px] text-ink-700">
        {what === 'all' ? t('Geen video of afbeelding beschikbaar.', 'No video or image available.') : t('Geen video beschikbaar.', 'No video available.')}{' '}
        <span className="text-ink-600">{t('De patiënt ziet dan alleen de beschrijving.', 'The patient then only sees the description.')}</span>
      </p>
      <Button size="sm" variant="secondary" onClick={onManage}>{t('Media beheren', 'Manage media')}</Button>
    </div>
  );
}

/**
 * Other versions of the same exercise (same Dutch or English name), e.g. a central and a practice
 * "Dead bug". Differences are shown side by side; nothing is merged or deleted.
 */
function Variants({ e }: { e: Exercise }) {
  const { t, locale } = useI18n();
  const L = useLabels();
  const q = useQuery({ queryKey: ['exercise-variants', e.id], queryFn: () => api.get<{ items: Exercise[] }>(`/exercises/${e.id}/variants`), staleTime: 60_000 });
  const all = q.data?.items ?? [];
  if (all.length < 2) return null;
  const nl = locale === 'nl';
  const doseOf = (x: Exercise) => [x.defaults.sets && `${x.defaults.sets}×`, x.defaults.reps && `${x.defaults.reps}`, x.defaults.holdS && `${x.defaults.holdS} s`].filter(Boolean).join(' ') || '—';
  const rows: [string, (x: Exercise) => React.ReactNode][] = [
    [t('Bron', 'Source'), (x) => (x.scope === 'global' ? t('Centraal', 'Central') : t('Praktijk', 'Practice'))],
    [t('Regio', 'Region'), (x) => L.region(x.bodyRegion)],
    [t('Materiaal', 'Equipment'), (x) => L.equipmentList(x.equipment)],
    [t('Standaarddosering', 'Default dose'), doseOf],
    [t('Niveau', 'Level'), (x) => `${x.difficulty}/5`],
    [t('Video', 'Video'), (x) => (x.videoMediaId ? t('ja', 'yes') : t('nee', 'no'))],
    [t('Status', 'Status'), (x) => (x.reviewStatus === 'reviewed' ? t('Goedgekeurd', 'Approved') : t('Te controleren', 'To review'))],
  ];
  const differs = (fn: (x: Exercise) => React.ReactNode) => new Set(all.map((x) => String(fn(x)))).size > 1;
  return (
    <section aria-labelledby="variants-title">
      <h2 id="variants-title" className="mb-1 flex items-center gap-1.5 font-sans text-[15px] font-semibold text-ink-900"><Layers className="h-4 w-4" />{t(`Varianten van deze oefening (${all.length})`, `Variants of this exercise (${all.length})`)}</h2>
      <p className="mb-2 text-[12.5px] text-ink-600">{t('Zelfde naam, andere bron of invulling. Verschillen zijn gemarkeerd; er wordt niets samengevoegd.', 'Same name, different source or content. Differences are highlighted; nothing is merged.')}</p>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[28rem] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-medium text-ink-600" scope="col"><span className="sr-only">{t('Kenmerk', 'Attribute')}</span></th>
              {all.map((x) => (
                <th key={x.id} scope="col" className="px-3 py-2 font-semibold text-ink-900">
                  {x.id === e.id ? <span>{nl ? x.nameNl : x.nameEn} <span className="font-normal text-ink-600">({t('deze', 'this one')})</span></span> : <Link className="text-accent underline-offset-2 hover:underline" to={`/app/oefeningen/${x.id}`}>{nl ? x.nameNl : x.nameEn}</Link>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, fn]) => {
              const d = differs(fn);
              return (
                <tr key={k} className="border-b border-line last:border-0">
                  <th scope="row" className="px-3 py-2 font-medium text-ink-600">{k}</th>
                  {all.map((x) => <td key={x.id} className={cn('px-3 py-2 text-ink-900', d && 'bg-warn-soft/50 font-medium')}>{fn(x)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
