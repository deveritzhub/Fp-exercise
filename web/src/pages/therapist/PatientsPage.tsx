import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Search, UserPlus, Users } from 'lucide-react';
import { api, ApiError, qs } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { fmtRelative, pct } from '@/lib/format';
import { useDocumentMeta } from '@/lib/meta';
import { Avatar, Badge, Button, Card, Dialog, EmptyState, ErrorState, Input, Notice, PageHeader, ProgressBar, Segmented, Select, Skeleton, useDebounced, useToast } from '@/components/ui';
import type { PatientListItem } from '@/lib/types';

export function PatientsPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Patiënten', 'Patients'));
  const { practice } = useSession();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'mine' | 'practice'>('practice');
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const dq = useDebounced(q);
  const list = useQuery({
    queryKey: ['patients', practice?.practiceId, dq, scope, status],
    queryFn: () => api.get<{ items: PatientListItem[] }>(`/patients${qs({ q: dq, scope, status })}`),
    placeholderData: (prev) => prev,
  });
  const creating = params.get('nieuw') === '1';

  return (
    <>
      <PageHeader
        title={t('Patiënten', 'Patients')}
        description={t('Alleen patiënten waartoe je toegang hebt worden getoond.', 'Only patients you are authorised to access are shown.')}
        actions={<Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setParams({ nieuw: '1' })}>{t('Nieuwe patiënt', 'New patient')}</Button>}
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <Input leading={<Search className="h-4 w-4" />} placeholder={t('Zoek op naam, e-mail of referentie…', 'Search by name, email or reference…')} value={q} onChange={(e) => setQ(e.target.value)} containerClassName="w-full sm:max-w-sm" aria-label={t('Zoeken', 'Search')} />
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Segmented label={t('Bereik', 'Scope')} value={scope} onChange={setScope} options={[{ value: 'practice', label: t('Toegankelijk', 'Accessible') }, { value: 'mine', label: t('Mijn patiënten', 'My patients') }]} />
            <Segmented label={t('Status', 'Status')} value={status} onChange={setStatus} options={[{ value: 'active', label: t('Actief', 'Active') }, { value: 'archived', label: t('Archief', 'Archive') }]} />
          </div>
        </div>
        {list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : !list.data ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : list.data.items.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title={dq ? t('Geen patiënten gevonden', 'No patients found') : t('Nog geen patiënten', 'No patients yet')} description={dq ? t('Probeer een andere zoekterm.', 'Try a different search term.') : t('Voeg een patiënt toe om een programma voor te schrijven.', 'Add a patient to prescribe a programme.')} action={!dq && <Button onClick={() => setParams({ nieuw: '1' })} icon={<UserPlus className="h-4 w-4" />}>{t('Nieuwe patiënt', 'New patient')}</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-ink-50/50 text-[12px] font-medium text-ink-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">{t('Patiënt', 'Patient')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('Therapietrouw (7 d)', 'Adherence (7 d)')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('Programma’s', 'Programmes')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('Laatste activiteit', 'Last activity')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('Therapeut', 'Therapist')}</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data.items.map((p) => (
                  <tr key={p.id} className="group cursor-pointer hover:bg-ink-50/60" onClick={() => navigate(`/app/patienten/${p.id}`)}>
                    <td className="px-5 py-3">
                      <Link to={`/app/patienten/${p.id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <Avatar name={`${p.firstName} ${p.lastName}`} />
                        <span>
                          <span className="block font-medium text-ink-900">{p.firstName} {p.lastName}</span>
                          <span className="text-[12.5px] text-ink-500">
                            {p.hasAccount ? p.email : p.invitedAt ? t('Uitgenodigd, nog niet actief', 'Invited, not yet active') : t('Geen app-account', 'No app account')}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      {p.adherence7d.planned ? (
                        <div className="flex w-32 items-center gap-2">
                          <ProgressBar value={p.adherence7d.rate} tone="auto" label={t('Therapietrouw', 'Adherence')} />
                          <span className="w-9 text-right text-[12.5px] tabular-nums text-ink-600">{pct(p.adherence7d.rate)}</span>
                        </div>
                      ) : (
                        <span className="text-[12.5px] text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">{p.activePrograms ? <Badge tone="ok" dot>{p.activePrograms} {t('actief', 'active')}</Badge> : <Badge tone="outline">{t('Geen actief', 'None active')}</Badge>}</td>
                    <td className="px-3 py-3 text-[13px] text-ink-600">{fmtRelative(p.lastActivity, locale)}</td>
                    <td className="px-3 py-3 text-[13px] text-ink-600">{p.therapists.map((x) => x.fullName).join(', ')}</td>
                    <td className="pr-4"><ArrowRight className="h-4 w-4 text-ink-300 group-hover:text-ink-500" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <PatientFormDialog open={creating} onClose={() => setParams({})} />
    </>
  );
}

export function PatientFormDialog({ open, onClose, patient }: { open: boolean; onClose: () => void; patient?: { id: string; firstName: string; lastName: string; email: string | null; locale: 'nl' | 'en'; externalRef: string | null; hasAccount: boolean } }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', locale: 'nl' as 'nl' | 'en', externalRef: '' });
  const [invite, setInvite] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setForm(patient ? { firstName: patient.firstName, lastName: patient.lastName, email: patient.email ?? '', locale: patient.locale, externalRef: patient.externalRef ?? '' } : { firstName: '', lastName: '', email: '', locale: 'nl', externalRef: '' });
      setError(null);
    }
  }, [open, patient]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { ...form, email: form.email.trim() || null, externalRef: form.externalRef.trim() || null };
    try {
      if (patient) {
        await api.patch(`/patients/${patient.id}`, body);
        toast(t('Gegevens opgeslagen', 'Details saved'));
        qc.invalidateQueries({ queryKey: ['patient', patient.id] });
        onClose();
      } else {
        const r = await api.post<{ id: string }>('/patients', body);
        const inv = invite && body.email ? await api.post<{ inviteUrl?: string }>(`/patients/${r.id}/invite`) : null;
        qc.invalidateQueries({ queryKey: ['patients'] });
        toast(invite && body.email ? t('Patiënt toegevoegd en uitgenodigd', 'Patient added and invited') : t('Patiënt toegevoegd', 'Patient added'));
        nav(`/app/patienten/${r.id}`, { state: { inviteUrl: inv?.inviteUrl ?? null } });
      }
    } catch (err) {
      setError(errorMessage(err instanceof ApiError ? err.code : undefined, locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={patient ? t('Patiëntgegevens', 'Patient details') : t('Nieuwe patiënt', 'New patient')}
      description={t('Leg alleen vast wat nodig is voor het oefenprogramma.', 'Only record what is needed for the exercise programme.')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('Annuleren', 'Cancel')}</Button>
          <Button type="submit" form="patient-form" loading={busy}>{patient ? t('Opslaan', 'Save') : t('Toevoegen', 'Add')}</Button>
        </>
      }
    >
      <form id="patient-form" onSubmit={submit} className="space-y-4">
        {error && <Notice tone="bad">{error}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('Voornaam', 'First name')} required value={form.firstName} onChange={set('firstName')} autoFocus />
          <Input label={t('Achternaam', 'Last name')} required value={form.lastName} onChange={set('lastName')} />
        </div>
        <Input
          label={t('E-mailadres', 'Email address')}
          optional={t('nodig voor de app', 'needed for the app')}
          type="email"
          value={form.email}
          onChange={set('email')}
          disabled={patient?.hasAccount}
          hint={patient?.hasAccount ? t('Gekoppeld aan een actief account.', 'Linked to an active account.') : undefined}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t('Taal van de app', 'App language')} value={form.locale} onChange={set('locale')}>
            <option value="nl">Nederlands</option>
            <option value="en">English</option>
          </Select>
          <Input label={t('Referentie (EPD)', 'Reference (EHR)')} optional={t('optioneel', 'optional')} value={form.externalRef} onChange={set('externalRef')} maxLength={64} />
        </div>
        {!patient && (
          <label className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]" checked={invite} onChange={(e) => setInvite(e.target.checked)} disabled={!form.email} />
            <span>
              <span className="font-medium">{t('Direct uitnodigen voor de patiëntapp', 'Invite to the patient app now')}</span>
              <span className="block text-[12.5px] text-ink-500">{t('De patiënt ontvangt een e-mail met een activatielink (7 dagen geldig).', 'The patient receives an email with an activation link (valid 7 days).')}</span>
            </span>
          </label>
        )}
        <p className="text-[12.5px] text-ink-500">
          {t('Geen geboortedatum, BSN of diagnose invullen: FP Exercise is geen EPD.', 'Do not enter date of birth, national ID or diagnosis: FP Exercise is not an EHR.')}
        </p>
      </form>
    </Dialog>
  );
}
