import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Dumbbell, HeartPulse, Lock, Move, Play, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n, describeError } from '@/lib/i18n';
import { fmtDate } from '@/lib/format';
import { Badge, Button, Card, CardHeader, Dialog, Notice, Textarea, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { SELF_CHECK, type AccountKind } from '@shared/accountKind';

export type Mode = 'revalidatie' | 'kracht' | 'mobiliteit';
export type Modes = {
  active: Mode;
  kind: AccountKind;
  modules: Mode[];
  strengthCleared: boolean;
  selfCheck: { at: string | null; outcome: 'clear' | 'doctor_ok' | null } | null;
  consents: { kracht: string | null; mobiliteit: string | null };
  templates: { id: string; title: string; patientInstructions: string; module: 'kracht' | 'mobiliteit'; phase: { seriesTitle: string; name: string; weeks: string | null } | null; redFlags: string[]; itemCount: number }[];
};

export const useModes = () => useQuery({ queryKey: ['patient-modes'], queryFn: () => api.get<Modes>('/patient/modes') });

/** W01: switch between rehabilitation, strength and mobility; the choice is remembered. */
export function ModeSwitch({ value, onChange, modules }: { value: Mode; onChange: (m: Mode) => void; modules?: Mode[] }) {
  const { t } = useI18n();
  const opts = ([
    { v: 'revalidatie', label: t('Revalidatie', 'Rehab'), icon: HeartPulse },
    { v: 'kracht', label: t('Kracht', 'Strength'), icon: Dumbbell },
    { v: 'mobiliteit', label: t('Mobiliteit', 'Mobility'), icon: Move },
  ] as { v: Mode; label: string; icon: typeof HeartPulse }[]).filter((o) => !modules || modules.includes(o.v));
  return (
    <div role="radiogroup" aria-label={t('Modus', 'Mode')} className={cn('grid gap-1 rounded-2xl bg-ink-100 p-1', opts.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn('flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl text-[14.5px] font-medium', value === o.v ? 'bg-white text-ink-950 shadow-xs' : 'text-ink-600')}
        >
          <o.icon className="h-4 w-4" aria-hidden />
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** W02: consent per module, dated. Withdrawing hides the data from the practice; nothing is deleted. */
export function ConsentToggle({ module, since }: { module: 'kracht' | 'mobiliteit'; since: string | null }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const label = module === 'kracht' ? t('krachttraining', 'strength training') : t('mobiliteit', 'mobility');
  const toggle = async () => {
    setBusy(true);
    try {
      if (since) await api.del(`/patient/consents/${module}`);
      else await api.post(`/patient/consents/${module}`);
      toast(since ? t('Je deelt dit niet meer met je praktijk', 'You no longer share this with your practice') : t('Je deelt dit nu met je praktijk', 'You now share this with your practice'));
      qc.invalidateQueries({ queryKey: ['patient-modes'] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        {since ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden /> : <Lock className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{since ? t(`Je deelt ${label} met je fysiotherapeut`, `You share ${label} with your physiotherapist`) : t(`Je ${label} is alleen voor jou`, `Your ${label} is just for you`)}</p>
          <p className="mt-0.5 text-[14px] text-ink-600">
            {since
              ? t(`Sinds ${fmtDate(since, locale)}. Je kunt dit altijd stoppen; je gegevens blijven dan bewaard maar je praktijk ziet ze niet meer.`, `Since ${fmtDate(since, locale)}. You can stop at any time; your data is kept but your practice no longer sees it.`)
              : t('Je praktijk ziet deze programma’s en resultaten pas als je toestemming geeft.', 'Your practice only sees these programmes and results once you give permission.')}
          </p>
        </div>
      </div>
      <Button size="lg" variant={since ? 'secondary' : 'primary'} className="mt-3 w-full" loading={busy} onClick={toggle}>
        {since ? t('Stoppen met delen', 'Stop sharing') : t('Delen met mijn fysiotherapeut', 'Share with my physiotherapist')}
      </Button>
    </div>
  );
}

/** Programmes the patient may start themselves in kracht/mobiliteit (strength only after clearance). */
export function StartTemplates({ modes, module }: { modes: Modes; module: 'kracht' | 'mobiliteit' }) {
  const { t, locale } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState<Modes['templates'][number] | null>(null);
  const [busy, setBusy] = useState(false);
  const list = modes.templates.filter((x) => x.module === module);
  const blocked = module === 'kracht' && !modes.strengthCleared;
  if (!list.length) return <p className="text-[15px] text-ink-600">{t('Je praktijk heeft hier nog geen programma’s klaargezet.', 'Your practice has not set up programmes here yet.')}</p>;
  return (
    <div className="space-y-2">
      {blocked && modes.kind === 'personal' && <SelfCheck />}
      {blocked && modes.kind !== 'personal' && (
        <Notice tone="info">{t('Krachttraining start pas als je fysiotherapeut heeft bevestigd dat je eraan toe bent. Bespreek het bij je volgende afspraak.', 'Strength training starts once your physiotherapist has confirmed you are ready. Discuss it at your next appointment.')}</Notice>
      )}
      {list.map((x) => (
        <div key={x.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{x.title}</span>
            <span className="text-[14px] text-ink-600">{x.itemCount} {t('oefeningen', 'exercises')}{x.phase?.weeks ? ` · ${t('week', 'week')} ${x.phase.weeks}` : ''}</span>
          </span>
          <Button size="lg" disabled={blocked} onClick={() => setConfirm(x)} icon={<Play className="h-4 w-4" />}>{t('Starten', 'Start')}</Button>
        </div>
      ))}
      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ''}
        description={t('Je start dit programma zelf. Je kunt het altijd weer stoppen.', 'You start this programme yourself. You can stop it at any time.')}
        size="sm"
        footer={
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={() => setConfirm(null)}>{t('Annuleren', 'Cancel')}</Button>
            <Button
              size="lg"
              loading={busy}
              onClick={async () => {
                if (!confirm) return;
                setBusy(true);
                try {
                  const r = await api.post<{ id: string }>('/patient/programs/start', { templateId: confirm.id });
                  qc.invalidateQueries({ queryKey: ['patient-home'] });
                  setConfirm(null);
                  nav(`/p/programma/${r.id}`);
                } catch (e) {
                  toast(describeError(e, locale), 'bad');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('Programma starten', 'Start programme')}
            </Button>
          </div>
        }
      >
        {confirm?.patientInstructions && <p className="text-[15px] leading-relaxed text-ink-700">{confirm.patientInstructions}</p>}
        {confirm && confirm.redFlags.length > 0 && (
          <div className="mt-3">
            <p className="text-[14px] font-semibold">{t('Stop direct en meld het bij:', 'Stop immediately and report it if:')}</p>
            <ul className="mt-1 list-disc pl-5 text-[14px] text-ink-700">{confirm.redFlags.map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        )}
      </Dialog>
    </div>
  );
}

/**
 * Self-check before strength training for someone without a physiotherapist (PAR-Q style). General
 * questions, no diagnosis: any "yes" means ask a doctor first. Only the outcome is stored.
 */
export function SelfCheck() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [doctorOk, setDoctorOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seeDoctor, setSeeDoctor] = useState(false);
  const all = SELF_CHECK.every((q) => answers[q.key] !== undefined);
  const anyYes = SELF_CHECK.some((q) => answers[q.key]);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ outcome: string }>('/patient/self-check', { anyYes, doctorOk });
      if (r.outcome === 'see_doctor') setSeeDoctor(true);
      else {
        toast(t('Klaar: je kunt krachttraining starten', 'Done: you can start strength training'), 'ok');
        await qc.invalidateQueries({ queryKey: ['patient-modes'] });
      }
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="selfcheck-title">
      <h3 id="selfcheck-title" className="t-card">{t('Eerst een korte check', 'A short check first')}</h3>
      <p className="mt-0.5 text-[14px] text-ink-600">{t('Zwaarder trainen is voor bijna iedereen veilig. Deze vragen helpen je bepalen of je eerst een arts moet spreken. Je antwoorden worden niet opgeslagen.', 'Training harder is safe for almost everyone. These questions help you decide whether to see a doctor first. Your answers are not stored.')}</p>
      <ol className="mt-3 space-y-3">
        {SELF_CHECK.map((q, i) => (
          <li key={q.key}>
            <fieldset>
              <legend className="text-[14.5px] text-ink-900">{i + 1}. {nl ? q.nl : q.en}</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {[false, true].map((v) => (
                  <label key={String(v)} className={cn('flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg border text-[14.5px] font-medium', answers[q.key] === v ? 'border-accent bg-accent-soft text-accent' : 'border-line')}>
                    <input type="radio" name={`sc-${q.key}`} className="sr-only" checked={answers[q.key] === v} onChange={() => setAnswers((a) => ({ ...a, [q.key]: v }))} />
                    {v ? t('Ja', 'Yes') : t('Nee', 'No')}
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      {all && anyYes && (
        <div className="mt-3 space-y-2">
          <Notice tone="warn">{t('Je hebt “ja” geantwoord. Bespreek met je huisarts of zwaarder trainen voor jou verstandig is, voordat je start met krachttraining. Mobiliteit kun je wel gewoon doen.', 'You answered “yes”. Ask your GP whether training harder is wise for you before you start strength training. You can still do mobility.')}</Notice>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-[14.5px]">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--accent))]" checked={doctorOk} onChange={(e) => setDoctorOk(e.target.checked)} />
            {t('Mijn huisarts of specialist heeft gezegd dat ik mag krachttrainen.', 'My GP or specialist has said I may do strength training.')}
          </label>
        </div>
      )}
      {seeDoctor && !doctorOk && <p className="mt-2 text-[14px] font-medium text-ink-800" role="status">{t('Prima. Spreek eerst je huisarts; daarna kun je hier verder.', 'Fine. See your GP first; then continue here.')}</p>}
      <Button className="mt-3 w-full" size="lg" disabled={!all} loading={busy} onClick={submit}>{t('Check afronden', 'Finish check')}</Button>
    </section>
  );
}

/** W15: download everything, or ask the practice to delete it. */
export function MyDataCard() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const req = useQuery({ queryKey: ['deletion-request'], queryFn: () => api.get<{ request: { created_at: string; handled_at: string | null; outcome: string | null } | null }>('/patient/deletion-request') });
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const r = req.data?.request;
  const pending = r && !r.handled_at;
  return (
    <Card>
      <CardHeader title={t('Mijn gegevens', 'My data')} description={t('Je praktijk is verantwoordelijk voor je gegevens (AVG).', 'Your practice is responsible for your data (GDPR).')} />
      <div className="space-y-3 px-5 pb-5">
        <a href="/api/patient/export" download className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-line bg-white text-[15px] font-medium text-ink-900 hover:bg-ink-50">
          <Download className="h-5 w-5" aria-hidden />{t('Download al mijn gegevens', 'Download all my data')}
        </a>
        {pending ? (
          <Notice tone="info">{t(`Je hebt op ${fmtDate(r.created_at, locale)} gevraagd je gegevens te verwijderen. Je praktijk handelt dit af.`, `On ${fmtDate(r.created_at, locale)} you asked for your data to be deleted. Your practice is handling it.`)}</Notice>
        ) : (
          <>
            {r?.outcome === 'declined' && <Notice tone="info">{t(`Je eerdere verzoek is op ${fmtDate(r.handled_at, locale)} afgewezen. Vraag je praktijk naar de reden.`, `Your earlier request was declined on ${fmtDate(r.handled_at, locale)}. Ask your practice for the reason.`)}</Notice>}
            <Button variant="ghost" size="lg" className="w-full text-bad" icon={<Trash2 className="h-4 w-4" />} onClick={() => setOpen(true)}>{t('Vraag verwijdering aan', 'Request deletion')}</Button>
          </>
        )}
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('Verwijdering aanvragen', 'Request deletion')}
        description={t('Je praktijk beoordeelt het verzoek. Soms moet een dossier wettelijk bewaard blijven; dan hoor je de reden.', 'Your practice reviews the request. Sometimes a record must legally be kept; you will then be told why.')}
        size="sm"
        footer={
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" data-autofocus onClick={() => setOpen(false)}>{t('Annuleren', 'Cancel')}</Button>
            <Button
              variant="danger"
              size="lg"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.post('/patient/deletion-request', { reason: reason.trim() || undefined });
                  toast(t('Verzoek verstuurd', 'Request sent'));
                  setOpen(false);
                  qc.invalidateQueries({ queryKey: ['deletion-request'] });
                } catch (e) {
                  toast(describeError(e, locale), 'bad');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('Versturen', 'Send')}
            </Button>
          </div>
        }
      >
        <Textarea label={t('Reden (optioneel)', 'Reason (optional)')} rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className="text-[16px]" />
      </Dialog>
    </Card>
  );
}

export function ModeBadge({ module }: { module?: string | null }) {
  const { t } = useI18n();
  if (!module || module === 'revalidatie') return null;
  return <Badge tone="outline">{module === 'kracht' ? t('Kracht', 'Strength') : t('Mobiliteit', 'Mobility')}</Badge>;
}
