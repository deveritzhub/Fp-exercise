import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Archive, ArrowDown, ArrowRight, ArrowUp, BookCopy, CheckCircle2, ChevronDown, Copy, Eye, GripVertical, History, LayoutTemplate, Plus, Search, Trash2, X,
} from 'lucide-react';
import { api, ApiError, qs } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { dose, fmtDate, fmtDateTime, todayISO } from '@/lib/format';
import { taxonomy, useDocumentMeta, useLabels } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, Dialog, EmptyState, Input, MenuItem, Notice, NumberStepper, Popover, Select, Spinner, Textarea, useDebounced, useToast } from '@/components/ui';
import { ExerciseThumb } from '@/components/app/ExerciseThumb';
import { ProgramStatusBadge } from '@/components/app/StatusBadge';
import { ExerciseFilterBar, emptyFilters, useExerciseSearch, type ExerciseFilters } from '@/components/app/ExerciseSearch';
import type { CriteriaCheck, Exercise, PatientListItem, Program, ProgramItem } from '@/lib/types';
import { CriteriaList, Evidence, ModuleBadge, RedFlags, Warnings } from '@/components/app/PhaseInfo';
import { ProgramItemsList, RestDayCard, TodayProgramCard } from '@/components/patient/TodayCard';
import { dayStatus, itemsForDate, nextSessionDate } from '@shared/schedule';

type BItem = Omit<ProgramItem, 'exercise'> & { key: string; exercise: ProgramItem['exercise'] };
type Meta = { title: string; description: string; patientInstructions: string; startDate: string; endDate: string };

let keySeq = 0;
const newKey = () => `k${++keySeq}`;
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

function fromExercise(e: Exercise): BItem {
  return {
    key: newKey(),
    exerciseId: e.id,
    alternativeExerciseId: null,
    sets: e.defaults.sets,
    reps: e.defaults.reps,
    holdS: e.defaults.holdS,
    restS: e.defaults.restS,
    tempo: e.defaults.tempo,
    load: null,
    frequency: e.defaults.frequency,
    days: ALL_DAYS,
    notes: '',
    exercise: {
      id: e.id, nameNl: e.nameNl, nameEn: e.nameEn, bodyRegion: e.bodyRegion, thumbnailMediaId: e.thumbnailMediaId, videoMediaId: e.videoMediaId,
      difficulty: e.difficulty, instructionsNl: e.instructionsNl, instructionsEn: e.instructionsEn, startingPositionNl: e.startingPositionNl,
      startingPositionEn: e.startingPositionEn, movementNl: e.movementNl, movementEn: e.movementEn, equipment: e.equipment,
    },
  };
}
const fromProgramItems = (items: ProgramItem[], keepIds: boolean): BItem[] =>
  items.map((i) => ({ ...i, id: keepIds ? i.id : undefined, key: newKey() }));

const plusWeeks = (iso: string, w: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + w * 7);
  return d.toISOString().slice(0, 10);
};

export function ProgramBuilderPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t, locale } = useI18n();
  const { practice } = useSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const isNew = !id;

  const existing = useQuery({ queryKey: ['program', id], queryFn: () => api.get<Program>(`/programs/${id}`), enabled: !!id });
  const templateParam = params.get('sjabloon');
  const tmpl = useQuery({ queryKey: ['program', templateParam], queryFn: () => api.get<Program>(`/programs/${templateParam}`), enabled: isNew && !!templateParam });

  const [patientId, setPatientId] = useState<string | null>(params.get('patient'));
  const [asTemplate, setAsTemplate] = useState(params.get('type') === 'sjabloon');
  const [meta, setMeta] = useState<Meta>({ title: '', description: '', patientInstructions: '', startDate: todayISO(), endDate: plusWeeks(todayISO(), 6) });
  const [items, setItems] = useState<BItem[]>([]);
  const [sourceTemplateId, setSourceTemplateId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<false | 'draft' | 'active' | 'save'>(false);
  const [error, setError] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState(false);
  const [pickTemplate, setPickTemplate] = useState(false);
  const [libOpen, setLibOpen] = useState(false); // mobile library sheet

  useDocumentMeta(isNew ? t('Nieuw programma', 'New programme') : existing.data?.title ?? t('Programma', 'Programme'));

  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    setMeta({ title: p.title, description: p.description, patientInstructions: p.patientInstructions, startDate: p.startDate ?? '', endDate: p.endDate ?? '' });
    setItems(fromProgramItems(p.items, true));
    setPatientId(p.patientId);
    setAsTemplate(p.isTemplate);
    setDirty(false);
  }, [existing.data]);

  const [templateSource, setTemplateSource] = useState<Program | null>(null);
  const loadTemplate = (p: Program) => {
    setTemplateSource(p);
    setMeta((m) => ({ ...m, title: m.title || p.title, description: p.description, patientInstructions: p.patientInstructions }));
    setItems((cur) => [...cur, ...fromProgramItems(p.items, false)]);
    setSourceTemplateId(p.id);
    setDirty(true);
  };
  useEffect(() => {
    if (tmpl.data) loadTemplate(tmpl.data);
  }, [tmpl.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arriving from the library's quick add ("Nieuw programma"): start with that exercise and its dose.
  const exParam = params.get('oefening');
  const startEx = useQuery({ queryKey: ['exercise', exParam], queryFn: () => api.get<Exercise>(`/exercises/${exParam}`), enabled: isNew && !!exParam });
  const startAdded = useRef(false);
  useEffect(() => {
    const e = startEx.data;
    if (!e || startAdded.current) return;
    startAdded.current = true;
    const num = (k: string) => (params.get(k) ? Number(params.get(k)) : undefined);
    const days = (params.get('days') ?? '').split(',').map(Number).filter((d) => d >= 1 && d <= 7);
    const base = fromExercise(e);
    update((x) => [...x, { ...base, sets: num('sets') ?? base.sets, reps: num('reps') ?? base.reps, holdS: num('holdS') ?? base.holdS, restS: num('restS') ?? base.restS, days: days.length ? days : base.days }]);
  }, [startEx.data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const program = existing.data;
  const readOnlyGlobal = program?.isTemplate && program.scope === 'global';
  const update = (fn: (x: BItem[]) => BItem[]) => {
    setItems(fn);
    setDirty(true);
  };
  const setM = (k: keyof Meta) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setMeta((m) => ({ ...m, [k]: e.target.value }));
    setDirty(true);
  };
  const addExercise = (e: Exercise) => {
    update((x) => [...x, fromExercise(e)]);
    toast(t(`${e.nameNl} toegevoegd`, `${e.nameEn} added`));
  };

  const payload = () => ({
    title: meta.title.trim(),
    description: meta.description,
    patientInstructions: meta.patientInstructions,
    startDate: asTemplate ? null : meta.startDate || null,
    endDate: asTemplate ? null : meta.endDate || null,
    items: items.map(({ id: itemId, exerciseId, alternativeExerciseId, sets, reps, holdS, restS, tempo, load, frequency, days, notes }) => ({
      id: itemId, exerciseId, alternativeExerciseId: alternativeExerciseId ?? null, sets, reps, holdS, restS, tempo, load, frequency, days, notes,
    })),
  });

  const validate = () => {
    if (meta.title.trim().length < 2) return t('Geef het programma een titel.', 'Give the programme a title.');
    if (isNew && !asTemplate && !patientId) return t('Kies een patiënt of sla op als sjabloon.', 'Choose a patient or save as template.');
    return null;
  };

  const save = async (mode: 'draft' | 'active' | 'save') => {
    const v = validate();
    if (v) return setError(v);
    setBusy(mode);
    setError(null);
    try {
      if (isNew) {
        const r = await api.post<{ id: string }>('/programs', {
          ...payload(),
          isTemplate: asTemplate,
          patientId: asTemplate ? null : patientId,
          status: mode === 'active' ? 'active' : 'draft',
          sourceTemplateId,
        });
        setDirty(false);
        toast(asTemplate ? t('Sjabloon opgeslagen', 'Template saved') : mode === 'active' ? t('Programma toegewezen aan patiënt', 'Programme assigned to patient') : t('Concept opgeslagen', 'Draft saved'));
        qc.invalidateQueries({ queryKey: ['patient'] });
        nav(`/app/programmas/${r.id}`, { replace: true });
      } else {
        await api.put(`/programs/${id}`, { ...payload(), changeNote });
        if (mode === 'active' && program?.status !== 'active') await api.post(`/programs/${id}/status`, { status: 'active' });
        setDirty(false);
        setChangeNote('');
        toast(mode === 'active' && program?.status === 'draft' ? t('Programma toegewezen aan patiënt', 'Programme assigned to patient') : t('Wijzigingen opgeslagen', 'Changes saved'));
        qc.invalidateQueries({ queryKey: ['program', id] });
        qc.invalidateQueries({ queryKey: ['program-versions', id] });
      }
    } catch (e) {
      setError(errorMessage(e instanceof ApiError ? e.code : undefined, locale));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: 'completed' | 'archived' | 'active') => {
    try {
      await api.post(`/programs/${id}/status`, { status });
      toast(t('Status bijgewerkt', 'Status updated'));
      qc.invalidateQueries({ queryKey: ['program', id] });
    } catch (e) {
      toast(errorMessage(e instanceof ApiError ? e.code : undefined, locale), 'bad');
    }
  };

  const duplicate = async (asTpl: boolean) => {
    try {
      const r = await api.post<{ id: string }>(`/programs/${id}/duplicate`, asTpl ? { asTemplate: true, title: meta.title } : { patientId });
      toast(asTpl ? t('Opgeslagen als praktijksjabloon', 'Saved as practice template') : t('Kopie gemaakt', 'Copy created'));
      nav(`/app/programmas/${r.id}`);
    } catch (e) {
      toast(errorMessage(e instanceof ApiError ? e.code : undefined, locale), 'bad');
    }
  };

  if (id && existing.isLoading) return <Spinner />;
  if (id && (existing.isError || !program)) return <Notice tone="bad">{errorMessage(existing.error instanceof ApiError ? existing.error.code : undefined, locale)}</Notice>;

  const library = <LibraryPanel onAdd={addExercise} addedIds={items.map((i) => i.exerciseId)} />;

  return (
    <div className="pb-24">
      {/* header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 text-[13px] text-ink-500">
            <Link to={program?.patient ? `/app/patienten/${program.patient.id}?tab=programmas` : '/app/programmas'} className="hover:text-ink-800">
              {program?.patient ? `${program.patient.firstName} ${program.patient.lastName}` : t('Programma’s', 'Programmes')}
            </Link>
          </div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {isNew ? (asTemplate ? t('Nieuw sjabloon', 'New template') : t('Nieuw programma', 'New programme')) : meta.title || t('Programma', 'Programme')}
            {program && !program.isTemplate && <ProgramStatusBadge status={program.status} />}
            {program?.isTemplate && <Badge tone="accent">{program.scope === 'global' ? t('Centraal sjabloon', 'Central template') : t('Praktijksjabloon', 'Practice template')}</Badge>}
            {program && <Badge tone="outline">v{program.version}</Badge>}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Eye className="h-4 w-4" />} onClick={() => setPreview(true)} disabled={!items.length}>{t('Voorbeeld', 'Preview')}</Button>
          {program && (
            <Popover trigger={({ toggle }) => <Button variant="secondary" onClick={toggle} icon={<ChevronDown className="h-4 w-4" />}>{t('Meer', 'More')}</Button>}>
              {(close) => (
                <>
                  {!readOnlyGlobal && <MenuItem icon={<History className="h-4 w-4" />} onClick={() => { close(); setHistory(true); }}>{t('Versiegeschiedenis', 'Version history')}</MenuItem>}
                  <MenuItem icon={<BookCopy className="h-4 w-4" />} onClick={() => { close(); duplicate(true); }}>{program.isTemplate ? t('Kopiëren naar praktijksjabloon', 'Copy to practice template') : t('Opslaan als sjabloon', 'Save as template')}</MenuItem>
                  {program.isTemplate && <MenuItem icon={<Copy className="h-4 w-4" />} onClick={() => { close(); nav(`/app/programmas/nieuw?sjabloon=${program.id}`); }}>{t('Gebruiken voor patiënt', 'Use for patient')}</MenuItem>}
                  {!program.isTemplate && program.status === 'active' && <MenuItem icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => { close(); setStatus('completed'); }}>{t('Markeer als afgerond', 'Mark as completed')}</MenuItem>}
                  {!program.isTemplate && (program.status === 'completed' || program.status === 'archived') && <MenuItem icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => { close(); setStatus('active'); }}>{t('Opnieuw activeren', 'Reactivate')}</MenuItem>}
                  {!program.isTemplate && program.status !== 'archived' && <MenuItem danger icon={<Archive className="h-4 w-4" />} onClick={() => { close(); setStatus('archived'); }}>{t('Archiveren', 'Archive')}</MenuItem>}
                  {(program.status === 'draft' || (program.isTemplate && program.scope === 'practice')) && (
                    <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={async () => { close(); if (!confirm(t('Definitief verwijderen?', 'Delete permanently?'))) return; try { await api.del(`/programs/${id}`); toast(t('Verwijderd', 'Deleted')); nav(program.patient ? `/app/patienten/${program.patient.id}` : '/app/programmas'); } catch (e) { toast(errorMessage(e instanceof ApiError ? e.code : undefined, locale), 'bad'); } }}>{t('Verwijderen', 'Delete')}</MenuItem>
                  )}
                </>
              )}
            </Popover>
          )}
        </div>
      </div>

      {readOnlyGlobal && (
        <Notice tone="info" className="mb-5" icon={<LayoutTemplate className="h-4 w-4" />} title={t('Centraal sjabloon (alleen-lezen)', 'Central template (read-only)')}>
          {t('Sjablonen zijn een startpunt voor professionele aanpassing, geen behandeladvies. Gebruik het sjabloon voor een patiënt of kopieer het naar je praktijk om het aan te passen.', 'Templates are a starting point for professional customisation, not treatment advice. Use it for a patient or copy it to your practice to edit it.')}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => nav(`/app/programmas/nieuw?sjabloon=${program!.id}`)}>{t('Gebruiken voor patiënt', 'Use for patient')}</Button>
            <Button size="sm" variant="secondary" onClick={() => duplicate(true)}>{t('Kopiëren naar praktijk', 'Copy to practice')}</Button>
          </div>
        </Notice>
      )}
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}

      <div className="grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* library (desktop) */}
        {!readOnlyGlobal && <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] lg:block">{library}</aside>}

        <div className={cn('space-y-5', readOnlyGlobal && 'lg:col-span-2')}>
          <Card className="space-y-4 p-5">
            {isNew && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {!asTemplate ? <PatientPicker value={patientId} onChange={(v) => { setPatientId(v); setDirty(true); }} /> : <div className="flex-1 rounded-lg bg-accent-soft px-3 py-2 text-[13px] text-accent">{t(`Wordt opgeslagen als sjabloon van ${practice?.practiceName}`, `Will be saved as a ${practice?.practiceName} template`)}</div>}
                <label className="flex h-9 items-center gap-2 text-[13px] text-ink-700">
                  <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={asTemplate} onChange={(e) => setAsTemplate(e.target.checked)} />
                  {t('Opslaan als sjabloon', 'Save as template')}
                </label>
              </div>
            )}
            <Input label={t('Titel', 'Title')} value={meta.title} onChange={setM('title')} placeholder={t('bijv. Knie — fase 2 kracht', 'e.g. Knee — phase 2 strength')} disabled={readOnlyGlobal} required />
            {!asTemplate && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('Startdatum', 'Start date')} type="date" value={meta.startDate} onChange={setM('startDate')} />
                <Input label={t('Einddatum', 'End date')} type="date" value={meta.endDate} min={meta.startDate} onChange={setM('endDate')} optional={t('optioneel', 'optional')} />
              </div>
            )}
            <Textarea label={t('Instructies voor de patiënt', 'Instructions for the patient')} value={meta.patientInstructions} onChange={setM('patientInstructions')} placeholder={t('Algemene uitleg, bijv. hoe om te gaan met pijn tijdens het oefenen.', 'General guidance, e.g. how to handle pain during exercise.')} disabled={readOnlyGlobal} />
            {asTemplate && <Textarea label={t('Omschrijving (intern)', 'Description (internal)')} value={meta.description} onChange={setM('description')} rows={meta.description.includes('\n') ? 8 : 2} disabled={readOnlyGlobal} />}
            {!asTemplate && meta.description.includes('\n') && (
              <details className="rounded-xl border border-line bg-ink-50/60 px-4 py-3 text-[13.5px]" open>
                <summary className="cursor-pointer font-medium text-ink-800">{t('Notities uit het sjabloon (alleen voor jou)', 'Notes from the template (only for you)')}</summary>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink-700">{meta.description}</p>
              </details>
            )}
          </Card>

          <PhaseCard source={program ?? templateSource} programId={program && !program.isTemplate ? program.id : null} patientId={patientId} />

          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">
              {t('Oefeningen', 'Exercises')} <span className="font-normal text-ink-500">({items.length})</span>
            </h2>
            {!readOnlyGlobal && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={<LayoutTemplate className="h-3.5 w-3.5" />} onClick={() => setPickTemplate(true)}>{t('Uit sjabloon', 'From template')}</Button>
                <Button size="sm" variant="secondary" className="lg:hidden" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setLibOpen(true)}>{t('Oefening', 'Exercise')}</Button>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <Card className="border-dashed">
              <EmptyState
                icon={<Search className="h-5 w-5" />}
                title={t('Voeg oefeningen toe', 'Add exercises')}
                description={t('Zoek in de bibliotheek en klik op een oefening, of start vanuit een sjabloon.', 'Search the library and click an exercise, or start from a template.')}
                action={<Button variant="secondary" onClick={() => setPickTemplate(true)} icon={<LayoutTemplate className="h-4 w-4" />}>{t('Kies een sjabloon', 'Choose a template')}</Button>}
              />
            </Card>
          ) : (
            <SortableItems items={items} update={update} readOnly={!!readOnlyGlobal} />
          )}
        </div>
      </div>

      {/* sticky action bar */}
      {!readOnlyGlobal && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <span className="text-[13px] text-ink-500">{dirty ? t('Niet-opgeslagen wijzigingen', 'Unsaved changes') : program ? t(`Opgeslagen · ${fmtDateTime(program.updatedAt, locale)}`, `Saved · ${fmtDateTime(program.updatedAt, locale)}`) : ''}</span>
            {!isNew && program?.status === 'active' && (
              <Input className="h-9 max-w-xs" placeholder={t('Wijzigingsnotitie (optioneel)', 'Change note (optional)')} value={changeNote} onChange={(e) => setChangeNote(e.target.value)} aria-label={t('Wijzigingsnotitie', 'Change note')} />
            )}
            <div className="ml-auto flex gap-2">
              {asTemplate || program?.isTemplate ? (
                <Button loading={busy === 'save'} onClick={() => save('save')}>{t('Sjabloon opslaan', 'Save template')}</Button>
              ) : isNew || program?.status === 'draft' ? (
                <>
                  <Button variant="secondary" loading={busy === 'draft'} onClick={() => save('draft')}>{t('Opslaan als concept', 'Save as draft')}</Button>
                  <Button loading={busy === 'active'} onClick={() => save('active')} disabled={!items.length}>{t('Opslaan & toewijzen', 'Save & assign')}</Button>
                </>
              ) : (
                <Button loading={busy === 'save'} onClick={() => save('save')} disabled={!dirty}>{t('Wijzigingen opslaan', 'Save changes')}</Button>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={libOpen} onClose={() => setLibOpen(false)} title={t('Oefening toevoegen', 'Add exercise')} side>
        <LibraryPanel onAdd={addExercise} addedIds={items.map((i) => i.exerciseId)} bare />
      </Dialog>
      <TemplatePicker open={pickTemplate} onClose={() => setPickTemplate(false)} onPick={(p) => { loadTemplate(p); setPickTemplate(false); }} />
      <PreviewDialog open={preview} onClose={() => setPreview(false)} meta={meta} items={items} unsaved={dirty} />
      {id && <VersionsDialog open={history} onClose={() => setHistory(false)} programId={id} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function LibraryPanel({ onAdd, addedIds, bare }: { onAdd: (e: Exercise) => void; addedIds: string[]; bare?: boolean }) {
  const { t, locale } = useI18n();
  const L = useLabels();
  const [f, setF] = useState<ExerciseFilters>(emptyFilters);
  const q = useExerciseSearch(f, 60);
  const added = useMemo(() => new Set(addedIds), [addedIds]);
  const body = (
    <>
      <div className="border-b border-line p-3">
        <ExerciseFilterBar value={f} onChange={setF} compact />
        <div className="mt-2 flex gap-1 text-[12.5px]">
          {[['all', t('Alle', 'All')], ['favorites', t('Favorieten', 'Favourites')], ['practice', t('Praktijk', 'Practice')]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setF({ ...f, scope: v })} aria-pressed={f.scope === v} className={cn('rounded-md px-2 py-1 font-medium', f.scope === v ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-100')}>{l}</button>
          ))}
        </div>
      </div>
      <div className={cn('overflow-y-auto', bare ? '' : 'flex-1')}>
        {!q.data ? (
          <Spinner />
        ) : q.data.items.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-ink-500">{t('Geen oefeningen gevonden', 'No exercises found')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {q.data.items.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onAdd(e)} className="group flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent-soft/50">
                  <span className="sr-only">{t('Toevoegen:', 'Add:')} </span>
                  <ExerciseThumb thumbnailId={e.thumbnailMediaId} videoId={e.videoMediaId} region={e.bodyRegion} className="h-11 w-11 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink-900">{locale === 'nl' ? e.nameNl : e.nameEn}</span>
                    <span className="block truncate text-[12px] text-ink-500">{L.region(e.bodyRegion)} · {e.equipment.map(L.equipment).join(', ')}</span>
                  </span>
                  {added.has(e.id) && <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-label={t('al toegevoegd', 'already added')} />}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-white text-ink-500 group-hover:border-accent group-hover:bg-accent group-hover:text-white">
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
  if (bare) return <div className="-mx-5 -my-5">{body}</div>;
  return <Card className="flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden">{body}</Card>;
}

function PatientPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['patients', 'picker'], queryFn: () => api.get<{ items: PatientListItem[] }>('/patients') });
  return (
    <Select label={t('Patiënt', 'Patient')} className="flex-1" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} required>
      <option value="">{q.isLoading ? t('Laden…', 'Loading…') : t('Kies een patiënt…', 'Choose a patient…')}</option>
      {q.data?.items.map((p) => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName}{p.externalRef ? ` (${p.externalRef})` : ''}</option>)}
    </Select>
  );
}

function SortableItems({ items, update, readOnly }: { items: BItem[]; update: (fn: (x: BItem[]) => BItem[]) => void; readOnly: boolean }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    update((x) => arrayMove(x, x.findIndex((i) => i.key === e.active.id), x.findIndex((i) => i.key === e.over!.id)));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-3">
          {items.map((item, idx) => (
            <SortableRow
              key={item.key}
              item={item}
              index={idx}
              count={items.length}
              readOnly={readOnly}
              onChange={(patch) => update((x) => x.map((i) => (i.key === item.key ? { ...i, ...patch } : i)))}
              onRemove={() => update((x) => x.filter((i) => i.key !== item.key))}
              onMove={(dir) => update((x) => arrayMove(x, idx, idx + dir))}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ item, index, count, readOnly, onChange, onRemove, onMove }: { item: BItem; index: number; count: number; readOnly: boolean; onChange: (p: Partial<BItem>) => void; onRemove: () => void; onMove: (d: -1 | 1) => void }) {
  const { t, locale } = useI18n();
  const L = useLabels();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key, disabled: readOnly });
  const [open, setOpen] = useState(false);
  const name = locale === 'nl' ? item.exercise.nameNl : item.exercise.nameEn;
  const daysLabel = item.days.length === 7 ? t('Dagelijks', 'Daily') : item.days.map(L.weekday).join(' ');
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('card relative', isDragging && 'z-10 shadow-pop ring-2 ring-accent/30')}>
      <div className="flex items-start gap-2 p-3 sm:p-4">
        {!readOnly && (
          <button type="button" className="mt-2 hidden cursor-grab touch-none rounded p-1 text-ink-300 hover:bg-ink-100 hover:text-ink-600 active:cursor-grabbing sm:block" aria-label={t(`Verplaats ${name}`, `Move ${name}`)} {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <span className="mt-2 w-5 shrink-0 text-center text-[13px] font-semibold tabular-nums text-ink-400">{index + 1}</span>
        <ExerciseThumb thumbnailId={item.exercise.thumbnailMediaId} videoId={item.exercise.videoMediaId} region={item.exercise.bodyRegion} className="h-12 w-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/app/oefeningen/${item.exerciseId}`} target="_blank" className="block truncate text-[14px] font-semibold text-ink-950 hover:underline">{name}</Link>
              <div className="text-[12.5px] text-ink-500">{[dose(item, locale), daysLabel, item.load].filter(Boolean).join(' · ')}</div>
            </div>
            {!readOnly && (
              <div className="flex shrink-0 items-center">
                <button type="button" className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30" onClick={() => onMove(-1)} disabled={index === 0} aria-label={t('Omhoog', 'Move up')}><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={t('Omlaag', 'Move down')}><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" className="rounded p-1.5 text-ink-400 hover:bg-bad-soft hover:text-bad" onClick={onRemove} aria-label={t(`Verwijder ${name}`, `Remove ${name}`)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </div>
          <fieldset disabled={readOnly} className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
            <Mini label={t('Sets', 'Sets')}><NumberStepper compact label={t('Sets', 'Sets')} value={item.sets} onChange={(v) => onChange({ sets: v })} min={1} max={20} /></Mini>
            <Mini label={t('Herh.', 'Reps')}><NumberStepper compact label={t('Herhalingen', 'Reps')} value={item.reps} onChange={(v) => onChange({ reps: v })} min={1} max={200} /></Mini>
            <Mini label={t('Vasthouden', 'Hold')}><NumberStepper compact label={t('Vasthouden (s)', 'Hold (s)')} suffix="s" value={item.holdS} onChange={(v) => onChange({ holdS: v })} min={1} max={600} /></Mini>
            <Mini label={t('Rust', 'Rest')}><NumberStepper compact label={t('Rust (s)', 'Rest (s)')} suffix="s" value={item.restS} onChange={(v) => onChange({ restS: v })} min={0} max={900} /></Mini>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12.5px] font-medium text-ink-600 hover:bg-ink-100">
              {open ? t('Minder', 'Less') : t('Meer opties', 'More options')}
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
            </button>
          </fieldset>
          {!open && item.notes && <p className="mt-2 line-clamp-1 text-[12.5px] italic text-ink-500">“{item.notes}”</p>}
          {open && <ItemDetails item={item} onChange={onChange} readOnly={readOnly} />}
        </div>
      </div>
    </li>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-2xs font-medium uppercase tracking-wide text-ink-400">{label}</div>
      {children}
    </div>
  );
}

function ItemDetails({ item, onChange, readOnly }: { item: BItem; onChange: (p: Partial<BItem>) => void; readOnly: boolean }) {
  const { t, locale } = useI18n();
  const detail = useQuery({ queryKey: ['exercise', item.exerciseId], queryFn: () => api.get<Exercise>(`/exercises/${item.exerciseId}`) });
  const toggleDay = (d: number) => {
    const next = item.days.includes(d) ? item.days.filter((x) => x !== d) : [...item.days, d].sort();
    if (next.length) onChange({ days: next });
  };
  return (
    <fieldset disabled={readOnly} className="mt-4 animate-fade-in space-y-3 border-t border-line pt-4">
      <div>
        <div className="label mb-1.5">{t('Trainingsdagen', 'Training days')}</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {taxonomy.WEEKDAYS.map((d) => {
            const n = Number(d.key);
            const on = item.days.includes(n);
            return (
              <button key={d.key} type="button" aria-pressed={on} onClick={() => toggleDay(n)} className={cn('h-8 w-10 rounded-lg border text-[12.5px] font-medium capitalize', on ? 'border-accent bg-accent text-white' : 'border-line bg-white text-ink-600 hover:border-ink-300')}>
                {d[locale]}
              </button>
            );
          })}
          <span className="mx-1 h-5 w-px bg-line" />
          <button type="button" className="text-[12.5px] font-medium text-accent hover:underline" onClick={() => onChange({ days: ALL_DAYS })}>{t('Dagelijks', 'Daily')}</button>
          <button type="button" className="text-[12.5px] font-medium text-accent hover:underline" onClick={() => onChange({ days: [1, 3, 5] })}>{t('ma/wo/vr', 'Mon/Wed/Fri')}</button>
          <button type="button" className="text-[12.5px] font-medium text-accent hover:underline" onClick={() => onChange({ days: [2, 4, 6] })}>{t('di/do/za', 'Tue/Thu/Sat')}</button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label={t('Tempo', 'Tempo')} placeholder="3-1-3" value={item.tempo ?? ''} onChange={(e) => onChange({ tempo: e.target.value || null })} maxLength={20} />
        <Input label={t('Belasting', 'Load')} placeholder={t('bijv. 8 kg / rode band', 'e.g. 8 kg / red band')} value={item.load ?? ''} onChange={(e) => onChange({ load: e.target.value || null })} maxLength={60} />
        <Input label={t('Frequentie', 'Frequency')} placeholder={t('bijv. 2x per dag', 'e.g. twice daily')} value={item.frequency ?? ''} onChange={(e) => onChange({ frequency: e.target.value || null })} maxLength={80} />
      </div>
      <SubstitutePicker item={item} relations={detail.data?.relations ?? []} onChange={(id) => onChange({ alternativeExerciseId: id })} />
      <Textarea label={t('Persoonlijke notitie voor de patiënt', 'Personal note for the patient')} rows={2} value={item.notes} onChange={(e) => onChange({ notes: e.target.value })} maxLength={2000} />
    </fieldset>
  );
}

/**
 * Substitute shown to the patient when the exercise does not work out ("Lukt het niet?").
 * Only easier variants (regressions) and equivalent alternatives are offered, never a progression;
 * the therapist chooses explicitly, also from the whole library.
 */
function SubstitutePicker({ item, relations, onChange }: { item: BItem; relations: NonNullable<Exercise['relations']>; onChange: (id: string | null) => void }) {
  const { t, locale } = useI18n();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const results = useExerciseSearch({ ...emptyFilters, q }, 8);
  const name = (x: { nameNl: string; nameEn: string }) => (locale === 'nl' ? x.nameNl : x.nameEn);
  const easier = relations.filter((r) => r.kind === 'regression');
  const equal = relations.filter((r) => r.kind === 'alternative');
  const progression = relations.find((r) => r.kind === 'progression' && r.id === item.alternativeExerciseId);
  const known = relations.some((r) => r.kind !== 'progression' && r.id === item.alternativeExerciseId);
  const [picked, setPicked] = useState<{ id: string; nameNl: string; nameEn: string } | null>(null);
  const current = item.alternativeExerciseId && !known && !progression ? (picked?.id === item.alternativeExerciseId ? picked : item.alternative ?? null) : null;
  return (
    <div>
      <Select
        label={t('Vervangende oefening als het niet lukt', 'Substitute if the exercise does not work out')}
        hint={t('De patiënt ziet deze oefening bij “Lukt het niet?”. Alleen makkelijkere varianten en gelijkwaardige alternatieven; een progressie nooit.', 'The patient sees this under “Can’t do it?”. Only easier variants and equivalent alternatives; never a progression.')}
        value={progression ? '' : item.alternativeExerciseId ?? ''}
        onChange={(e) => {
          if (e.target.value === '__search') return setSearching(true);
          onChange(e.target.value || null);
        }}
      >
        <option value="">{t('Geen vervangende oefening', 'No substitute')}</option>
        {easier.length > 0 && (
          <optgroup label={t('Makkelijker (regressie)', 'Easier (regression)')}>
            {easier.map((r) => <option key={'r' + r.id} value={r.id}>{name(r)}</option>)}
          </optgroup>
        )}
        {equal.length > 0 && (
          <optgroup label={t('Gelijkwaardig alternatief', 'Equivalent alternative')}>
            {equal.map((r) => <option key={'a' + r.id} value={r.id}>{name(r)}</option>)}
          </optgroup>
        )}
        {item.alternativeExerciseId && !known && !progression && (
          <option value={item.alternativeExerciseId}>{current ? name(current) : t('Zelf gekozen oefening', 'Exercise chosen by you')}</option>
        )}
        <option value="__search">{t('Andere oefening zoeken…', 'Search another exercise…')}</option>
      </Select>
      {!easier.length && !equal.length && (
        <p className="mt-1 text-[12.5px] text-ink-600">{t('Voor deze oefening zijn geen regressies of alternatieven vastgelegd. Zoek zelf een passende oefening.', 'No regressions or alternatives are recorded for this exercise. Search for a suitable exercise yourself.')}</p>
      )}
      {progression && (
        <Notice tone="warn" className="mt-2">
          {t(`“${name(progression)}” is een progressie (zwaarder) en wordt daarom niet als vervangende oefening getoond. Kies een regressie of alternatief.`, `“${name(progression)}” is a progression (harder) and is therefore not shown as a substitute. Choose a regression or alternative.`)}
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => onChange(null)}>{t('Verwijderen als vervanger', 'Remove as substitute')}</Button>
        </Notice>
      )}
      {searching && (
        <div className="mt-2 rounded-lg border border-line p-2">
          <Input autoFocus leading={<Search className="h-4 w-4" />} aria-label={t('Zoek vervangende oefening', 'Search substitute')} placeholder={t('Zoek op naam…', 'Search by name…')} value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="mt-2 max-h-56 overflow-auto">
            {q.trim().length < 2 ? (
              <li className="px-2 py-1.5 text-[12.5px] text-ink-600">{t('Typ minstens 2 letters.', 'Type at least 2 letters.')}</li>
            ) : results.isFetching && results.isPlaceholderData ? (
              <li className="px-2 py-1.5 text-[12.5px] text-ink-600">{t('Zoeken…', 'Searching…')}</li>
            ) : (
              (results.data?.items ?? [])
                .filter((x) => x.id !== item.exerciseId)
                .map((x) => {
                  const isProg = relations.some((r) => r.kind === 'progression' && r.id === x.id);
                  return (
                    <li key={x.id}>
                      <button type="button" disabled={isProg} className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md px-2 text-left text-[13px] hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => {
                        setPicked(x);
                        onChange(x.id);
                        setSearching(false);
                        setQ('');
                      }}>
                        <span>{name(x)}</span>
                        {isProg && <span className="text-[11.5px] text-ink-600">{t('progressie', 'progression')}</span>}
                      </button>
                    </li>
                  );
                })
            )}
          </ul>
          <Button variant="ghost" size="sm" onClick={() => setSearching(false)}>{t('Annuleren', 'Cancel')}</Button>
        </div>
      )}
    </div>
  );
}

function TemplatePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (p: Program) => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const list = useQuery({ queryKey: ['templates', dq], queryFn: () => api.get<{ items: Program[] }>(`/programs/templates${qs({ q: dq })}`), enabled: open });
  const L = useLabels();
  return (
    <Dialog open={open} onClose={onClose} title={t('Start vanuit een sjabloon', 'Start from a template')} description={t('De oefeningen worden toegevoegd; daarna pas je alles aan voor deze patiënt.', 'Exercises are added; then tailor everything for this patient.')} size="lg">
      <Input leading={<Search className="h-4 w-4" />} placeholder={t('Zoek sjablonen…', 'Search templates…')} value={q} onChange={(e) => setQ(e.target.value)} className="mb-4" aria-label={t('Zoek sjablonen', 'Search templates')} />
      {!list.data ? <Spinner /> : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.data.items.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex h-full w-full flex-col rounded-xl border border-line p-3.5 text-left hover:border-accent hover:bg-accent-soft/40"
                onClick={async () => {
                  try {
                    onPick(await api.get<Program>(`/programs/${p.id}`));
                  } catch {
                    toast(t('Sjabloon kon niet worden geladen', 'Template could not be loaded'), 'bad');
                  }
                }}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-[14px] font-semibold">{p.title}</span>
                  {p.favorite && <Badge tone="warn">★</Badge>}
                </span>
                <span className="mt-1 line-clamp-2 text-[12.5px] text-ink-500">{p.description}</span>
                <span className="mt-2 flex flex-wrap gap-1">
                  <Badge tone={p.scope === 'practice' ? 'accent' : 'neutral'}>{p.scope === 'practice' ? t('Praktijk', 'Practice') : t('Centraal', 'Central')}</Badge>
                  <Badge tone="outline">{p.itemCount} {t('oef.', 'ex.')}</Badge>
                  {p.regions?.slice(0, 2).map((r) => <Badge key={r} tone="outline">{L.region(r)}</Badge>)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

/**
 * Patient preview: the same planning rules (shared/schedule) and the same screens as the patient
 * app, for a chosen date. Purely visual: it registers, sends and stores nothing.
 */
function PreviewDialog({ open, onClose, meta, items, unsaved }: { open: boolean; onClose: () => void; meta: Meta; items: BItem[]; unsaved: boolean }) {
  const { t, locale } = useI18n();
  const win = { startDate: meta.startDate || null, endDate: meta.endDate || null };
  const initial = win.startDate && win.startDate > todayISO() ? win.startDate : todayISO();
  const [date, setDate] = useState(initial);
  const [view, setView] = useState<'today' | 'program'>('today');
  useEffect(() => {
    if (open) setDate(initial);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const dayItems = itemsForDate(win, items, date);
  const status = dayStatus(win, items, date);
  const title = meta.title || t('Programma', 'Programme');
  return (
    <Dialog open={open} onClose={onClose} title={t('Voorbeeld voor de patiënt', 'Patient preview')} description={t('Dezelfde planning en schermen als de patiëntapp. Er wordt niets opgeslagen of verstuurd.', 'Same planning and screens as the patient app. Nothing is saved or sent.')} size="md">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[13px] font-medium text-ink-700">
          {t('Voorbeelddatum', 'Preview date')}
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-11 rounded-lg border border-line bg-white px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40" />
        </label>
        <div role="tablist" aria-label={t('Scherm', 'Screen')} className="flex rounded-lg bg-ink-100 p-1">
          {(['today', 'program'] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn('min-h-[36px] rounded-md px-3 text-[13px] font-medium', view === v ? 'bg-white text-ink-950 shadow-xs' : 'text-ink-600')}>
              {v === 'today' ? t('Vandaag', 'Today') : t('Programma', 'Programme')}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-[12.5px] text-ink-600">
        {fmtDate(date, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {t(`${dayItems.length} van ${items.length} oefeningen gepland`, `${dayItems.length} of ${items.length} exercises planned`)}
        {unsaved && <> · <span className="font-medium text-warn">{t('niet-opgeslagen wijzigingen', 'unsaved changes')}</span></>}
      </p>
      <div className="mx-auto max-w-sm rounded-[28px] border-[6px] border-ink-900 bg-canvas p-4 shadow-pop">
        {view === 'today' ? (
          status === 'training' ? (
            <TodayProgramCard
              id="preview"
              title={title}
              items={dayItems}
              done={false}
              action={
                <div aria-disabled="true" className="flex h-14 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-accent/90 text-base font-semibold text-white">
                  {t('Start training', 'Start workout')}
                </div>
              }
            />
          ) : (
            <RestDayCard status={status} startDate={win.startDate} nextSession={nextSessionDate(win, items, date)} />
          )
        ) : (
          <div>
            <h3 className="mb-3 text-xl font-semibold">{title}</h3>
            <ProgramItemsList items={items} instructions={meta.patientInstructions} />
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-center"><Button variant="ghost" icon={<X className="h-4 w-4" />} onClick={onClose}>{t('Sluiten', 'Close')}</Button></div>
    </Dialog>
  );
}

function VersionsDialog({ open, onClose, programId }: { open: boolean; onClose: () => void; programId: string }) {
  const { t, locale } = useI18n();
  const q = useQuery({
    queryKey: ['program-versions', programId],
    queryFn: () => api.get<{ items: { version: number; changeNote: string; createdAt: string; author: string | null; snapshot: { items: { exerciseName?: { nl: string; en: string }; sets: number | null; reps: number | null; holdS?: number | null; hold_s?: number | null }[] } }[] }>(`/programs/${programId}/versions`),
    enabled: open,
  });
  return (
    <Dialog open={open} onClose={onClose} title={t('Versiegeschiedenis', 'Version history')} side>
      {!q.data ? <Spinner /> : (
        <ol className="relative space-y-5 border-l border-line pl-5">
          {q.data.items.map((v) => (
            <li key={v.version} className="relative">
              <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent ring-1 ring-accent/30" />
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">v{v.version}</span>
                <span className="text-[12px] text-ink-500">{fmtDateTime(v.createdAt, locale)}</span>
              </div>
              <div className="text-[12.5px] text-ink-500">{v.author}{v.changeNote ? ` — ${v.changeNote}` : ''}</div>
              <ul className="mt-2 space-y-0.5 text-[12.5px] text-ink-700">
                {v.snapshot.items.map((i, n) => (
                  <li key={n}>
                    {n + 1}. {i.exerciseName ? (locale === 'nl' ? i.exerciseName.nl : i.exerciseName.en) : t('oefening', 'exercise')} <span className="text-ink-400">{dose({ sets: i.sets, reps: i.reps, holdS: i.holdS ?? i.hold_s ?? null }, locale)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}

/**
 * Phase of this programme: goal, criteria for the next phase (test + threshold) and red flags.
 * On a patient programme the therapist ticks criteria (name + date are kept). Moving on is always
 * a deliberate choice: "Next phase" opens the next phase's template for this patient.
 */
function PhaseCard({ source, programId, patientId }: { source: Program | null; programId: string | null; patientId: string | null }) {
  const { t, locale } = useI18n();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [checks, setChecks] = useState<CriteriaCheck[]>(source?.criteriaChecks ?? []);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => setChecks(source?.criteriaChecks ?? []), [source?.id, source?.criteriaChecks]);
  const next = useQuery({
    queryKey: ['next-phase', programId],
    queryFn: () => api.get<{ next: { id: string; title: string; phaseName: string; weeks: string | null } | null }>(`/programs/${programId}/next-phase`),
    enabled: !!programId && !!source?.series,
  });
  if (!source) return null;
  const criteria = source.criteria ?? [];
  const has = !!source.series || criteria.length > 0 || (source.redFlags ?? []).length > 0 || (source.warnings ?? []).length > 0;
  if (!has) return null;
  const total = criteria.reduce((n, g) => n + g.items.length, 0);
  const done = checks.length;
  const s = source.series;

  const toggle = async (key: string, on: boolean) => {
    if (!programId) return;
    setBusy(key);
    try {
      const r = on ? await api.put<{ items: CriteriaCheck[] }>(`/programs/${programId}/criteria/${key}`, {}) : await api.del<{ items: CriteriaCheck[] }>(`/programs/${programId}/criteria/${key}`);
      setChecks(r.items);
      qc.invalidateQueries({ queryKey: ['program', programId] });
    } catch (err) {
      toast(errorMessage(err instanceof ApiError ? err.code : undefined, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {source.module && <ModuleBadge module={source.module} />}
            {s && <Badge tone="accent">{t(`${s.phaseName} van ${s.phaseCount}`, `${s.phaseName} of ${s.phaseCount}`)}{s.weeks ? ` · ${t('week', 'week')} ${s.weeks}` : ''}</Badge>}
          </div>
          {s && <h2 className="mt-1.5 font-sans text-[15px] font-semibold text-ink-950">{s.title}</h2>}
          {s?.goal && <p className="mt-0.5 text-[13.5px] text-ink-600"><span className="font-medium text-ink-800">{t('Doel', 'Goal')}:</span> {s.goal}</p>}
        </div>
        {programId && total > 0 && (
          <div className="text-right">
            <div className={cn('text-[20px] font-semibold tabular-nums', done === total ? 'text-ok' : 'text-ink-900')}>{done}/{total}</div>
            <div className="text-[11.5px] text-ink-500">{t('criteria behaald', 'criteria met')}</div>
          </div>
        )}
      </div>
      <Warnings items={source.warnings ?? []} />
      {criteria.length > 0 && (
        <div>
          {!programId && <p className="mb-2 text-[12.5px] text-ink-500">{t('Na opslaan kun je deze criteria per patiënt afvinken.', 'After saving you can tick these criteria for this patient.')}</p>}
          <CriteriaList groups={criteria} checks={programId ? checks : undefined} onToggle={programId ? toggle : undefined} busy={busy} />
        </div>
      )}
      <RedFlags flags={source.redFlags ?? []} />
      <Evidence text={source.evidence ?? ''} />
      {programId && s && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          {next.data?.next ? (
            <Button
              variant={done === total ? 'primary' : 'secondary'}
              icon={<ArrowRight className="h-4 w-4" />}
              onClick={() => {
                const open = total - done;
                if (open > 0 && !confirm(t(`Nog ${open} criteria niet afgevinkt. Toch de volgende fase klaarzetten?`, `${open} criteria not ticked yet. Prepare the next phase anyway?`))) return;
                nav(`/app/programmas/nieuw?sjabloon=${next.data!.next!.id}${patientId ? `&patient=${patientId}` : ''}`);
              }}
            >
              {t(`${next.data.next.phaseName} klaarzetten`, `Prepare ${next.data.next.phaseName}`)}
            </Button>
          ) : (
            <span className="text-[13px] text-ink-500">{t('Dit is de laatste fase van dit programma.', 'This is the last phase of this programme.')}</span>
          )}
          <span className="text-[12px] text-ink-500">{t('Fases gaan nooit automatisch door; jij beslist.', 'Phases never advance automatically; you decide.')}</span>
        </div>
      )}
    </Card>
  );
}
