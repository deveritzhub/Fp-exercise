import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Check, ChevronDown, Download, Layers, Mail, MessageSquareText, Pencil, Plus, Send, FileText } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { fmtDate, fmtDateTime, fmtRelative, pct } from '@/lib/format';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Avatar, Badge, Bars, Button, ButtonLink, Card, CardHeader, Dialog, EmptyState, ErrorState, Notice, PageHeader, Popover, MenuItem, Skeleton, Sparkline, Spinner, Stat, Tabs, useToast, TableScroll } from '@/components/ui';
import { ProgramStatusBadge } from '@/components/app/StatusBadge';
import { PatientFormDialog } from './PatientsPage';
import { OpenRedFlagsBanner, PatientModulesTab } from './PatientModulesTab';
import type { Member, PatientDetail, Progress } from '@/lib/types';

type Tab = 'overzicht' | 'programmas' | 'sessies' | 'modules' | 'gegevens';

export function PatientDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { t, locale } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'overzicht';
  const [editing, setEditing] = useState(false);
  const location = useLocation();
  const [inviteUrl, setInviteUrl] = useState<string | null>((location.state as { inviteUrl?: string } | null)?.inviteUrl ?? null);
  const p = useQuery({ queryKey: ['patient', id], queryFn: () => api.get<PatientDetail>(`/patients/${id}`) });
  const prog = useQuery({ queryKey: ['patient', id, 'progress'], queryFn: () => api.get<Progress>(`/patients/${id}/progress?weeks=8`), enabled: !!p.data });
  useDocumentMeta(p.data ? `${p.data.firstName} ${p.data.lastName}` : t('Patiënt', 'Patient'));

  if (p.isLoading) return <Spinner />;
  if (p.isError || !p.data) return <Card><ErrorState error={p.error} onRetry={() => p.refetch()} /></Card>;
  const pt = p.data;
  const name = `${pt.firstName} ${pt.lastName}`;
  const unreviewed = prog.data?.sessions.filter((s) => s.completedAt && !s.reviewedAt && (s.feedback || s.logs.some((l) => l.feedback) || (s.pain ?? 0) >= 6)).length ?? 0;

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast(msg);
      qc.invalidateQueries({ queryKey: ['patient', id] });
      qc.invalidateQueries({ queryKey: ['patients'] });
    } catch (e) {
      toast(errorMessage(e instanceof ApiError ? e.code : undefined, locale), 'bad');
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/app/patienten" className="hover:text-ink-800">{t('Patiënten', 'Patients')}</Link>}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={name} size={40} />
            <span>{name}</span>
            {pt.archived && <Badge>{t('Gearchiveerd', 'Archived')}</Badge>}
          </span>
        }
        actions={
          <>
            {!pt.hasAccount && !pt.archived && (
              <Button
                variant="secondary"
                icon={<Send className="h-4 w-4" />}
                disabled={!pt.email}
                title={!pt.email ? t('Voeg eerst een e-mailadres toe', 'Add an email address first') : undefined}
                onClick={() =>
                  act(async () => {
                    const r = await api.post<{ inviteUrl?: string }>(`/patients/${id}/invite`);
                    if (r.inviteUrl) setInviteUrl(r.inviteUrl);
                  }, t('Uitnodiging verstuurd', 'Invitation sent'))
                }
              >
                {pt.invitedAt ? t('Opnieuw uitnodigen', 'Re-send invitation') : t('Uitnodigen voor app', 'Invite to app')}
              </Button>
            )}
            <Popover
              trigger={({ toggle }) => (
                <Button variant="secondary" onClick={toggle} icon={<ChevronDown className="h-4 w-4" />}>{t('Acties', 'Actions')}</Button>
              )}
            >
              {(close) => (
                <>
                  <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => { close(); setEditing(true); }}>{t('Gegevens bewerken', 'Edit details')}</MenuItem>
                  <MenuItem icon={<FileText className="h-4 w-4" />} onClick={() => { close(); nav(`/app/patienten/${id}/rapport`); }}>{t('Voortgangsrapport (PDF)', 'Progress report (PDF)')}</MenuItem>
                  <MenuItem icon={<Download className="h-4 w-4" />} onClick={() => { close(); window.open(`/api/patients/${id}/export`, '_blank'); }}>{t('Gegevens exporteren (AVG)', 'Export data (GDPR)')}</MenuItem>
                  {pt.archived ? (
                    <MenuItem icon={<ArchiveRestore className="h-4 w-4" />} onClick={() => { close(); act(() => api.post(`/patients/${id}/restore`), t('Patiënt hersteld', 'Patient restored')); }}>{t('Herstellen', 'Restore')}</MenuItem>
                  ) : (
                    <MenuItem danger icon={<Archive className="h-4 w-4" />} onClick={() => { close(); if (confirm(t('Patiënt archiveren? Actieve programma’s worden gearchiveerd.', 'Archive patient? Active programmes will be archived.'))) act(() => api.post(`/patients/${id}/archive`), t('Patiënt gearchiveerd', 'Patient archived')); }}>{t('Archiveren', 'Archive')}</MenuItem>
                  )}
                </>
              )}
            </Popover>
            {!pt.archived && <ButtonLink to={`/app/programmas/nieuw?patient=${id}`} icon={<Plus className="h-4 w-4" />}>{t('Nieuw programma', 'New programme')}</ButtonLink>}
          </>
        }
      >
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-500">
          <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{pt.email ?? t('geen e-mail', 'no email')}</span>
          <span>{pt.hasAccount ? <Badge tone="ok" dot>{t('App actief', 'App active')}</Badge> : pt.invitedAt ? <Badge tone="warn">{t(`Uitgenodigd ${fmtRelative(pt.invitedAt, locale)}`, `Invited ${fmtRelative(pt.invitedAt, locale)}`)}</Badge> : <Badge tone="outline">{t('Niet uitgenodigd', 'Not invited')}</Badge>}</span>
          <span>{t('Therapeut', 'Therapist')}: {pt.therapists.map((x) => x.fullName).join(', ')}</span>
        </div>
      </PageHeader>

      {inviteUrl && (
        <Notice tone="info" className="mb-5" title={t('Demo: uitnodigingslink voor de patiënt', 'Demo: patient invitation link')}>
          {t('In de echte versie ontvangt de patiënt deze link per e-mail. Open hem bijvoorbeeld op je telefoon om de patiëntapp te proberen.', 'In the real version the patient receives this link by email. Open it, e.g. on your phone, to try the patient app.')}{' '}
          <a href={inviteUrl} className="link break-all">{inviteUrl}</a>
        </Notice>
      )}

      {tab !== 'modules' && <OpenRedFlagsBanner patientId={pt.id} onOpen={() => setParams({ tab: 'modules' })} />}
      <Tabs
        className="mb-6"
        value={tab}
        onChange={(v) => setParams({ tab: v })}
        tabs={[
          { value: 'overzicht', label: t('Overzicht', 'Overview') },
          { value: 'programmas', label: t('Programma’s', 'Programmes'), count: pt.programs.length },
          { value: 'sessies', label: unreviewed ? <>{t('Sessies & feedback', 'Sessions & feedback')} <span className="ml-1 rounded-full bg-warn-soft px-2 py-0.5 text-[12px] font-semibold text-warn">{t(`${unreviewed} te beoordelen`, `${unreviewed} to review`)}</span></> : t('Sessies & feedback', 'Sessions & feedback') },
          { value: 'modules', label: t('Veiligheid & modules', 'Safety & modules') },
          { value: 'gegevens', label: t('Gegevens', 'Details') },
        ]}
      />

      {tab === 'modules' && <PatientModulesTab patientId={pt.id} />}
      {tab === 'overzicht' && <Overview progress={prog.data} programs={pt.programs} />}
      {tab === 'programmas' && <Programs pt={pt} />}
      {tab === 'sessies' && <Sessions progress={prog.data} onReviewed={() => qc.invalidateQueries({ queryKey: ['patient', id, 'progress'] })} />}
      {tab === 'gegevens' && <Details pt={pt} onEdit={() => setEditing(true)} />}

      <PatientFormDialog open={editing} onClose={() => setEditing(false)} patient={pt} />
    </>
  );
}

function Overview({ progress, programs }: { progress?: Progress; programs: PatientDetail['programs'] }) {
  const { t, locale } = useI18n();
  if (!progress) return <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;
  const active = programs.filter((p) => p.status === 'active');
  const chronological = [...progress.sessions].filter((s) => s.completedAt).reverse().slice(-20);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('Therapietrouw 7 d', 'Adherence 7 d')} value={pct(progress.adherence7d.rate)} hint={t(`${progress.adherence7d.completed} van ${progress.adherence7d.planned} geplande trainingsdagen`, `${progress.adherence7d.completed} of ${progress.adherence7d.planned} planned training days`)} />
        <Stat label={t('Therapietrouw 28 d', 'Adherence 28 d')} value={pct(progress.adherence28d.rate)} hint={t(`${progress.adherence28d.completed} van ${progress.adherence28d.planned} geplande trainingsdagen`, `${progress.adherence28d.completed} of ${progress.adherence28d.planned} planned training days`)} />
        <Stat label={t('Afgeronde sessies', 'Completed sessions')} value={progress.completedSessions} hint={t('totaal', 'total')} />
        <Stat label={t('Actieve programma’s', 'Active programmes')} value={active.length} hint={active[0]?.title} />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title={t('Therapietrouw per week', 'Weekly adherence')} description={t('Gedane ten opzichte van geplande trainingsdagen per week (start op maandag). Zelfde berekening als op het dashboard en in de patiëntapp.', 'Completed versus planned training days per week (starting Monday). Same calculation as the dashboard and the patient app.')} />
          <div className="p-5">
            <Bars
              format={pct}
              axisMax="100%"
              showValues
              data={progress.weekly.map((w) => ({ label: fmtDate(w.weekStart, locale, { day: 'numeric', month: 'short' }), value: w.planned ? w.rate : null, sub: w.planned ? `${w.completed}/${w.planned}` : '' }))}
            />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <SessionScores sessions={chronological} />
        </Card>
      </div>
      <Card>
        <CardHeader title={t('Oefenscores per oefening (laatste 8 weken)', 'Exercise scores per exercise (last 8 weeks)')} description={t('Ingevuld na elke oefening, 0–10. Los van de sessiescore na de hele training.', 'Filled in after each exercise, 0–10. Separate from the session score after the whole workout.')} />
        {progress.perExercise.length === 0 ? (
          <EmptyState title={t('Nog geen geregistreerde oefeningen', 'No logged exercises yet')} />
        ) : (
          <TableScroll label={t('Oefenscores per oefening', 'Exercise scores per exercise')}>
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-line text-left text-[12px] text-ink-500">
                <tr><th className="px-5 py-2 font-medium">{t('Oefening', 'Exercise')}</th><th className="px-3 py-2 font-medium">{t('Uitgevoerd', 'Completed')}</th><th className="px-3 py-2 font-medium">{t('Gem. zwaarte', 'Avg. difficulty')}</th><th className="px-3 py-2 font-medium">{t('Gem. pijn', 'Avg. pain')}</th><th className="px-3 py-2 font-medium">{t('Max. pijn', 'Max. pain')}</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {progress.perExercise.map((e) => (
                  <tr key={e.exerciseId}>
                    <td className="px-5 py-2.5 font-medium">{locale === 'nl' ? e.nameNl : e.nameEn}</td>
                    <td className="px-3 py-2.5 tabular-nums">{e.completed}/{e.logged}</td>
                    <td className="px-3 py-2.5 tabular-nums">{e.avgDifficulty ?? '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums">{e.avgPain ?? '—'}</td>
                    <td className="px-3 py-2.5">{e.maxPain === null ? '—' : <Badge tone={e.maxPain >= 6 ? 'bad' : 'neutral'}>{e.maxPain}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Card>
    </div>
  );
}

function Programs({ pt }: { pt: PatientDetail }) {
  const { t, locale } = useI18n();
  if (!pt.programs.length)
    return (
      <Card>
        <EmptyState icon={<Layers className="h-5 w-5" />} title={t('Nog geen programma’s', 'No programmes yet')} description={t('Start vanaf nul of vanuit een sjabloon.', 'Start from scratch or from a template.')} action={!pt.archived && <ButtonLink to={`/app/programmas/nieuw?patient=${pt.id}`} icon={<Plus className="h-4 w-4" />}>{t('Programma maken', 'Create programme')}</ButtonLink>} />
      </Card>
    );
  return (
    <Card>
      <ul className="divide-y divide-line">
        {pt.programs.map((p) => (
          <li key={p.id}>
            <Link to={`/app/programmas/${p.id}`} className="flex flex-col gap-1 px-5 py-4 hover:bg-ink-50/60 sm:flex-row sm:items-center sm:gap-4">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{p.title}</span>
                <span className="text-[12.5px] text-ink-500">
                  {p.itemCount} {t('oefeningen', 'exercises')} · {fmtDate(p.startDate, locale)} – {fmtDate(p.endDate, locale)} · v{p.version}
                </span>
              </span>
              <ProgramStatusBadge status={p.status} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Sessions({ progress, onReviewed }: { progress?: Progress; onReviewed: () => void }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);
  if (!progress) return <Spinner />;
  const done = progress.sessions.filter((s) => s.completedAt);
  if (!done.length) return <Card><EmptyState icon={<MessageSquareText className="h-5 w-5" />} title={t('Nog geen sessies', 'No sessions yet')} description={t('Zodra de patiënt oefeningen registreert, verschijnen ze hier.', 'Once the patient logs exercises, they appear here.')} /></Card>;
  return (
    <Card>
      <ul className="divide-y divide-line">
        {done.map((s) => {
          const needsReview = !s.reviewedAt && (s.feedback || s.logs.some((l) => l.feedback) || (s.pain ?? 0) >= 6);
          const completed = s.logs.filter((l) => l.completed).length;
          return (
            <li key={s.id}>
              <button type="button" className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left hover:bg-ink-50/60" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{fmtDateTime(s.completedAt, locale)}</span>
                  <span className="text-[12.5px] text-ink-500">{s.programTitle} · {completed}/{s.logs.length} {t('oefeningen', 'exercises')}</span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {s.difficulty !== null && <Badge tone="neutral">{t('Sessie-zwaarte', 'Session difficulty')} {s.difficulty}/10</Badge>}
                  {s.pain !== null && <Badge tone={s.pain >= 6 ? 'bad' : 'neutral'}>{t('Sessiepijn', 'Session pain')} {s.pain}/10</Badge>}
                  {(s.feedback || s.logs.some((l) => l.feedback)) && <Badge tone="info"><MessageSquareText className="h-3 w-3" />{t('Feedback', 'Feedback')}</Badge>}
                  {needsReview ? <Badge tone="warn">{t('Te beoordelen', 'To review')}</Badge> : s.reviewedAt ? <Badge tone="ok"><Check className="h-3 w-3" />{t('Gezien', 'Seen')}</Badge> : null}
                </span>
                <ChevronDown className={cn('h-4 w-4 text-ink-400 transition-transform', open === s.id && 'rotate-180')} />
              </button>
              {open === s.id && (
                <div className="animate-fade-in border-t border-line bg-ink-50/40 px-5 py-4">
                  {s.feedback && (
                    <blockquote className="mb-4 rounded-lg border-l-2 border-info bg-white px-4 py-3 text-sm text-ink-800 shadow-xs">“{s.feedback}”</blockquote>
                  )}
                  <table className="w-full text-[13px]">
                    <caption className="pb-2 text-left text-[12.5px] text-ink-600">{t('Oefenscores: ingevuld na elke oefening (0–10).', 'Exercise scores: filled in after each exercise (0–10).')}</caption>
                    <thead className="text-left text-[12px] text-ink-600"><tr><th className="py-1 font-medium">{t('Oefening', 'Exercise')}</th><th className="py-1 font-medium">{t('Uitgevoerd', 'Done')}</th><th className="py-1 font-medium">{t('Gedaan', 'Done')}</th><th className="py-1 font-medium">{t('Zwaarte', 'Difficulty')}</th><th className="py-1 font-medium">{t('Pijn', 'Pain')}</th></tr></thead>
                    <tbody>
                      {s.logs.map((l, i) => (
                        <tr key={i} className="border-t border-line/70 align-top">
                          <td className="py-2 pr-2">
                            <div className="font-medium">{locale === 'nl' ? l.nameNl : l.nameEn}</div>
                            {l.feedback && <div className="mt-0.5 text-[12.5px] italic text-info">“{l.feedback}”</div>}
                          </td>
                          <td className="py-2">{l.completed ? <Check className="h-4 w-4 text-ok" aria-label={t('ja', 'yes')} /> : <span className="text-ink-400">{t('overgeslagen', 'skipped')}</span>}</td>
                          <td className="py-2 tabular-nums">
                            {l.plannedHoldS
                              ? t(`${l.setsDone ?? '—'} sets × ${l.plannedHoldS} s vasthouden`, `${l.setsDone ?? '—'} sets × ${l.plannedHoldS} s hold`)
                              : t(`${l.setsDone ?? '—'} sets × ${l.repsDone ?? '—'} herh.`, `${l.setsDone ?? '—'} sets × ${l.repsDone ?? '—'} reps`)}
                          </td>
                          <td className="py-2 tabular-nums">{l.difficulty ?? '—'}</td>
                          <td className="py-2">{l.pain === null ? '—' : <span className={l.pain >= 6 ? 'font-semibold text-bad' : ''}>{l.pain}</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!s.reviewedAt && (
                    <div className="mt-4 flex justify-end">
                      <Button size="sm" variant="secondary" icon={<Check className="h-3.5 w-3.5" />} onClick={async () => { await api.post(`/patients/sessions/${s.id}/review`); toast(t('Gemarkeerd als gezien', 'Marked as seen')); onReviewed(); }}>
                        {t('Markeer als gezien', 'Mark as seen')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Details({ pt, onEdit }: { pt: PatientDetail; onEdit: () => void }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const [assigning, setAssigning] = useState(false);
  const members = useQuery({ queryKey: ['members'], queryFn: () => api.get<{ items: Member[] }>('/practice/members'), enabled: assigning });
  const [selected, setSelected] = useState<string[]>(pt.therapists.map((x) => x.id));
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title={t('Gegevens', 'Details')} action={<Button size="sm" variant="secondary" icon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>{t('Bewerken', 'Edit')}</Button>} />
        <dl className="divide-y divide-line text-sm">
          {[
            [t('Naam', 'Name'), `${pt.firstName} ${pt.lastName}`],
            [t('E-mailadres', 'Email'), pt.email ?? '—'],
            [t('Taal', 'Language'), pt.locale === 'nl' ? 'Nederlands' : 'English'],
            [t('Referentie (EPD)', 'Reference (EHR)'), pt.externalRef ?? '—'],
            [t('Toegevoegd', 'Added'), fmtDate((pt as unknown as { createdAt: string }).createdAt, locale)],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-4 px-5 py-3"><dt className="text-ink-500">{k}</dt><dd className="col-span-2 text-ink-900">{v}</dd></div>
          ))}
        </dl>
      </Card>
      <Card>
        <CardHeader title={t('Behandelaars', 'Therapists')} description={t('Alleen toegewezen therapeuten en praktijkbeheerders hebben toegang.', 'Only assigned therapists and practice admins have access.')} action={<Button size="sm" variant="secondary" onClick={() => setAssigning(true)}>{t('Wijzigen', 'Change')}</Button>} />
        <ul className="divide-y divide-line">
          {pt.therapists.map((x) => (
            <li key={x.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <Avatar name={x.fullName} size={28} />
              <span className="flex-1">{x.fullName}</span>
              {x.isPrimary && <Badge tone="accent">{t('Hoofdbehandelaar', 'Primary')}</Badge>}
            </li>
          ))}
        </ul>
      </Card>
      <Dialog
        open={assigning}
        onClose={() => setAssigning(false)}
        title={t('Behandelaars toewijzen', 'Assign therapists')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAssigning(false)}>{t('Annuleren', 'Cancel')}</Button>
            <Button
              disabled={!selected.length}
              onClick={async () => {
                try {
                  await api.put(`/patients/${pt.id}/therapists`, { therapistIds: selected });
                  toast(t('Toewijzing opgeslagen', 'Assignment saved'));
                  setAssigning(false);
                  qc.invalidateQueries({ queryKey: ['patient', pt.id] });
                } catch (e) {
                  setError(errorMessage(e instanceof ApiError ? e.code : undefined, locale));
                }
              }}
            >
              {t('Opslaan', 'Save')}
            </Button>
          </>
        }
      >
        {error && <Notice tone="bad" className="mb-3">{error}</Notice>}
        {!members.data ? <Spinner /> : (
          <ul className="space-y-1">
            {members.data.items.filter((m) => m.active).map((m) => (
              <li key={m.userId}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-ink-50">
                  <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={selected.includes(m.userId)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, m.userId] : s.filter((x) => x !== m.userId)))} />
                  <Avatar name={m.fullName} size={28} />
                  <span className="flex-1 text-sm">{m.fullName}<span className="block text-[12px] text-ink-500">{m.title ?? m.role}</span></span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}

/** Session scores (after the whole workout) over time, with dates, scale and the values as a list. */
function SessionScores({ sessions }: { sessions: Progress['sessions'] }) {
  const { t, locale } = useI18n();
  const first = sessions[0]?.completedAt;
  const last = sessions.at(-1)?.completedAt;
  const range = first && last ? `${fmtDate(first, locale, { day: 'numeric', month: 'short' })} – ${fmtDate(last, locale, { day: 'numeric', month: 'short' })}` : '';
  return (
    <>
      <CardHeader title={t('Sessiescores', 'Session scores')} description={t(`Na de hele training gemeld, schaal 0–10${range ? `, ${range}` : ''}. Indicatief, geen klinische meting.`, `Reported after the whole workout, scale 0–10${range ? `, ${range}` : ''}. Indicative, not a clinical measure.`)} />
      <div className="space-y-4 p-5">
        {[
          [t('Pijn / ongemak', 'Pain / discomfort'), sessions.map((s) => s.pain), 'bad'] as const,
          [t('Ervaren zwaarte', 'Perceived difficulty'), sessions.map((s) => s.difficulty), 'accent'] as const,
        ].map(([label, values, tone]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-[12.5px]"><span className="font-medium text-ink-800">{label}</span><span className="text-ink-600">{t('laatste', 'latest')}: {values.at(-1) ?? '—'}/10</span></div>
            <div className="flex gap-2">
              <div className="flex h-14 flex-col justify-between text-2xs text-ink-600" aria-hidden><span>10</span><span>0</span></div>
              <Sparkline values={values} tone={tone} />
            </div>
          </div>
        ))}
        {sessions.length > 0 && (
          <details className="text-[12.5px]">
            <summary className="min-h-[44px] cursor-pointer py-2 font-medium text-accent">{t('Toon per sessie', 'Show per session')}</summary>
            <table className="w-full">
              <thead className="text-left text-ink-600"><tr><th className="py-1 font-medium">{t('Datum', 'Date')}</th><th className="py-1 font-medium">{t('Pijn', 'Pain')}</th><th className="py-1 font-medium">{t('Zwaarte', 'Difficulty')}</th></tr></thead>
              <tbody>
                {[...sessions].reverse().map((s) => (
                  <tr key={s.id} className="border-t border-line"><td className="py-1">{fmtDateTime(s.completedAt, locale)}</td><td className="py-1 tabular-nums">{s.pain ?? '—'}</td><td className="py-1 tabular-nums">{s.difficulty ?? '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </div>
    </>
  );
}
