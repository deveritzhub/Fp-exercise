import { FeedbackList } from '@/components/app/Feedback';
import { IdleGuard } from '@/components/app/IdleGuard';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, LogOut, Plus, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AccountPage } from '@/pages/AccountPage';
import { api } from '@/lib/api';
import { useI18n, describeError, fieldErrors, slugify } from '@/lib/i18n';
import { useLogout, useSession } from '@/lib/session';
import { fmtDate } from '@/lib/format';
import { useDocumentMeta } from '@/lib/meta';
import { Logo, LocaleSwitch } from '@/components/app/Brand';
import { Badge, Button, Card, CardHeader, Dialog, Input, Notice, PageHeader, Select, Spinner, Stat, useToast, TableScroll } from '@/components/ui';

type PracticeRow = { id: string; name: string; slug: string; city: string | null; planCode: string; subscriptionStatus: string; createdAt: string; archived: boolean; members: number; activePatients: number; customExercises: number };

export function AdminPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Platformbeheer', 'Platform admin'));
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin-practices'], queryFn: () => api.get<{ items: PracticeRow[] }>('/admin/practices') });
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.get<{ items: { code: string; name: string }[] }>('/public/plans') });
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', city: '', planCode: 'trial', ownerName: '', ownerEmail: '' });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const items = q.data?.items ?? [];

  return (
    <AdminShell>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-5">
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
            <TableScroll label={t('Alle praktijken', 'All practices')}>
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
            </TableScroll>
          )}
        </Card>
        <div className="mt-6"><FeedbackList /></div>
      </main>
      <Dialog open={creating} onClose={() => setCreating(false)} title={t('Nieuwe praktijk', 'New practice')} footer={<><Button variant="ghost" onClick={() => setCreating(false)}>{t('Annuleren', 'Cancel')}</Button><Button type="submit" form="practice-form">{t('Aanmaken', 'Create')}</Button></>}>
        <form id="practice-form" className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setFields({});
          try {
            const r = await api.post<{ inviteUrl?: string }>('/admin/practices', { ...form, slug: slugify(form.slug, true), city: form.city || null });
            setLink(r.inviteUrl ?? null);
            setCreating(false);
            qc.invalidateQueries({ queryKey: ['admin-practices'] });
            toast(t('Praktijk aangemaakt, eigenaar uitgenodigd', 'Practice created, owner invited'));
          } catch (err) { setError(describeError(err, locale)); setFields(fieldErrors(err, locale)); }
        }}>
          {error && <Notice tone="bad">{error}</Notice>}
          <Input label={t('Praktijknaam', 'Practice name')} required error={fields.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugTouched ? form.slug : slugify(e.target.value, true) })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Slug" required minLength={2} hint={t('Kleine letters, cijfers en streepjes; wordt automatisch aangepast.', 'Lowercase letters, numbers and hyphens; adjusted automatically.')} error={fields.slug} value={form.slug} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: slugify(e.target.value) }); }} />
            <Input label={t('Plaats', 'City')} error={fields.city} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <Input label={t('Naam eigenaar', 'Owner name')} required error={fields.ownerName} value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          <Input label={t('E-mail eigenaar', 'Owner email')} type="email" required error={fields.ownerEmail} value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
        </form>
      </Dialog>
    </AdminShell>
  );
}

/** Header for the platform-admin pages: logo, role, account and log out. */
function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { user } = useSession();
  const logout = useLogout();
  return (
    <div className="min-h-screen bg-canvas">
      <IdleGuard />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-5">
          {/* Narrow phones: logo mark only, so the header fits on one line. */}
          <Logo to="/admin" compact className="min-h-[44px] min-w-[44px] justify-center sm:hidden" />
          <Logo to="/admin" className="hidden sm:inline-flex" />
          <Badge tone="info">{t('Platformbeheer', 'Platform admin')}</Badge>
          <div className="flex-1" />
          <LocaleSwitch />
          <span className="hidden text-[13px] text-ink-500 md:inline">{user?.email}</span>
          <Link to="/admin/account" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13.5px] font-medium text-ink-700 hover:bg-ink-100 hover:text-ink-900" aria-label={t('Account', 'Account')}>
            <UserRound className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t('Account', 'Account')}</span>
          </Link>
          <Button variant="ghost" size="sm" className="h-10" icon={<LogOut className="h-4 w-4" />} onClick={() => logout()} aria-label={t('Uitloggen', 'Log out')}>
            <span className="hidden sm:inline">{t('Uitloggen', 'Log out')}</span>
          </Button>
        </div>
      </header>
      {children}
    </div>
  );
}

/** Platform admin: own account (name, password, two-step verification). */
export function AdminAccountPage() {
  const { t } = useI18n();
  return (
    <AdminShell>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-5">
        <Link to="/admin" className="mb-4 inline-flex min-h-[44px] items-center text-[14px] font-medium text-ink-700 hover:text-ink-950">← {t('Praktijken', 'Practices')}</Link>
        <AccountPage />
      </main>
    </AdminShell>
  );
}
