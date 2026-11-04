import { useId, useState } from 'react';
import { heroPhotoKey } from '@shared/hero';
import type { FigureLook } from './HumanFigure';
import { photoFit, sourcePhotoKey, identityAlignment } from './photoFit';

/** Preserve the selected generated head/hair when wearing an existing full-body outfit.
 * The selected photo is aligned by ear landmarks; its upper image and hair form a single mask.
 * Only catalog images participate. Personal photographs are never composited.
 */
export function PhotoIdentity({look,source}:{look:FigureLook;source:string}) {
  const id=useId().replace(/:/g,'');
  const [failed,setFailed]=useState(false);
  if(look.photo || !sourcePhotoKey(source).includes('__') || failed)return null;
  const key=heroPhotoKey(look,look.body ?? null);
  const original=photoFit(key), outfit=photoFit(source);
  if(!original || !outfit)return null;
  const a=original.points;
  const {scale,dx,dy}=identityAlignment(source,key)!;
  const neck=((a[11][1]+a[12][1])*.5-.045)*1333.33;
  return <g data-photo-identity={key} transform={`translate(${dx*1000} ${dy*1333.33}) scale(${scale})`}>
    <defs>
      <linearGradient id={`neck${id}`} x1="0" x2="0" y1={neck-10} y2={neck+12} gradientUnits="userSpaceOnUse">
        <stop stopColor="white"/><stop offset="1" stopColor="black"/>
      </linearGradient>
      <clipPath id={`head${id}`}><rect x="-300" y="-300" width="1600" height={neck+290}/><path d={original.hair}/></clipPath>
      <mask id={`identity${id}`} maskUnits="userSpaceOnUse" x="-300" y="-300" width="1600" height="1800">
        <rect x="-300" y={neck-10} width="1600" height="22" fill={`url(#neck${id})`}/>
      </mask>
    </defs>
    <image href={`/api/hero-assets/avatar/${key}`} width="1000" height="1333.33" preserveAspectRatio="none" clipPath={`url(#head${id})`} onError={()=>setFailed(true)}/>
    <image href={`/api/hero-assets/avatar/${key}`} width="1000" height="1333.33" preserveAspectRatio="none" mask={`url(#identity${id})`} onError={()=>setFailed(true)}/>
  </g>;
}
