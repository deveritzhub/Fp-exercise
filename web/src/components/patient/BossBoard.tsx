import { Check, MapPin, Swords } from 'lucide-react';
import { ATTACKS, BOSSES, BOSS_WEEK_BONUS, CREATURES, DROPS, LOOT, alphaAdvised, isAlpha, lightFrom, type CreatureKind } from '@shared/adventure';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

const PORTRAIT: Record<string, [string, string]> = {
  giant_slime: ['🫧', 'linear-gradient(135deg,#8fb2c9,#3d6a8a)'],
  couch_king: ['🛋️', 'linear-gradient(135deg,#a07ad0,#4a2a7a)'],
  alpha_boar: ['🐗', 'linear-gradient(135deg,#8a5a3a,#2b2420)'],
  alpha_wolf: ['🐺', 'linear-gradient(135deg,#6a6d74,#1c1d20)'],
  alpha_bear: ['🐻', 'linear-gradient(135deg,#6b4a2f,#1e140c)'],
  shame_lord: ['🌑', 'linear-gradient(135deg,#5a2a7a,#0a0510)'],
};
const WEAK_NL: Record<string, string> = { trained: 'trainen', hydrated: 'water drinken', moving: 'bewegen', rested: 'goed slapen', fed: 'goed eten' };
const WEAK_EN: Record<string, string> = { trained: 'training', hydrated: 'drinking water', moving: 'moving', rested: 'sleeping well', fed: 'eating well' };

/**
 * The boss board: an adventure guide with every boss, small ones first and the raid bosses last. Each
 * card tells where it lives, how strong it is, what it is weak against, what it drops and what it
 * frees on the light side, whether it was beaten, and takes the hero there.
 */
export function BossBoard({ level, slain, weekly, onGo }: { level: number; slain: string[]; weekly: string | null; onGo: (kind: CreatureKind) => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  return (
    <ul className="space-y-3" data-testid="boss-board">
      {BOSSES.map((b) => {
        const c = CREATURES[b.kind];
        const a = ATTACKS[b.kind];
        const advised = isAlpha(b.kind) ? alphaAdvised(b.kind) : c.level;
        const beaten = slain.includes(b.kind);
        const week = weekly === b.kind;
        const light = lightFrom(b.kind);
        const [icon, bg] = PORTRAIT[b.kind] ?? ['⚔️', '#333'];
        const shown = level >= c.level;
        return (
          <li key={b.kind} data-boss={b.kind} data-state={beaten ? 'slain' : 'open'} className={cn('overflow-hidden rounded-2xl border bg-white', week ? 'border-[#c8321e]' : 'border-line')}>
            <div className="flex items-center gap-3 p-3" style={{ background: bg }}>
              <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-black/25 text-[34px] ring-1 ring-white/30">{icon}</span>
              <span className="min-w-0 flex-1 text-white">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-white/75">{b.tier === 'raid' ? t('Raidbaas', 'Raid boss') : t('Kleine baas', 'Small boss')}</span>
                <span className="block text-[18px] font-bold leading-tight">{nl ? c.nl : c.en}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-white/85"><MapPin className="h-3.5 w-3.5" aria-hidden />{nl ? b.zoneNl : b.zoneEn}</span>
              </span>
              {beaten && <span data-testid={`slain-${b.kind}`} className="shrink-0 -rotate-6 rounded-md border-2 border-[#ffd76a] px-1.5 py-0.5 text-[11px] font-black uppercase text-[#ffd76a]"><Check className="mr-0.5 inline h-3 w-3" aria-hidden />{t('Verslagen', 'Beaten')}</span>}
            </div>
            {week && <p className="bg-[#c8321e] px-3 py-1 text-[12.5px] font-semibold text-white">{t(`Baas van de week: +${Math.round((BOSS_WEEK_BONUS - 1) * 100)}% avonturen-XP`, `Boss of the week: +${Math.round((BOSS_WEEK_BONUS - 1) * 100)}% adventure XP`)}</p>}
            <dl className="grid grid-cols-3 gap-px bg-line text-center">
              {([
                [t('Level', 'Level'), String(advised)],
                [t('Leven', 'Life'), String(c.hp)],
                [t('Klap', 'Blow'), String(a.damage)],
              ] as const).map(([k, v]) => (
                <div key={k} className="bg-white px-2 py-1.5"><dt className="text-[11px] text-ink-600">{k}</dt><dd className="text-[16px] font-bold tabular-nums text-ink-950">{v}</dd></div>
              ))}
            </dl>
            <div className="space-y-1.5 p-3 text-[13px] text-ink-800">
              <p>{a.aggressive ? t('Valt zelf aan.', 'Attacks by itself.') : t('Slaat pas terug als je hem raakt.', 'Only hits back once struck.')} {t(`Zwak tegen ${WEAK_NL[c.weakTo] ?? c.weakTo}: dan raak je dubbel.`, `Weak to ${WEAK_EN[c.weakTo] ?? c.weakTo}: then you hit double.`)}</p>
              <p><span className="font-semibold">{t('Buit', 'Loot')}:</span> {DROPS[b.kind].map((d) => `${LOOT[d.item].icon} ${(nl ? LOOT[d.item].nl : LOOT[d.item].en).toLowerCase()} (${Math.round(d.chance * 100)}%)`).join(', ')}</p>
              {light && <p><span className="font-semibold">{t('Lichtkant', 'Light side')}:</span> {light.icon} {nl ? light.nl : light.en}. {nl ? light.doesNl : light.doesEn}</p>}
              <p className="text-ink-700">💡 {nl ? b.tipNl : b.tipEn}</p>
              {shown ? (
                <Button size="sm" className="mt-1" icon={<Swords className="h-4 w-4" />} onClick={() => onGo(b.kind)} data-testid={`go-${b.kind}`}>{t('Breng me erheen', 'Take me there')}</Button>
              ) : (
                <p className="font-semibold text-[#7a3a2a]">{t(`Laat zich zien vanaf avonturier ${c.level}.`, `Shows itself from adventurer ${c.level}.`)}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
