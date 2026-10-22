import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Bell, FilePlus2, LayoutTemplate, Plus, Star, UserRound } from 'lucide-react';
import { api, ApiError, mediaUrl } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { useLabels } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Badge, Button, Dialog, NumberStepper, Spinner, useToast } from '@/components/ui';
import { ExerciseThumb } from './ExerciseThumb';
import type { Exercise, Program } from '@/lib/types';

type Recent = Program & { itemCount: number; patient: { id: string; firstName: string; lastName: string } | null };
type Dose = { sets: number | null; reps: number | null; holdS: number | null; restS: number | null; days: number[] };

const doseFrom = (e: Exercise): Dose => ({ sets: e.defaults.sets, reps: e.defaults.reps, holdS: e.defaults.holdS, restS: e.defaults.restS, days: [1, 2, 3, 4, 5, 6, 7] });

/** Sets / reps / hold / rest / days, editable right away. */
export function DoseEditor({ dose, onChange }: { dose: Dose; onChange: (d: Dose) => void }) {
  const { t } = useI18n();
  const L = useLabels();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {(
          [
            ['sets', t('Sets', 'Sets'), 1, 20, undefined],
            ['reps', t('Herhalingen', 'Reps'), 1, 200, undefined],
            ['holdS', t('Vasthouden', 'Hold'), 1, 600, 's'],
            ['restS', t('Rust', 'Rest'), 0, 900, 's'],
          ] as const
        ).map(([k, label, min, max, suffix]) => (
          <div key={k}>
            <div className="label mb-1" aria-hidden>{label}{suffix && <span className="font-normal text-ink-400"> ({t('sec', 'sec')})</span>}</div>
            <NumberStepper large label={label} value={dose[k]} min={min} max={max} onChange={(v) => onChange({ ...dose, [k]: v })} />
          </div>
        ))}
      </div>
      <div>
        <div className="label mb-1.5">{t('Dagen', 'Days')}</div>
        <div className="flex gap-1.5" role="group" aria-label={t('Dagen', 'Days')}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const on = dose.days.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const days = on ? dose.days.filter((x) => x !== d) : [...dose.days, d].sort();
                  if (days.length) onChange({ ...dose, days });
                }}
                className={cn('tap h-9 flex-1 rounded-lg border text-[13px] font-medium transition-colors', on ? 'border-accent bg-accent text-white' : 'border-line bg-white text-ink-600 hover:border-ink-300')}
              >
                {L.weekday(d)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** "Add to programme" without leaving the library: dose first, then one tap on a programme. */
export function QuickAddSheet({ exercise, open, onClose }: { exercise: Exercise | null; open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [dose, setDose] = useState<Dose | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const recent = useQuery({ queryKey: ['programs', 'recent'], queryFn: () => api.get<{ items: Recent[] }>('/programs/recent'), enabled: open, staleTime: 15_000 });
  useEffect(() => {
    if (open && exercise) setDose(doseFrom(exercise));
  }, [open, exercise]);
  if (!exercise || !dose) return null;
  const name = locale === 'nl' ? exercise.nameNl : exercise.nameEn;
  const targets = (recent.data?.items ?? []).filter((p) => p.status === 'draft' || p.status === 'active');

  const add = async (p: Recent) => {
    setBusy(p.id);
    try {
      const r = await api.post<{ items: number; notifiedPatient: boolean }>(`/programs/${p.id}/items`, { exerciseId: exercise.id, ...dose, notes: '' });
      qc.invalidateQueries({ queryKey: ['program', p.id] });
      qc.invalidateQueries({ queryKey: ['programs'] });
      onClose();
      toast(
        r.notifiedPatient
          ? t(`Toegevoegd aan “${p.title}” — de patiënt krijgt een melding`, `Added to “${p.title}” — the patient gets a notification`)
          : t(`Toegevoegd aan “${p.title}”`, `Added to “${p.title}”`),
      );
    } catch (err) {
      toast(errorMessage(err instanceof ApiError ? err.code : undefined, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };

  const toNew = () => {
    const q = new URLSearchParams({ oefening: exercise.id, days: dose.days.join(',') });
    for (const k of ['sets', 'reps', 'holdS', 'restS'] as const) if (dose[k] != null) q.set(k, String(dose[k]));
    onClose();
    nav(`/app/programmas/nieuw?${q}`);
  };

  return (
    <Dialog open={open} onClose={onClose} sheet size="md" title={t('Toevoegen aan programma', 'Add to programme')}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <ExerciseThumb thumbnailId={exercise.thumbnailMediaId} videoId={exercise.videoMediaId} region={exercise.bodyRegion} name={name} className="h-14 w-14 shrink-0" rounded="rounded-xl" hideBadge />
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink-950">{name}</div>
            <div className="text-[12.5px] text-ink-500">{t('Pas de dosering aan en kies een programma.', 'Adjust the dose and pick a programme.')}</div>
          </div>
        </div>
        <DoseEditor dose={dose} onChange={setDose} />
        <div>
          <div className="label mb-2">{t('Toevoegen aan', 'Add to')}</div>
          <button type="button" onClick={toNew} className="tap mb-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-ink-300 px-3.5 py-3 text-left transition-colors hover:border-accent hover:bg-accent-soft/50 active:bg-accent-soft">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white"><FilePlus2 className="h-4 w-4" /></span>
            <span className="flex-1 text-[14px] font-medium text-ink-900">{t('Nieuw programma', 'New programme')}</span>
            <ArrowRight className="h-4 w-4 text-ink-400" />
          </button>
          {recent.isLoading ? (
            <Spinner />
          ) : targets.length === 0 ? (
            <p className="px-1 text-[13px] text-ink-500">{t('Nog geen recente programma’s van jou.', 'No recent programmes of yours yet.')}</p>
          ) : (
            <ul className="space-y-1.5">
              {targets.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => add(p)}
                    className="tap flex w-full items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5 text-left transition-colors hover:border-ink-300 hover:bg-ink-50 active:bg-ink-100 disabled:opacity-60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600">
                      {p.isTemplate ? <LayoutTemplate className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink-900">{p.title}</span>
                      <span className="flex items-center gap-1.5 text-[12px] text-ink-500">
                        {p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : t('Sjabloon', 'Template')} · {p.itemCount} {t('oefeningen', 'exercises')}
                        {!p.isTemplate && p.status === 'active' && <Bell className="h-3 w-3" aria-label={t('patiënt krijgt melding', 'patient is notified')} />}
                      </span>
                    </span>
                    {busy === p.id ? <Spinner className="h-4 w-4" /> : !p.isTemplate && <Badge tone={p.status === 'active' ? 'ok' : 'neutral'}>{p.status === 'active' ? t('Actief', 'Active') : t('Concept', 'Draft')}</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}

/** Watch the exercise without opening its page (one video at a time). */
export function PreviewSheet({ exercise, open, onClose, onAdd }: { exercise: Exercise | null; open: boolean; onClose: () => void; onAdd: (e: Exercise) => void }) {
  const { t, locale } = useI18n();
  const L = useLabels();
  if (!exercise) return null;
  const nl = locale === 'nl';
  const name = nl ? exercise.nameNl : exercise.nameEn;
  const video = mediaUrl(exercise.videoMediaId);
  const how = (nl ? exercise.movementNl || exercise.startingPositionNl : exercise.movementEn || exercise.startingPositionEn) || '';
  const cues = nl ? exercise.instructionsNl : exercise.instructionsEn;
  const d = exercise.defaults;
  const dose = [d.sets && d.reps && `${d.sets} × ${d.reps}`, d.holdS && `${d.holdS}s ${t('vasthouden', 'hold')}`, d.restS != null && `${d.restS}s ${t('rust', 'rest')}`].filter(Boolean).join(' · ');
  return (
    <Dialog open={open} onClose={onClose} sheet size="md" title={name}>
      <div className="-mx-5 -mt-5 mb-4 bg-ink-950">
        {video ? (
          <video key={video} src={video} autoPlay muted loop playsInline controls className="aspect-video w-full object-contain" aria-label={t(`Video: ${name}`, `Video: ${name}`)} />
        ) : (
          <ExerciseThumb thumbnailId={exercise.thumbnailMediaId} region={exercise.bodyRegion} name={name} className="aspect-video w-full" rounded="rounded-none" />
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge>{L.region(exercise.bodyRegion)}</Badge>
        {exercise.trainingCategories.slice(0, 2).map((c) => <Badge key={c}>{L.training(c)}</Badge>)}
        {exercise.equipment.filter((x) => x !== 'none').map((x) => <Badge key={x} tone="outline">{L.equipment(x)}</Badge>)}
      </div>
      {how && <p className="mt-3 text-[14.5px] leading-relaxed text-ink-800">{how}</p>}
      {cues && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{cues}</p>}
      {dose && <p className="mt-3 text-[13px] font-medium text-ink-700">{t('Standaard', 'Default')}: {dose}</p>}
      <div className="mt-5 flex gap-2">
        <Link to={`/app/oefeningen/${exercise.id}`} className="tap inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-line bg-white text-[14px] font-medium text-ink-800 hover:bg-ink-50">
          {t('Alle details', 'All details')}
        </Link>
        <Button size="lg" className="flex-1" icon={<Plus className="h-4 w-4" />} onClick={() => onAdd(exercise)}>{t('Toevoegen', 'Add')}</Button>
      </div>
    </Dialog>
  );
}

/** Favourite star with clear feedback. */
export function FavoriteToggle({ e, className, size = 'md' }: { e: Pick<Exercise, 'id' | 'favorite' | 'nameNl' | 'nameEn'>; className?: string; size?: 'md' | 'lg' }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [fav, setFav] = useState(e.favorite);
  useEffect(() => setFav(e.favorite), [e.favorite]);
  const name = locale === 'nl' ? e.nameNl : e.nameEn;
  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={fav ? t(`${name} uit favorieten halen`, `Remove ${name} from favourites`) : t(`${name} als favoriet bewaren`, `Save ${name} as favourite`)}
      className={cn(
        'tap inline-flex shrink-0 items-center justify-center rounded-full transition-[color,background,transform] active:scale-90',
        size === 'lg' ? 'h-11 w-11' : 'h-9 w-9',
        fav ? 'text-amber-500 hover:bg-amber-50' : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700',
        className,
      )}
      onClick={async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const next = !fav;
        setFav(next);
        try {
          if (next) await api.post(`/exercises/${e.id}/favorite`);
          else await api.del(`/exercises/${e.id}/favorite`);
          toast(next ? t('Bewaard bij je favorieten', 'Saved to your favourites') : t('Uit je favorieten gehaald', 'Removed from your favourites'));
          qc.invalidateQueries({ queryKey: ['exercises'] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });
        } catch (err) {
          setFav(!next);
          toast(errorMessage(err instanceof ApiError ? err.code : undefined, locale), 'bad');
        }
      }}
    >
      <Star className={cn(size === 'lg' ? 'h-5 w-5' : 'h-[18px] w-[18px]', fav && 'fill-current')} />
    </button>
  );
}
