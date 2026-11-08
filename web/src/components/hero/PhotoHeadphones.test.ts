import {describe,it,expect} from 'vitest';
import {headphoneFit} from './PhotoHeadphones';
import {photoFitProfiles,identityAlignment} from './photoFit';
describe('segmented photographic headphones',()=>{
 it('anchors each cup to the selected ear for all original and outfit combinations',()=>{
  for(const key of Object.keys(photoFitProfiles).filter(k=>!k.includes('__'))){
   const base=key.replace(/_h[234]$/,'');
   for(const source of [key,...['tracksuit','team_kit','champion'].map(o=>base+'__'+o)]){
    const fit=headphoneFit(source,key)!;
    expect(fit.width,key).toBeGreaterThan(.04);
    expect(fit.width,key).toBeLessThan(.2);
    expect(fit.top,key).toBeLessThan(Math.min(...fit.ears.map(e=>e[1])));
    const a=source===key?{scale:1,dx:0,dy:0}:identityAlignment(source,key)!;
    const p=photoFitProfiles[key].points;
    const expected=[p[7],p[8]].map(e=>[e[0]*a.scale+a.dx,e[1]*a.scale+a.dy]).sort((a,b)=>a[0]-b[0]);
    expect(fit.ears).toEqual(expected);
   }
  }
 });
 it('does not fabricate geometry for unknown images',()=>expect(headphoneFit('personal','unknown')).toBeNull());
});
