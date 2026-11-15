import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Axe, Beef, Coins, Droplets, Footprints, Gem, Hammer, Lock, Swords } from 'lucide-react';
import { LOOT, LOOT_KEYS, RECIPES, TOOLS, WEAPONS, weaponByKey, type LootKey } from '@shared/adventure';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Button, Card, Spinner, useToast } from '@/components/ui';
import type { HeroState } from '@/lib/types';
import { useSupplies } from '@/lib/supplies';

type Adventure = { level: number; weapon: string | null; owned: string[]; coins: number; loot?: Record<string, number>; tools?: string[]; built?: string[]; strength?: number; lootCap?: number };

const ICON: Record<string, string> = { fists: '✊', staff: '🦯', gloves: '🥊', club: '🏏', hammer: '🔨', sword: '🗡️', axe: '🪓', spear: '🔱', hero_sword: '⚔️' };
/**
 * The backpack: the weapons of the adventure (bought with coins, put on or off) and what the hero
 * carries for the day: the flask, and the water, protein and steps of today.
 */
export function BackpackCard({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['patient-adventure'], queryFn: () => api.get<Adventure>('/patient/hero/adventure') });
  const [busy, setBusy] = useState<string | null>(null);
  const supply = useSupplies(d.logs?.survival.water.ml ?? 0, !!d.hero);
  const a = q.data;
  const worn = weaponByKey(a?.weapon);

  const act = async (key: string, run: () => Promise<Adventure>, done: string) => {
    setBusy(key);
    try {
      qc.setQueryData(['patient-adventure'], await run());
      void qc.invalidateQueries({ queryKey: ['patient-hero'] });
      toast(done);
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };
  const wear = (key: string | null, name: string) =>
    act(key ?? 'off', () => api.put<Adventure>('/patient/hero/adventure/weapon', { key }), key ? t(`${name} in de hand.`, `${name} in hand.`) : t('Wapen opgeborgen. Je vecht met je vuisten.', 'Weapon put away. You fight with your fists.'));
  const buyTool = (key: string, name: string) => act(`tool:${key}`, () => api.post<Adventure>('/patient/hero/adventure/tool/buy', { key }), t(`${name} gekocht!`, `${name} bought!`));
  const craft = (key: string, name: string) => act(`craft:${key}`, () => api.post<Adventure>('/patient/hero/adventure/craft', { key }), t(`${name} gemaakt!`, `${name} made!`));
  const buy = (key: string, name: string) => act(key, () => api.post<Adventure>('/patient/hero/adventure/weapon/buy', { key }), t(`${name} gekocht en in de hand!`, `${name} bought and in hand!`));

  const logs = d.logs;
  const supplies = logs ? [
    { key: 'water', Icon: Droplets, color: '#2f7fc4', label: t('Water vandaag', 'Water today'), text: `${(logs.survival.water.ml / 1000).toLocaleString(nl ? 'nl-NL' : 'en-GB', { maximumFractionDigits: 1 })} / ${(logs.survival.water.target / 1000).toLocaleString(nl ? 'nl-NL' : 'en-GB', { maximumFractionDigits: 1 })} l`, ratio: logs.survival.water.ratio },
    { key: 'protein', Icon: Beef, color: '#c2452b', label: t('Eiwit vandaag', 'Protein today'), text: logs.protein.goal ? `${Math.round(logs.protein.grams)} / ${logs.protein.goal} g` : `${Math.round(logs.protein.grams)} g`, ratio: logs.protein.goal ? logs.protein.grams / logs.protein.goal : 0 },
    { key: 'steps', Icon: Footprints, color: '#2f8a45', label: t('Stappen vandaag', 'Steps today'), text: `${logs.steps.today.toLocaleString(nl ? 'nl-NL' : 'en-GB')} / ${logs.steps.goal.toLocaleString(nl ? 'nl-NL' : 'en-GB')}`, ratio: logs.steps.goal ? logs.steps.today / logs.steps.goal : 0 },
  ] : [];

  // Nothing to buy or make until the purse and the loot are known.
  if (!a) return <Card className="p-5"><h2 id="backpack-title" className="t-section scroll-mt-20">{t('Rugzak', 'Backpack')}</h2><div className="mt-3"><Spinner /></div></Card>;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="backpack-title" className="t-section scroll-mt-20">{t('Rugzak', 'Backpack')}</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#fbf0d9] px-2.5 py-1 text-[13px] font-semibold text-[#855806]" data-testid="backpack-coins">
          <Coins className="h-4 w-4" aria-hidden />{t(`${a?.coins ?? d.gear.coins} muntjes`, `${a?.coins ?? d.gear.coins} coins`)}
        </span>
      </div>

      <h3 className="mt-4 flex items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Swords className="h-4 w-4" aria-hidden />{t('Wapens', 'Weapons')}</h3>
      <p className="mt-1 text-[13.5px] text-ink-700">
        {t(`In de hand: ${worn.nl}${worn.power > 0 ? ` (+${worn.power} kracht per slag)` : ''}. Koop wapens met muntjes; je avonturier-level bepaalt wat de smid verkoopt.`,
          `In hand: ${worn.en}${worn.power > 0 ? ` (+${worn.power} power per blow)` : ''}. Buy weapons with coins; your adventurer level decides what the smith sells.`)}
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="weapons">
        {WEAPONS.map((w) => {
          const name = nl ? w.nl : w.en;
          const fists = w.key === 'fists';
          const owned = fists || !!a?.owned.includes(w.key);
          const on = worn.key === w.key;
          const weak = !owned && (a?.strength ?? 1) < w.strength;
          const locked = !owned && ((a?.level ?? 1) < w.level || weak);
          const short = !owned && !locked && (a?.coins ?? 0) < w.price;
          return (
            <li key={w.key} data-weapon={w.key} data-state={on ? 'on' : owned ? 'owned' : locked ? 'locked' : 'shop'}
              className={cn('flex items-center gap-3 rounded-xl border p-2.5', on ? 'border-[#b8892a] bg-[#fbf0d9]' : 'border-line bg-white')}>
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]">{ICON[w.key] ?? '⚔️'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold text-ink-950">{name}</span>
                <span className="block text-[12.5px] text-ink-700">
                  {fists ? t('Altijd bij je', 'Always with you') : t(`+${w.power} per slag`, `+${w.power} per blow`)}{w.strength > 0 && !owned ? t(` · kracht-skill ${w.strength}`, ` · strength skill ${w.strength}`) : ''}
                  {!owned && <> · <span className="inline-flex items-center gap-0.5 font-semibold text-[#855806]"><Coins className="h-3 w-3" aria-hidden />{w.price}</span></>}
                </span>
              </span>
              {locked ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-ink-600"><Lock className="h-3.5 w-3.5" aria-hidden />{(a?.level ?? 1) < w.level ? t(`Level ${w.level}`, `Level ${w.level}`) : t(`Kracht ${w.strength}`, `Strength ${w.strength}`)}</span>
              ) : !owned ? (
                <Button size="sm" disabled={short || !a} loading={busy === w.key} onClick={() => void buy(w.key, name)} aria-label={t(`Koop ${name} voor ${w.price} muntjes`, `Buy ${name} for ${w.price} coins`)}>
                  {short ? t(`Nog ${w.price - (a?.coins ?? 0)}`, `${w.price - (a?.coins ?? 0)} short`) : t('Koop', 'Buy')}
                </Button>
              ) : fists ? (
                on ? <span className="shrink-0 text-[12.5px] font-semibold text-[#6b4705]">{t('In de hand', 'In hand')}</span> : null
              ) : on ? (
                <Button size="sm" variant="secondary" loading={busy === 'off'} onClick={() => void wear(null, name)} aria-label={t(`Doe ${name} uit`, `Take ${name} off`)}>{t('Uit', 'Off')}</Button>
              ) : (
                <Button size="sm" loading={busy === w.key} onClick={() => void wear(w.key, name)} aria-label={t(`Doe ${name} aan`, `Put ${name} on`)}>{t('Aan', 'On')}</Button>
              )}
            </li>
          );
        })}
      </ul>

      <h3 className="mt-5 flex items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Axe className="h-4 w-4" aria-hidden />{t('Gereedschap', 'Tools')}</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="tools">
        {TOOLS.map((tool) => {
          const name = nl ? tool.nl : tool.en;
          const has = !!a?.tools?.includes(tool.key);
          const short = !has && (a?.coins ?? 0) < tool.price;
          return (
            <li key={tool.key} data-tool={tool.key} data-state={has ? 'owned' : 'shop'} className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5">
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]">{tool.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-ink-950">{name}</span>
                <span className="block text-[12.5px] text-ink-700">{t('Hak er eiken mee voor hout.', 'Chop oaks with it for wood.')}{!has && <> · <span className="inline-flex items-center gap-0.5 font-semibold text-[#855806]"><Coins className="h-3 w-3" aria-hidden />{tool.price}</span></>}</span>
              </span>
              {has ? <span className="shrink-0 text-[12.5px] font-semibold text-[#6b4705]">{t('In je rugzak', 'In your pack')}</span> : (
                <Button size="sm" disabled={short || !a} loading={busy === `tool:${tool.key}`} onClick={() => void buyTool(tool.key, name)} aria-label={t(`Koop ${name} voor ${tool.price} muntjes`, `Buy ${name} for ${tool.price} coins`)}>{short ? t(`Nog ${tool.price - (a?.coins ?? 0)}`, `${tool.price - (a?.coins ?? 0)} short`) : t('Koop', 'Buy')}</Button>
              )}
            </li>
          );
        })}
      </ul>

      <h3 id="craft-title" className="mt-5 flex scroll-mt-20 items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Hammer className="h-4 w-4" aria-hidden />{t('Maken', 'Make')}</h3>
      <p className="mt-1 text-[13.5px] text-ink-700">{t('Maak van je buit een eenvoudig wapen of een kist. In een kist bewaar je tot 99 stuks per soort in plaats van 20; dat heb je nodig voor de grotere huizen.', 'Make a simple weapon or a chest from your loot. A chest keeps up to 99 of a kind instead of 20; the bigger homes need that.')}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="recipes">
        {RECIPES.map((r) => {
          const name = nl ? r.nl : r.en;
          const weapon = r.kind === 'weapon' ? WEAPONS.find((w) => w.key === r.key) : undefined;
          const have = weapon ? !!a?.owned.includes(r.key) : !!a?.built?.includes(r.key);
          const low = !!weapon && (a?.level ?? 1) < weapon.level;
          const needs = Object.entries(r.needs) as [LootKey, number][];
          const enough = needs.every(([k, n]) => (a?.loot?.[k] ?? 0) >= n);
          return (
            <li key={r.key} data-recipe={r.key} data-state={have ? 'made' : low ? 'locked' : enough ? 'ready' : 'short'} className={cn('flex items-center gap-3 rounded-xl border p-2.5', have ? 'border-[#b8892a] bg-[#fbf0d9]' : 'border-line bg-white')}>
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]">{r.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-ink-950">{name}</span>
                <span className="block text-[12.5px] text-ink-700">
                  {needs.map(([k, n], i) => <span key={k}>{i > 0 && ' · '}<span aria-hidden>{LOOT[k].icon}</span> {(nl ? LOOT[k].nl : LOOT[k].en).toLowerCase()} {Math.min(a?.loot?.[k] ?? 0, n)}/{n}</span>)}
                </span>
              </span>
              {have ? <span className="shrink-0 text-[12.5px] font-semibold text-[#6b4705]">{t('Heb je', 'Owned')}</span>
                : low ? <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-ink-600"><Lock className="h-3.5 w-3.5" aria-hidden />{t(`Level ${weapon!.level}`, `Level ${weapon!.level}`)}</span>
                : <Button size="sm" disabled={!enough || !a} loading={busy === `craft:${r.key}`} onClick={() => void craft(r.key, name)} aria-label={t(`Maak ${name}`, `Make ${name}`)}>{t('Maak', 'Make')}</Button>}
            </li>
          );
        })}
      </ul>

      <h3 className="mt-5 flex items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Gem className="h-4 w-4" aria-hidden />{t('Buit', 'Loot')}</h3>
      <p className="mt-1 text-[13.5px] text-ink-700">{t(`Wat kwaaltjes, dieren en bomen in je dorp opleveren. Een vakje met een vraagteken heb je nog niet gevonden. Je bewaart er ${a?.lootCap ?? 20} per soort.`, `What ailments, animals and trees in your village drop. A square with a question mark is one you have not found yet. You keep ${a?.lootCap ?? 20} of a kind.`)}</p>
      <ul className="mt-2 grid grid-cols-5 gap-2" data-testid="loot">
        {LOOT_KEYS.map((k) => {
          const n = a?.loot?.[k] ?? 0;
          const name = nl ? LOOT[k].nl : LOOT[k].en;
          return (
            <li key={k} data-loot={k} data-n={n} title={n > 0 ? name : undefined} aria-label={n > 0 ? `${name}: ${n}` : t('Nog niet gevonden', 'Not found yet')}
              className={cn('relative grid aspect-square place-items-center rounded-xl border text-[24px]', n > 0 ? 'border-[#e4bc63] bg-[#fbf0d9]' : 'border-line bg-canvas text-ink-600')}>
              <span aria-hidden>{n > 0 ? LOOT[k].icon : '?'}</span>
              {n > 0 && <span aria-hidden className="absolute bottom-0.5 right-1 text-[11.5px] font-bold tabular-nums text-ink-950">{n}</span>}
            </li>
          );
        })}
      </ul>

      <h3 className="mt-5 flex items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Droplets className="h-4 w-4" aria-hidden />{t('Voorraad', 'Supplies')}</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5" data-testid="backpack-flask">
          <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]">🧴</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-semibold text-ink-950">{t('Veldfles', 'Flask')} · {supply.glasses} {t(supply.glasses === 1 ? 'glas' : 'glazen', supply.glasses === 1 ? 'glass' : 'glasses')}</span>
            <span className="block text-[12.5px] text-ink-700">{t('Elk glas water dat je invult geeft je held een glas. In het dorp drinkt je held het voor +50% leven.', 'Every glass of water you log gives your hero a glass. In the village your hero drinks it for +50% life.')}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5" data-testid="backpack-rations">
          <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]">🍱</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-semibold text-ink-950">{t('Rantsoenen', 'Rations')} · {supply.rations}</span>
            <span className="block text-[12.5px] text-ink-700">{supply.fed ? t('Goed gegeten vandaag: je held is sneller en sterker.', 'Well fed today: your hero is faster and stronger.') : t(`Elke maaltijd die je bij Voeding invult geeft een rantsoen. ${supply.mainMeals}/3 maaltijden vandaag; bij 3 is je held sneller en sterker.`, `Every meal you log under Nutrition gives a ration. ${supply.mainMeals}/3 meals today; at 3 your hero is faster and stronger.`)}</span>
          </span>
        </div>
      </div>
      {supplies.length > 0 && (
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {supplies.map(({ key, Icon, color, label, text, ratio }) => (
            <li key={key} className="rounded-xl border border-line bg-white p-2.5">
              <span className="flex items-center gap-1.5 text-[12.5px] text-ink-700"><Icon className="h-4 w-4" style={{ color }} aria-hidden />{label}</span>
              <span className="mt-0.5 block text-[14.5px] font-semibold tabular-nums text-ink-950">{text}</span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-canvas" aria-hidden><span className="block h-full rounded-full" style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`, background: color }} /></span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
