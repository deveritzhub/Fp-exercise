import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Upload, UserPlus } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { fmtDateTime, fmtDate } from '@/lib/format';
import { useDocumentMeta } from '@/lib/meta';
import { accentVars, DEFAULT_ACCENT } from '@/lib/accent';
import { Avatar, Badge, Button, buttonClass, Card, CardHeader, Dialog, EmptyState, Input, Notice, PageHeader, ProgressBar, Select, Spinner, Tabs, useToast, TableScroll } from '@/components/ui';
import type { Member, Role } from '@/lib/types';
import { FeedbackList } from '@/components/app/Feedback';

type Practice = {
  id: string; name: string; slug: string; city: string | null; defaultLocale: 'nl' | 'en'; branding: { accent?: string };
  settings: { requireMfa?: boolean };
  plan: { code: string; name: string; limits: { therapists?: number; active_patients?: number }; status: string; trialEndsAt: string | null };
  usage: { members: number; activePatients: number };
};

export function PracticePage() {
  const { t } = useI18n();
  useDocumentMeta(t('Praktijk', 'Practice'));
  const { practice } = useSession();
  const isAdmin = practice?.role !== 'therapist';
  const [tab, setTab] = useState<'team' | 'settings' | 'plan' | 'audit' | 'feedback'>('team');
  return (
    <>
      <PageHeader title={practice?.practiceName ?? t('Praktijk', 'Practice')} description={t('Team, instellingen en abonnement van je praktijk.', 'Your practice’s team, settings and subscription.')} />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'team', label: t('Team', 'Team') },
          ...(isAdmin ? [{ value: 'settings' as const, label: t('Instellingen', 'Settings') }, { value: 'plan' as const, label: t('Abonnement', 'Subscription') }, { value: 'audit' as const, label: t('Auditlog', 'Audit log') }, { value: 'feedback' as const, label: t('Feedback', 'Feedback') }] : []),
        ]}
      />
      {tab === 'team' && <Team isAdmin={isAdmin} myRole={practice?.role ?? 'therapist'} />}
      {tab === 'settings' && <div className="space-y-6"><Security /><LibraryImport /><Settings /></div>}
      {tab === 'plan' && <Plan />}
      {tab === 'audit' && <Audit />}
      {tab === 'feedback' && <FeedbackList />}
    </>
  );
}

function usePractice() {
  const { practice } = useSession();
  return useQuery({ queryKey: ['practice', practice?.practiceId], queryFn: () => api.get<Practice>('/practice') });
}

function Team({ isAdmin, myRole }: { isAdmin: boolean; myRole: Role }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['members'], queryFn: () => api.get<{ items: Member[] }>('/practice/members') });
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', role: 'therapist' as Role, title: '' });
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [resetting, setResetting] = useState<Member | null>(null);
  const { user: me } = useSession();
  const roleLabel = (r: Role) => ({ owner: t('Eigenaar', 'Owner'), admin: t('Beheerder', 'Admin'), therapist: t('Therapeut', 'Therapist') })[r];
  return (
    <Card>
      <CardHeader title={t('Teamleden', 'Team members')} action={isAdmin && <Button size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviting(true)}>{t('Uitnodigen', 'Invite')}</Button>} />
      {link && <Notice tone="info" className="m-4" title={t('Ontwikkelomgeving: uitnodigingslink', 'Development: invitation link')}><a className="link break-all" href={link}>{link}</a></Notice>}
      {!q.data ? <Spinner /> : (
        <ul className="divide-y divide-line">
          {q.data.items.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Avatar name={m.fullName} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{m.fullName} {!m.active && <Badge>{t('Inactief', 'Inactive')}</Badge>} {!m.activated && <Badge tone="warn">{t('Uitnodiging open', 'Invite pending')}</Badge>} {m.activated && (m.mfaEnabled ? <Badge tone="ok"><ShieldCheck className="h-3 w-3" />2FA</Badge> : <Badge tone="outline">{t('Geen 2FA', 'No 2FA')}</Badge>)}</span>
                <span className="text-[12.5px] text-ink-500">{m.email} · {m.title ?? roleLabel(m.role)} · {m.patients} {t('patiënten', 'patients')}</span>
              </span>
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <Select aria-label={t('Rol', 'Role')} className="h-8 w-36 py-1 text-[13px]" value={m.role} disabled={m.role === 'owner' && myRole !== 'owner'} onChange={async (e) => {
                    try { await api.patch(`/practice/members/${m.userId}`, { role: e.target.value }); toast(t('Rol bijgewerkt', 'Role updated')); qc.invalidateQueries({ queryKey: ['members'] }); } catch (err) { toast(errorMessage(err instanceof ApiError ? err.code : undefined, locale), 'bad'); }
                  }}>
                    <option value="therapist">{roleLabel('therapist')}</option>
                    <option value="admin">{roleLabel('admin')}</option>
                    {myRole === 'owner' && <option value="owner">{roleLabel('owner')}</option>}
                  </Select>
                  {m.mfaEnabled && m.userId !== me?.id && (
                    <Button size="sm" variant="ghost" onClick={() => setResetting(m)}>{t('2FA resetten', 'Reset 2FA')}</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={async () => {
                    try { await api.patch(`/practice/members/${m.userId}`, { active: !m.active }); qc.invalidateQueries({ queryKey: ['members'] }); } catch (err) { toast(errorMessage(err instanceof ApiError ? err.code : undefined, locale), 'bad'); }
                  }}>{m.active ? t('Deactiveren', 'Deactivate') : t('Activeren', 'Activate')}</Button>
                </div>
              ) : <Badge tone="outline">{roleLabel(m.role)}</Badge>}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!resetting} onClose={() => setResetting(null)} size="sm" title={t('Tweestapsverificatie resetten', 'Reset two-factor authentication')} footer={
        <>
          <Button variant="ghost" onClick={() => setResetting(null)}>{t('Annuleren', 'Cancel')}</Button>
          <Button variant="danger" onClick={async () => {
            try {
              await api.post(`/practice/members/${resetting!.userId}/mfa-reset`);
              toast(t('Gereset — je collega stelt het opnieuw in bij de volgende keer inloggen', 'Reset — your colleague sets it up again at next sign-in'));
              qc.invalidateQueries({ queryKey: ['members'] });
            } catch (err) { toast(errorMessage(err instanceof ApiError ? err.code : undefined, locale), 'bad'); }
            setResetting(null);
          }}>{t('Resetten', 'Reset')}</Button>
        </>
      }>
        <p className="text-[14px] text-ink-700">
          {t(
            `Doe dit alleen als ${resetting?.fullName} de telefoon én de herstelcodes kwijt is, en je zeker weet dat het verzoek echt van die persoon komt (bel even). De reset wordt vastgelegd in het auditlog.`,
            `Only do this if ${resetting?.fullName} lost both the phone and the recovery codes, and you are sure the request is genuine (give them a call). The reset is recorded in the audit log.`,
          )}
        </p>
      </Dialog>
      <Dialog open={inviting} onClose={() => setInviting(false)} title={t('Teamlid uitnodigen', 'Invite team member')} footer={
        <>
          <Button variant="ghost" onClick={() => setInviting(false)}>{t('Annuleren', 'Cancel')}</Button>
          <Button type="submit" form="invite-form">{t('Uitnodiging versturen', 'Send invitation')}</Button>
        </>
      }>
        <form id="invite-form" className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            const r = await api.post<{ inviteUrl?: string }>('/practice/members', { ...form, title: form.title || null, locale });
            setLink(r.inviteUrl ?? null);
            setInviting(false);
            setForm({ fullName: '', email: '', role: 'therapist', title: '' });
            toast(t('Uitnodiging verstuurd', 'Invitation sent'));
            qc.invalidateQueries({ queryKey: ['members'] });
          } catch (err) { setError(errorMessage(err instanceof ApiError ? err.code : undefined, locale)); }
        }}>
          {error && <Notice tone="bad">{error}</Notice>}
          <Input label={t('Naam', 'Name')} required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label={t('E-mailadres', 'Email')} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label={t('Rol', 'Role')} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="therapist">{roleLabel('therapist')}</option>
              <option value="admin">{roleLabel('admin')}</option>
            </Select>
            <Input label={t('Functietitel', 'Job title')} optional={t('optioneel', 'optional')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <p className="text-[12.5px] text-ink-500">{t('Therapeuten zien alleen patiënten die aan hen zijn toegewezen. Beheerders zien alle patiënten van de praktijk.', 'Therapists only see patients assigned to them. Admins see all patients of the practice.')}</p>
        </form>
      </Dialog>
    </Card>
  );
}

function Settings() {
  const { t, locale } = useI18n();
  const q = usePractice();
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({ name: '', city: '', defaultLocale: 'nl' as 'nl' | 'en', accent: DEFAULT_ACCENT });
  useEffect(() => {
    if (q.data) setF({ name: q.data.name, city: q.data.city ?? '', defaultLocale: q.data.defaultLocale, accent: accentVars(q.data.branding.accent) ? q.data.branding.accent! : DEFAULT_ACCENT });
  }, [q.data]);
  if (!q.data) return <Spinner />;
  return (
    <Card className="max-w-2xl">
      <CardHeader title={t('Praktijkgegevens', 'Practice details')} />
      <form className="space-y-4 p-5" onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.patch('/practice', { name: f.name, city: f.city || null, defaultLocale: f.defaultLocale, branding: accentVars(f.accent) ? { accent: f.accent } : {} });
          toast(t('Instellingen opgeslagen', 'Settings saved'));
          qc.invalidateQueries();
        } catch (err) { toast(errorMessage(err instanceof ApiError ? err.code : undefined, locale), 'bad'); }
      }}>
        <Input label={t('Praktijknaam', 'Practice name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('Plaats', 'City')} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
          <Select label={t('Standaardtaal', 'Default language')} value={f.defaultLocale} onChange={(e) => setF({ ...f, defaultLocale: e.target.value as 'nl' | 'en' })}>
            <option value="nl">Nederlands</option><option value="en">English</option>
          </Select>
        </div>
        <div>
          <label className="label mb-1.5 block" htmlFor="accent">{t('Accentkleur (huisstijl)', 'Accent colour (branding)')}</label>
          <div className="flex items-center gap-3">
            <input id="accent" type="color" value={f.accent} onChange={(e) => setF({ ...f, accent: e.target.value })} className="h-9 w-14 cursor-pointer rounded-lg border border-line" />
            <span className="min-w-0 flex-1 text-[13px] text-ink-500">{t('Voor knoppen en accenten in de app en de patiëntapp. Een te lichte kleur wordt automatisch donkerder gemaakt voor voldoende contrast.', 'For buttons and accents in the app and the patient app. A colour that is too light is darkened automatically for sufficient contrast.')}</span>
            {f.accent.toLowerCase() !== DEFAULT_ACCENT && <Button size="sm" variant="ghost" onClick={() => setF({ ...f, accent: DEFAULT_ACCENT })}>{t('Standaardkleur', 'Default colour')}</Button>}
          </div>
        </div>
        <div className="flex justify-end"><Button type="submit">{t('Opslaan', 'Save')}</Button></div>
      </form>
    </Card>
  );
}

function Security() {
  const { t, locale } = useI18n();
  const q = usePractice();
  const { user } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!q.data) return null;
  const on = !!q.data.settings?.requireMfa;
  return (
    <Card className="max-w-2xl">
      <CardHeader
        title={t('Beveiliging', 'Security')}
        action={on ? <Badge tone="ok"><ShieldCheck className="h-3 w-3" />{t('Verplicht', 'Required')}</Badge> : <Badge tone="warn">{t('Niet verplicht', 'Not required')}</Badge>}
      />
      <div className="space-y-4 p-5">
        <p className="text-[14px] leading-relaxed text-ink-700">
          {t(
            'Tweestapsverificatie verplichten: iedereen in je team moet bij het inloggen ook een code uit een app op de telefoon invullen. Sterk aanbevolen zodra je met echte patiëntgegevens werkt. Patiënten merken hier niets van.',
            'Require two-factor authentication: everyone on your team must also enter a code from a phone app when signing in. Strongly recommended once you work with real patient data. Patients are not affected.',
          )}
        </p>
        {!on && !user?.mfaEnabled && (
          <Notice tone="info">{t('Zet het eerst voor jezelf aan via Account → Tweestapsverificatie.', 'First turn it on for yourself under Account → Two-factor authentication.')}</Notice>
        )}
        <div className="flex justify-end">
          <Button variant={on ? 'secondary' : 'primary'} icon={<ShieldCheck className="h-4 w-4" />} loading={busy} disabled={!on && !user?.mfaEnabled} onClick={async () => {
            setBusy(true);
            try {
              const p = q.data!;
              await api.patch('/practice', { name: p.name, city: p.city, defaultLocale: p.defaultLocale, branding: p.branding, requireMfa: !on });
              toast(on ? t('Niet meer verplicht', 'No longer required') : t('Tweestapsverificatie is nu verplicht voor je team', 'Two-factor authentication is now required for your team'));
              qc.invalidateQueries();
            } catch (err) { toast(errorMessage(err instanceof ApiError ? err.code : undefined, locale), 'bad'); }
            finally { setBusy(false); }
          }}>{on ? t('Niet meer verplichten', 'Stop requiring') : t('Verplicht maken voor iedereen', 'Require for everyone')}</Button>
        </div>
      </div>
    </Card>
  );
}

function LibraryImport() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ exercises: number; created: number; updated: number; templates: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card className="max-w-2xl">
      <CardHeader
        title={t('Eigen oefenbibliotheek importeren', 'Import your own exercise library')}
        description={t('JSON-bestand met oefeningen en gefaseerde programma’s (formaat Functional Performance). Alleen zichtbaar voor jouw praktijk.', 'JSON file with exercises and phased programmes (Functional Performance format). Only visible to your practice.')}
      />
      <div className="space-y-4 p-5">
        {error && <Notice tone="bad">{error}</Notice>}
        {result && (
          <Notice tone="ok" title={t('Import gelukt', 'Import complete')}>
            {t(
              `${result.exercises} oefeningen (${result.created} nieuw, ${result.updated} bijgewerkt) en ${result.templates} sjablonen (één per fase). Oefeningen die niet als "gecheckt" gemarkeerd zijn, staan onder "Te controleren".`,
              `${result.exercises} exercises (${result.created} new, ${result.updated} updated) and ${result.templates} templates (one per phase). Exercises not marked as checked are listed under "To review".`,
            )}
          </Notice>
        )}
        <div className="rounded-lg border border-line bg-sage/50 p-4">
          <p className="text-[14px] font-semibold text-ink-900">{t('Functional Performance-bibliotheek', 'Functional Performance library')}</p>
          <p className="mt-0.5 text-[13.5px] text-ink-600">{t('Oefeningen en gefaseerde sjablonen voor revalidatie, krachttraining en mobiliteit. Opnieuw toevoegen werkt ze bij, zonder dubbele oefeningen.', 'Exercises and phased templates for rehabilitation, strength training and mobility. Adding again updates them, without duplicates.')}</p>
          <Button className="mt-3" loading={busy} onClick={async () => {
            setBusy(true); setError(null); setResult(null);
            try {
              setResult(await api.post('/practice/library-import/fp'));
              qc.invalidateQueries();
            } catch (err) {
              setError(errorMessage(err instanceof ApiError ? err.code : undefined, locale));
            } finally { setBusy(false); }
          }}>{t('FP-bibliotheek toevoegen', 'Add FP library')}</Button>
        </div>
        <p className="text-[13.5px] text-ink-600">
          {t('Een nieuwe versie van hetzelfde bestand werkt de bestaande oefeningen en sjablonen bij (op basis van de id’s in het bestand). Er komen geen dubbele oefeningen.', 'A new version of the same file updates existing exercises and templates (matched on the ids in the file). No duplicates are created.')}
        </p>
        <label className={buttonClass('secondary', 'md', busy ? 'pointer-events-none opacity-60' : 'cursor-pointer')}>
          <Upload className="h-4 w-4" />
          {busy ? t('Bezig met importeren…', 'Importing…') : t('Kies JSON-bestand', 'Choose JSON file')}
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setBusy(true); setError(null); setResult(null);
              try {
                let data: unknown;
                try { data = JSON.parse(await f.text()); } catch { throw new ApiError(400, 'invalid_json'); }
                setResult(await api.post('/practice/library-import', data));
                qc.invalidateQueries();
              } catch (err) {
                const code = err instanceof ApiError ? err.code : undefined;
                setError(code === 'invalid_json' || code === 'validation_failed'
                  ? t('Dit bestand heeft niet het verwachte formaat (oefeningen met id, naam, regio, instructie en dosering).', 'This file does not have the expected format (exercises with id, name, region, instruction and dose).')
                  : errorMessage(code, locale));
              } finally { setBusy(false); }
            }}
          />
        </label>
      </div>
    </Card>
  );
}

function Plan() {
  const { t, locale } = useI18n();
  const q = usePractice();
  if (!q.data) return <Spinner />;
  const p = q.data;
  const rows = [
    [t('Therapeuten', 'Therapists'), p.usage.members, p.plan.limits.therapists],
    [t('Actieve patiënten', 'Active patients'), p.usage.activePatients, p.plan.limits.active_patients],
  ] as const;
  return (
    <div className="grid max-w-3xl gap-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[13px] text-ink-500">{t('Huidig abonnement', 'Current plan')}</div>
            <div className="text-xl font-semibold">{p.plan.name}</div>
          </div>
          <Badge tone={p.plan.status === 'trialing' ? 'info' : 'ok'}>{p.plan.status === 'trialing' ? t(`Proefperiode tot ${fmtDate(p.plan.trialEndsAt, locale)}`, `Trial until ${fmtDate(p.plan.trialEndsAt, locale)}`) : p.plan.status}</Badge>
        </div>
        <div className="mt-5 space-y-4">
          {rows.map(([label, used, max]) => (
            <div key={label}>
              <div className="mb-1 flex justify-between text-[13px]"><span>{label}</span><span className="tabular-nums text-ink-500">{used}{max ? ` / ${max}` : ''}</span></div>
              <ProgressBar value={max ? used / max : 0} />
            </div>
          ))}
        </div>
      </Card>
      <Notice tone="info" icon={<ShieldCheck className="h-4 w-4" />} title={t('Betalingen zijn nog niet geactiveerd', 'Payments are not yet enabled')}>
        {t('De facturatie-architectuur is voorbereid (abonnementen, limieten, proefperiode), maar er worden in deze fase geen betalingen verwerkt.', 'The billing architecture is in place (plans, limits, trial), but no payments are processed in this phase.')}
      </Notice>
    </div>
  );
}

function Audit() {
  const { t, locale } = useI18n();
  const q = useQuery({ queryKey: ['audit'], queryFn: () => api.get<{ items: { id: number; at: string; action: string; entity: string; entityId: string | null; actor: string | null }[] }>('/practice/audit') });
  if (!q.data) return <Spinner />;
  if (!q.data.items.length) return <Card><EmptyState title={t('Nog geen auditregels', 'No audit entries yet')} /></Card>;
  return (
    <Card>
      <CardHeader title={t('Auditlog', 'Audit log')} description={t('Gevoelige handelingen binnen je praktijk (laatste 200). Bevat geen klinische inhoud.', 'Sensitive operations in your practice (last 200). Contains no clinical content.')} />
      <TableScroll label={t('Auditlog', 'Audit log')}>
        <table className="w-full min-w-[560px] text-[13px]">
          <thead className="border-b border-line text-left text-[12px] text-ink-500"><tr><th className="px-5 py-2 font-medium">{t('Tijdstip', 'Time')}</th><th className="px-3 py-2 font-medium">{t('Gebruiker', 'User')}</th><th className="px-3 py-2 font-medium">{t('Actie', 'Action')}</th><th className="px-3 py-2 font-medium">{t('Object', 'Object')}</th></tr></thead>
          <tbody className="divide-y divide-line">
            {q.data.items.map((a) => (
              <tr key={a.id}><td className="whitespace-nowrap px-5 py-2 text-ink-500">{fmtDateTime(a.at, locale)}</td><td className="px-3 py-2">{a.actor ?? '—'}</td><td className="px-3 py-2"><Badge tone="outline">{a.action}</Badge></td><td className="px-3 py-2 font-mono text-[12px] text-ink-500">{a.entity} {a.entityId?.slice(0, 8)}</td></tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </Card>
  );
}
