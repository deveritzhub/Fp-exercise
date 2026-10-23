import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Lock, Trash2, Upload, Video } from 'lucide-react';
import { api, ApiError, mediaUrl } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { taxonomy, useDocumentMeta } from '@/lib/meta';
import { Button, Card, Chip, Input, Notice, NumberStepper, PageHeader, Select, Spinner, Textarea, useToast } from '@/components/ui';
import type { Exercise } from '@/lib/types';

type Form = {
  nameNl: string; nameEn: string; altNames: string; bodyRegion: string; targetMuscles: string; movementCategory: string;
  trainingCategories: string[]; equipment: string[]; difficulty: number;
  startingPositionNl: string; startingPositionEn: string; movementNl: string; movementEn: string; instructionsNl: string; instructionsEn: string;
  sets: number | null; reps: number | null; holdS: number | null; restS: number | null; tempo: string; frequency: string;
  tags: string; clinicalNotes: string; videoMediaId: string | null; thumbnailMediaId: string | null;
  physitrackId: string; externalVideoUrl: string;
};

const empty: Form = {
  nameNl: '', nameEn: '', altNames: '', bodyRegion: 'knee', targetMuscles: '', movementCategory: '', trainingCategories: [], equipment: ['none'], difficulty: 2,
  startingPositionNl: '', startingPositionEn: '', movementNl: '', movementEn: '', instructionsNl: '', instructionsEn: '',
  sets: 3, reps: 10, holdS: null, restS: 60, tempo: '', frequency: '', tags: '', clinicalNotes: '', videoMediaId: null, thumbnailMediaId: null,
  physitrackId: '', externalVideoUrl: '',
};

const toForm = (e: Exercise, copy: boolean): Form => ({
  nameNl: copy ? `${e.nameNl} (praktijk)` : e.nameNl, nameEn: copy ? `${e.nameEn} (practice)` : e.nameEn, altNames: e.altNames.join(', '), bodyRegion: e.bodyRegion,
  targetMuscles: e.targetMuscles.join(', '), movementCategory: e.movementCategory ?? '', trainingCategories: e.trainingCategories, equipment: e.equipment,
  difficulty: e.difficulty, startingPositionNl: e.startingPositionNl, startingPositionEn: e.startingPositionEn, movementNl: e.movementNl, movementEn: e.movementEn,
  instructionsNl: e.instructionsNl, instructionsEn: e.instructionsEn, sets: e.defaults.sets, reps: e.defaults.reps, holdS: e.defaults.holdS, restS: e.defaults.restS,
  tempo: e.defaults.tempo ?? '', frequency: e.defaults.frequency ?? '', tags: e.tags.join(', '), clinicalNotes: e.clinicalNotes ?? '',
  videoMediaId: copy && e.scope === 'global' ? null : e.videoMediaId, thumbnailMediaId: copy && e.scope === 'global' ? null : e.thumbnailMediaId,
  physitrackId: e.physitrackId ?? '', externalVideoUrl: e.externalVideoUrl ?? '',
});

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export function ExerciseFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const sourceId = id ?? params.get('van');
  const { t, locale } = useI18n();
  useDocumentMeta(id ? t('Oefening bewerken', 'Edit exercise') : t('Nieuwe oefening', 'New exercise'));
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const src = useQuery({ queryKey: ['exercise', sourceId], queryFn: () => api.get<Exercise>(`/exercises/${sourceId}`), enabled: !!sourceId });
  const [f, setF] = useState<Form>(empty);
  const [lang, setLang] = useState<'nl' | 'en'>('nl');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (src.data) setF(toForm(src.data, !id));
  }, [src.data, id]);
  if (sourceId && src.isLoading) return <Spinner />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const text = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never);
  const toggle = (k: 'trainingCategories' | 'equipment', v: string) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      nameNl: f.nameNl, nameEn: f.nameEn || f.nameNl, altNames: list(f.altNames), bodyRegion: f.bodyRegion, targetMuscles: list(f.targetMuscles),
      movementCategory: f.movementCategory || null, trainingCategories: f.trainingCategories, equipment: f.equipment, difficulty: f.difficulty,
      startingPositionNl: f.startingPositionNl, startingPositionEn: f.startingPositionEn, movementNl: f.movementNl, movementEn: f.movementEn,
      instructionsNl: f.instructionsNl, instructionsEn: f.instructionsEn,
      defaults: { sets: f.sets, reps: f.reps, holdS: f.holdS, restS: f.restS, tempo: f.tempo || null, frequency: f.frequency || null },
      tags: list(f.tags), clinicalNotes: f.clinicalNotes, videoMediaId: f.videoMediaId, thumbnailMediaId: f.thumbnailMediaId,
      physitrackId: f.physitrackId.trim() || null, externalVideoUrl: f.externalVideoUrl.trim() || null,
      ...(!id && src.data?.relations ? { relations: src.data.relations.map((r) => ({ kind: r.kind, id: r.id })) } : {}),
    };
    try {
      if (id) {
        await api.patch(`/exercises/${id}`, body);
        qc.invalidateQueries({ queryKey: ['exercise', id] });
        toast(t('Oefening opgeslagen', 'Exercise saved'));
        nav(`/app/oefeningen/${id}`);
      } else {
        const r = await api.post<{ id: string }>('/exercises', body);
        toast(t('Oefening aangemaakt', 'Exercise created'));
        nav(`/app/oefeningen/${r.id}`);
      }
      qc.invalidateQueries({ queryKey: ['exercises'] });
    } catch (err) {
      setError(errorMessage(err instanceof ApiError ? err.code : undefined, locale));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  const L = lang === 'nl';
  return (
    <form onSubmit={submit}>
      <PageHeader
        eyebrow={<Link to="/app/oefeningen" className="hover:text-ink-800">{t('Oefenbibliotheek', 'Exercise library')}</Link>}
        title={id ? t('Oefening bewerken', 'Edit exercise') : src.data ? t('Oefening dupliceren', 'Duplicate exercise') : t('Nieuwe oefening', 'New exercise')}
        description={t('Eigen oefeningen zijn alleen zichtbaar binnen je praktijk.', 'Custom exercises are only visible within your practice.')}
        actions={
          <>
            <Button variant="ghost" onClick={() => nav(-1)}>{t('Annuleren', 'Cancel')}</Button>
            <Button type="submit" loading={busy}>{t('Opslaan', 'Save')}</Button>
          </>
        }
      />
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('Naam (Nederlands)', 'Name (Dutch)')} required minLength={2} value={f.nameNl} onChange={text('nameNl')} />
              <Input label={t('Naam (Engels)', 'Name (English)')} value={f.nameEn} onChange={text('nameEn')} placeholder={f.nameNl} />
            </div>
            <Input label={t('Alternatieve namen', 'Alternative names')} hint={t('Gescheiden door komma’s — worden meegenomen in zoeken.', 'Comma-separated — included in search.')} value={f.altNames} onChange={text('altNames')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label={t('Lichaamsregio', 'Body region')} value={f.bodyRegion} onChange={text('bodyRegion')}>
                {taxonomy.BODY_REGIONS.map((r) => <option key={r.key} value={r.key}>{r[locale]}</option>)}
              </Select>
              <Select label={t('Bewegingspatroon', 'Movement pattern')} value={f.movementCategory} onChange={text('movementCategory')}>
                <option value="">—</option>
                {taxonomy.MOVEMENT_CATEGORIES.map((r) => <option key={r.key} value={r.key}>{r[locale]}</option>)}
              </Select>
            </div>
            <Input label={t('Doelspieren', 'Target muscles')} hint={t('Gescheiden door komma’s', 'Comma-separated')} value={f.targetMuscles} onChange={text('targetMuscles')} />
            <fieldset>
              <legend className="label mb-2">{t('Trainingscategorie', 'Training category')}</legend>
              <div className="flex flex-wrap gap-1.5">
                {taxonomy.TRAINING_CATEGORIES.map((c) => <Chip key={c.key} active={f.trainingCategories.includes(c.key)} onClick={() => toggle('trainingCategories', c.key)}>{c[locale]}</Chip>)}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label mb-2">{t('Materiaal', 'Equipment')}</legend>
              <div className="flex flex-wrap gap-1.5">
                {taxonomy.EQUIPMENT.map((c) => <Chip key={c.key} active={f.equipment.includes(c.key)} onClick={() => toggle('equipment', c.key)}>{c[locale]}</Chip>)}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label mb-2">{t('Niveau', 'Level')}</legend>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => <Chip key={n} active={f.difficulty === n} onClick={() => set('difficulty', n)}>{n}</Chip>)}
              </div>
            </fieldset>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">{t('Instructies voor de patiënt', 'Patient instructions')}</h2>
              <div className="flex rounded-lg border border-line bg-ink-50 p-0.5 text-[13px]">
                {(['nl', 'en'] as const).map((l) => (
                  <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className={lang === l ? 'rounded-md bg-white px-2.5 py-1 font-medium shadow-xs' : 'px-2.5 py-1 text-ink-500'}>
                    {l === 'nl' ? 'Nederlands' : 'English'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Textarea label={t('Startpositie', 'Starting position')} value={L ? f.startingPositionNl : f.startingPositionEn} onChange={text(L ? 'startingPositionNl' : 'startingPositionEn')} />
              <Textarea label={t('Uitvoering', 'Movement')} rows={4} value={L ? f.movementNl : f.movementEn} onChange={text(L ? 'movementNl' : 'movementEn')} />
              <Textarea label={t('Aandachtspunten', 'Key points')} value={L ? f.instructionsNl : f.instructionsEn} onChange={text(L ? 'instructionsNl' : 'instructionsEn')} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <h2 className="text-[15px] font-semibold">{t('Media', 'Media')}</h2>
            <MediaUpload kind="video" value={f.videoMediaId} onChange={(v) => set('videoMediaId', v)} />
            <MediaUpload kind="image" value={f.thumbnailMediaId} onChange={(v) => set('thumbnailMediaId', v)} />
            <p className="text-[12px] text-ink-500">{t('Bestanden worden privé opgeslagen en alleen getoond aan je praktijk en haar patiënten. Upload geen herkenbare patiëntbeelden.', 'Files are stored privately and only shown to your practice and its patients. Do not upload identifiable patient footage.')}</p>
          </Card>
          <Card className="space-y-4 p-5">
            <h2 className="text-[15px] font-semibold">{t('Standaarddosering', 'Default dosage')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <DoseField label={t('Sets', 'Sets')}><NumberStepper label={t('Sets', 'Sets')} value={f.sets} onChange={(v) => set('sets', v)} min={1} max={20} /></DoseField>
              <DoseField label={t('Herhalingen', 'Reps')}><NumberStepper label={t('Herhalingen', 'Reps')} value={f.reps} onChange={(v) => set('reps', v)} min={1} max={200} /></DoseField>
              <DoseField label={t('Vasthouden (s)', 'Hold (s)')}><NumberStepper label={t('Vasthouden', 'Hold')} value={f.holdS} onChange={(v) => set('holdS', v)} min={1} max={600} /></DoseField>
              <DoseField label={t('Rust (s)', 'Rest (s)')}><NumberStepper label={t('Rust', 'Rest')} value={f.restS} onChange={(v) => set('restS', v)} min={0} max={900} /></DoseField>
            </div>
            <Input label={t('Tempo', 'Tempo')} placeholder="3-1-3" value={f.tempo} onChange={text('tempo')} maxLength={20} />
            <Input label={t('Frequentie', 'Frequency')} placeholder={t('bijv. 1x per dag', 'e.g. once a day')} value={f.frequency} onChange={text('frequency')} maxLength={80} />
          </Card>
          <Card className="space-y-4 p-5">
            <Input label={t('Trefwoorden', 'Tags')} hint={t('Gescheiden door komma’s', 'Comma-separated')} value={f.tags} onChange={text('tags')} />
            <Textarea label={<span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />{t('Klinische notities', 'Clinical notes')}</span>} hint={t('Alleen zichtbaar voor zorgprofessionals in je praktijk.', 'Only visible to professionals in your practice.')} value={f.clinicalNotes} onChange={text('clinicalNotes')} />
          </Card>
          <Card className="space-y-4 p-5">
            <div>
              <h2 className="text-[15px] font-semibold">{t('Externe verwijzingen', 'External references')}</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-600">{t('Alleen opgeslagen ter referentie, zonder koppeling. Er wordt niets opgehaald of gekopieerd; patiënten zien dit niet.', 'Stored for reference only, without integration. Nothing is fetched or copied; patients do not see this.')}</p>
            </div>
            <Input label={t('Physitrack-ID', 'Physitrack ID')} optional={t('optioneel', 'optional')} value={f.physitrackId} onChange={text('physitrackId')} maxLength={80} />
            <Input label={t('Externe video-URL', 'External video URL')} optional={t('optioneel', 'optional')} type="url" placeholder="https://" value={f.externalVideoUrl} onChange={text('externalVideoUrl')} maxLength={500} error={f.externalVideoUrl && !/^https:\/\//.test(f.externalVideoUrl) ? t('Moet met https:// beginnen', 'Must start with https://') : undefined} />
          </Card>
        </div>
      </div>
    </form>
  );
}

function DoseField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="label mb-1.5">{label}</div>{children}</div>;
}

export function MediaUpload({ kind, value, onChange }: { kind: 'video' | 'image'; value: string | null; onChange: (id: string | null) => void }) {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = mediaUrl(value);
  return (
    <div>
      <div className="label mb-1.5">{kind === 'video' ? t('Instructievideo', 'Instruction video') : t('Miniatuur', 'Thumbnail')}</div>
      {url ? (
        <div className="relative overflow-hidden rounded-lg border border-line">
          {kind === 'video' ? <video src={url} controls preload="metadata" className="aspect-video w-full bg-ink-950" /> : <img src={url} alt="" className="aspect-video w-full object-cover" />}
          <button type="button" onClick={() => onChange(null)} className="absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-ink-600 shadow-xs hover:text-bad" aria-label={t('Verwijderen', 'Remove')}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-ink-200 bg-ink-50/50 px-4 py-6 text-[13px] text-ink-500 hover:border-ink-300 hover:bg-ink-50">
          {busy ? <Spinner className="py-0" /> : kind === 'video' ? <Video className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />}
          <span className="font-medium text-ink-700"><Upload className="mr-1 inline h-3.5 w-3.5" />{busy ? t('Uploaden…', 'Uploading…') : t('Bestand kiezen', 'Choose file')}</span>
          <span className="text-[12px]">{kind === 'video' ? 'MP4 / WebM · max 200 MB' : 'JPG / PNG / WebP · max 10 MB'}</span>
        </button>
      )}
      {error && <p className="mt-1.5 text-[12.5px] text-bad">{error}</p>}
      <input
        ref={ref}
        type="file"
        hidden
        accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            const r = await api.upload<{ id: string; kind: string }>('/media', file);
            if (r.kind !== kind) throw new ApiError(400, 'unsupported_file_type');
            onChange(r.id);
          } catch (err) {
            setError(errorMessage(err instanceof ApiError ? err.code : undefined, locale));
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
