import { gearTier } from '@shared/hero';
import { useId, useState, type ReactNode } from 'react';
import type { FigureLook } from './HumanFigure';
import bounds from './photoGearBounds.json';

// Coordinates in the existing generated-photo framing, never applied to personal photos.
// Slots are based on the source photograph, not on HumanFigure's unrelated skeleton.
type Placement = [number, number, number, number];
const FIT: Record<string, Placement> = {
  cap:[.5,.028,.145,.067], visor:[.5,.052,.155,.035], headband:[.5,.068,.13,.018], crown:[.5,.005,.17,.063],
  headphones:[.5,.027,.18,.11], scarf:[.5,.185,.15,.14], towel:[.5,.18,.18,.19], medal:[.5,.177,.12,.12],
  pin:[.56,.235,.035,.025], hr_band:[.5,.29,.27,.027], belt:[.5,.436,.258,.033],
  captain:[.625,.285,.055,.034], watch:[.33,.473,.041,.036], wristbands:[.33,.478,.045,.027],
  gloves:[.335,.505,.051,.064], sleeve:[.405,.59,.10,.14], shin_guards:[.39,.71,.062,.12],
  crew_socks:[.386,.81,.046,.065], gold_shoes:[.37,.86,.112,.096], balance_shoes:[.37,.86,.112,.096], spikes:[.37,.86,.112,.096],
  sport_item:[.65,.54,.09,.075], yoga_mat:[.63,.15,.17,.28],
};
// The face centre is slightly left of the image centre in this calibrated photo.
const HEAD_ITEMS = new Set(['cap', 'visor', 'headband', 'crown', 'headphones']);
const HEAD_FIT: Record<string, { x: number; dy: number }> = {
  f_s5_average: { x: .492, dy: 0 }, f_s5_average_h2: { x: .492, dy: 0 },
  f_s1_lean: { x: .495, dy: 0 }, f_s7_full_h4: { x: .507, dy: 0 },
  m_s3_athletic: { x: .492, dy: 0 }, m_s9_full_h2: { x: .507, dy: -.009 },
  m_s1_lean_h3: { x: .5, dy: 0 },
};
// Measured against the reviewed photographic poses. Left/right are screen sides.
const BODY_FIT: Record<string, { hands: [number,number]; feet: [number,number]; shins: [number,number] }> = {
  f_s5_average: { hands:[.335,.63], feet:[.37,.595], shins:[.39,.60] },
  f_s5_average_h2: { hands:[.335,.63], feet:[.37,.595], shins:[.39,.60] },
  f_s1_lean: { hands:[.325,.625], feet:[.39,.59], shins:[.40,.585] },
  f_s7_full_h4: { hands:[.31,.69], feet:[.375,.625], shins:[.40,.60] },
  m_s3_athletic: { hands:[.325,.66], feet:[.39,.60], shins:[.405,.595] },
  m_s9_full_h2: { hands:[.31,.69], feet:[.39,.625], shins:[.405,.61] },
  m_s1_lean_h3: { hands:[.35,.64], feet:[.395,.605], shins:[.41,.59] },
};
// Front-facing worn layers exclude the product's rear collar/inner ear pads.
const FRONT_BOX: Record<string, number[]> = { scarf:[128,360,768,598], towel:[175,180,674,805], visor:[112,290,802,525] };
const PAIRED = new Set(['wristbands','gloves','shin_guards','crew_socks','gold_shoes','balance_shoes','spikes']);
export function PhotoEquipment({look, source}: {look:FigureLook;source:string}) {
  const uid=useId().replace(/:/g,'');
  if(look.photo) return null;
  const spread=(({lean:.91,slim:.91,average:1,athletic:1.05,muscular:1.1,soft:1.1,full:1.17} as Record<string,number>)[look.body?.kind ?? look.build ?? 'average'] ?? 1)*(look.frame==='m'?1.08:1);
  const gear=look.gear ?? [];
  const sourceKey=source.split('/').at(-1)?.split('__')[0] ?? '';
  const body=BODY_FIT[sourceKey];
  const head=HEAD_FIT[sourceKey] ?? { x: .5, dy: 0 };
  const piece=(key:string,mirror=false)=>{
    const fit=FIT[key], asset=bounds[key as keyof typeof bounds];
    if(!fit || !asset)return null;
    const [px,y,w,h]=fit;
    const box=FRONT_BOX[key] ?? asset.box;
    const anchors=body && (['wristbands','watch','gloves'].includes(key) ? body.hands : ['gold_shoes','balance_shoes','spikes','crew_socks'].includes(key) ? body.feet : key==='shin_guards' ? body.shins : null);
    const x=anchors ? anchors[mirror?1:0] : HEAD_ITEMS.has(key) ? head.x : .5+((mirror ? (['shin_guards','crew_socks'].includes(key) ? .99 : .965)-px:px)-.5)*spread;
    const width=w*(['belt','hr_band','captain'].includes(key)?spread:1);
    return <svg key={key+mirror} data-photo-gear={key} data-tier={gearTier(key).tier} style={{filter:`drop-shadow(0 0 ${gearTier(key).tier * .18}px ${gearTier(key).glow})`}} className="photo-worn"  x={(x-width/2)*1000} y={(y+(HEAD_ITEMS.has(key)?head.dy:0))*1333.33} width={width*1000} height={h*1333.33} viewBox={box.join(' ')} preserveAspectRatio="none" overflow="hidden">
      <image href={`/api/hero-assets/wear/${key}`} width={asset.size[0]} height={asset.size[1]} clipPath={key==='headphones'?`url(#ears${uid})`:undefined} filter={`url(#cut${uid})`} transform={mirror?`translate(${asset.box[0]*2+asset.box[2]} 0) scale(-1 1)`:undefined}/>
    </svg>;
  };
  return <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 1333.33" aria-hidden>
    <defs><clipPath id={`ears${uid}`}><path d="M100,130 H920 V390 H100Z M100,390 H290 V880 H100Z M735,390 H930 V880 H735Z"/></clipPath><filter id={`cut${uid}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncA type="table" tableValues="0 0 0 0 0 0 .6 1 1 1 1"/></feComponentTransfer><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#271c10" floodOpacity=".22"/></filter>
    <clipPath id={`body${uid}`}><path d={`M400,20 H600 V235 L${500+180*spread},280  ${500+170*spread},760 620,1290 H350 L${500-170*spread},760 ${500-180*spread},280 400,235Z`}/></clipPath></defs>
    {gear.includes('yoga_mat') && <>{piece('yoga_mat')}<image href={source} width="1000" height="1333.33" preserveAspectRatio="none" clipPath={`url(#body${uid})`}/></>}
    {Object.keys(FIT).filter(key=>key!=='yoga_mat' && gear.includes(key)).map(key=><g key={key}>{piece(key)}{PAIRED.has(key)&&piece(key,true)}</g>)}
  </svg>;
}

/** Reuse the photographic item texture for its inventory thumbnail. */
export function PhotoGearThumbnail({ item, className, fallback }: { item: string; className?: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const thumbId=useId().replace(/:/g,'');
  const asset = bounds[item as keyof typeof bounds];
  if (failed) return <>{fallback}</>;
  if (!asset) return <img src={`/api/hero-assets/shop/${item}`} alt="" className={className} onError={() => setFailed(true)} />;
  return <svg aria-hidden viewBox={(FRONT_BOX[item] ?? asset.box).join(' ')} className={className}>
    <defs><clipPath id={`thumb${thumbId}`}><path d="M100,130 H920 V390 H100Z M100,390 H290 V880 H100Z M735,390 H930 V880 H735Z"/></clipPath></defs>
    <image href={`/api/hero-assets/wear/${item}`} width={asset.size[0]} height={asset.size[1]} clipPath={item==='headphones'?`url(#thumb${thumbId})`:undefined} onError={() => setFailed(true)} />
  </svg>;
}
