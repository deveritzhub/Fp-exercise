import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutTemplate, Plus, Search, Star } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { fmtRelative } from '@/lib/format';
import { useDocumentMeta, useLabels } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Badge, ButtonLink, Card, CardHeader, EmptyState, ErrorState, Input, PageHeader, Skeleton, Tabs, useDebounced } from '@/components/ui';
import { ProgramStatusBadge } from '@/components/app/StatusBadge';
import type { Program } from '@/lib/types';

export function ProgramsPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Programma’s & sjablonen', 'Programmes & templates'));
  const { practice } = useSession();
  const qc = useQueryClient();
  const L = useLabels();
  const [tab, setTab] = useState<'templates' | 'recent'>('templates');
  const [scope, setScope] = useState<'all' | 'favorites' | 'practice' | 'global'>('all');
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const templates = useQuery({ queryKey: ['templates', dq], queryFn: () => api.get<{ items: Program[] }>(`/programs/templates${qs({ q: dq })}`), placeholderData: (p) => p });
  const recent = useQuery({ queryKey: ['programs-recent', practice?.practiceId], queryFn: () => api.get<{ items: Program[] }>('/programs/recent'), enabled: tab === 'recent' });
  const shown = (templates.data?.items ?? []).filter((p) => (scope === 'all' ? true : scope === 'favorites' ? p.favorite : p.scope === scope));

  const toggleFav = async (p: Program) => {
    if (p.favorite) await api.del(`/programs/${p.id}/favorite`);
    else await api.post(`/programs/${p.id}/favorite`);
    qc.invalidateQueries({ queryKey: ['templates'] });
  };

  return (
    <>
      <PageHeader
        title={t('Programma’s & sjablonen', 'Programmes & templates')}
        description={t('Sjablonen zijn een startpunt voor professionele aanpassing — geen geautomatiseerd behandeladvies.', 'Templates are a starting point for professional customisation — not automated treatment advice.')}
        actions={
          <>
            <ButtonLink to="/app/programmas/nieuw?type=sjabloon" variant="secondary" icon={<LayoutTemplate className="h-4 w-4" />}>{t('Nieuw sjabloon', 'New template')}</ButtonLink>
            <ButtonLink to="/app/programmas/nieuw" icon={<Plus className="h-4 w-4" />}>{t('Nieuw programma', 'New programme')}</ButtonLink>
          </>
        }
      />
      <Tabs className="mb-5" value={tab} onChange={setTab} tabs={[{ value: 'templates', label: t('Sjablonen', 'Templates') }, { value: 'recent', label: t('Mijn recente programma’s', 'My recent programmes') }]} />
      {tab === 'templates' ? (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input leading={<Search className="h-4 w-4" />} placeholder={t('Zoek sjablonen…', 'Search templates…')} value={q} onChange={(e) => setQ(e.target.value)} containerClassName="w-full sm:max-w-sm" aria-label={t('Zoeken', 'Search')} />
            <div className="flex flex-wrap gap-1 sm:ml-auto">
              {([['all', t('Alle', 'All')], ['favorites', t('Favorieten', 'Favourites')], ['practice', t('Praktijk', 'Practice')], ['global', t('Centraal', 'Central')]] as const).map(([v, l]) => (
                <button key={v} type="button" aria-pressed={scope === v} onClick={() => setScope(v)} className={cn('rounded-lg px-3 py-1.5 text-[13px] font-medium', scope === v ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100')}>{l}</button>
              ))}
            </div>
          </div>
          {templates.isError ? <Card><ErrorState error={templates.error} onRetry={() => templates.refetch()} /></Card> : !templates.data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
          ) : shown.length === 0 ? (
            <Card><EmptyState icon={<LayoutTemplate className="h-5 w-5" />} title={t('Geen sjablonen gevonden', 'No templates found')} /></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((p) => (
                <div key={p.id} className="card group flex flex-col p-5 transition-shadow hover:shadow-pop">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/app/programmas/${p.id}`} className="text-[15px] font-semibold leading-snug hover:underline">{p.title}</Link>
                    <button type="button" onClick={() => toggleFav(p)} aria-pressed={!!p.favorite} aria-label={p.favorite ? t('Verwijder uit favorieten', 'Remove from favourites') : t('Voeg toe aan favorieten', 'Add to favourites')} className={cn('rounded-full p-1', p.favorite ? 'text-amber-500' : 'text-ink-300 hover:text-ink-600')}>
                      <Star className={cn('h-4 w-4', p.favorite && 'fill-current')} />
                    </button>
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-[13px] text-ink-500">{p.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone={p.scope === 'practice' ? 'accent' : 'neutral'}>{p.scope === 'practice' ? t('Praktijk', 'Practice') : t('Centraal', 'Central')}</Badge>
                    <Badge tone="outline">{p.itemCount} {t('oefeningen', 'exercises')}</Badge>
                    {p.regions?.slice(0, 2).map((r) => <Badge key={r} tone="outline">{L.region(r)}</Badge>)}
                  </div>
                  <div className="mt-auto flex gap-2 pt-4">
                    <ButtonLink size="sm" to={`/app/programmas/nieuw?sjabloon=${p.id}`}>{t('Gebruiken', 'Use')}</ButtonLink>
                    <ButtonLink size="sm" variant="ghost" to={`/app/programmas/${p.id}`}>{t('Bekijken', 'View')}</ButtonLink>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardHeader title={t('Mijn recente programma’s', 'My recent programmes')} />
          {!recent.data ? <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div> : recent.data.items.length === 0 ? (
            <EmptyState title={t('Nog geen programma’s', 'No programmes yet')} />
          ) : (
            <ul className="divide-y divide-line">
              {recent.data.items.map((p) => (
                <li key={p.id}>
                  <Link to={`/app/programmas/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50/60">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{p.title}</span>
                      <span className="text-[12.5px] text-ink-500">{p.isTemplate ? t('Sjabloon', 'Template') : p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : ''} · {fmtRelative(p.updatedAt, locale)}</span>
                    </span>
                    {p.isTemplate ? <Badge tone="accent">{t('Sjabloon', 'Template')}</Badge> : <ProgramStatusBadge status={p.status} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
