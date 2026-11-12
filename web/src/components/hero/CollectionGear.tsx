import { useId } from 'react';
import { COLLECTION_ITEM_KEYS } from '@shared/gearCollections';
import { gearTier } from '@shared/hero';
import { figureGeometry } from './figureGeometry';
import type { FigureLook } from './HumanFigure';

export type GearShapes = { torso: string; arm: (side: -1 | 1) => string; leg: (side: -1 | 1) => string };

/**
 * Original SVG garments, sports gear and fantasy props, fitted to the same 200x420 skeleton
 * as the 2D hero. The inventory thumbnail uses this component too.
 * Not a photographic texture: callers must NOT place these drawings as stickers over photos.
 */
export function CollectionGear({ item, look, shapes }: { item: string; look: FigureLook; shapes?: GearShapes }) {
  const uid = useId().replace(/:/g, '');
  const g = figureGeometry(look);
  if (!COLLECTION_ITEM_KEYS.has(item)) return null;
  const tier = gearTier(item);
  const gradient = 'colGrad' + uid;
  const shade = 'colShade' + uid;
  const legXs = ([-1, 1] as const).map(side => ({ side, x: 100 + side * (g.legX - 2) }));
  const hands = ([-1, 1] as const).map(side => ({ side, x: g.armX(side, 214) }));
  const clothes: Record<string, { main: string; light: string; stroke: string }> = {
    warmup_hoodie: { main: '#40584f', light: '#839d89', stroke: '#263f35' },
    trail_runner: { main: '#294d41', light: '#bc7a57', stroke: '#1f3931' },
    arena_uniform: { main: '#254f76', light: '#67a7c5', stroke: '#182f50' },
    kyokushin_gi: { main: '#f4f1e6', light: '#fffdfa', stroke: '#a9a394' },
    astral_armor: { main: '#1d3052', light: '#c8a75e', stroke: '#0d1e39' },
  };
  const material = clothes[item];
  return (
    <g data-rpg-item={item} data-collection-tier={tier.tier} className="rpg-item" strokeLinejoin="round" strokeLinecap="round"
      style={{ filter: 'drop-shadow(0 0 ' + (tier.tier * .45) + 'px ' + tier.glow + ')' }}>
      <defs>
        <linearGradient id={gradient} x1="0%" y1="0%" x2="100%" y2="85%">
          <stop stopColor={material?.light ?? '#e5d2a2'} />
          <stop offset=".43" stopColor={material?.main ?? '#628c80'} />
          <stop offset="1" stopColor={material?.stroke ?? '#223d38'} />
        </linearGradient>
        <linearGradient id={shade} x1="0" y1="0" x2="0.95" y2="1">
          <stop stopColor="#fff8d5" /><stop offset=".35" stopColor="#e3b965" /><stop offset="1" stopColor="#84602c" />
        </linearGradient>
      </defs>

      {material && shapes && <g>
        <g fill={'url(#' + gradient + ')'} stroke={material.stroke} strokeWidth="1.6">
          <path d={shapes.leg(-1)} /><path d={shapes.leg(1)} />
          <path d={shapes.arm(-1)} /><path d={shapes.arm(1)} />
          <path d={shapes.torso} />
        </g>
        {item === 'warmup_hoodie' && <g>
          <path d={'M' + (100-g.neck-4) + ' 76 Q100 95 ' + (100+g.neck+4) + ' 76 L114 105 100 116 86 105Z'} fill="#9aada0" stroke="#263f35" strokeWidth="2" />
          <path d="M100 87 V190" fill="none" stroke="#e0ddc5" strokeWidth="2.5" />
          <path d="M92 99 l-3 30 M108 99 l3 30" fill="none" stroke="#f0e8d5" strokeWidth="1.6"/>
          <path d="M74 183 Q100 189 126 183 M74 194 H126" fill="none" stroke="#203c35" strokeWidth="3"/>
          <path d="M84 146 l-7 16 h46 l-8-16" fill="none" stroke="#b6c6ad" strokeWidth="1.5"/>
          {legXs.map(({x,side})=><path key={side} d={'M'+x+' 228 l'+(side*3)+' 143'} stroke="#b7cbb9" fill="none" strokeWidth="2"/>)}
        </g>}
        {item === 'trail_runner' && <g>
          <path d="M87 85 L99 108 113 85 M100 109 V189" stroke="#e1c39b" strokeWidth="3" fill="none" />
          <path d="M81 129 l13 4 -2 13 -13 -3Z M107 133 l13 -4 3 14 -13 3Z" fill="#b87d5d" stroke="#e2d1a7" strokeWidth="1.5"/>
          <path d="M82 180 H118" stroke="#d5bd81" strokeWidth="2.5"/>
          <path d="M84 101 L94 184 M116 101 L106 184" stroke="#6a8e7f" strokeWidth="2" fill="none"/>
          {legXs.map(({x,side})=><path key={side} d={'M'+(x-side*5)+' 230 L'+(x-side*4)+' 366'} stroke="#7fb99d" fill="none" strokeWidth="1.6"/>)}
        </g>}
        {item === 'arena_uniform' && <g>
          <path d="M85 83 Q100 110 115 83" stroke="#b7dce4" fill="none" strokeWidth="3"/>
          <path d="M74 119 H126 M78 131 H122" stroke="#5badd1" strokeWidth="3"/>
          <path d="M94 149 H105 V169 M94 149 V169" stroke="#f0f1dd" strokeWidth="3.5" fill="none"/>
          <path d="M79 182 H121" stroke="#e6c489" strokeWidth="3"/>
          {legXs.map(({x,side})=><path key={side} d={'M'+(x-side*6)+' 224 l'+(side*2)+' 142'} fill="none" stroke="#81c5db" strokeWidth="2"/>)}
        </g>}
        {item === 'kyokushin_gi' && <g>
          {/* A plain, traditional white gi; not a copied federation patch. */}
          <path d={'M'+(100-g.neck-2)+' 77 L115 116 87 171 L73 164 L95 109 ' + (100+g.neck+3) + ' 77'} fill="#fffdf6" stroke="#b9afa1" strokeWidth="2.7"/>
          <path d={'M'+(100+g.neck+2)+' 77 L86 118 119 174 L128 165 L106 107 ' + (100-g.neck-2) + ' 77'} fill="#ebe8de" stroke="#b8b1a1" strokeWidth="2.7"/>
          <path d="M76 183 H124 M73 195 H127" stroke="#d5d0c4" strokeWidth="2.5"/>
          <path d="M78 104 L85 153 M122 104 L115 153" fill="none" stroke="#fffdfa" strokeWidth="2"/>
          {legXs.map(({x,side})=><g key={side}><path d={'M'+(x-side*11)+' 366 H'+(x+side*11)} stroke="#c2bcb1" strokeWidth="3"/><path d={'M'+x+' 218 V355'} stroke="#ddd8cc" strokeWidth="2"/></g>)}
        </g>}
        {item === 'astral_armor' && <g>
          <path d={'M'+(100-g.shoulder+4)+' 91 Q100 77 '+(100+g.shoulder-4)+' 91 L124 122 100 164 76 122Z'} fill={'url(#'+shade+')'} stroke="#e8dcae" strokeWidth="2"/>
          <path d="M100 107 L111 127 100 147 89 127Z" fill="#3e7792" stroke="#edf6e5" strokeWidth="1.5"/>
          <path d="M82 163 L100 172 118 163 L128 190 100 212 72 190Z" fill="#1c3657" stroke="#d6b46d" strokeWidth="2"/>
          <path d="M85 185 L100 197 115 185" fill="none" stroke="#d6b46d" strokeWidth="2"/>
          {([-1,1] as const).map(side=><g key={side}><path d={'M'+(100+side*g.shoulder)+' 90 l'+(side*12)+' -10 '+(side*14)+' 9 -6 26 -'+(side*19)+' 4Z'} fill={'url(#'+shade+')'} stroke="#9d793d" strokeWidth="2"/><path d={'M'+(100+side*g.legX)+' 250 l'+(side*7)+' 0 -'+(side*4)+' 120'} fill="none" stroke="#d9c27c" strokeWidth="3"/></g>)}
          <circle cx="100" cy="125" r="4" fill="#d7f4ff"/>
        </g>}
      </g>}

      {item === 'gym_bandana' && <g>
        <path d="M77 29 Q100 21 123 29 L122 37 Q100 31 78 37Z" fill="#a8b7a3" stroke="#32483f" strokeWidth="1.7"/>
        <path d="M117 31 l15 9 -10 13" stroke="#465b49" fill="#829981" strokeWidth="2"/>
        <path d="M88 30 H112" stroke="#f5f0de" strokeWidth="2"/>
      </g>}
      {item === 'foam_roller' && <g transform={'translate('+(g.armX(1,214)+12)+' 231) rotate(-14)'}>
        <rect x="-10" y="-31" width="20" height="69" rx="9" fill="#536b62" stroke="#28453d" strokeWidth="2.4"/>
        {[-23,-11,1,13,25].map(y=><path key={y} d={'M-9 '+y+' H9'} stroke="#9bb4a2" strokeWidth="3.5"/>)}
        <ellipse cy="-31" rx="10" ry="5" fill="#a7bcad" stroke="#385c4d"/>
        <ellipse cy="38" rx="10" ry="5" fill="#273c34"/>
      </g>}
      {item === 'basic_sneakers' && legXs.map(({x,side})=><g key={side} transform={'translate('+x+' 381)'}>
        <path d="M-8 -6 Q0 -11 8 -6 L11 12 15 15 Q19 24 11 25 H-12 Q-16 20 -10 12Z" fill="#f6f3e7" stroke="#60736c" strokeWidth="2"/>
        <path d="M-11 20 H15 M-5 1 H6 M-5 6 H6 M-5 11 H6" stroke="#637d72" strokeWidth="2.2"/>
        <path d="M-9 -4 L5 -4" stroke="#b79a62" strokeWidth="2"/>
      </g>)}

      {item === 'trail_cap' && <g>
        <path d="M77 31 Q77 4 100 4 Q123 4 123 31Z" fill="#355f48" stroke="#bed0a7" strokeWidth="2"/>
        <path d="M78 28 Q100 23 123 28 L141 36 Q114 43 78 32Z" fill="#ad754e" stroke="#d8bb89" strokeWidth="2"/>
        <path d="M100 10 V25" stroke="#8ca77a" strokeWidth="1.5"/>
      </g>}
      {item === 'hydration_pack' && <g>
        <rect x={100+g.shoulder*.69} y="98" width="25" height="89" rx="10" fill="#2b654d" stroke="#b7cfa8" strokeWidth="2"/>
        <path d={'M'+(100+g.shoulder*.69+4)+' 108 v58 m7 -61 v64'} stroke="#81b8a0" strokeWidth="2.5" fill="none"/>
        <path d={'M'+(100+g.shoulder*.69+2)+' 122 q-16 -25 -24 -12'} fill="none" stroke="#a99f6d" strokeWidth="4"/>
        <circle cx={100+g.shoulder*.69+13} cy="119" r="5" fill="#b1dcc2" stroke="#335a48"/>
      </g>}
      {item === 'trail_shoes' && legXs.map(({x,side})=><g key={side} transform={'translate('+x+' 379)'}>
        <path d="M-9 -8 Q0 -13 9 -8 L12 14 18 16 18 24 Q4 29 -14 23 L-12 11Z" fill="#536b47" stroke="#263c35" strokeWidth="2"/>
        <path d="M-11 21 H18 M-6 2 H8 M-6 8 H8" stroke="#ddb87b" strokeWidth="2"/>
        <path d="M-8 27 v-3 M0 27 v-3 M8 27 v-3" stroke="#263c35" strokeWidth="2"/>
      </g>)}

      {item === 'compression_knee' && <g transform={'translate('+(100-g.legX)+' 294)'}>
        <path d={'M'+(-10*g.legW)+' -31 Q0 -34 '+(10*g.legW)+' -31 L'+(9*g.legW)+' 30 Q0 36 '+(-9*g.legW)+' 30Z'} fill="#183e5b" stroke="#68a5b7" strokeWidth="2"/>
        <path d="M-12 -21 H12 M-11 23 H11" stroke="#9ed5e1" strokeWidth="3.5"/>
        <circle r="7" fill="none" stroke="#e0d8ae" strokeWidth="2"/>
      </g>}
      {item === 'kettlebell' && <g transform={'translate('+(g.armX(1,214)+12)+' 244)'}>
        <path d="M-9 -12 V-24 Q0 -34 9 -24 V-12" stroke="#d1c18c" strokeWidth="5" fill="none"/>
        <path d="M-15 -12 Q0 -21 15 -12 L21 17 Q0 34 -21 17Z" fill="#31566e" stroke="#b4d6da" strokeWidth="2"/>
        <circle cx="-5" cy="-3" r="3" fill="#c6e0df" opacity=".7"/>
      </g>}
      {item === 'pulse_medallion' && <g>
        <path d={'M'+(100-g.neck)+' 77 L100 111 '+(100+g.neck)+' 77'} stroke="#a6b6d0" fill="none" strokeWidth="3"/>
        <circle cx="100" cy="115" r="11" fill="#2c6790" stroke="#e6ce92" strokeWidth="2"/>
        <path d="M92 116 h4 l2 -4 4 8 2 -4 h4" fill="none" stroke="#eaffed" strokeWidth="1.8"/>
      </g>}

      {item === 'karate_obi' && <g>
        <path d={'M'+(100-g.hip)+' 185 Q100 191 '+(100+g.hip)+' 185 L'+(100+g.hip)+' 203 Q100 209 '+(100-g.hip)+' 203Z'} fill="#191d20" stroke="#77716a" strokeWidth="1.7"/>
        <path d="M96 191 l4 -5 7 8 -7 8 -7 -7Z" fill="#111618" stroke="#bba36b" strokeWidth="1.7"/>
        <path d="M99 203 l-10 42 -7 -2 9 -42 M104 203 l9 37 7 -2 -9 -41" fill="#1d1f20" stroke="#c7b28b" strokeWidth="1.4"/>
        <path d="M83 235 l-1 5 M114 231 l1 5" stroke="#dcbb69" strokeWidth="2"/>
      </g>}
      {item === 'karate_wraps' && hands.map(({side,x})=><g key={side} transform={'translate('+x+' 215) rotate('+(-side*8)+')'}>
        <path d="M-7 -11 Q0 -15 7 -11 L8 9 Q0 16 -8 9Z" fill="#f2e8d8" stroke="#8c4e45" strokeWidth="1.7"/>
        {[-7,-1,5].map(y=><path key={y} d={'M-7 '+y+' L7 '+(y+3)} stroke="#aa594c" strokeWidth="2.3"/>)}
      </g>)}
      {item === 'dojo_headband' && <g>
        <path d="M77 26 Q100 18 123 26 L122 34 Q100 27 78 34Z" fill="#f8f6ef" stroke="#7c7b73" strokeWidth="1.6"/>
        <circle cx="100" cy="27" r="4.5" fill="#a34137"/>
        <path d="M121 28 l12 12 -8 14" fill="#eee7dc" stroke="#a5a091" strokeWidth="1.3"/>
      </g>}
      {item === 'dojo_medal' && <g>
        <path d={'M'+(100-g.neck)+' 76 L100 108 '+(100+g.neck)+' 76'} fill="none" stroke="#8b3e34" strokeWidth="3"/>
        <circle cx="100" cy="114" r="10" fill={'url(#'+shade+')'} stroke="#805b2b" strokeWidth="1.7"/>
        <path d="M100 106 l2.2 5 5 .7 -3.6 3.5 1 5 -4.6 -2.4 -4.6 2.4 1 -5 -3.6 -3.5 5 -.7Z" fill="#fff4cf"/>
      </g>}

      {item === 'phoenix_wings' && <g fill="#b57c52" stroke="#d5b179" strokeWidth="2">
        <path d="M88 91 C58 47 26 51 8 85 C34 76 31 99 15 120 C43 111 26 150 13 164 C60 154 70 121 88 91Z"/>
        <path d="M112 91 C142 47 174 51 192 85 C166 76 169 99 185 120 C157 111 174 150 187 164 C140 154 130 121 112 91Z"/>
        <path d="M87 101 Q51 114 28 139 M113 101 Q149 114 172 139" stroke="#fff0bb" fill="none" strokeWidth="3"/>
        <path d="M45 72 Q69 79 83 97 M155 72 Q131 79 117 97" stroke="#f3c878" fill="none" strokeWidth="2"/>
      </g>}
      {item === 'comet_boots' && legXs.map(({x,side})=><g key={side} transform={'translate('+x+' 379)'}>
        <path d="M-11 -8 Q0 -16 11 -8 L12 15 18 19 16 29 Q0 36 -17 27 L-15 18Z" fill="#254568" stroke="#d9c389" strokeWidth="2.2"/>
        <path d="M-7 0 H9 M-8 6 H10 M-16 27 H16" stroke="#a5d6dd" strokeWidth="2.5"/>
        <path d="M12 -3 l10 -7 -6 16 6 4 -10 5" fill="#ffdf91" stroke="#e1a849" strokeWidth="1.5"/>
      </g>)}
      {item === 'star_staff' && <g transform={'translate('+(g.armX(1,214)+14)+' 0)'}>
        <path d="M0 101 V399" stroke="#735c3e" strokeWidth="6" fill="none"/>
        <path d="M0 101 V399" stroke="#e1b878" strokeWidth="2" fill="none"/>
        <path d="M0 91 l7 13 14 2 -11 9 3 14 -13 -7 -13 7 3 -14 -11 -9 14 -2Z" fill={'url(#'+shade+')'} stroke="#f2e7c2" strokeWidth="2"/>
        <circle cy="111" r="5" fill="#b5f4ec"/>
        <path d="M-7 189 H7 M-7 294 H7" stroke="#9fd3c2" strokeWidth="3"/>
      </g>}
      {item === 'aurora_halo' && <g>
        <ellipse cx="100" cy="4" rx="27" ry="7" fill="none" stroke="#e9d3a0" strokeWidth="3.3"/>
        <ellipse cx="100" cy="4" rx="22" ry="4.2" fill="none" stroke="#a4e9d9" strokeWidth="1.9"/>
        <path d="M100 -3 v-7 M76 4 l-6 -5 M124 4 l6 -5" stroke="#d7f8e5" strokeWidth="2.2" opacity=".85"/>
      </g>}
    </g>
  );
}
