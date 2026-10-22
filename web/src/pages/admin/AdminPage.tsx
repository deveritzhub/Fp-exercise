import { FeedbackList } from '@/components/app/Feedback';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, LogOut, Plus, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { useLogout, useSession } from '@/lib/session';
import { fmtDate } from '@/lib/format';
import { useDocumentMeta } from '@/lib/meta';
import { Logo, LocaleSwitch } from '@/components/app/Brand';
import { Badge, Button, Card, CardHeader, Dialog, Input, Notice, PageHeader, Select, Spinner, Stat, useToast } from '@/components/ui';

type PracticeRow = { id: string; name: string; slug: string; city: string | null; planCode: string; subscriptionStatus: string; createdAt: string; archived: boolean; members: number; activePatients: number; customExercises: number };

export function AdminPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Platformbeheer', 'Platform admin'));
  const { user } = useSession();
  const logout = useLogout();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin-practices'], queryFn: () => api.get<{ items: PracticeRow[] }>('/admin/practices') });
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.get<{ items: { code: string; name: string }[] }>('/public/plans') });
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', city: '', planCode: 'trial', ownerName: '', ownerEmail: '' });
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const items = q.data?.items ?? [];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-5">
          <Logo to="/admin" />
          <Badge tone="info">{t('Platformbeheer', 'Platform admin')}</Badge>
          <div className="flex-1" />
          <LocaleSwitch />
          <span className="hidden text-[13px] text-ink-500 sm:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={logout}>{t('Uitloggen', 'Log out')}</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <PageHeader
          title={t('Praktijken', 'Practices')}
          description={t('Beheer van tenants en abonnementen. Geen toegang tot patiënt- of behandelgegevens.', 'Tenant and subscription management. No access to patient or treatment data.')}
          actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>{t('Nieuwe praktijk', 'New practice')}</Button>}
        />
        <Notice tone="info" icon={<ShieldCheck className="h-4 w-4" />} className="mb-6">
          {t('Deze weergave toont alleen geaggregeerde aantallen. Klinische gegevens zijn technisch afgeschermd (row level security).', 'This view only shows aggregated counts. Clinical data is technically shielded (row level security).')}
        </Notice>
        {link && <Notice tone="info" className="mb-6" title={t('Ontwikkelomgeving: uitnodiging eigenaar', 'Development: owner invitation')}><a className="link break-all" href={link}>{link}</a></Notice>}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t('Praktijken', 'Practices')} value={items.filter((p) => !p.archived).length} />
          <Stat label={t('Teamleden', 'Team members')} value={items.reduce((a, p) => a + p.members, 0)} />
          <Stat label={t('Actieve patiënten', 'Active patients')} value={items.reduce((a, p) => a + p.activePatients, 0)} />
          <Stat label={t('Eigen oefeningen', 'Custom exercises')} value={items.reduce((a, p) => a + p.customExercises, 0)} />
        </div>
        <Card>
          <CardHeader title={t('Alle praktijken', 'All practices')} />
          {!q.data ? <Spinner /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-line text-left text-[12px] text-ink-500"><tr><th className="px-5 py-2 font-medium">{t('Praktijk', 'Practice')}</th><th className="px-3 py-2 font-medium">{t('Abonnement', 'Plan')}</th><th className="px-3 py-2 font-medium">{t('Team', 'Team')}</th><th className="px-3 py-2 font-medium">{t('Patiënten', 'Patients')}</th><th className="px-3 py-2 font-medium">{t('Sinds', 'Since')}</th><th className="px-3 py-2" /></tr></thead>
                <tbody className="divide-y divide-line">
                  {items.map((p) => (
                    <tr key={p.id} className={p.archived ? 'opacity-60' : ''}>
                      <td className="px-5 py-3"><div className="flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-ink-400" />{p.name}</div><div className="text-[12px] text-ink-500">{p.slug}{p.city ? ` · ${p.city}` : ''}</div></td>
                      <td className="px-3 py-3">
                        <Select aria-label={t('Abonnement', 'Plan')} className="h-8 w-36 py-1 text-[13px]" value={p.planCode} onChange={async (e) => { await api.patch(`/admin/practices/${p.id}`, { planCode: e.target.value }); qc.invalidateQueries({ queryKey: ['admin-practices'] }); toast(t('Abonnement gewijzigd', 'Plan changed')); }}>
                          {[{ code: 'trial', name: 'Proefperiode' }, ...(plans.data?.items ?? [])].map((pl) => <option key={pl.code} value={pl.code}>{pl.name}</option>)}
                        </Select>
                        <div className="mt-1"><Badge tone={p.subscriptionStatus === 'active' ? 'ok' : 'info'}>{p.subscriptionStatus}</Badge></div>
                      </td>
                      <td className="px-3 py-3 tabular-nums">{p.members}</td>
                      <td className="px-3 py-3 tabular-nums">{p.activePatients}</td>
                      <td className="px-3 py-3 text-ink-500">{fmtDate(p.createdAt, locale)}</td>
                      <td className="px-3 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={async () => { if (!p.archived && !confirm(t('Praktijk archiveren? Leden verliezen toegang.', 'Archive practice? Members lose access.'))) return; await api.patch(`/admin/practices/${p.id}`, { archived: !p.archived }); qc.invalidateQueries({ queryKey: ['admin-practices'] }); }}>
                          {p.archived ? t('Herstellen', 'Restore') : t('Archiveren', 'Archive')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <div className="mt-6"><FeedbackList /></div>
      </main>
      <Dialog open={creating} onClose={() => setCreating(false)} title={t('Nieuwe praktijk', 'New practice')} footer={<><Button variant="ghost" onClick={() => setCreating(false)}>{t('Annuleren', 'Cancel')}</Button><Button type="submit" form="practice-form">{t('Aanmaken', 'Create')}</Button></>}>
        <form id="practice-form" className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            const r = await api.post<{ inviteUrl?: string }>('/admin/practices', { ...form, city: form.city || null });
            setLink(r.inviteUrl ?? null);
            setCreating(false);
            qc.invalidateQueries({ queryKey: ['admin-practices'] });
            toast(t('Praktijk aangemaakt, eigenaar uitgenodigd', 'Practice created, owner invited'));
          } catch (err) { setError(errorMessage(err instanceof ApiError ? err.code : undefined, locale)); }
        }}>
          {error && <Notice tone="bad">{error}</Notice>}
          <Input label={t('Praktijknaam', 'Practice name')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || e.target.value.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Slug" required pattern="[a-z0-9-]{2,60}" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Input label={t('Plaats', 'City')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <Input label={t('Naam eigenaar', 'Owner name')} required value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          <Input label={t('E-mail eigenaar', 'Owner email')} type="email" required value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
        </form>
      </Dialog>
    </div>
  );
}
