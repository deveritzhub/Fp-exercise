import { useId } from 'react';
import type { FigureLook } from './HumanFigure';
import { figureGeometry } from './figureGeometry';
import { GEAR_SLOT } from '@shared/hero';

// Original vector artwork. The inventory and character use exactly these same shapes.
export function RpgGear({ item, look, shapes }: { item: string; look: FigureLook; shapes?: { torso: string; arm: (s: -1 | 1) => string; leg: (s: -1 | 1) => string } }) {
  const id = useId().replace(/:/g, '');
  const g = figureGeometry(look);
  const gold = `url(#gold${id})`, teal = `url(#teal${id})`;
  const pair = (fn: (x: number, s: -1 | 1) => React.ReactNode) => ([-1, 1] as const).map(s => <g key={s}>{fn(100 + s * (g.legX - 2), s)}</g>);
  const jewel = (x: number, y: number, r = 4) => <path d={`M${x},${y-r} l${r},${r} -${r},${r} -${r},-${r}Z`} fill="#8affdc" stroke="#e9ffe7" strokeWidth=".7" />;
  const shoe = ['gold_shoes', 'balance_shoes', 'spikes'].includes(item);
  const outfit = ['tracksuit', 'team_kit', 'champion'].includes(item);
  return <g data-rpg-item={item} className="rpg-item" strokeLinejoin="round" strokeLinecap="round">
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
      {item === 'team_kit' && <text x="100" y="169" textAnchor="middle" fill="#164e49" fontSize="24" fontWeight="800">FP</text>}
    </g>}
    {item === 'master_cape' && <g><path d={`M${100-g.shoulder},77 Q100,63 ${100+g.shoulder},77 L${100+g.hip+35},365 Q100,402 ${100-g.hip-35},365Z`} fill={teal} stroke="#dec486" strokeWidth="3"/><path d={`M${100-g.shoulder+8},88 L${100-g.hip-20},357 M${100+g.shoulder-8},88 L${100+g.hip+20},357`} stroke="#86ae9b" fill="none" strokeWidth="2"/><path d="M80,315 L100,290 120,315 100,351Z" fill={gold}/>{jewel(100,318,10)}</g>}
    {item === 'yoga_mat' && <g transform={`translate(${100+g.shoulder-2} 83) rotate(-12)`}><rect width="23" height="112" rx="9" fill={teal} stroke="#96cdb6" strokeWidth="2"/><ellipse cx="11.5" cy="3" rx="11.5" ry="6" fill="#72a494"/><ellipse cx="11.5" cy="3" rx="6" ry="3" fill="none" stroke="#183e3d"/><path d="M0,25 h23 M0,89 h23" stroke="#ceae68" strokeWidth="6"/></g>}
    {shoe && pair(x => <g><path d={`M${x-7},379 Q${x},375 ${x+7},379 L${x+10},397 Q${x+18},406 ${x+2},407 H${x-10} Q${x-14},402 ${x-7},379Z`} fill={item === 'gold_shoes' ? gold : item === 'spikes' ? '#d9f1d8' : '#386ca2'} stroke="#173d49" strokeWidth="1.2"/><path d={`M${x-10},403 h23 M${x-4},385 h9 M${x-5},390 h10 M${x-6},395 h11`} stroke={item === 'gold_shoes' ? '#fff1ba' : '#c5e9ef'} strokeWidth="2"/>{item === 'spikes' && <path d={`M${x-8},407 v4 M${x},407 v4 M${x+8},407 v4`} stroke="#dcb96b" strokeWidth="2"/>}{item === 'gold_shoes' && jewel(x,396,3)}</g>)}
    {['crew_socks','shin_guards'].includes(item) && pair(x => <g><path d={`M${x-8},${item === 'crew_socks'?345:317} h16 l-2,64 h-12Z`} fill={item === 'crew_socks'?'#d8e7df':teal} stroke="#5a8e83"/><path d={`M${x-7},352 h14 M${x-7},358 h14`} stroke="#b79954" strokeWidth="3"/>{item === 'shin_guards' && jewel(x,332)}</g>)}
    {['wristbands','gloves','watch','captain'].includes(item) && ([-1,1] as const).filter(s => !['watch','captain'].includes(item) || s === (item==='watch'?-1:1)).map(s => {
      const y = item==='captain'?116:item==='gloves'?214:196; const x=g.armX(s,y); const w=(item==='captain'?9:6)*g.armW;
      return <g key={s} transform={`translate(${x} ${y}) rotate(${-s*8})`}><path d={`M${-w},-7 Q0,-10 ${w},-7 L${w*.8},9 Q0,13 ${-w*.8},9Z`} fill={item==='captain'?gold:teal} stroke="#c7dcc1"/>{item==='watch'?<><rect x="-5" y="-5" width="10" height="11" rx="3" fill="#111e2a" stroke="#dec382"/><path d="M-3,2 l2,-4 2,3 2,-1" fill="none" stroke="#80ffdb"/></>:item==='captain'?<text y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#193f3d">C</text>:<path d={`M${-w+1},-3 h${w*2-2} M${-w+1},3 h${w*2-2}`} stroke="#c7ad73"/>}</g>;
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
  </g>;
}

const crops: Record<string,string> = { head:'62 -4 80 65', neck:'67 62 66 78', arm:'124 100 40 40', wrist:'36 178 36 38', hands:'30 199 140 38', waist:'62 178 76 35', feet:'60 371 80 45', legs:'60 310 80 80', chest:'65 93 70 50', back:'115 65 65 140', outfit:'28 68 144 330' };
export function GearArtwork({ item, className }: { item:string; className?:string }) {
  const look:FigureLook={skin:'s4',hair:'short',outfit:'forest',frame:'m',build:'average'};
  // Outfit thumbnails use a miniature garment silhouette; its panels share the worn renderer.
  const shapes={torso:'M66,80 L89,72 111,72 134,80 129,195 71,195Z',arm:(s:-1|1)=>`M${100+s*34},82 l${s*10},5 ${s*15},114 -12,3 ${-s*13},-86Z`,leg:(s:-1|1)=>`M${100+s*3},194 h${s*28} l${-s*4},185 h${-s*18}Z`};
  return <svg aria-hidden viewBox={({sleeve:'65 257 40 70',gloves:'141 202 26 29',pin:'103 94 25 27',headphones:'63 0 75 60',crew_socks:'60 338 80 60',sport_item:'135 194 40 65'}[item] ?? crops[GEAR_SLOT[item]]) ?? '25 0 150 420'} className={className}><RpgGear item={item} look={look} shapes={shapes}/></svg>;
}
