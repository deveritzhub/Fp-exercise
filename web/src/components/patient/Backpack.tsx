import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Axe, Bike, Shield, Beef, Coins, Droplets, Footprints, Gem, Hammer, Lock, Swords } from 'lucide-react';
import { ARMOURS, armourByKey, BERRIES_FOR, LOOT, LOOT_KEYS, RECIPES, RIDES, TOOLS, WEAPONS, weaponByKey, type LootKey } from '@shared/adventure';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Button, Card, Spinner, useToast } from '@/components/ui';
import type { HeroState } from '@/lib/types';
import { ItemIcon } from './ItemIcon';
import { useSupplies } from '@/lib/supplies';

type Adventure = { level: number; weapon: string | null; owned: string[]; coins: number; loot?: Record<string, number>; tools?: string[]; rides?: string[]; built?: string[]; strength?: number; lootCap?: number; armour?: string | null };

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
  const wearArmour = (key: string | null, name: string) =>
    act(key ? `armour:${key}` : 'armour-off', () => api.put<Adventure>('/patient/hero/adventure/armour', { key }), key ? t(`${name} aan.`, `${name} on.`) : t(`${name} uit.`, `${name} off.`));
  const buyTool = (key: string, name: string) => act(`tool:${key}`, () => api.post<Adventure>('/patient/hero/adventure/tool/buy', { key }), t(`${name} gekocht!`, `${name} bought!`));
  const buyRide = (key: string, name: string) => act(`ride:${key}`, () => api.post<Adventure>('/patient/hero/adventure/ride/buy', { key }), t(`${name} gekocht! Stap op in het dorp.`, `${name} bought! Get on in the village.`));
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
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]"><ItemIcon k={w.key} emoji={ICON[w.key] ?? '⚔️'} /></span>
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

      <h3 className="mt-5 flex items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Shield className="h-4 w-4" aria-hidden />{t('Harnas', 'Armour')}</h3>
      <p className="mt-1 text-[13.5px] text-ink-700">{t('Een harnas dempt de klappen van wezens. Je maakt het van vachten en huiden onder “Maken”.', 'Armour softens the blows of creatures. You make it from pelts and hides under “Make”.')}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="armours">
        {ARMOURS.filter((ar) => a?.built?.includes(ar.key)).map((ar) => {
          const name = nl ? ar.nl : ar.en;
          const on = a?.armour === ar.key;
          return (
            <li key={ar.key} data-armour={ar.key} data-state={on ? 'on' : 'owned'} className={cn('flex items-center gap-3 rounded-xl border p-2.5', on ? 'border-[#b8892a] bg-[#fbf0d9]' : 'border-line bg-white')}>
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]"><ItemIcon k={ar.key} emoji={RECIPES.find((r) => r.key === ar.key)?.icon ?? '🛡️'} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-ink-950">{name}</span>
                <span className="block text-[12.5px] text-ink-700">{t(`${Math.round(ar.guard * 100)}% minder schade`, `${Math.round(ar.guard * 100)}% less damage`)}</span>
              </span>
              {on ? (
                <Button size="sm" variant="secondary" loading={busy === 'armour-off'} onClick={() => void wearArmour(null, name)} aria-label={t(`Doe ${name} uit`, `Take ${name} off`)}>{t('Uit', 'Off')}</Button>
              ) : (
                <Button size="sm" loading={busy === `armour:${ar.key}`} onClick={() => void wearArmour(ar.key, name)} aria-label={t(`Doe ${name} aan`, `Put ${name} on`)}>{t('Aan', 'On')}</Button>
              )}
            </li>
          );
        })}
      </ul>
      {!ARMOURS.some((ar) => a?.built?.includes(ar.key)) && <p className="mt-2 text-[13px] text-ink-600" data-testid="no-armour">{t('Nog geen harnas. Het eerste, een leren harnas, maak je van 3 koeienhuiden.', 'No armour yet. The first, leather armour, takes 3 cowhides.')}</p>}

      <h3 id="tools-title" className="mt-5 flex scroll-mt-20 items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Axe className="h-4 w-4" aria-hidden />{t('Gereedschapswinkel', 'Tool shop')}</h3>
      <p className="mt-1 text-[13.5px] text-ink-700">{t('Grote eiken hak je alleen met een hakbijl, grote rotsen breek je alleen met een pikhouweel; die geven veel meer. Takken en steentjes raap je met de hand op.', 'Big oaks are chopped only with a hatchet, big rocks broken only with a pickaxe; they give much more. Twigs and pebbles are picked up by hand.')}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="tools">
        {TOOLS.map((tool) => {
          const name = nl ? tool.nl : tool.en;
          const has = !!a?.tools?.includes(tool.key);
          const short = !has && (a?.coins ?? 0) < tool.price;
          return (
            <li key={tool.key} data-tool={tool.key} data-state={has ? 'owned' : 'shop'} className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5">
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]"><ItemIcon k={tool.key} emoji={tool.icon} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-ink-950">{name}</span>
                <span className="block text-[12.5px] text-ink-700">{tool.key === 'hatchet' ? t('Nodig om eiken te hakken; geeft dubbel zoveel hout.', 'Needed to chop oaks; gives twice the wood.') : t('Rotsen breken drie keer zo snel en geven dubbel zoveel steen. Met de hand kan het ook.', 'Rocks break three times as fast and give twice the stone. By hand works too.')}{!has && <> · <span className="inline-flex items-center gap-0.5 font-semibold text-[#855806]"><Coins className="h-3 w-3" aria-hidden />{tool.price}</span></>}</span>
              </span>
              {has ? <span className="shrink-0 text-[12.5px] font-semibold text-[#6b4705]">{t('In je rugzak', 'In your pack')}</span> : (
                <Button size="sm" disabled={short || !a} loading={busy === `tool:${tool.key}`} onClick={() => void buyTool(tool.key, name)} aria-label={t(`Koop ${name} voor ${tool.price} muntjes`, `Buy ${name} for ${tool.price} coins`)}>{short ? t(`Nog ${tool.price - (a?.coins ?? 0)}`, `${tool.price - (a?.coins ?? 0)} short`) : t('Koop', 'Buy')}</Button>
              )}
            </li>
          );
        })}
      </ul>

      <h3 id="rides-title" className="mt-5 flex scroll-mt-20 items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Bike className="h-4 w-4" aria-hidden />{t('Stallen: vervoer', 'Stables: rides')}</h3>
      <p className="mt-1 text-[13.5px] text-ink-700">{t('Sneller door het dorp en de jachtgronden. In de wereld stap je op en af met de knop rechts. Vechten, oprapen en naar binnen gaan doe je te voet.', 'Faster round the village and the hunting grounds. In the world you get on and off with the button on the right. Fighting, picking up and going inside are done on foot.')}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="rides">
        {RIDES.map((ride) => {
          const name = nl ? ride.nl : ride.en;
          const has = !!a?.rides?.includes(ride.key);
          const low = !has && (a?.level ?? 1) < ride.level;
          const short = !has && !low && (a?.coins ?? 0) < ride.price;
          return (
            <li key={ride.key} data-ride={ride.key} data-state={has ? 'owned' : low ? 'locked' : 'shop'} className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5">
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]">{ride.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-ink-950">{name}</span>
                <span className="block text-[12.5px] text-ink-700">{t(`${String(ride.speed).replace('.', ',')}× zo snel als lopen`, `${ride.speed}× as fast as walking`)}{!has && <> · <span className="inline-flex items-center gap-0.5 font-semibold text-[#855806]"><Coins className="h-3 w-3" aria-hidden />{ride.price}</span></>}</span>
              </span>
              {has ? <span className="shrink-0 text-[12.5px] font-semibold text-[#6b4705]">{t('In de stal', 'In the stable')}</span> : low ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-ink-600"><Lock className="h-3.5 w-3.5" aria-hidden />{t(`Level ${ride.level}`, `Level ${ride.level}`)}</span>
              ) : (
                <Button size="sm" disabled={short || !a} loading={busy === `ride:${ride.key}`} onClick={() => void buyRide(ride.key, name)} aria-label={t(`Koop ${name} voor ${ride.price} muntjes`, `Buy ${name} for ${ride.price} coins`)}>{short ? t(`Nog ${ride.price - (a?.coins ?? 0)}`, `${ride.price - (a?.coins ?? 0)} short`) : t('Koop', 'Buy')}</Button>
              )}
            </li>
          );
        })}
      </ul>

      <h3 id="craft-title" className="mt-5 flex scroll-mt-20 items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Hammer className="h-4 w-4" aria-hidden />{t('Maken', 'Make')}</h3>
      <p className="mt-1 text-[13.5px] text-ink-700">{t('Liever niet jagen? Huid, bot en veren betaal je ook met bessen. ', 'Rather not hunt? Hide, bone and feathers can be paid with berries too. ')}{t('Maak van je buit een eenvoudig wapen of een kist. In een kist bewaar je tot 99 stuks per soort in plaats van 20; dat heb je nodig voor de grotere huizen.', 'Make a simple weapon or a chest from your loot. A chest keeps up to 99 of a kind instead of 20; the bigger homes need that.')}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="recipes">
        {RECIPES.map((r) => {
          const name = nl ? r.nl : r.en;
          const weapon = r.kind === 'weapon' ? WEAPONS.find((w) => w.key === r.key) : undefined;
          const have = weapon ? !!a?.owned.includes(r.key) : !!a?.built?.includes(r.key);
          const armourRow = r.kind === 'armour' ? armourByKey(r.key) : null;
          const needLevel = weapon?.level ?? armourRow?.level ?? 1;
          const low = (a?.level ?? 1) < needLevel;
          const needs = Object.entries(r.needs) as [LootKey, number][];
          // Animal loot that is short can be paid with berries (the server decides in the end).
          let berries = a?.loot?.berries ?? 0;
          const enough = needs.every(([k, n]) => {
            const short = n - Math.min(n, a?.loot?.[k] ?? 0);
            if (short <= 0) return true;
            const rate = BERRIES_FOR[k];
            if (!rate || berries < short * rate) return false;
            berries -= short * rate;
            return true;
          });
          return (
            <li key={r.key} data-recipe={r.key} data-state={have ? 'made' : low ? 'locked' : enough ? 'ready' : 'short'} className={cn('flex items-center gap-3 rounded-xl border p-2.5', have ? 'border-[#b8892a] bg-[#fbf0d9]' : 'border-line bg-white')}>
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]"><ItemIcon k={r.key} emoji={r.icon} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-ink-950">{name}{armourRow && <span className="font-normal text-ink-700"> · {t(`${Math.round(armourRow.guard * 100)}% minder schade`, `${Math.round(armourRow.guard * 100)}% less damage`)}</span>}</span>
                <span className="block text-[12.5px] text-ink-700">
                  {needs.map(([k, n], i) => <span key={k}>{i > 0 && ' · '}<span className="inline-grid h-4 w-4 place-items-center align-[-3px]"><ItemIcon k={k} emoji={LOOT[k].icon} className="!h-4 !w-4" /></span> {(nl ? LOOT[k].nl : LOOT[k].en).toLowerCase()} {Math.min(a?.loot?.[k] ?? 0, n)}/{n}</span>)}
                </span>
              </span>
              {have ? <span className="shrink-0 text-[12.5px] font-semibold text-[#6b4705]">{t('Heb je', 'Owned')}</span>
                : low ? <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-ink-600"><Lock className="h-3.5 w-3.5" aria-hidden />{t(`Level ${needLevel}`, `Level ${needLevel}`)}</span>
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
              {n > 0 ? <ItemIcon k={k} emoji={LOOT[k].icon} /> : <span aria-hidden>?</span>}
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
