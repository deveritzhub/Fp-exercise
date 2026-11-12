import { lazy, Suspense, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, Flag, Home, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Button, ButtonLink, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { HOME_STAGES, homeStage, levelsToNextHome, type VillageHome } from '@shared/practiceVillage';
// three.js only loads on the 3D pages.
const PracticeVillage3D = lazy(() => import('@/components/app/PracticeVillage3D'));

const SAMPLE: VillageHome[] = [1, 1, 2, 3, 4, 6, 7, 9, 11, 14, 16, 22].map((level, i) => ({ id: `sample-${i}`, no: i + 1, level, progress: ((i * 37) % 100) / 100, week: i % 3 === 0 ? 0 : (i % 4) + 1 }));

/**
 * The practice as a village: every patient a home that grows with the hero's level, from a camp
 * to a villa. Homes are numbered and carry no name, so this page is safe on a screen others see;
 * the record behind a home opens only when asked.
 */
export function PracticeVillagePage() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const { practice } = useSession();
  useDocumentMeta(t('Dorp', 'Village'));
  // Names are off when the page opens, every time: the village may be on a screen others see.
  const [names, setNames] = useState(false);
  const q = useQuery({ queryKey: ['practice-village', names], queryFn: () => api.get<{ homes: VillageHome[] }>(`/dashboard/village${names ? '?names=1' : ''}`), placeholderData: (prev) => prev });
  const [picked, setPicked] = useState<string | null>(null);
  // A look ahead: twelve made-up homes, two of every kind. Clearly marked, and without a record behind them.
  const [sample, setSample] = useState(false);
  const homes = useMemo(
    () => (sample ? SAMPLE : q.data?.homes ?? []),
    [q.data, sample],
  );
  const home = homes.find((h) => h.id === picked) ?? null;
  const counts = HOME_STAGES.map((_, i) => homes.filter((h) => homeStage(h.level) === i).length);
  const active = homes.filter((h) => h.week > 0).length;
  const stageName = (level: number) => (nl ? HOME_STAGES[homeStage(level)].nl : HOME_STAGES[homeStage(level)].en);
  const trained = (n: number) => (n === 0 ? t('Deze week niet getraind', 'No workout this week') : n === 1 ? t('1 training deze week', '1 workout this week') : t(`${n} trainingen deze week`, `${n} workouts this week`));

  return (
    <>
      <PageHeader
        title={t('Dorp', 'Village')}
        actions={<>
          {!sample && <Button variant="secondary" aria-pressed={names} data-testid="toggle-names" icon={names ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} onClick={() => setNames((v) => !v)}>{names ? t('Namen verbergen', 'Hide names') : t('Namen tonen', 'Show names')}</Button>}
          <Button variant="secondary" aria-pressed={sample} onClick={() => { setSample((v) => !v); setPicked(null); }}>{sample ? t('Terug naar mijn patiënten', 'Back to my patients') : t('Voorbeeld: alle soorten huisjes', 'Example: every kind of home')}</Button>
        </>}
        description={t(
          'Elk huisje is een patiënt. Het groeit mee met het level van de held: van een kamp tot een villa. Een groene vlag betekent: deze week getraind. Namen staan uit tot je ze aanzet.',
          'Every home is a patient. It grows with the hero’s level: from a camp to a villa. A green flag means: trained this week. Names are off until you switch them on.',
        )}
      />

      {q.isError ? (
        <Card><ErrorState error={q.error} onRetry={() => q.refetch()} /></Card>
      ) : !q.data ? (
        <Skeleton className="h-[420px] rounded-2xl" />
      ) : homes.length === 0 && !sample ? (
        <Card><EmptyState icon={<Home className="h-5 w-5" />} title={t('Nog geen huisjes', 'No homes yet')} description={t('Zodra je patiënten hebt, krijgt elk van hen hier een plek.', 'As soon as you have patients, each of them gets a place here.')} action={<ButtonLink to="/app/patienten?nieuw=1">{t('Nieuwe patiënt', 'New patient')}</ButtonLink>} /></Card>
      ) : (
        <>
          {sample && <p role="status" data-testid="sample-notice" className="mb-4 rounded-xl border border-[#e4bc63] bg-[#fbf0d9] px-3 py-2 text-[14.5px] font-medium text-[#6b4705]">{t('Dit is een voorbeeld met verzonnen huisjes, niet je eigen patiënten.', 'This is an example with made-up homes, not your own patients.')}</p>}
          <ul className="mb-4 flex flex-wrap gap-2" aria-label={t('Soorten huisjes', 'Kinds of homes')}>
            {HOME_STAGES.map((s, i) => (
              <li key={s.key} className={cn('rounded-full border px-3 py-1 text-[13px]', counts[i] ? 'border-line bg-white text-ink-900' : 'border-line/60 bg-transparent text-ink-600')}>
                <span className="font-semibold">{nl ? s.nl : s.en}</span> <span className="text-ink-600">· {t(`vanaf level ${s.from}`, `from level ${s.from}`)} ·</span> <span className="font-semibold">{counts[i]}</span>
              </li>
            ))}
            <li className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-[13px] text-ink-900"><Flag className="h-3.5 w-3.5 text-[#2f9e44]" aria-hidden />{t(`${active} van ${homes.length} deze week actief`, `${active} of ${homes.length} active this week`)}</li>
          </ul>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section aria-label={t('Het dorp in 3D. Kies een huisje.', 'The village in 3D. Pick a home.')}>
              <Suspense fallback={<div className="h-[420px] animate-pulse rounded-2xl bg-[#E7EFE3] lg:h-[560px]" />}>
                <PracticeVillage3D className="h-[420px] lg:h-[560px]" homes={homes} practiceName={practice?.practiceName ?? ''} selected={picked} onPick={setPicked} />
              </Suspense>
            </section>

            <div className="space-y-4">
              <Card aria-live="polite">
                {home ? (
                  <div className="p-5" data-testid="home-panel">
                    <p className="t-label">{t(`Huisje ${home.no}`, `Home ${home.no}`)}</p>
                    {home.name && !sample && <p className="mt-1 text-[17px] font-semibold text-ink-950" data-testid="home-name">{home.name}</p>}
                    <h2 className="t-section mt-1">{stageName(home.level)} · {t(`level ${home.level}`, `level ${home.level}`)}</h2>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E7EFE3]" role="img" aria-label={t(`${Math.round(Math.min(1, home.progress) * 100)}% naar het volgende level`, `${Math.round(Math.min(1, home.progress) * 100)}% to the next level`)}>
                      <div className="h-full bg-accent" style={{ width: `${Math.round(Math.min(1, home.progress) * 100)}%` }} />
                    </div>
                    <p className="mt-3 text-[14.5px] text-ink-800">{trained(home.week)}</p>
                    <p className="mt-1 text-[14.5px] text-ink-700">
                      {levelsToNextHome(home.level) === null
                        ? t('Het grootste huis: een villa.', 'The biggest home: a villa.')
                        : t(`Nog ${levelsToNextHome(home.level)} ${levelsToNextHome(home.level) === 1 ? 'level' : 'levels'} tot een ${HOME_STAGES[homeStage(home.level) + 1].nl.toLowerCase()}.`, `${levelsToNextHome(home.level)} more ${levelsToNextHome(home.level) === 1 ? 'level' : 'levels'} to a ${HOME_STAGES[homeStage(home.level) + 1].en.toLowerCase()}.`)}
                    </p>
                    {!sample && (
                      <>
                        <ButtonLink to={`/app/patienten/${home.id}`} className="mt-4 w-full" icon={<Users className="h-4 w-4" />}>{t('Open het dossier', 'Open the record')}</ButtonLink>
                        {!names && <p className="mt-2 text-[12.5px] text-ink-600">{t('Zet “Namen tonen” aan om te zien van wie dit huisje is.', 'Switch on “Show names” to see whose home this is.')}</p>}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="p-5 text-[14.5px] text-ink-700">{t('Kies een huisje in het dorp of in de lijst om het level en de activiteit te zien.', 'Pick a home in the village or in the list to see its level and activity.')}</p>
                )}
              </Card>

              <Card>
                <CardHeader title={t('Alle huisjes', 'All homes')} description={names && !sample ? t('Met naam.', 'With names.') : t('Op nummer, zonder namen.', 'By number, without names.')} />
                <ul className="max-h-[300px] divide-y divide-line overflow-y-auto" data-testid="home-list">
                  {homes.map((h) => (
                    <li key={h.id}>
                      <button type="button" onClick={() => setPicked(h.id)} aria-pressed={picked === h.id} className="flex min-h-[48px] w-full items-center justify-between gap-3 px-5 py-2 text-left hover:bg-[#F3F7F1] aria-pressed:bg-[#fbf0d9]">
                        <span className="font-medium text-ink-900">{t(`Huisje ${h.no}`, `Home ${h.no}`)} <span className="font-normal text-ink-700">· {h.name ? `${h.name} · ` : ''}{stageName(h.level)}</span></span>
                        <span className="flex items-center gap-2 text-[13px] text-ink-700">{h.week > 0 && <Flag className="h-3.5 w-3.5 text-[#2f9e44]" aria-label={t('deze week getraind', 'trained this week')} />}{t(`level ${h.level}`, `level ${h.level}`)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}
