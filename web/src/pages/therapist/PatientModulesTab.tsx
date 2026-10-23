import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Lock, OctagonAlert, ShieldCheck, Trash2, TrendingUp } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { Badge, Button, Card, CardHeader, Dialog, EmptyState, Input, Notice, Sparkline, Spinner, Textarea, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';

export type Modules = {
  consents: { kracht: string | null; mobiliteit: string | null };
  consentHistory: { module: string; grantedAt: string; revokedAt: string | null }[];
  strength: { items: string[]; checks: { no: number; checkedAt: string; checkedBy: string | null }[]; cleared: { at: string; by: string | null } | null };
  redFlags: { id: string; programTitle: string | null; flags: string[]; note: string | null; createdAt: string; handledAt: string | null; handledBy: string | null; handledNote: string | null }[];
  deletionRequest: { id: string; reason: string | null; createdAt: string; handledAt: string | null; outcome: string | null } | null;
};
type Strength = {
  shared: boolean;
  screeningStops?: number;
  exercises: {
    exerciseId: string; nameNl: string; nameEn: string; main: boolean; best: { date: string; value: number } | null; latestIsPr: boolean;
    history: { date: string; best: number | null; topKg: number | null; topReps: number | null }[];
    advice: { kind: 'increase'; fromKg: number; toKgMin: number; toKgMax: number } | { kind: 'keep' | 'plateau' | 'none' };
  }[];
};

export const useModules = (patientId: string) => useQuery({ queryKey: ['patient', patientId, 'modules'], queryFn: () => api.get<Modules>(`/patients/${patientId}/modules`) });

/** Open alarm signals, shown above every tab of the patient record. */
export function OpenRedFlagsBanner({ patientId, onOpen }: { patientId: string; onOpen: () => void }) {
  const { t, locale } = useI18n();
  const q = useModules(patientId);
  const open = q.data?.redFlags.filter((r) => !r.handledAt) ?? [];
  if (!open.length) return null;
  return (
    <Notice tone="bad" className="mb-5" icon={<OctagonAlert className="h-4 w-4" />} title={t('Alarmsignaal gemeld — oefeningen staan stil', 'Warning sign reported — exercises are paused')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{t(`Gemeld op ${fmtDateTime(open[0].createdAt, locale)}. Neem contact op met de patiënt en handel de melding af.`, `Reported on ${fmtDateTime(open[0].createdAt, locale)}. Contact the patient and handle the report.`)}</span>
        <Button size="sm" variant="danger" onClick={onOpen}>{t('Melding afhandelen', 'Handle report')}</Button>
      </div>
    </Notice>
  );
}

export function PatientModulesTab({ patientId }: { patientId: string }) {
  const q = useModules(patientId);
  if (q.isLoading || !q.data) return <Spinner />;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
      <RedFlagsCard patientId={patientId} m={q.data} />
      <ConsentCard m={q.data} />
      <TransitionCard patientId={patientId} m={q.data} />
      <StrengthCard patientId={patientId} shared={!!q.data.consents.kracht} />
      <DeletionCard patientId={patientId} m={q.data} />
    </div>
  );
}

function useRefresh(patientId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['patient', patientId, 'modules'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

function RedFlagsCard({ patientId, m }: { patientId: string; m: Modules }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const refresh = useRefresh(patientId);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <Card className="lg:col-span-2">
      <CardHeader title={t('Alarmsignalen', 'Warning signs')} description={t('Meldingen van de patiënt. Zolang een melding openstaat, kan de patiënt niet oefenen.', 'Reports from the patient. While a report is open, the patient cannot exercise.')} />
      {m.redFlags.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title={t('Geen meldingen', 'No reports')} />
      ) : (
        <ul className="divide-y divide-line">
          {m.redFlags.map((r) => (
            <li key={r.id} className={cn('px-5 py-4', !r.handledAt && 'bg-bad-soft/40')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">{fmtDateTime(r.createdAt, locale)}{r.programTitle ? ` · ${r.programTitle}` : ''}</span>
                {r.handledAt ? <Badge tone="ok"><CheckCircle2 className="h-3 w-3" />{t('Afgehandeld', 'Handled')}</Badge> : <Badge tone="bad">{t('Open — programma staat stil', 'Open — programme paused')}</Badge>}
              </div>
              {r.flags.length > 0 && <ul className="mt-2 list-disc pl-5 text-[14px] text-ink-800">{r.flags.map((f) => <li key={f}>{f}</li>)}</ul>}
              {r.note && <p className="mt-2 text-[14px] italic text-ink-700">“{r.note}”</p>}
              {r.handledAt ? (
                <p className="mt-2 text-[13px] text-ink-600">{t(`Afgehandeld door ${r.handledBy ?? '—'} op ${fmtDateTime(r.handledAt, locale)}`, `Handled by ${r.handledBy ?? '—'} on ${fmtDateTime(r.handledAt, locale)}`)}{r.handledNote ? `: ${r.handledNote}` : ''}</p>
              ) : (
                <div className="mt-3 space-y-2">
                  <Textarea label={t('Wat is er afgesproken?', 'What was agreed?')} rows={2} maxLength={1000} value={notes[r.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} placeholder={t('bijv. gebeld, knie beoordeeld, oefenen mag weer met lagere dosering', 'e.g. called, knee assessed, may exercise again at a lower dose')} />
                  <Button
                    size="sm"
                    disabled={!(notes[r.id] ?? '').trim()}
                    loading={busy === r.id}
                    onClick={async () => {
                      setBusy(r.id);
                      try {
                        await api.post(`/red-flags/${r.id}/handle`, { note: notes[r.id].trim() });
                        toast(t('Melding afgehandeld; de patiënt kan weer oefenen', 'Report handled; the patient can exercise again'));
                        refresh();
                      } catch (e) {
                        toast(errorMessage(e instanceof ApiError ? e.code : undefined, locale), 'bad');
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    {t('Afgehandeld — patiënt mag weer oefenen', 'Handled — patient may exercise again')}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ConsentCard({ m }: { m: Modules }) {
  const { t, locale } = useI18n();
  const row = (module: 'kracht' | 'mobiliteit', label: string) => (
    <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
      <span className="font-medium">{label}</span>
      {m.consents[module] ? <Badge tone="ok">{t(`Gedeeld sinds ${fmtDate(m.consents[module], locale)}`, `Shared since ${fmtDate(m.consents[module], locale)}`)}</Badge> : <Badge tone="outline"><Lock className="h-3 w-3" />{t('Niet gedeeld', 'Not shared')}</Badge>}
    </div>
  );
  return (
    <Card>
      <CardHeader title={t('Toestemming per module', 'Consent per module')} description={t('Alleen de patiënt geeft of trekt toestemming in. Intrekken verbergt de gegevens voor de praktijk; er wordt niets verwijderd.', 'Only the patient gives or withdraws consent. Withdrawing hides the data from the practice; nothing is deleted.')} />
      <div className="divide-y divide-line">
        <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span className="font-medium">{t('Revalidatie', 'Rehabilitation')}</span><Badge tone="neutral">{t('Altijd zichtbaar (behandeling)', 'Always visible (treatment)')}</Badge></div>
        {row('kracht', t('Krachttraining', 'Strength training'))}
        {row('mobiliteit', t('Mobiliteit', 'Mobility'))}
      </div>
      {m.consentHistory.length > 0 && (
        <details className="border-t border-line px-5 py-3 text-[13px]">
          <summary className="min-h-[44px] cursor-pointer py-2 font-medium text-accent">{t('Geschiedenis', 'History')}</summary>
          <ul className="space-y-1 text-ink-700">
            {m.consentHistory.map((h, i) => (
              <li key={i}>{h.module}: {t('gegeven', 'given')} {fmtDateTime(h.grantedAt, locale)}{h.revokedAt ? ` · ${t('ingetrokken', 'withdrawn')} ${fmtDateTime(h.revokedAt, locale)}` : ''}</li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

/** W09: the therapist checks the transition to strength training; never automatic. */
function TransitionCard({ patientId, m }: { patientId: string; m: Modules }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const refresh = useRefresh(patientId);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  // Ticks show immediately; they are reverted if saving fails.
  const [optimistic, setOptimistic] = useState<Record<number, boolean>>({});
  const run = async (key: string, fn: () => Promise<unknown>, msg?: string) => {
    setBusy(key);
    try {
      await fn();
      if (msg) toast(msg);
      await qc.invalidateQueries({ queryKey: ['patient', patientId, 'modules'] });
      refresh();
    } catch (e) {
      toast(errorMessage(e instanceof ApiError ? e.code : undefined, locale), 'bad');
    } finally {
      setOptimistic({});
      setBusy(null);
    }
  };
  const isChecked = (no: number) => optimistic[no] ?? m.strength.checks.some((x) => x.no === no);
  const all = m.strength.items.every((_, no) => isChecked(no));
  return (
    <Card>
      <CardHeader title={t('Overgang naar krachttraining', 'Transition to strength training')} description={t('Pas als alle punten zijn afgevinkt en jij het bevestigt, kan de patiënt zelf een krachtprogramma starten.', 'Only when every item is ticked and you confirm can the patient start a strength programme.')} />
      <ul className="divide-y divide-line">
        {m.strength.items.map((label, no) => {
          const c = m.strength.checks.find((x) => x.no === no);
          return (
            <li key={no} className="px-5 py-2">
              <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
                  checked={isChecked(no)}
                  disabled={!!m.strength.cleared}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setOptimistic((o) => ({ ...o, [no]: on }));
                    run(`c${no}`, () => (on ? api.put(`/patients/${patientId}/transition/${no}`) : api.del(`/patients/${patientId}/transition/${no}`)));
                  }}
                />
                <span className="text-[14px] text-ink-800">
                  {label}
                  {c && <span className="block text-[12px] text-ink-600">{c.checkedBy} · {fmtDate(c.checkedAt, locale)}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-line px-5 py-3">
        {m.strength.cleared ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
            <span className="text-ok">{t(`Vrijgegeven door ${m.strength.cleared.by ?? '—'} op ${fmtDate(m.strength.cleared.at, locale)}`, `Cleared by ${m.strength.cleared.by ?? '—'} on ${fmtDate(m.strength.cleared.at, locale)}`)}</span>
            <Button size="sm" variant="ghost" loading={busy === 'w'} onClick={() => run('w', () => api.del(`/patients/${patientId}/strength-clearance`), t('Vrijgave ingetrokken', 'Clearance withdrawn'))}>{t('Intrekken', 'Withdraw')}</Button>
          </div>
        ) : (
          <Button size="sm" disabled={!all || (busy !== null && busy !== 'ok')} loading={busy === 'ok'} onClick={() => run('ok', () => api.post(`/patients/${patientId}/strength-clearance`), t('Krachttraining vrijgegeven', 'Strength training cleared'))}>
            {t('Bevestigen: klaar voor krachttraining', 'Confirm: ready for strength training')}
          </Button>
        )}
      </div>
    </Card>
  );
}

function StrengthCard({ patientId, shared }: { patientId: string; shared: boolean }) {
  const { t, locale } = useI18n();
  const q = useQuery({ queryKey: ['patient', patientId, 'strength', shared], queryFn: () => api.get<Strength>(`/patients/${patientId}/strength`) });
  return (
    <Card>
      <CardHeader title={t('Krachtprogressie', 'Strength progress')} description={t('Geschatte 1RM (Epley/Brzycki, alleen sets tot 10 herhalingen). Indicatief.', 'Estimated 1RM (Epley/Brzycki, only sets up to 10 reps). Indicative.')} />
      {!q.data ? <Spinner /> : !q.data.shared ? (
        <EmptyState icon={<Lock className="h-5 w-5" />} title={t('Niet gedeeld', 'Not shared')} description={t('De patiënt deelt de krachtmodule niet met de praktijk.', 'The patient does not share the strength module with the practice.')} />
      ) : q.data.exercises.length === 0 ? (
        <EmptyState title={t('Nog geen sets gelogd', 'No sets logged yet')} />
      ) : (
        <ul className="divide-y divide-line">
          {q.data.exercises.map((e) => (
            <li key={e.exerciseId} className="px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">{locale === 'nl' ? e.nameNl : e.nameEn}</span>
                <span className="flex items-center gap-1.5">
                  {e.latestIsPr && <Badge tone="ok"><TrendingUp className="h-3 w-3" />PR</Badge>}
                  {e.best && <Badge tone="neutral">{t('beste', 'best')} {e.best.value} kg</Badge>}
                </span>
              </div>
              <Sparkline values={e.history.map((h) => h.best)} max={Math.max(1, ...e.history.map((h) => h.best ?? 0)) * 1.1} />
              <p className="text-[12.5px] text-ink-600">
                {e.advice.kind === 'increase'
                  ? t(`Advies: gewicht naar ${e.advice.toKgMin}–${e.advice.toKgMax} kg`, `Advice: weight to ${e.advice.toKgMin}–${e.advice.toKgMax} kg`)
                  : e.advice.kind === 'plateau'
                    ? t('Plateau: 3 sessies zonder hogere schatting', 'Plateau: 3 sessions without a higher estimate')
                    : t('Advies: gewicht aanhouden', 'Advice: keep the weight')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** W15: only the owner/admin sees and handles the request (RLS); therapists get a notification. */
function DeletionCard({ patientId, m }: { patientId: string; m: Modules }) {
  const { t, locale } = useI18n();
  const { practice } = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const refresh = useRefresh(patientId);
  const [mode, setMode] = useState<null | 'declined' | 'deleted'>(null);
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const r = m.deletionRequest;
  const admin = practice?.role === 'owner' || practice?.role === 'admin';
  if (!r || !admin) return null;
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/patients/${patientId}/deletion/${r.id}`, mode === 'declined' ? { outcome: 'declined', note } : { outcome: 'deleted', confirm });
      toast(mode === 'deleted' ? t('Patiënt en gegevens verwijderd', 'Patient and data deleted') : t('Verzoek afgewezen', 'Request declined'));
      setMode(null);
      if (mode === 'deleted') nav('/app/patienten');
      else refresh();
    } catch (e) {
      toast(errorMessage(e instanceof ApiError ? e.code : undefined, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="lg:col-span-2">
      <CardHeader title={t('Verzoek tot verwijdering (AVG)', 'Deletion request (GDPR)')} />
      <div className="space-y-2 px-5 pb-5 text-[14px]">
        <p>{t(`Aangevraagd op ${fmtDate(r.createdAt, locale)}`, `Requested on ${fmtDate(r.createdAt, locale)}`)}{r.reason ? ` — “${r.reason}”` : ''}</p>
        {r.handledAt ? (
          <Badge tone="neutral">{r.outcome === 'declined' ? t('Afgewezen', 'Declined') : t('Afgehandeld', 'Handled')} · {fmtDate(r.handledAt, locale)}</Badge>
        ) : (
          <>
            <p className="text-ink-700">{t('Controleer eerst of een wettelijke bewaartermijn (dossierplicht) geldt. Verwijderen is definitief.', 'First check whether a legal retention period applies. Deleting is permanent.')}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setMode('declined')}>{t('Afwijzen met reden', 'Decline with reason')}</Button>
              <Button size="sm" variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setMode('deleted')}>{t('Gegevens verwijderen', 'Delete data')}</Button>
            </div>
          </>
        )}
      </div>
      <Dialog
        open={mode !== null}
        onClose={() => setMode(null)}
        title={mode === 'deleted' ? t('Definitief verwijderen', 'Delete permanently') : t('Verzoek afwijzen', 'Decline request')}
        description={mode === 'deleted' ? t('Het dossier, alle programma’s, trainingen en het account van de patiënt worden verwijderd. Dit kan niet ongedaan worden gemaakt.', 'The record, all programmes, workouts and the patient’s account are deleted. This cannot be undone.') : undefined}
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" data-autofocus onClick={() => setMode(null)}>{t('Annuleren', 'Cancel')}</Button>
            <Button variant={mode === 'deleted' ? 'danger' : 'primary'} loading={busy} disabled={mode === 'deleted' ? confirm !== 'VERWIJDEREN' : !note.trim()} onClick={submit}>
              {mode === 'deleted' ? t('Verwijderen', 'Delete') : t('Afwijzen', 'Decline')}
            </Button>
          </div>
        }
      >
        {mode === 'deleted' ? (
          <Input label={t('Typ VERWIJDEREN om te bevestigen', 'Type VERWIJDEREN to confirm')} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        ) : (
          <Textarea label={t('Reden (de patiënt ziet de uitkomst)', 'Reason (the patient sees the outcome)')} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        )}
      </Dialog>
    </Card>
  );
}
