import { Link } from 'react-router-dom';
import { ChevronRight, Heart, Shield, Sparkles, Swords } from 'lucide-react';
import { AMMO, ARMOURS, COMBAT_SKILLS, RIDES, TOOLS, WEAPONS, ammoFor, armourByKey, skillPower, weaponByKey, type Weapon, type WeaponStyle } from '@shared/adventure';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Button, Spinner } from '@/components/ui';
import { ItemIcon } from './ItemIcon';
import { ICON, useAdventureActions, weaponLine } from './Backpack';

const STYLE_WORD: Record<WeaponStyle, [string, string]> = { melee: ['Zwaard en vuist', 'Close by'], ranged: ['Bogen', 'Bows'], magic: ['Magie', 'Magic'] };

/** A bar for a level: how far to the next one. */
function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <span className="relative block h-2 overflow-hidden rounded-full bg-black/10" aria-hidden>
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.round(Math.min(1, Math.max(0, max ? value / max : 0)) * 100)}%`, background: color }} />
    </span>
  );
}

/**
 * The hero's gear, inside the game: the adventurer level, the three ways to fight with their skill,
 * and every slot (weapon, armour, arrows and runes, tools, ride) with what can be put on or off.
 */
export function GearScreen({ hp, maxHp }: { hp: number; maxHp: number }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const { a, busy, wear, wearArmour } = useAdventureActions();
  if (!a) return <Spinner />;
  const worn = weaponByKey(a.weapon);
  const armour = armourByKey(a.armour);
  const ammo = ammoFor(worn.style);
  const skillOf = (k: WeaponStyle) => a.skills?.[k] ?? { xp: 0, level: 1, from: 0, to: 60 };
  const owned = WEAPONS.filter((w) => w.key !== 'fists' && a.owned.includes(w.key));
  const xp = a.xp ?? 0;
  const from = a.from ?? 0;
  const to = a.to ?? 60;
  const blowNow = Math.round((1 + worn.power) * skillPower(skillOf(worn.style).level) * 10) / 10;
  const weaponRow = (w: Weapon) => {
    const on = worn.key === w.key;
    const name = nl ? w.nl : w.en;
    return (
      <li key={w.key} data-gear-weapon={w.key} data-state={on ? 'on' : 'owned'} className={cn('flex items-center gap-3 rounded-xl border p-2.5', on ? 'border-[#b8892a] bg-[#fbf0d9]' : 'border-line bg-white')}>
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]"><ItemIcon k={w.key} emoji={ICON[w.key] ?? '⚔️'} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold text-ink-950">{name}</span>
          <span className="block text-[12.5px] text-ink-700">{w.key === 'fists' ? t('Altijd bij je', 'Always with you') : weaponLine(w, nl)}</span>
        </span>
        {on ? (
          w.key === 'fists' ? <span className="text-[12.5px] font-semibold text-[#6b4705]">{t('In de hand', 'In hand')}</span>
            : <Button size="sm" variant="secondary" loading={busy === 'off'} onClick={() => void wear(null, name)} aria-label={t(`Doe ${name} uit`, `Take ${name} off`)}>{t('Uit', 'Off')}</Button>
        ) : w.key === 'fists' ? null : (
          <Button size="sm" loading={busy === w.key} onClick={() => void wear(w.key, name)} aria-label={t(`Doe ${name} aan`, `Put ${name} on`)}>{t('Aan', 'On')}</Button>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-5" data-testid="gear-screen">
      {/* The adventurer: level, XP to the next, life, blow and guard. */}
      <section className="rounded-2xl border border-[#e4bc63] bg-[linear-gradient(180deg,#2f4a3f,#1c2f28)] p-4 text-white" aria-labelledby="gear-level">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#e4bc63] bg-[#141c18] text-[24px] font-bold text-[#ffd76a]" aria-hidden>{a.level}</span>
          <div className="min-w-0 flex-1">
            <h3 id="gear-level" className="flex items-center gap-1.5 text-[17px] font-semibold"><Sparkles className="h-4 w-4 text-[#ffd76a]" aria-hidden />{t(`Avonturier ${a.level}`, `Adventurer ${a.level}`)}</h3>
            <p className="text-[13px] text-white/80" data-testid="gear-xp">{t(`${xp - from} van ${to - from} XP · nog ${to - xp} XP tot level ${a.level + 1}`, `${xp - from} of ${to - from} XP · ${to - xp} XP to level ${a.level + 1}`)}</p>
            <div className="mt-1.5"><Bar value={xp - from} max={to - from} color="#ffd76a" /></div>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {([[Heart, t('Leven', 'Life'), `${Math.round(hp)}/${maxHp}`], [Swords, t('Klap', 'Blow'), String(blowNow).replace('.', nl ? ',' : '.')], [Shield, t('Bescherming', 'Guard'), `${Math.round((armour?.guard ?? 0) * 100)}%`]] as const).map(([Icon, label, value]) => (
            <div key={label} className="rounded-xl bg-black/30 px-2 py-2">
              <dt className="flex items-center justify-center gap-1 text-[11.5px] text-white/75"><Icon className="h-3.5 w-3.5" aria-hidden />{label}</dt>
              <dd className="text-[16px] font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* The three ways to fight, each a skill of its own. */}
      <section aria-labelledby="gear-skills">
        <h3 id="gear-skills" className="text-[15px] font-semibold text-ink-950">{t('Vechtstijlen', 'Ways to fight')}</h3>
        <p className="mt-0.5 text-[13px] text-ink-700">{t('Wat je in de hand hebt, groeit mee: elke overwinning geeft XP aan die stijl, en elk level slaat 5% harder.', 'What you hold grows with you: every win gives XP to that style, and each level hits 5% harder.')}</p>
        <ul className="mt-2 space-y-2" data-testid="gear-skills">
          {COMBAT_SKILLS.map((k) => {
            const sk = skillOf(k.key);
            return (
              <li key={k.key} data-skill={k.key} data-level={sk.level} className={cn('rounded-xl border p-2.5', worn.style === k.key ? 'border-[#b8892a] bg-[#fbf0d9]' : 'border-line bg-white')}>
                <div className="flex items-center justify-between gap-2 text-[14px]">
                  <span className="font-semibold text-ink-950"><span aria-hidden>{k.icon}</span> {nl ? k.nl : k.en}{worn.style === k.key && <span className="ml-1.5 text-[12px] font-medium text-[#6b4705]">{t('· nu in gebruik', '· in use')}</span>}</span>
                  <span className="tabular-nums text-ink-700">{t(`level ${sk.level}`, `level ${sk.level}`)}</span>
                </div>
                <div className="mt-1.5"><Bar value={sk.xp - sk.from} max={sk.to - sk.from} color={k.key === 'magic' ? '#8b6cf0' : k.key === 'ranged' ? '#2f8a45' : '#c2452b'} /></div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* In the hand: every weapon owned, by kind. */}
      <section aria-labelledby="gear-hand">
        <h3 id="gear-hand" className="flex items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Swords className="h-4 w-4" aria-hidden />{t('In de hand', 'In hand')}</h3>
        {(['melee', 'ranged', 'magic'] as const).map((style) => {
          const list = style === 'melee' ? [WEAPONS[0], ...owned.filter((w) => w.style === 'melee')] : owned.filter((w) => w.style === style);
          if (!list.length) return null;
          return (
            <div key={style} className="mt-2">
              <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-600">{STYLE_WORD[style][nl ? 0 : 1]}</p>
              <ul className="mt-1 grid gap-2 sm:grid-cols-2">{list.map(weaponRow)}</ul>
            </div>
          );
        })}
        {!owned.some((w) => w.style !== 'melee') && (
          <p className="mt-2 text-[13px] text-ink-700">{t('Een boog koop je bij de smederij, een toverstokje in de magiërstoren.', 'A bow is sold at the smithy, a wand at the mage tower.')}</p>
        )}
      </section>

      {/* Arrows and runes: what a bow and magic use up. */}
      <section aria-labelledby="gear-ammo">
        <h3 id="gear-ammo" className="text-[15px] font-semibold text-ink-950">{t('Pijlen en runen', 'Arrows and runes')}</h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {(['arrows', 'runes'] as const).map((k) => {
            const n = (k === 'arrows' ? a.arrows : a.runes) ?? 0;
            const needed = ammo === k;
            return (
              <li key={k} data-ammo={k} data-n={n} className={cn('flex items-center gap-3 rounded-xl border p-2.5', needed && n === 0 ? 'border-[#c2452b] bg-[#fdeee9]' : 'border-line bg-white')}>
                <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]">{AMMO[k].icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-ink-950">{nl ? AMMO[k].nl : AMMO[k].en}: {n}</span>
                  <span className="block text-[12.5px] text-ink-700">{needed && n === 0 ? t('Op! Je vecht nu met je vuisten.', 'Out! You fight with your fists now.') : k === 'arrows' ? t('Gemaakt in de werkplaats', 'Made in the workshop') : t('Gemaakt in de magiërstoren', 'Made in the mage tower')}</span>
                </span>
                <Link to={k === 'arrows' ? '/p/winkel/werkplaats' : '/p/winkel/magie'} className="inline-flex min-h-[40px] items-center gap-0.5 text-[13.5px] font-semibold text-accent">{t('Maken', 'Make')}<ChevronRight className="h-4 w-4" aria-hidden /></Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Armour: what was made, one worn at a time. */}
      <section aria-labelledby="gear-armour">
        <h3 id="gear-armour" className="flex items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Shield className="h-4 w-4" aria-hidden />{t('Harnas', 'Armour')}</h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="gear-armours">
          {ARMOURS.filter((ar) => a.built?.includes(ar.key)).map((ar) => {
            const name = nl ? ar.nl : ar.en;
            const on = a.armour === ar.key;
            return (
              <li key={ar.key} data-gear-armour={ar.key} data-state={on ? 'on' : 'owned'} className={cn('flex items-center gap-3 rounded-xl border p-2.5', on ? 'border-[#b8892a] bg-[#fbf0d9]' : 'border-line bg-white')}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-ink-950">{name}</span>
                  <span className="block text-[12.5px] text-ink-700">{t(`${Math.round(ar.guard * 100)}% minder schade`, `${Math.round(ar.guard * 100)}% less damage`)}</span>
                </span>
                {on ? <Button size="sm" variant="secondary" loading={busy === 'armour-off'} onClick={() => void wearArmour(null, name)}>{t('Uit', 'Off')}</Button>
                  : <Button size="sm" loading={busy === `armour:${ar.key}`} onClick={() => void wearArmour(ar.key, name)}>{t('Aan', 'On')}</Button>}
              </li>
            );
          })}
        </ul>
        {!a.built?.some((k) => ARMOURS.some((ar) => ar.key === k)) && (
          <p className="mt-1 text-[13px] text-ink-700">{t('Nog geen harnas. De pantsermaker maakt er een van huiden en vachten (vanaf level 2).', 'No armour yet. The armourer makes one from hides and pelts (from level 2).')}</p>
        )}
      </section>

      {/* Tools and the ride: always at hand, used by themselves. */}
      <section aria-labelledby="gear-more">
        <h3 id="gear-more" className="text-[15px] font-semibold text-ink-950">{t('Gereedschap en rijdier', 'Tools and ride')}</h3>
        <ul className="mt-2 flex flex-wrap gap-2 text-[13.5px]">
          {TOOLS.map((tool) => (
            <li key={tool.key} className={cn('rounded-full border px-3 py-1.5', a.tools?.includes(tool.key) ? 'border-[#b8892a] bg-[#fbf0d9] text-ink-950' : 'border-line text-ink-500')}>
              <span aria-hidden>{tool.icon}</span> {nl ? tool.nl : tool.en}{a.tools?.includes(tool.key) ? '' : t(' · nog niet', ' · not yet')}
            </li>
          ))}
          {RIDES.filter((r) => a.rides?.includes(r.key)).map((r) => (
            <li key={r.key} className="rounded-full border border-[#b8892a] bg-[#fbf0d9] px-3 py-1.5 text-ink-950"><span aria-hidden>{r.icon}</span> {nl ? r.nl : r.en}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {([['/p/winkel/smid', t('Smederij: wapens en bogen', 'Smithy: weapons and bows')], ['/p/winkel/magie', t('Magiërstoren', 'Mage tower')], ['/p/winkel/pantser', t('Pantsermaker', 'Armourer')]] as const).map(([to, label]) => (
          <Link key={to} to={to} className="inline-flex min-h-[44px] items-center gap-0.5 text-[14px] font-semibold text-accent">{label}<ChevronRight className="h-4 w-4" aria-hidden /></Link>
        ))}
      </div>
    </div>
  );
}
