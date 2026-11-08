import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CloudFog, Flag, LockKeyhole, Map as MapIcon, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { ErrorState, Skeleton } from '@/components/ui';
import { HeroPhoto } from '@/components/hero/HeroPhoto';
import { bodyShape } from '@shared/hero';
import { worldCopy, zoneTheme, type WorldZone } from '@shared/worldMap';
import type { HeroState } from '@/lib/types';
import { GuildRaidCard } from '@/components/patient/GuildRaid';
import { useHero } from '@/pages/patient/HeroPages';

type WorldResponse = {
  clinical: boolean;
  zones: WorldZone[];
  heroZoneNo: number | null;
  rest: { active: boolean; reason: 'rest' | 'pain' | null };
  guild: import('@shared/worldMap').GuildPublic;
  empty: boolean;
};

const DOTS = 8;

/** The rehabilitation journey as a world map. Looking never unlocks a zone. */
export function WorldMapPage() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const { user } = useSession();
  const copy = worldCopy(user?.patient?.kind);
  const line = (pair: { nl: string; en: string }) => (nl ? pair.nl : pair.en);
  useDocumentMeta(t('Wereldkaart', 'World map'));
  const world = useQuery({ queryKey: ['patient-world'], queryFn: () => api.get<WorldResponse>('/patient/world') });
  const heroQ = useHero();
  const [selectedNo, setSelectedNo] = useState<number | null>(null);

  if (world.isError) return <ErrorState error={world.error} onRetry={() => world.refetch()} />;
  if (!world.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const data = world.data;
  const selected = data.zones.find((z) => z.no === (selectedNo ?? data.heroZoneNo)) ?? data.zones[0] ?? null;
  const statusName = (z: WorldZone) =>
    z.status === 'done' ? t('Achter de rug', 'Behind you') : z.status === 'current' ? t('Je staat hier', 'You are here') : t('Mist · vergrendeld', 'Fog · locked');

  return (
    <div className="space-y-5">
      <header>
        <p className="t-label flex items-center gap-1.5"><MapIcon className="h-4 w-4" aria-hidden />{t('Wereld', 'World')}</p>
        <h1 className="t-page mt-1">{t('Wereldkaart', 'World map')}</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{line(copy.intro)}</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">{line(copy.unlock)}</p>
      </header>

      {data.rest.active && (
        <p role="status" className="flex items-start gap-2 rounded-2xl border border-[#C9D7C2] bg-[#F3F7F1] px-3 py-3 text-[14.5px] leading-relaxed text-ink-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#496246]" aria-hidden />
          <span>{line(data.rest.reason === 'pain' ? copy.pain : copy.rest)}</span>
        </p>
      )}

      {data.empty || !selected ? (
        <section className="rounded-2xl border border-dashed border-line bg-white p-5" aria-labelledby="world-empty">
          <h2 id="world-empty" className="font-display text-[18px] font-bold text-ink-950">{zoneTheme(null)[nl ? 'nl' : 'en']}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-700">
            {t('Er is nog geen schema, dus de kaart is nog leeg. Zodra er een schema klaarstaat, verschijnt je eerste zone.', 'There is no plan yet, so the map is still empty. Your first zone appears once a plan is ready.')}
          </p>
        </section>
      ) : (
        <>
          <ol className="space-y-3" aria-label={t('Zones van je kaart', 'Zones on your map')}>
            {data.zones.map((zone, index) => {
              const theme = zoneTheme(zone.region);
              const here = zone.no === data.heroZoneNo && zone.status === 'current';
              const isSelected = selected.no === zone.no;
              return (
                <li key={zone.no} className="relative">
                  {index < data.zones.length - 1 && (
                    <span aria-hidden className={cn('absolute left-5 top-full z-0 h-3 w-0.5', zone.status === 'done' ? 'bg-[#869A75]' : 'bg-ink-200')} />
                  )}
                  <button
                    type="button"
                    data-zone-status={zone.status}
                    aria-pressed={isSelected}
                    aria-current={zone.status === 'current' ? 'step' : undefined}
                    aria-controls="world-zone-detail"
                    onClick={() => setSelectedNo(zone.no)}
                    className={cn(
                      'relative flex w-full min-w-0 flex-col gap-2 rounded-2xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      zone.locked ? 'border-dashed border-ink-300 bg-[#eef1ea]' : isSelected ? 'border-accent/40 bg-white shadow-card' : 'border-line bg-white',
                    )}
                  >
                    <span className="flex items-start gap-3">
                      {here && heroQ.data?.hero ? (
                        <span className="w-16 shrink-0" aria-hidden>
                          <HeroPhoto look={heroLook(heroQ.data)} className="h-24 w-16" />
                        </span>
                      ) : (
                        <span aria-hidden className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2',
                          zone.status === 'done' ? 'border-[#496246] bg-[#496246] text-white' : zone.status === 'current' ? 'border-[#496246] bg-white text-[#343F2A]' : 'border-ink-300 bg-[#f7f7f4] text-ink-500',
                        )}>
                          {zone.locked ? <CloudFog className="h-5 w-5" /> : <MapIcon className="h-5 w-5" />}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-600">
                          {theme[nl ? 'nl' : 'en']} · {statusName(zone)}
                        </span>
                        <span className="block text-[16px] font-bold leading-snug text-ink-950 [overflow-wrap:anywhere]">
                          {zone.name || t(`Zone ${zone.no}`, `Zone ${zone.no}`)}
                        </span>
                        {here && <span className="mt-0.5 block text-[13px] font-medium text-[#343F2A]">{t('Je held staat in deze zone.', 'Your hero stands in this zone.')}</span>}
                        {zone.locked && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-ink-700">
                            <LockKeyhole className="h-3.5 w-3.5" aria-hidden />{t('Vergrendeld', 'Locked')}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="block">
                      <span className="mb-1 block text-[12.5px] text-ink-600">
                        {zone.nodes === 0
                          ? t('Nog geen afgeronde training in deze zone.', 'No completed workout in this zone yet.')
                          : zone.nodes === 1
                            ? t('1 afgeronde training op het pad.', '1 completed workout on the path.')
                            : t(`${zone.nodes} afgeronde trainingen op het pad.`, `${zone.nodes} completed workouts on the path.`)}
                      </span>
                      {zone.nodes > 0 && (
                        <span aria-hidden className="flex flex-wrap gap-1.5">
                          {Array.from({ length: Math.min(zone.nodes, DOTS) }, (_, i) => (
                            <span key={i} className="h-2.5 w-2.5 rounded-full bg-[#496246]" />
                          ))}
                          {zone.nodes > DOTS && <span className="text-[12px] font-semibold text-ink-600">+{zone.nodes - DOTS}</span>}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-800">
                      <Flag className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {line(copy.boss)}
                      <span className="font-medium text-ink-600">· {zone.boss === 'past' ? line(copy.bossPast) : zone.boss === 'review' ? t('Te beoordelen', 'To be reviewed') : line(copy.bossLocked)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div id="world-zone-detail" role="region" aria-label={t('Gekozen zone', 'Chosen zone')} className="rounded-2xl border border-line bg-sand-soft/60 p-4">
            <h2 className="font-display text-[18px] font-bold text-ink-950">{selected.name || zoneTheme(selected.region)[nl ? 'nl' : 'en']}</h2>
            {selected.weeks && <p className="mt-1 text-[13px] text-ink-600">{t('Indicatieve weken:', 'Indicative weeks:')} {selected.weeks}</p>}
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-800">
              {selected.goal ? <><strong>{t('Doel:', 'Goal:')}</strong> {selected.goal}</> : t('Bekijken verandert niets aan je schema.', 'Looking changes nothing about your plan.')}
            </p>
            <div className="mt-3 rounded-xl bg-[#343F2A] p-3 text-white">
              <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#E8DFCD]">
                <Flag className="h-4 w-4" aria-hidden />{line(copy.boss)}
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-[#F4F1E8]">
                {selected.boss === 'past' ? line(copy.bossPast) : selected.boss === 'review' ? line(copy.bossReview) : line(copy.bossLocked)}
              </p>
            </div>
          </div>
        </>
      )}

      <GuildRaidCard guild={data.guild} restActive={data.rest.active} />

      <p className="text-center text-[14px]">
        <Link to="/p/held" className="link font-semibold">{t('Terug naar je held', 'Back to your hero')}</Link>
      </p>
    </div>
  );
}

function heroLook(d: HeroState) {
  return {
    ...d.hero!,
    gear: [...d.gear.equipped, ...(d.aids ?? [])],
    body: d.metrics ? bodyShape(d.metrics, d.hero!.frame) : null,
    photo: d.customPhoto ?? null,
  };
}
