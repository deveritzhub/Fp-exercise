import {useId} from 'react';
import {photoFit} from './photoFit';

/** Original fabric artwork for the existing future-reward preview, drawn behind
 * the source photograph's silhouette. This does not grant or equip a reward. */
export function PhotoMasterCape({source}:{source:string}){
 const id=useId().replace(/:/g,'');
 const fit=photoFit(source);
 if(!fit)return null;
 const p=fit.points, left=Math.min(p[11][0],p[12][0])*1000,right=Math.max(p[11][0],p[12][0])*1000;
 const y=(p[11][1]+p[12][1])/2*1333.33;
 const cx=(left+right)/2,w=right-left;
 const hem=(p[27][1]+p[28][1])/2*1333.33-60;
 const outerL=Math.max(75,cx-w*.94),outerR=Math.min(925,cx+w*.94);
 const outline=`M${left},${y-16} Q${cx},${y-58} ${right},${y-16} C${right+42},${y+100} ${outerR-25},${hem-150} ${outerR},${hem} Q${cx},${hem+52} ${outerL},${hem} C${outerL+25},${hem-150} ${left-42},${y+100} ${left},${y-16}Z`;
 return <g data-photo-gear="master_cape" data-cosmetic-preview="true">
  <defs>
   <linearGradient id={`cape${id}`}><stop stopColor="#142d2b"/><stop offset=".16" stopColor="#315c52"/><stop offset=".33" stopColor="#193a35"/><stop offset=".5" stopColor="#49766a"/><stop offset=".68" stopColor="#193a35"/><stop offset=".85" stopColor="#315c52"/><stop offset="1" stopColor="#102c28"/></linearGradient>
   <linearGradient id={`trim${id}`} x2=".7" y2="1"><stop stopColor="#896332"/><stop offset=".4" stopColor="#f1dba1"/><stop offset="1" stopColor="#aa7837"/></linearGradient>
   <clipPath id={`capeClip${id}`}><path d={outline}/></clipPath>
  </defs>
  <path d={outline} fill={`url(#cape${id})`} stroke="#102c28" strokeWidth="7"/>
  <g clipPath={`url(#capeClip${id})`}>
   <path d={outline} fill="none" stroke={`url(#trim${id})`} strokeWidth="18"/>
   {[.17,.33,.67,.83].map((t,i)=><path key={t} d={`M${left+w*t},${y} Q${cx+(t-.5)*w*.9},${(y+hem)/2} ${outerL+(outerR-outerL)*t},${hem+18}`} fill="none" stroke={i%2?'#88a495':'#0b2521'} strokeOpacity=".35" strokeWidth={i%2?3:7}/>)}
   {[outerL+29,outerR-29].map((x,i)=><g key={x} transform={`translate(${x} ${hem-55})`}><path d={`M0,-27 L${i?-12:12},0 0,27 ${i?12:-12},0Z`} fill={`url(#trim${id})`}/><path d="M0,-13 L6,0 0,13 -6,0Z" fill="#7aada0"/></g>)}
   <path d={`M${outerL+16},${hem-13} Q${cx},${hem+26} ${outerR-16},${hem-13}`} fill="none" stroke="#d4b97b" strokeWidth="2" strokeDasharray="3 5"/>
  </g>
 </g>;
}
