import { useId } from 'react';
import type { FigureLook } from './HumanFigure';
import { figureGeometry } from './figureGeometry';
import { GEAR_SLOT, gearTier } from '@shared/hero';

// Original vector artwork. The inventory and character use exactly these same shapes.
export function RpgGear({ item, look, shapes }: { item: string; look: FigureLook; shapes?: { torso: string; arm: (s: -1 | 1) => string; leg: (s: -1 | 1) => string } }) {
  const id = useId().replace(/:/g, '');
  const g = figureGeometry(look);
  const gold = `url(#gold${id})`, teal = `url(#teal${id})`;
  const pair = (fn: (x: number, s: -1 | 1) => React.ReactNode) => ([-1, 1] as const).map(s => <g key={s}>{fn(100 + s * (g.legX - 2), s)}</g>);
  const jewel = (x: number, y: number, r = 4) => <path d={`M${x},${y-r} l${r},${r} -${r},${r} -${r},-${r}Z`} fill="#8affdc" stroke="#e9ffe7" strokeWidth=".7" />;
  const shoe = ['gold_shoes', 'balance_shoes', 'spikes'].includes(item);
  const outfit = ['tracksuit', 'team_kit', 'champion'].includes(item);
  return <g data-rpg-item={item} className="rpg-item" style={{filter:`drop-shadow(0 0 ${gearTier(item).tier * .25}px ${gearTier(item).glow})`}} strokeLinejoin="round" strokeLinecap="round">
    <defs>
      <linearGradient id={`gold${id}`} x2="90%" y2="100%"><stop stopColor="#fff1b8"/><stop offset=".35" stopColor="#dbaa4e"/><stop offset=".6" stopColor="#8e591d"/><stop offset=".8" stopColor="#f6d887"/><stop offset="1" stopColor="#a47332"/></linearGradient>
      <linearGradient id={`teal${id}`}><stop stopColor="#102b35"/><stop offset=".45" stopColor="#347e79"/><stop offset=".7" stopColor="#245655"/><stop offset="1" stopColor="#0a222c"/></linearGradient>
      <clipPath id={`clothes${id}`}><rect y="78" width="200" height={item === 'team_kit' ? 176 : 308}/></clipPath>
    </defs>
    {outfit && shapes && <g clipPath={`url(#clothes${id})`}>
      <g fill={item === 'team_kit' ? '#e7e5cf' : teal} stroke="#102d32" strokeWidth="1.5">
        <path d={shapes.torso}/>{pair((_,s) => <><path d={shapes.arm(s)}/><path d={shapes.leg(s)}/></>)}
      </g>
      <path d={`M${100-g.shoulder},91 Q100,132 ${100+g.shoulder},91 L${100+g.chest},115 Q100,147 ${100-g.chest},115Z`} fill={item === 'champion' ? gold : '#368b85'} stroke="#9ac9b5"/>
      <path d="M100,88 V192" stroke={item === 'champion' ? '#f8d88a' : '#adc8bc'} strokeWidth="2"/>
      {pair((x,s) => <g fill="none" stroke={item === 'champion' ? '#d9b86f' : '#80aaa1'} strokeWidth="2"><path d={`M${x+s*8},222 L${x+s*5},374`}/><path d={`M${g.armX(s,116)},116 L${g.armX(s,193)},193`}/></g>)}
      {item === 'champion' && <>{pair((_,s) => <path d={`M${g.armX(s,86)-12},86 l12,-8 12,8 -3,20 -9,5 -9,-5Z`} fill={gold} stroke="#775225"/>)}{jewel(100,120,7)}<path d={`M${100-g.hip},185 Q100,200 ${100+g.hip},185 L${100+g.hip},218 L100,235 ${100-g.hip},218Z`} fill={teal} stroke="#d9b86f" strokeWidth="2"/></>}
      {item === 'team_kit' && <path d="M87,168 V151 H98 M87,159 H96 M104,168 V151 H111 Q120,151 120,158 Q120,163 111,163 H104" fill="none" stroke="#164e49" strokeWidth="3.5"/>}
    </g>}
    {item === 'master_cape' && <g><path d={`M${100-g.shoulder},77 Q100,63 ${100+g.shoulder},77 L${100+g.hip+35},365 Q100,402 ${100-g.hip-35},365Z`} fill={teal} stroke="#dec486" strokeWidth="3"/><path d={`M${100-g.shoulder+8},88 L${100-g.hip-20},357 M${100+g.shoulder-8},88 L${100+g.hip+20},357`} stroke="#86ae9b" fill="none" strokeWidth="2"/><path d="M80,315 L100,290 120,315 100,351Z" fill={gold}/>{jewel(100,318,10)}</g>}
    {item === 'yoga_mat' && <g transform={`translate(${100+g.shoulder-2} 83) rotate(-12)`}><rect width="23" height="112" rx="9" fill={teal} stroke="#96cdb6" strokeWidth="2"/><ellipse cx="11.5" cy="3" rx="11.5" ry="6" fill="#72a494"/><ellipse cx="11.5" cy="3" rx="6" ry="3" fill="none" stroke="#183e3d"/><path d="M0,25 h23 M0,89 h23" stroke="#ceae68" strokeWidth="6"/></g>}
    {shoe && pair(x => <g><path d={`M${x-7},379 Q${x},375 ${x+7},379 L${x+10},397 Q${x+18},406 ${x+2},407 H${x-10} Q${x-14},402 ${x-7},379Z`} fill={item === 'gold_shoes' ? gold : item === 'spikes' ? '#d9f1d8' : '#386ca2'} stroke="#173d49" strokeWidth="1.2"/><path d={`M${x-10},403 h23 M${x-4},385 h9 M${x-5},390 h10 M${x-6},395 h11`} stroke={item === 'gold_shoes' ? '#fff1ba' : '#c5e9ef'} strokeWidth="2"/>{item === 'spikes' && <path d={`M${x-8},407 v4 M${x},407 v4 M${x+8},407 v4`} stroke="#dcb96b" strokeWidth="2"/>}{item === 'gold_shoes' && jewel(x,396,3)}</g>)}
    {['crew_socks','shin_guards'].includes(item) && pair(x => <g><path d={`M${x-8},${item === 'crew_socks'?345:317} h16 l-2,64 h-12Z`} fill={item === 'crew_socks'?'#d8e7df':teal} stroke="#5a8e83"/><path d={`M${x-7},352 h14 M${x-7},358 h14`} stroke="#b79954" strokeWidth="3"/>{item === 'shin_guards' && jewel(x,332)}</g>)}
    {['wristbands','gloves','watch','captain'].includes(item) && ([-1,1] as const).filter(s => !['watch','captain'].includes(item) || s === (item==='watch'?-1:1)).map(s => {
      const y = item==='captain'?116:item==='gloves'?214:196; const x=g.armX(s,y); const w=(item==='captain'?9:6)*g.armW;
      return <g key={s} transform={`translate(${x} ${y}) rotate(${-s*8})`}><path d={`M${-w},-7 Q0,-10 ${w},-7 L${w*.8},9 Q0,13 ${-w*.8},9Z`} fill={item==='captain'?gold:teal} stroke="#c7dcc1"/>{item==='watch'?<><rect x="-5" y="-5" width="10" height="11" rx="3" fill="#111e2a" stroke="#dec382"/><path d="M-3,2 l2,-4 2,3 2,-1" fill="none" stroke="#80ffdb"/></>:item==='captain'?<path d="M3,-4 C-5,-7 -5,7 3,4" fill="none" stroke="#193f3d" strokeWidth="2"/>:<path d={`M${-w+1},-3 h${w*2-2} M${-w+1},3 h${w*2-2}`} stroke="#c7ad73"/>}</g>;
    })}
    {item==='sleeve' && <g transform={`translate(${100-g.legX} 290)`}><path d={`M${-10*g.legW},-25 Q0,-30 ${10*g.legW},-25 L${8*g.legW},29 Q0,34 ${-8*g.legW},29Z`} fill={teal} stroke="#96b9ab"/><path d={`M${-9*g.legW},-19 h${18*g.legW} M${-8*g.legW},23 h${16*g.legW}`} stroke="#d8bf83" strokeWidth="2"/>{jewel(0,0,4)}</g>}
    {item==='belt' && <g><path d={`M${100-g.hip},186 Q100,194 ${100+g.hip},186 v12 Q100,207 ${100-g.hip},198Z`} fill="#483a2f" stroke="#bba475"/><rect x="94" y="190" width="12" height="12" rx="2" fill={gold}/>{jewel(100,196,3)}</g>}
    {item==='hr_band' && <g><path d={`M${100-g.chest},122 Q100,133 ${100+g.chest},122`} fill="none" stroke="#122d3b" strokeWidth="7"/><rect x="94" y="122" width="12" height="9" rx="3" fill="#73d6ca"/><path d="M96,127 h2 l2,-3 2,5 2,-2" fill="none" stroke="#123d3c"/></g>}
    {item==='pin' && <g transform={`translate(${100+g.chest*.46} 105)`}><path d="M-7,-7 L7,-7 6,4 0,10 -6,4Z" fill={item==='pin'?gold:teal} stroke="#e2cc91"/>{jewel(0,0,3)}</g>}
    {item==='sport_item' && <g transform={`translate(${g.armX(1,214)+7} 231)`}><path d="M-8,-18 L-5,-8" stroke="#d7bf7f" strokeWidth="3"/><circle r="13" fill="#dce9d6" stroke="#234e49" strokeWidth="2"/><path d="M0,-6 l6,4 -2,7 h-8 l-2,-7Z M0,-13 v7 M12,-3 l-6,1 M8,10 l-4,-5 M-8,10 l4,-5 M-12,-3 l6,1" fill="#2e7367" stroke="#234e49"/></g>}
    {item==='medal' && <g><path d={`M${100-g.neck},75 L100,113 ${100+g.neck},75`} fill="none" stroke="#7956aa" strokeWidth="5"/><circle cx="100" cy="116" r="10" fill={gold} stroke="#fae4ab"/><circle cx="100" cy="116" r="7" fill="none" stroke="#8b6336"/>{jewel(100,116,5)}</g>}
    {['scarf','towel'].includes(item) && <g fill={item==='scarf'?teal:'#e2dcc4'} stroke="#aa995e"><path d={`M${100-g.neck-5},70 Q100,83 ${100+g.neck+5},70 l3,13 Q100,100 ${100-g.neck-8},82Z`}/><path d={`M${100+g.neck},82 l10,3 -3,45 -13,-5Z`}/><path d={`M${100+g.neck-3},118 l10,3`} stroke="#c9ab65" strokeWidth="3"/></g>}
    {['headband','visor','cap','crown'].includes(item) && <g transform={look.hair==='afro'?'translate(100 0) scale(1.22 1) translate(-100 0)':undefined}>
      {item==='cap' && <path d="M75,29 Q74,2 100,2 Q126,2 125,29Z" fill={teal} stroke="#92b8a4"/>}
      {item==='crown'?<><path d="M76,26 L72,5 87,14 100,0 113,14 128,5 124,26Z" fill={gold} stroke="#e6cf92"/><path d="M78,22 Q100,18 122,22" fill="none" stroke="#77532d" strokeWidth="3"/>{jewel(100,15,5)}{jewel(83,19,2)}{jewel(117,19,2)}</>:<><path d="M76,27 Q100,19 124,27 L124,34 Q100,27 76,34Z" fill={item==='headband'?'#b4c9b2':teal} stroke="#e0cf96"/>{item!=='headband' && <path d="M85,30 Q104,25 125,31 L140,38 Q113,42 85,30Z" fill={teal} stroke="#b7c8a0"/>}{jewel(100,27,3)}</>}
    </g>}
    {item==='headphones' && <g fill={teal} stroke="#d2b77d" strokeWidth="2"><path d="M74,39 V25 Q100,-4 126,25 V39" fill="none" strokeWidth="4"/><rect x="69" y="33" width="12" height="20" rx="5"/><rect x="119" y="33" width="12" height="20" rx="5"/></g>}
    {/* ACL reward gear: all shapes are anchored to the same body coordinates as the character,
        rather than the inventory thumbnail coordinates (which previously put knee gear on the chest). */}
    {item==='ice_pack' && <g><path d={`M${100-g.neck},77 L100,105 ${100+g.neck},77`} fill="none" stroke="#3b7c91" strokeWidth="2.5"/><circle cx="100" cy="107" r="10" fill="#a7d9e6" stroke="#23546c" strokeWidth="2"/><path d="M100,100 v14 M93,107 h14" stroke="#f7fcff" strokeWidth="2"/></g>}
    {['deswell_mantle','wind_cape'].includes(item) && <g>
      <path d={`M${100-g.shoulder},82 Q100,93 ${100+g.shoulder},82 C${138+g.hip},160 ${139+g.hip},265 ${132+g.hip},${item==='wind_cape'?361:318} Q100,${item==='wind_cape'?380:328} ${68-g.hip},${item==='wind_cape'?361:318} C${61-g.hip},265 ${62-g.hip},160 ${100-g.shoulder},82Z`} fill={item==='wind_cape'?'#d2e5e9':'#5c8e9a'} stroke={item==='wind_cape'?'#4c8693':'#1e4458'} strokeWidth="3"/>
      <path d={`M${100-g.shoulder+4},92 Q${91-g.hip},218 ${72-g.hip},${item==='wind_cape'?353:309} M${100+g.shoulder-4},92 Q${109+g.hip},218 ${128+g.hip},${item==='wind_cape'?353:309}`} stroke="#eff8f2" strokeOpacity=".55" strokeWidth="2" fill="none"/>
    </g>}
    {['iron_brace','rune_guard'].includes(item) && <g transform={`translate(${100-g.legX} 294)`}>
      <path d={`M${-10*g.legW},-29 Q0,-34 ${10*g.legW},-29 L${9*g.legW},30 Q0,35 ${-9*g.legW},30Z`} fill={item==='rune_guard'?'#d9c27a':'#95aaac'} stroke={item==='rune_guard'?'#685323':'#354850'} strokeWidth="2"/>
      <path d="M-12,-16 H12 M-12,16 H12" stroke={item==='rune_guard'?'#7b5a21':'#dfeaed'} strokeWidth="3"/>
      <circle cx="-10" cy="0" r="3" fill="#f6e9c8"/><circle cx="10" cy="0" r="3" fill="#f6e9c8"/>
      {item==='rune_guard' && jewel(0,0,6)}
    </g>}
    {item==='crutch_staff' && <g transform={`translate(${g.armX(1,214)+10} 0)`}>
      <path d="M0,127 Q-4,137 -3,158 L-2,402 Q1,409 4,402 L3,158 Q7,137 0,127Z" fill="#ad8556" stroke="#4a372b" strokeWidth="1.8"/>
      <path d="M-12,196 H10 M-9,201 H7" stroke="#dec692" strokeWidth="4" strokeLinecap="round"/>
      <circle cy="126" r="7" fill={gold} stroke="#82602a" strokeWidth="2"/>
    </g>}
    {['pilgrim_boots','wing_shoes'].includes(item) && pair((x,side) => <g transform={`translate(${x} 382)`}>
      <path d="M-8,-4 Q0,-9 8,-4 L10,12 Q17,16 16,23 Q9,28 -13,23 L-12,10Z" fill={item==='pilgrim_boots'?'#805c3d':'#dfe8e2'} stroke="#33443b" strokeWidth="1.6"/>
      <path d="M-12,21 H16 M-4,0 H6 M-4,5 H6" stroke={item==='pilgrim_boots'?'#d4b47e':'#678e83'} strokeWidth="2"/>
      {item==='wing_shoes' && <path d={`M${side*10},6 l${side*11},-16 -${side*2},13 ${side*11},-9 -${side*8},16Z`} fill="#fcfaf0" stroke="#7f9a8d" strokeWidth="1.2"/>}
    </g>)}
    {['golden_hinge','frog_badge'].includes(item) && <g transform={`translate(${100+g.chest*.45} 116)`}>
      {item==='frog_badge' ? <><circle r="9" fill="#7dbe6a" stroke="#24522c" strokeWidth="1.5"/><circle cx="-4" cy="-3" r="2" fill="#f9f5e9"/><circle cx="4" cy="-3" r="2" fill="#f9f5e9"/><path d="M-4,3 Q0,6 4,3" fill="none" stroke="#24522c"/></> :
      <><rect x="-10" y="-5" width="20" height="10" rx="3" fill={gold} stroke="#6a4a12"/><path d="M-5,-11 V11 M5,-11 V11" stroke="#f6dea5" strokeWidth="3"/></>}
    </g>}
    {item==='smith_hammer' && <g transform={`translate(${g.armX(1,214)+7} 0)`}>
      <path d="M0,195 V272" stroke="#815532" strokeWidth="6" strokeLinecap="round"/>
      <rect x="-20" y="187" width="42" height="19" rx="4" fill="#b1b9ba" stroke="#364547" strokeWidth="2"/>
      <path d="M-15,191 H17" stroke="#eef3ee" strokeWidth="2.2"/>
    </g>}
    {item==='spring_belt' && <g>
      <path d={`M${100-g.hip},188 Q100,194 ${100+g.hip},188 L${100+g.hip},204 Q100,211 ${100-g.hip},204Z`} fill="#3d6b4f" stroke="#d7bb75" strokeWidth="2"/>
      <rect x="93" y="190" width="14" height="16" rx="3" fill={gold} stroke="#5a431e"/>{jewel(100,198,4)}
    </g>}
    {item==='champion_helm' && <g>
      <path d="M77,35 Q77,9 100,5 Q123,9 123,35 V47 L116,51 L112,38 H88 L84,51 L77,47Z" fill={gold} stroke="#704f1f" strokeWidth="2"/>
      <path d="M83,30 Q100,19 117,30 M100,11 V28" stroke="#fff1be" strokeWidth="3" fill="none"/>{jewel(100,32,5)}
    </g>}
    {item==='vkb_banner' && <path d="M70,16 h8 v70 h-8Z M78,16 h40 v28 h-40Z" fill="#8C3A32" stroke="#343F2A"/>}
    {item==='guild_banner' && <path d="M70,16 h8 v70 h-8Z M78,16 h40 v28 h-40Z" fill="#496246" stroke="#343F2A"/>}
    {item==='pet_wolf' && <path d="M86,50 l8,-16 6,10 6,-10 8,16 v18 h-28Z" fill="#c5b8a4" stroke="#4a4034"/>}
    {item==='pet_horse' && <path d="M78,40 h20 v10 l10,8 v16 h-8 l-4,-8 h-10 l-4,8 h-8Z" fill="#8a5a32" stroke="#3a2414"/>}
    {item.startsWith('sport_') && shapes && <g fill={({
      sport_football:'#1d5f99',sport_basketball:'#b5781a',sport_hockey:'#2b6b41',
      sport_ski:'#8e3b5f',sport_running:'#2759a0',sport_padel:'#46554e',
    } as Record<string,string>)[item] ?? '#29483c'} stroke="#e1d09b" strokeWidth="1.4">
      <path d={shapes.torso}/>{pair((_,side)=><g key={side}><path d={shapes.arm(side)}/><path d={shapes.leg(side)}/></g>)}
      <path d="M86,100 H114 M86,109 H114" stroke="#f5f4dc" strokeWidth="3" fill="none"/>
    </g>}
  </g>;
}

const crops: Record<string,string> = { head:'62 -4 80 68', neck:'66 68 68 75', arm:'124 100 40 40', wrist:'36 178 36 38', hands:'30 190 140 87', held:'115 113 85 300', waist:'62 178 76 38', feet:'54 367 92 48', legs:'56 258 88 105', chest:'64 91 72 58', back:'26 73 148 310', outfit:'28 68 144 330' };
export function GearArtwork({ item, className }: { item:string; className?:string }) {
  const look:FigureLook={skin:'s4',hair:'short',outfit:'forest',frame:'m',build:'average'};
  // Outfit thumbnails use a miniature garment silhouette; its panels share the worn renderer.
  const shapes={torso:'M66,80 L89,72 111,72 134,80 129,195 71,195Z',arm:(s:-1|1)=>`M${100+s*34},82 l${s*10},5 ${s*15},114 -12,3 ${-s*13},-86Z`,leg:(s:-1|1)=>`M${100+s*3},194 h${s*28} l${-s*4},185 h${-s*18}Z`};
  return <svg aria-hidden viewBox={({sleeve:'65 257 40 70',gloves:'141 202 26 29',pin:'103 94 25 27',headphones:'63 0 75 60',crew_socks:'60 338 80 60',sport_item:'135 194 40 65'}[item] ?? crops[GEAR_SLOT[item]]) ?? '25 0 150 420'} className={className}><RpgGear item={item} look={look} shapes={shapes}/></svg>;
}
