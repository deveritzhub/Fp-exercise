import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Axe, Shield, Beef, ChevronRight, Coins, Droplets, Footprints, Gem, Lock, Store, Swords } from 'lucide-react';
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
/** The adventure state and what can be done with it: put on, buy, make. Shared by the backpack and the shops. */
function useAdventureActions() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['patient-adventure'], queryFn: () => api.get<Adventure>('/patient/hero/adventure') });
  const [busy, setBusy] = useState<string | null>(null);
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
  return {
    a: q.data,
    busy,
    wear: (key: string | null, name: string) =>
      act(key ?? 'off', () => api.put<Adventure>('/patient/hero/adventure/weapon', { key }), key ? t(`${name} in de hand.`, `${name} in hand.`) : t('Wapen opgeborgen. Je vecht met je vuisten.', 'Weapon put away. You fight with your fists.')),
    wearArmour: (key: string | null, name: string) =>
      act(key ? `armour:${key}` : 'armour-off', () => api.put<Adventure>('/patient/hero/adventure/armour', { key }), key ? t(`${name} aan.`, `${name} on.`) : t(`${name} uit.`, `${name} off.`)),
    buyTool: (key: string, name: string) => act(`tool:${key}`, () => api.post<Adventure>('/patient/hero/adventure/tool/buy', { key }), t(`${name} gekocht! Hij zit in je rugzak.`, `${name} bought! It is in your backpack.`)),
    buyRide: (key: string, name: string) => act(`ride:${key}`, () => api.post<Adventure>('/patient/hero/adventure/ride/buy', { key }), t(`${name} gekocht! Stap op in het dorp.`, `${name} bought! Get on in the village.`)),
    craft: (key: string, name: string) => act(`craft:${key}`, () => api.post<Adventure>('/patient/hero/adventure/craft', { key }), t(`${name} gemaakt!`, `${name} made!`)),
    buy: (key: string, name: string) => act(key, () => api.post<Adventure>('/patient/hero/adventure/weapon/buy', { key }), t(`${name} gekocht en in de hand!`, `${name} bought and in hand!`)),
  };
}

/** The shops of the town and what each sells or makes (the backpack only holds what you have). */
export const SHOPS = {
  smid: { nl: 'Smederij', en: 'Smithy', icon: '⚒️', aboutNl: 'Wapens, te koop met muntjes. De smid verkoopt wat bij je avonturier-level past.', aboutEn: 'Weapons, for coins. The smith sells what suits your adventurer level.' },
  gereedschap: { nl: 'Gereedschapswinkel', en: 'Tool shop', icon: '🛠️', aboutNl: 'Grote eiken hak je alleen met een hakbijl, grote rotsen breek je alleen met een pikhouweel; die geven veel meer. Takken en steentjes raap je met de hand op.', aboutEn: 'Big oaks are chopped only with a hatchet, big rocks broken only with a pickaxe; they give much more. Twigs and pebbles are picked up by hand.' },
  stallen: { nl: 'Stallen', en: 'Stables', icon: '🚲', aboutNl: 'Sneller door het dorp en de jachtgronden. In de wereld stap je op en af met de knop onderin. Vechten, oprapen en naar binnen gaan doe je te voet.', aboutEn: 'Faster round the village and the hunting grounds. In the world you get on and off with the button at the bottom. Fighting, picking up and going inside are done on foot.' },
  werkplaats: { nl: 'Werkplaats', en: 'Workshop', icon: '🔨', aboutNl: 'Maak van je buit een eenvoudig wapen of een kist. In een kist bewaar je tot 99 stuks per soort in plaats van 20. Liever niet jagen? Huid, bot en veren betaal je ook met bessen.', aboutEn: 'Make a simple weapon or a chest from your loot. A chest keeps up to 99 of a kind instead of 20. Rather not hunt? Hide, bone and feathers can be paid with berries too.' },
  pantser: { nl: 'Pantsermaker', en: 'Armourer', icon: '🛡️', aboutNl: 'Een harnas dempt de klappen van wezens. Je laat het maken van vachten en huiden.', aboutEn: 'Armour softens the blows of creatures. You have it made from pelts and hides.' },
} as const;
export type ShopKey = keyof typeof SHOPS;
export const isShop = (k: string | undefined): k is ShopKey => !!k && k in SHOPS;

/** A row in a list: icon, name, a line under it, and an action on the right. */
function Row({ testAttr, state, icon, name, line, action, on = false }: { testAttr: Record<string, string>; state: string; icon: React.ReactNode; name: React.ReactNode; line: React.ReactNode; action: React.ReactNode; on?: boolean }) {
  return (
    <li {...testAttr} data-state={state} className={cn('flex min-w-0 items-center gap-3 rounded-xl border p-2.5', on ? 'border-[#b8892a] bg-[#fbf0d9]' : 'border-line bg-white')}>
      <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold leading-snug text-ink-950">{name}</span>
        <span className="block text-[12.5px] leading-snug text-ink-700">{line}</span>
      </span>
      <span className="shrink-0">{action}</span>
    </li>
  );
}
const Price = ({ n }: { n: number }) => <span className="inline-flex items-center gap-0.5 font-semibold text-[#855806]"><Coins className="h-3 w-3" aria-hidden />{n}</span>;
const Owned = ({ children }: { children: React.ReactNode }) => <span className="text-[12.5px] font-semibold text-[#6b4705]">{children}</span>;

/**
 * The backpack: only what the hero has. Weapons and armour to put on, tools, rides, loot and the
 * supplies of the day. Buying and making happen in the shops of the town; what a level unlocks is
 * under Skills.
 */
export function BackpackCard({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const { a, busy, wear, wearArmour } = useAdventureActions();
  const supply = useSupplies(d.logs?.survival.water.ml ?? 0, !!d.hero);
  const worn = weaponByKey(a?.weapon);
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
      <p className="mt-1 text-[13.5px] text-ink-700">{t(`In de hand: ${worn.nl}${worn.power > 0 ? ` (+${worn.power} kracht per slag)` : ''}.`, `In hand: ${worn.en}${worn.power > 0 ? ` (+${worn.power} power per blow)` : ''}.`)}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="pack-weapons">
        {WEAPONS.filter((w) => w.key === 'fists' || a?.owned.includes(w.key)).map((w) => {
          const name = nl ? w.nl : w.en;
          const fists = w.key === 'fists';
          const on = worn.key === w.key;
          return (
            <Row key={w.key} testAttr={{ 'data-weapon': w.key }} state={on ? 'on' : 'owned'} on={on} icon={<ItemIcon k={w.key} emoji={ICON[w.key] ?? '⚔️'} />} name={name}
              line={fists ? t('Altijd bij je', 'Always with you') : t(`+${w.power} per slag`, `+${w.power} per blow`)}
              action={fists ? (on ? <Owned>{t('In de hand', 'In hand')}</Owned> : null)
                : on ? <Button size="sm" variant="secondary" loading={busy === 'off'} onClick={() => void wear(null, name)} aria-label={t(`Doe ${name} uit`, `Take ${name} off`)}>{t('Uit', 'Off')}</Button>
                : <Button size="sm" loading={busy === w.key} onClick={() => void wear(w.key, name)} aria-label={t(`Doe ${name} aan`, `Put ${name} on`)}>{t('Aan', 'On')}</Button>} />
          );
        })}
      </ul>

      <h3 className="mt-5 flex items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Shield className="h-4 w-4" aria-hidden />{t('Harnas', 'Armour')}</h3>
      <p className="mt-1 text-[13.5px] text-ink-700">{t('Een harnas dempt de klappen van wezens. Je laat het maken bij de Pantsermaker.', 'Armour softens the blows of creatures. You have it made at the Armourer.')}</p>
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

      {(TOOLS.some((x) => a?.tools?.includes(x.key)) || RIDES.some((x) => a?.rides?.includes(x.key))) && (
        <>
          <h3 className="mt-5 flex items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Axe className="h-4 w-4" aria-hidden />{t('Gereedschap en vervoer', 'Tools and rides')}</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="pack-tools">
            {TOOLS.filter((x) => a?.tools?.includes(x.key)).map((tool) => (
              <Row key={tool.key} testAttr={{ 'data-tool': tool.key }} state="owned" icon={<ItemIcon k={tool.key} emoji={tool.icon} />} name={nl ? tool.nl : tool.en}
                line={tool.key === 'hatchet' ? t('Voor de grote eiken; dubbel zoveel hout.', 'For the big oaks; twice the wood.') : t('Voor de grote rotsen; dubbel zoveel steen.', 'For the big rocks; twice the stone.')} action={null} />
            ))}
            {RIDES.filter((x) => a?.rides?.includes(x.key)).map((ride) => (
              <Row key={ride.key} testAttr={{ 'data-ride': ride.key }} state="owned" icon={ride.icon} name={nl ? ride.nl : ride.en}
                line={t(`${String(ride.speed).replace('.', ',')}× zo snel als lopen · in de stal`, `${ride.speed}× as fast as walking · in the stable`)} action={null} />
            ))}
          </ul>
        </>
      )}

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

      {/* The shops of the town: where to buy and make (what a level unlocks is under Skills). */}
      <h3 className="mt-5 flex items-center gap-1.5 text-[15px] font-semibold text-ink-950"><Store className="h-4 w-4" aria-hidden />{t('Winkels in het dorp', 'Shops in the village')}</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="pack-shops">
        {(Object.keys(SHOPS) as ShopKey[]).map((k) => (
          <li key={k}>
            <Link to={`/p/winkel/${k}`} data-shop={k} className="tap flex min-h-[52px] items-center gap-3 rounded-xl border border-line bg-white p-2.5 hover:border-ink-300">
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-canvas text-[20px]">{SHOPS[k].icon}</span>
              <span className="min-w-0 flex-1 text-[14.5px] font-semibold text-ink-950">{nl ? SHOPS[k].nl : SHOPS[k].en}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * A shop of the town: what it sells (or makes from loot) at your level. What comes at higher levels
 * is under Skills, as in a skill guide.
 */
export function ShopCard({ shop }: { shop: ShopKey }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const { a, busy, buy, buyTool, buyRide, craft } = useAdventureActions();
  const level = a?.level ?? 1;
  const coins = a?.coins ?? 0;
  const info = SHOPS[shop];
  const buyButton = (key: string, name: string, price: number, onBuy: () => void) => {
    const short = coins < price;
    return (
      <Button size="sm" disabled={short || !a} loading={busy === key} onClick={onBuy} aria-label={t(`Koop ${name} voor ${price} muntjes`, `Buy ${name} for ${price} coins`)}>
        {short ? t(`Nog ${price - coins}`, `${price - coins} short`) : t('Koop', 'Buy')}
      </Button>
    );
  };
  // The next thing that comes, as a teaser: the full list is under Skills.
  const later = (what: string | null, at: number | null) =>
    what && at ? <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-600" data-testid="shop-later"><Lock className="h-3.5 w-3.5" aria-hidden />{t(`Vanaf level ${at}: ${what}. Alles wat je vrijspeelt zie je bij Skills.`, `From level ${at}: ${what}. Everything you unlock is under Skills.`)}</p> : null;

  let list: React.ReactNode = null;
  let next: React.ReactNode = null;
  if (shop === 'smid') {
    const forSale = WEAPONS.filter((w) => w.key !== 'fists' && !a?.owned.includes(w.key) && level >= w.level);
    const soon = WEAPONS.find((w) => level < w.level);
    list = (
      <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="weapons">
        {forSale.map((w) => {
          const name = nl ? w.nl : w.en;
          const weak = (a?.strength ?? 1) < w.strength;
          return (
            <Row key={w.key} testAttr={{ 'data-weapon': w.key }} state={weak ? 'locked' : 'shop'} icon={<ItemIcon k={w.key} emoji={ICON[w.key] ?? '⚔️'} />} name={name}
              line={<>{t(`+${w.power} per slag`, `+${w.power} per blow`)}{w.strength > 0 ? t(` · kracht-skill ${w.strength}`, ` · strength skill ${w.strength}`) : ''} · <Price n={w.price} /></>}
              action={weak ? <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-600"><Lock className="h-3.5 w-3.5" aria-hidden />{t(`Kracht ${w.strength}`, `Strength ${w.strength}`)}</span> : buyButton(w.key, name, w.price, () => void buy(w.key, name))} />
          );
        })}
      </ul>
    );
    if (!forSale.length) list = <p className="mt-3 text-[14px] text-ink-700" data-testid="weapons">{t('Je hebt alles wat de smid nu verkoopt.', 'You have everything the smith sells now.')}</p>;
    next = later(soon ? (nl ? soon.nl : soon.en) : null, soon?.level ?? null);
  } else if (shop === 'gereedschap') {
    list = (
      <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="tools">
        {TOOLS.map((tool) => {
          const name = nl ? tool.nl : tool.en;
          const has = !!a?.tools?.includes(tool.key);
          return (
            <Row key={tool.key} testAttr={{ 'data-tool': tool.key }} state={has ? 'owned' : 'shop'} icon={<ItemIcon k={tool.key} emoji={tool.icon} />} name={name}
              line={<>{tool.key === 'hatchet' ? t('Nodig om eiken te hakken; geeft dubbel zoveel hout.', 'Needed to chop oaks; gives twice the wood.') : t('Rotsen breken drie keer zo snel en geven dubbel zoveel steen. Met de hand kan het ook.', 'Rocks break three times as fast and give twice the stone. By hand works too.')}{!has && <> · <Price n={tool.price} /></>}</>}
              action={has ? <Owned>{t('In je rugzak', 'In your pack')}</Owned> : buyButton(`tool:${tool.key}`, name, tool.price, () => void buyTool(tool.key, name))} />
          );
        })}
      </ul>
    );
  } else if (shop === 'stallen') {
    const forSale = RIDES.filter((r) => level >= r.level);
    const soon = RIDES.find((r) => level < r.level);
    list = (
      <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="rides">
        {forSale.map((ride) => {
          const name = nl ? ride.nl : ride.en;
          const has = !!a?.rides?.includes(ride.key);
          return (
            <Row key={ride.key} testAttr={{ 'data-ride': ride.key }} state={has ? 'owned' : 'shop'} icon={ride.icon} name={name}
              line={<>{t(`${String(ride.speed).replace('.', ',')}× zo snel als lopen`, `${ride.speed}× as fast as walking`)}{!has && <> · <Price n={ride.price} /></>}</>}
              action={has ? <Owned>{t('In de stal', 'In the stable')}</Owned> : buyButton(`ride:${ride.key}`, name, ride.price, () => void buyRide(ride.key, name))} />
          );
        })}
      </ul>
    );
    next = later(soon ? (nl ? soon.nl : soon.en) : null, soon?.level ?? null);
  } else {
    const armour = shop === 'pantser';
    const recipes = RECIPES.filter((r) => (armour ? r.kind === 'armour' : r.kind !== 'armour'));
    const needLevelOf = (r: (typeof RECIPES)[number]) => (r.kind === 'weapon' ? WEAPONS.find((w) => w.key === r.key)?.level : r.kind === 'armour' ? armourByKey(r.key)?.level : 1) ?? 1;
    const open = recipes.filter((r) => level >= needLevelOf(r));
    const soon = recipes.find((r) => level < needLevelOf(r));
    list = (
      <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="recipes">
        {open.map((r) => {
          const name = nl ? r.nl : r.en;
          const weapon = r.kind === 'weapon';
          const have = weapon ? !!a?.owned.includes(r.key) : !!a?.built?.includes(r.key);
          const armourRow = r.kind === 'armour' ? armourByKey(r.key) : null;
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
            <Row key={r.key} testAttr={{ 'data-recipe': r.key }} state={have ? 'made' : enough ? 'ready' : 'short'} on={have} icon={<ItemIcon k={r.key} emoji={r.icon} />}
              name={<>{name}{armourRow && <span className="font-normal text-ink-700"> · {t(`${Math.round(armourRow.guard * 100)}% minder schade`, `${Math.round(armourRow.guard * 100)}% less damage`)}</span>}</>}
              line={needs.map(([k, n], i) => <span key={k}>{i > 0 && ' · '}<span className="inline-grid h-4 w-4 place-items-center align-[-3px]"><ItemIcon k={k} emoji={LOOT[k].icon} className="!h-4 !w-4" /></span> {(nl ? LOOT[k].nl : LOOT[k].en).toLowerCase()} {Math.min(a?.loot?.[k] ?? 0, n)}/{n}</span>)}
              action={have ? <Owned>{t('Heb je', 'Owned')}</Owned> : <Button size="sm" disabled={!enough || !a} loading={busy === `craft:${r.key}`} onClick={() => void craft(r.key, name)} aria-label={t(`Maak ${name}`, `Make ${name}`)}>{t('Maak', 'Make')}</Button>} />
          );
        })}
      </ul>
    );
    next = later(soon ? (nl ? soon.nl : soon.en) : null, soon ? needLevelOf(soon) : null);
  }

  return (
    <Card className="p-5" data-testid={`shop-${shop}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="t-section flex items-center gap-2"><span aria-hidden>{info.icon}</span>{nl ? info.nl : info.en}</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#fbf0d9] px-2.5 py-1 text-[13px] font-semibold text-[#855806]" data-testid="shop-coins"><Coins className="h-4 w-4" aria-hidden />{t(`${coins} muntjes`, `${coins} coins`)}</span>
      </div>
      <p className="mt-1 text-[13.5px] text-ink-700">{nl ? info.aboutNl : info.aboutEn}</p>
      {!a ? <div className="mt-3"><Spinner /></div> : <>{list}{next}</>}
    </Card>
  );
}
