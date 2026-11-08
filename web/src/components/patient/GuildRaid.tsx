import { Flag, Shield, Swords, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { GuildPublic } from '@shared/worldMap';

/** Practice guild raid. Totals only, and only when the cohort is large enough. */
export function GuildRaidCard({ guild, restActive = false }: { guild: GuildPublic; restActive?: boolean }) {
  const { t } = useI18n();
  const reward = !!guild.reward;
  return (
    <section className="rounded-2xl border border-line bg-white shadow-card" aria-labelledby="guild-raid-title">
      <div className="bg-[#343F2A] px-4 py-4 text-white">
        <h2 id="guild-raid-title" className="flex items-center gap-2 font-display text-[17px] font-bold text-white">
          <Swords className="h-5 w-5 text-[#E8DFCD]" aria-hidden />
          {t('Gilderaid', 'Guild raid')}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[#E9E9DF]">
          {t('Iedereen van het gilde deelt één raidbaas deze week. Je ziet alleen het totaal, nooit wie wat deed.', 'Everyone in the guild shares one raid boss this week. You only see the total, never who did what.')}
        </p>
      </div>
      <div className="space-y-3 px-4 py-4">
        {!guild.available ? (
          <p className="flex items-start gap-2 text-[14.5px] leading-relaxed text-ink-800">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-ink-600" aria-hidden />
            <span>{t('De raid blijft verborgen tot het gilde groot genoeg is. Zo is niemand herkenbaar.', 'The raid stays hidden until the guild is large enough. That way nobody can be recognised.')}</span>
          </p>
        ) : (
          <>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-600">{t('Gilde van 5 of meer', 'Guild of 5 or more')}</p>
            <div
              role="meter"
              aria-valuemin={0}
              aria-valuemax={guild.bossMaxHp}
              aria-valuenow={guild.bossHp}
              aria-label={t('Levenspunten van de raidbaas', 'Raid boss health')}
              className="h-3 overflow-hidden rounded-full bg-ink-100"
            >
              <div className="h-full rounded-full bg-[#8C3A32]" style={{ width: `${guild.bossMaxHp ? (guild.bossHp / guild.bossMaxHp) * 100 : 0}%` }} />
            </div>
            <p className="text-[15px] font-semibold text-ink-950">
              {guild.defeated
                ? t('De raidbaas is verslagen.', 'The raid boss is defeated.')
                : t(`Nog ${guild.bossHp} van ${guild.bossMaxHp} levenspunten.`, `${guild.bossHp} of ${guild.bossMaxHp} health left.`)}
            </p>
            <p className="text-[14px] leading-relaxed text-ink-700">
              {t(
                `Het gilde rondde samen ${guild.workouts} voorgeschreven trainingen af. Meer herhalingen geven geen extra beloning.`,
                `The guild completed ${guild.workouts} prescribed workouts together. More repetitions do not give an extra reward.`,
              )}
            </p>
          </>
        )}
        <div className="flex items-start gap-3 rounded-xl border border-[#E0D5BF] bg-sand-soft/70 p-3">
          <Banner earned={!!reward} />
          <p className="text-[14px] leading-relaxed text-ink-800">
            {reward
              ? t('Jouw gildebanier. Een uiterlijk, omdat je deze week een voorgeschreven training afrondde.', 'Your guild banner. A cosmetic, because you finished a prescribed workout this week.')
              : t('De gildebanier is een uiterlijk voor wie deze week een voorgeschreven training afrondt. Geen extra oefeningen.', 'The guild banner is a cosmetic for anyone who finishes a prescribed workout this week. No extra exercises.')}
          </p>
        </div>
        {restActive && (
          <p className="flex items-start gap-2 text-[14px] leading-relaxed text-ink-800">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span>{t('Een rustdag of een melding dat het niet gaat maakt de baas niet sterker en haalt niets weg.', 'A rest day or letting us know it is not going well does not strengthen the boss and takes nothing away.')}</span>
          </p>
        )}
        <p className="flex items-center gap-1.5 text-[12.5px] text-ink-600">
          <Flag className="h-3.5 w-3.5" aria-hidden />
          {t('Geen ranglijst en geen chat.', 'No ranking and no chat.')}
        </p>
      </div>
    </section>
  );
}

function Banner({ earned }: { earned: boolean }) {
  return (
    <span className="relative mt-0.5 block h-12 w-10 shrink-0" aria-hidden>
      <svg viewBox="0 0 40 48" className="h-full w-full">
        <path d="M6 4 h22 v28 l-11 -6 -11 6 z" fill={earned ? '#496246' : '#cfc8ba'} stroke="#343F2A" strokeWidth="1.5" />
        <path d="M8 4 v40" stroke="#343F2A" strokeWidth="2" />
        {earned && <path d="M14 14 h8 M14 19 h6" stroke="#E8DFCD" strokeWidth="1.6" />}
      </svg>
    </span>
  );
}
