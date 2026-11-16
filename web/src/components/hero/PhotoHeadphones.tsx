import {gearTier} from '@shared/hero';
import {useId} from 'react';
import {photoFit,identityAlignment} from './photoFit';

/** Fit the same product texture as three parts: a crown arc and two ear cups.
 * The inner pads in the product photograph face the camera, not the wearer;
 * only the outer housings belong on the photographic avatar. */
export function headphoneFit(source:string,originalKey:string){
 const sourceFit=photoFit(source);
 if(!sourceFit)return null;
 const alignment=source.includes('__')?identityAlignment(source,originalKey):null;
 const profile=alignment?photoFit(originalKey):sourceFit;
 if(!profile)return null;
 const project=(p:number[])=>[p[0]*(alignment?.scale ?? 1)+(alignment?.dx ?? 0),p[1]*(alignment?.scale ?? 1)+(alignment?.dy ?? 0)];
 const ears=[project(profile.points[8]),project(profile.points[7])].sort((a,b)=>a[0]-b[0]);
 const width=ears[1][0]-ears[0][0];
 const top=profile.headTop*(alignment?.scale ?? 1)+(alignment?.dy ?? 0);
 return {ears,width,top};
}
export function PhotoHeadphones({source,originalKey,cap=false,onError}:{source:string;originalKey:string;cap?:boolean;onError?:()=>void}){
 const id=useId().replace(/:/g,'');
 const fit=headphoneFit(source,originalKey);
 if(!fit)return null;
 const {ears,width,top}=fit;
 const cupW=width*.36, cupH=width*.51;
 const left=ears[0][0]-cupW*.9, right=ears[1][0]+cupW*.9;
 const bandTop=Math.min(top-.004-(cap ? .014 : 0),(ears[0][1]+ears[1][1])/2-.04);
 const bandBottom=(ears[0][1]+ears[1][1])/2;
 const texture='/api/hero-assets/wear/headphones';
 return <g data-photo-gear="headphones" data-headphone-fit="segmented" className="photo-worn" data-tier={gearTier('headphones').tier} style={{filter:`drop-shadow(0 0 .4px ${gearTier('headphones').glow})`}}>
  <defs>
   <filter id={`hp${id}`} colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncA type="table" tableValues="0 0 0 0 0 0 .6 1 1 1 1"/></feComponentTransfer></filter>
   <clipPath id={`arc${id}`}><path d="M155 390 C164 245 285 145 505 145 C729 145 851 249 866 390 L810 430 C799 307 697 195 505 195 C316 195 216 308 211 430Z"/></clipPath>
   <clipPath id={`left${id}`}><path d="M181 478 C211 470 243 501 267 551 L340 789 Q353 843 286 860 Q213 863 181 795 L125 640 Q100 548 144 502Z"/></clipPath>
   <clipPath id={`right${id}`}><path d="M843 478 C813 470 781 501 757 551 L684 789 Q671 843 738 860 Q811 863 843 795 L899 640 Q924 548 880 502Z"/></clipPath>
  </defs>
  <svg data-headphone-part="band" x={left*1000} y={bandTop*1333.33} width={(right-left)*1000} height={(bandBottom-bandTop)*1333.33} viewBox="155 139 711 291" preserveAspectRatio="none" overflow="visible">
   <image onError={onError} href={texture} width="1024" height="1024" clipPath={`url(#arc${id})`} filter={`url(#hp${id})`}/>
  </svg>
  {ears.map((ear,i)=><svg key={i} data-headphone-part="cup" x={(ear[0]-cupW/2+(i===0?-1:1)*cupW*.4)*1000} y={(ear[1]-cupH*.43)*1333.33} width={cupW*1000} height={cupH*1333.33} viewBox={i===0?'118 475 230 390':'676 475 230 390'} preserveAspectRatio="none" overflow="hidden">
   <image onError={onError} href={texture} width="1024" height="1024" clipPath={`url(#${i===0?'left':'right'}${id})`} filter={`url(#hp${id})`}/>
  </svg>)}
 </g>;
}
