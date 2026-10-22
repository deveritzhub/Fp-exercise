import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Copy, Lock, Pencil, ShieldAlert, Undo2, Video } from 'lucide-react';
import { api, ApiError, mediaUrl } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { dose, fmtDate } from '@/lib/format';
import { useDocumentMeta, useLabels } from '@/lib/meta';
import { Badge, Button, ButtonLink, Card, ErrorState, Notice, PageHeader, Spinner, useToast } from '@/components/ui';
import { MediaUpload } from './ExerciseFormPage';
import { ExerciseThumb } from '@/components/app/ExerciseThumb';
import { Difficulty } from '@/components/app/StatusBadge';
import { FavoriteButton } from './ExercisesPage';
import type { Exercise } from '@/lib/types';

export function ExerciseDetailPage() {
  const { id = '' } = useParams();
  const { t, locale } = useI18n();
  const { user, practice } = useSession();
  const L = useLabels();
  const q = useQuery({ queryKey: ['exercise', id], queryFn: () => api.get<Exercise>(`/exercises/${id}`) });
  useDocumentMeta(q.data ? (locale === 'nl' ? q.data.nameNl : q.data.nameEn) : t('Oefening', 'Exercise'));
  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) return <Card><ErrorState error={q.error} /></Card>;
  const e = q.data;
  const nl = locale === 'nl';
  const canEdit = e.scope === 'practice' && (e.createdBy === user?.id || practice?.role !== 'therapist');
  const video = mediaUrl(e.videoMediaId);
  const sections = [
    [t('Startpositie', 'Starting position'), nl ? e.startingPositionNl : e.startingPositionEn],
    [t('Uitvoering', 'Movement'), nl ? e.movementNl : e.movementEn],
    [t('Aandachtspunten', 'Key points'), nl ? e.instructionsNl : e.instructionsEn],
  ].filter(([, v]) => v);
  return (
    <>
      <PageHeader
        eyebrow={<Link to="/app/oefeningen" className="hover:text-ink-800">{t('Oefenbibliotheek', 'Exercise library')}</Link>}
        title={<span className="flex items-center gap-2">{nl ? e.nameNl : e.nameEn}<FavoriteButton e={e} /></span>}
        description={[nl ? e.nameEn : e.nameNl, ...e.altNames].join(' · ')}
        actions={
          <>
            <ButtonLink to={`/app/oefeningen/nieuw?van=${e.id}`} variant="secondary" icon={<Copy className="h-4 w-4" />}>{t('Dupliceren', 'Duplicate')}</ButtonLink>
            {canEdit && <ButtonLink to={`/app/oefeningen/${e.id}/bewerken`} icon={<Pencil className="h-4 w-4" />}>{t('Bewerken', 'Edit')}</ButtonLink>}
          </>
        }
      />
      <ReviewBanner e={e} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card className="overflow-hidden">
            {video ? (
              <video key={video} controls autoPlay muted loop playsInline preload="auto" className="aspect-video w-full bg-ink-950" poster={mediaUrl(e.thumbnailMediaId) ?? undefined}>
                <source src={`${video}#t=0.1`} type="video/mp4" />
              </video>
            ) : (
              <div className="relative">
                <ExerciseThumb thumbnailId={e.thumbnailMediaId} region={e.bodyRegion} className="aspect-video w-full" rounded="rounded-none" />
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/45 to-transparent px-4 pb-3 pt-10 text-[13px] text-white">
                  <Video className="h-4 w-4" /> {t('Nog geen video. Voeg hiernaast een instructievideo van je praktijk toe.', 'No video yet. Add your practice’s instruction video alongside.')}
                </div>
              </div>
            )}
          </Card>
          <Card className="divide-y divide-line">
            {sections.map(([title, text]) => (
              <section key={title} className="px-5 py-4">
                <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-500">{title}</h2>
                <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-800">{text}</p>
              </section>
            ))}
          </Card>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <PracticeMediaCard e={e} />
          <Card className="p-5">
            <h2 className="text-[13px] font-semibold text-ink-900">{t('Standaarddosering', 'Default dosage')}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {[
                [t('Sets × herhalingen', 'Sets × reps'), dose(e.defaults, locale) || '—'],
                [t('Rust', 'Rest'), e.defaults.restS ? `${e.defaults.restS} s` : '—'],
                [t('Tempo', 'Tempo'), e.defaults.tempo ?? '—'],
                [t('Frequentie', 'Frequency'), e.defaults.frequency ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-ink-50 px-3 py-2">
                  <dt className="text-[12px] text-ink-500">{k}</dt>
                  <dd className="font-medium tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-5">
            <dl className="space-y-3 text-sm">
              <Row k={t('Regio', 'Region')} v={L.region(e.bodyRegion)} />
              <Row k={t('Doelspieren', 'Target muscles')} v={e.targetMuscles.join(', ') || '—'} />
              <Row k={t('Bewegingspatroon', 'Movement')} v={L.movement(e.movementCategory) || '—'} />
              <Row k={t('Categorie', 'Category')} v={<span className="flex flex-wrap gap-1">{e.trainingCategories.map((c) => <Badge key={c}>{L.training(c)}</Badge>)}</span>} />
              <Row k={t('Materiaal', 'Equipment')} v={e.equipment.map(L.equipment).join(', ')} />
              <Row k={t('Niveau', 'Level')} v={<Difficulty value={e.difficulty} />} />
              {e.tags.length > 0 && <Row k={t('Trefwoorden', 'Tags')} v={<span className="flex flex-wrap gap-1">{e.tags.map((x) => <Badge key={x} tone="outline">{x}</Badge>)}</span>} />}
              <Row k={t('Bron', 'Source')} v={e.scope === 'global' ? t('Centrale bibliotheek', 'Central library') : t('Praktijk', 'Practice')} />
            </dl>
          </Card>
          {e.clinicalNotes !== undefined && (
            <Card className="border-warn/25 bg-warn-soft/40 p-5">
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-900"><Lock className="h-3.5 w-3.5" />{t('Klinische notities', 'Clinical notes')}</h2>
              <p className="mt-0.5 text-[12px] text-ink-500">{t('Alleen zichtbaar voor zorgprofessionals.', 'Only visible to professionals.')}</p>
              <p className="mt-2 whitespace-pre-line text-sm text-ink-800">{e.clinicalNotes || '—'}</p>
            </Card>
          )}
          {e.relations && e.relations.length > 0 && (
            <Card>
              <h2 className="border-b border-line px-5 py-3 text-[13px] font-semibold">{t('Regressies, progressies en alternatieven', 'Regressions, progressions and alternatives')}</h2>
              <ul className="divide-y divide-line">
                {e.relations.map((r) => (
                  <li key={r.kind + r.id}>
                    <Link to={`/app/oefeningen/${r.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-ink-50/60">
                      <ExerciseThumb thumbnailId={r.thumbnailMediaId} region={r.bodyRegion} className="h-9 w-9" />
                      <span className="flex-1 text-sm font-medium">{nl ? r.nameNl : r.nameEn}</span>
                      <Badge tone={r.kind === 'progression' ? 'accent' : r.kind === 'regression' ? 'info' : 'neutral'}>
                        {r.kind === 'progression' ? t('Progressie', 'Progression') : r.kind === 'regression' ? t('Regressie', 'Regression') : t('Alternatief', 'Alternative')}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <dt className="text-ink-500">{k}</dt>
      <dd className="col-span-2 text-ink-900">{v}</dd>
    </div>
  );
}

/** Upload the practice's own video/thumbnail for this exercise (also for central library exercises). */
function PracticeMediaCard({ e }: { e: Exercise }) {
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
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-[15px] font-semibold">{t('Video van je praktijk', 'Your practice’s video')}</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-500">
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
            toast(t('Video opgeslagen', 'Video saved'));
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
      <p className="text-[12px] text-ink-500">{t('Tip: liggend filmen, 10–20 seconden, 2–3 rustige herhalingen. Zie de filmchecklist.', 'Tip: film in landscape, 10–20 seconds, 2–3 calm repetitions. See the filming checklist.')}</p>
    </Card>
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
      <Notice tone="ok" icon={<CheckCircle2 className="h-4 w-4" />} className="mb-6" title={t('Klinisch goedgekeurd', 'Clinically approved')}>
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
    <Notice tone="warn" icon={<ShieldAlert className="h-4 w-4" />} className="mb-6" title={t('Nog niet klinisch gecontroleerd', 'Not yet clinically reviewed')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{t('Controleer startpositie, uitvoering, aandachtspunten en video. Klopt alles? Keur de oefening dan goed voor je praktijk.', 'Check starting position, movement, key points and video. All correct? Approve the exercise for your practice.')}</span>
        <Button size="sm" icon={<CheckCircle2 className="h-3.5 w-3.5" />} loading={busy} onClick={() => act(true)}>
          {t('Goedkeuren', 'Approve')}
        </Button>
      </div>
    </Notice>
  );
}
