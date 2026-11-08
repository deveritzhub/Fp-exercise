import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CloudFog, Flag, Hammer, LockKeyhole, Map as MapIcon, Pin, ShieldCheck, Swords, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Dialog, ErrorState, Skeleton } from '@/components/ui';
import { HeroPhoto } from '@/components/hero/HeroPhoto';
import { BADGES, SKILLS, TROPHY_TIERS, bodyShape } from '@shared/hero';
import { prizesForZones, villageBuildings, worldCopy, zoneTheme, type WorldZone, type ZoneExercise } from '@shared/worldMap';
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
const VILLAGE_LABEL = {
  smithy: ['Smederij', 'Smithy'],
  library: ['Bibliotheek', 'Library'],
  hall: ['Trofeeënhal', 'Trophy hall'],
  board: ['Prikbord', 'Notice board'],
  guild: ['Gildehal', 'Guild hall'],
} as const;
const VILLAGE_HINT = {
  smithy: ['Je uitrusting en de winkel.', 'Your gear and the shop.'],
  library: ['Spierenatlas en de quiz.', 'Muscle atlas and the quiz.'],
  hall: ['Je prijzenkast.', 'Your trophy cabinet.'],
  board: ['Missie van vandaag. Weekquests staan bij je held.', "Today's mission. Weekly quests are with your hero."],
  guild: ['De raid van je gilde, op deze kaart.', 'Your guild raid, on this map.'],
} as const;

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
  const [zoneNo, setZoneNo] = useState<number | null>(null);
  const [villageOpen, setVillageOpen] = useState(false);

  const data = world.data;
  const prizes = useMemo(() => {
    if (!data || !heroQ.data) return null;
    return prizesForZones({
      clinical: data.clinical,
      zones: data.zones.map((z) => ({ no: z.no, status: z.status, workouts: z.workoutDates.length || z.nodes, skills: z.skills })),
      trophies: heroQ.data.trophies.filter((x) => x.earned).map((x) => ({ key: x.key, skill: x.skill, level: x.level, tier: x.tier })),
      badges: heroQ.data.badges.filter((b) => b.earned).map((b) => b.key),
    });
  }, [data, heroQ.data]);
  const buildings = villageBuildings({ hero: true, atlas: true, mission: true, guild: true });

  if (world.isError) return <ErrorState error={world.error} onRetry={() => world.refetch()} />;
  if (!data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const openZone = data.zones.find((z) => z.no === zoneNo) ?? null;
  const statusName = (z: WorldZone) =>
    z.status === 'done' ? t('Achter de rug', 'Behind you') : z.status === 'current' ? t('Je staat hier', 'You are here') : t('Mist · vergrendeld', 'Fog · locked');
  const when = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString(nl ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

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

      <section aria-labelledby="village-heading" className="overflow-hidden rounded-2xl border border-[#C9D3BC] bg-[#E7EFE3]">
        <h2 id="village-heading" className="sr-only">{t('Dorp', 'Village')}</h2>
        <button
          type="button"
          data-village
          onClick={() => setVillageOpen(true)}
          className="flex w-full items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <VillageArt />
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#3d5236]">{t('Begin van het pad', 'Start of the path')}</span>
            <span className="block text-[16px] font-bold text-ink-950">{t('Dorp', 'Village')}</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-ink-700">{t('Je uitvalsbasis. Tik voor de gebouwen.', 'Your home base. Tap for the buildings.')}</span>
          </span>
        </button>
      </section>

      {data.empty ? (
        <section className="rounded-2xl border border-dashed border-line bg-white p-5" aria-labelledby="world-empty">
          <h2 id="world-empty" className="font-display text-[18px] font-bold text-ink-950">{zoneTheme(null)[nl ? 'nl' : 'en']}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-700">
            {t('Er is nog geen schema, dus de kaart is nog leeg. Zodra er een schema klaarstaat, verschijnt je eerste zone.', 'There is no plan yet, so the map is still empty. Your first zone appears once a plan is ready.')}
          </p>
        </section>
      ) : (
        <ol className="space-y-3" aria-label={t('Zones van je kaart', 'Zones on your map')}>
          {data.zones.map((zone, index) => {
            const theme = zoneTheme(zone.region);
            const here = zone.no === data.heroZoneNo && zone.status === 'current';
            return (
              <li key={zone.no} className="relative">
                {index < data.zones.length - 1 && (
                  <span aria-hidden className={cn('absolute left-5 top-full z-0 h-3 w-0.5', zone.status === 'done' ? 'bg-[#869A75]' : 'bg-ink-200')} />
                )}
                <button
                  type="button"
                  data-zone-status={zone.status}
                  aria-current={zone.status === 'current' ? 'step' : undefined}
                  aria-haspopup="dialog"
                  onClick={() => setZoneNo(zone.no)}
                  className={cn(
                    'relative flex w-full min-w-0 flex-col gap-2 rounded-2xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    zone.locked ? 'border-dashed border-ink-300 bg-[#eef1ea]' : 'border-line bg-white',
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
                  {zone.locked ? (
                    <span className="text-[14px] leading-relaxed text-ink-800">{line(copy.lockedNotice)}</span>
                  ) : (
                    <>
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
                      </span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <GuildRaidCard guild={data.guild} restActive={data.rest.active} />

      <p className="text-center text-[14px]">
        <Link to="/p/held" className="link font-semibold">{t('Terug naar je held', 'Back to your hero')}</Link>
      </p>

      <Dialog open={villageOpen} onClose={() => setVillageOpen(false)} sheet title={t('Dorp', 'Village')} description={t('Gebouwen naar wat je al in de app hebt.', 'Buildings to what you already have in the app.')}>
        <ul className="space-y-2">
          {buildings.map((b) => {
            const Icon = b.key === 'smithy' ? Hammer : b.key === 'library' ? BookOpen : b.key === 'hall' ? Trophy : b.key === 'board' ? Pin : Swords;
            const label = VILLAGE_LABEL[b.key];
            return (
              <li key={b.key}>
                <Link to={b.to} className="flex min-h-[52px] items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <Icon className="h-5 w-5 shrink-0 text-[#496246]" aria-hidden />
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-950">{t(label[0], label[1])}</span>
                    <span className="block text-[13px] leading-snug text-ink-600">{t(VILLAGE_HINT[b.key][0], VILLAGE_HINT[b.key][1])}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[14px]">
          <Link to="/p/held#weekly-title" className="link font-semibold">{t('Weekquests bij je held', 'Weekly quests with your hero')}</Link>
        </p>
      </Dialog>

      <Dialog
        open={!!openZone}
        onClose={() => setZoneNo(null)}
        sheet
        title={openZone ? (openZone.name || zoneTheme(openZone.region)[nl ? 'nl' : 'en']) : t('Zone', 'Zone')}
      >
        {openZone && (openZone.locked ? (
          <p className="text-[16px] leading-relaxed text-ink-900">{line(copy.lockedNotice)}</p>
        ) : (
          <ZoneSheet zone={openZone} prizes={prizes?.get(openZone.no)} clinical={data.clinical} when={when} />
        ))}
      </Dialog>
    </div>
  );
}

function ZoneSheet({ zone, prizes, clinical, when }: {
  zone: WorldZone;
  prizes: { trophies: { key: string; skill: string; level: number; tier: string }[]; badges: string[] } | undefined;
  clinical: boolean;
  when: (iso: string) => string;
}) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const trophyName = (skill: string, tier: string) => {
    const s = SKILLS.find((x) => x.key === skill);
    const tr = TROPHY_TIERS.find((x) => x.key === tier);
    const skillLabel = s ? (nl ? s.nl : s.en) : skill;
    const tierLabel = tr ? (nl ? tr.nl : tr.en) : tier;
    return `${skillLabel} · ${tierLabel}`;
  };
  const badgeName = (key: string) => {
    const b = BADGES.find((x) => x.key === key);
    return b ? (nl ? b.nl : b.en) : key;
  };
  return (
    <div className="space-y-5">
      {(zone.releasedOn || zone.startedOn || zone.endedOn || zone.weeks) && (
        <dl className="grid grid-cols-1 gap-2 text-[14.5px]">
          {zone.releasedOn && <div><dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">{clinical ? t('Vrijgegeven', 'Released') : t('Gestart', 'Started')}</dt><dd><time dateTime={zone.releasedOn}>{when(zone.releasedOn)}</time></dd></div>}
          {zone.startedOn && zone.startedOn !== zone.releasedOn && <div><dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">{t('Schema vanaf', 'Plan from')}</dt><dd><time dateTime={zone.startedOn}>{when(zone.startedOn)}</time></dd></div>}
          {zone.endedOn && <div><dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">{t('T/m', 'Until')}</dt><dd><time dateTime={zone.endedOn}>{when(zone.endedOn)}</time></dd></div>}
          {zone.weeks && <div><dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-500">{t('Indicatieve weken', 'Indicative weeks')}</dt><dd>{zone.weeks}</dd></div>}
        </dl>
      )}
      {zone.goal && <p className="text-[15px] leading-relaxed text-ink-800"><strong>{t('Doel:', 'Goal:')}</strong> {zone.goal}</p>}

      <section aria-labelledby="zone-workouts">
        <h3 id="zone-workouts" className="text-[15px] font-bold text-ink-950">
          {zone.nodes === 1 ? t('1 training', '1 workout') : t(`${zone.nodes} trainingen`, `${zone.nodes} workouts`)}
        </h3>
        {zone.workoutDates.length > 0 ? (
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[14.5px] text-ink-800">
            {zone.workoutDates.map((d) => <li key={d}><time dateTime={d}>{when(d)}</time></li>)}
          </ul>
        ) : (
          <p className="mt-1 text-[14.5px] text-ink-600">{t('Nog geen afgeronde training in deze zone.', 'No completed workout in this zone yet.')}</p>
        )}
      </section>

      <section aria-labelledby="zone-exercises">
        <h3 id="zone-exercises" className="text-[15px] font-bold text-ink-950">{t('Oefeningen', 'Exercises')}</h3>
        {zone.exercises.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {zone.exercises.map((ex) => (
              <li key={ex.itemId}>
                <Link to={exerciseHref(ex)} className="link inline-flex min-h-[44px] items-center text-[15px] font-semibold">{nl ? ex.nameNl : ex.nameEn}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[14.5px] text-ink-600">{t('Voor dit stuk staat nog geen oefenlijst.', 'This stretch has no exercise list yet.')}</p>
        )}
      </section>

      <section aria-labelledby="zone-prizes">
        <h3 id="zone-prizes" className="text-[15px] font-bold text-ink-950">{t('Prijzenkast', 'Trophy cabinet')}</h3>
        {(prizes?.trophies.length || prizes?.badges.length) ? (
          <ul className="mt-2 space-y-1 text-[14.5px] text-ink-800">
            {prizes?.trophies.map((tr) => <li key={tr.key}>{trophyName(tr.skill, tr.tier)}</li>)}
            {prizes?.badges.map((key) => <li key={key}>{badgeName(key)}</li>)}
          </ul>
        ) : (
          <p className="mt-1 text-[14.5px] text-ink-600">{t('Nog geen beker of badge bij deze zone.', 'No trophy or badge with this zone yet.')}</p>
        )}
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{t('Uit je prijzenkast. Een beker hoort bij een skill die je in deze zone traint. Extra herhalingen geven geen extra beker.', 'From your trophy cabinet. A trophy belongs to a skill you train in this zone. Extra repetitions do not add a trophy.')}</p>
      </section>
    </div>
  );
}

function exerciseHref(ex: ZoneExercise) {
  return `/p/programma/${ex.programId}/oefening/${ex.itemId}`;
}

function VillageArt() {
  return (
    <svg viewBox="0 0 96 64" className="h-16 w-24 shrink-0" aria-hidden>
      <rect width="96" height="64" rx="12" fill="#F4F1E8" />
      <path d="M8 40 h20 l-10 -14 z" fill="#496246" />
      <rect x="12" y="40" width="12" height="12" fill="#E8DFCD" stroke="#343F2A" />
      <path d="M38 36 h22 l-11 -16 z" fill="#343F2A" />
      <rect x="42" y="36" width="14" height="16" fill="#F7F4EC" stroke="#343F2A" />
      <path d="M66 42 h22 l-11 -12 z" fill="#869A75" />
      <rect x="70" y="42" width="14" height="10" fill="#E7EFE3" stroke="#343F2A" />
      <circle cx="22" cy="52" r="2" fill="#8C3A32" />
    </svg>
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
