import {describe,it,expect} from 'vitest';
import {GEAR} from '@shared/hero';
import { COLLECTION_ITEM_KEYS } from '@shared/gearCollections';
import {photoFitProfiles,measuredPlacement,identityAlignment} from './photoFit';
describe('generated photographic fittings',()=>{
 it('covers every standard catalog body/skin/hair and outfit with valid geometry',()=>{
  expect(Object.keys(photoFitProfiles)).toHaveLength(420);
  for(const [key,profile] of Object.entries(photoFitProfiles)){
   expect(profile.points,key).toHaveLength(33);
   expect(profile.silhouette,key).toMatch(/^M/);
   for(const item of GEAR.filter(g=>!['tracksuit','team_kit','champion'].includes(g.key) && !COLLECTION_ITEM_KEYS.has(g.key))){
    for(const mirror of [false,true]){
     const fit=measuredPlacement(key,item.key,mirror)!;
     expect(fit,key+' '+item.key).not.toBeNull();
     expect(Object.values(fit).every(Number.isFinite)).toBe(true);
     expect(fit.width).toBeGreaterThan(0); expect(fit.height).toBeGreaterThan(0);
     expect(fit.x-fit.width/2,key+' '+item.key).toBeGreaterThanOrEqual(0);
     expect(fit.x+fit.width/2,key+' '+item.key).toBeLessThanOrEqual(1);
     // Fitted stage reserves 4% at top/bottom around its 92% image.
     expect(.04+.92*fit.y,key+' '+item.key).toBeGreaterThanOrEqual(0);
     expect(fit.y+fit.height,key+' '+item.key).toBeLessThanOrEqual(1.02);
    }
   }
  }
 });
 it('measures the actual outfit pose rather than reusing the base body',()=>{
  expect(measuredPlacement('outfit/f_s5_average__champion','gloves',false)).not.toEqual(measuredPlacement('avatar/f_s5_average','gloves',false));
 });
 it('sizes knee sleeves from the leg contour and centres them on the knee',()=>{
  for(const key of ['f_s5_full_h2','m_s5_full','f_s1_lean']){
   const fit=measuredPlacement(key,'sleeve',false)!;
   const knee=photoFitProfiles[key].points[26];
   expect(fit.x).toBe(knee[0]);
   expect(fit.y).toBeLessThan(knee[1]);
   expect(fit.y+fit.height).toBeGreaterThan(knee[1]);
  }
  expect(measuredPlacement('f_s5_full_h2','sleeve',false)!.width).toBeGreaterThan(measuredPlacement('f_s1_lean','sleeve',false)!.width);
 });
 it('keeps caps and visors above the selected eyes when an outfit changes the source head',()=>{
  for(const key of Object.keys(photoFitProfiles).filter(k=>!k.includes('__'))){
   const base=key.replace(/_h[234]$/,'');
   for(const outfit of ['tracksuit','team_kit','champion']){
    const source=base+'__'+outfit, alignment=identityAlignment(source,key)!;
    const points=photoFitProfiles[key].points;
    const eyes=(points[2][1]+points[5][1])/2*alignment.scale+alignment.dy;
    for(const item of ['cap','visor']){
     const placement=measuredPlacement(source,item,false,key)!;
     expect(placement.y+placement.height,key+' '+outfit+' '+item).toBeLessThan(eyes);
     expect(eyes-placement.y-placement.height).toBeLessThan(.03);
    }
   }
  }
 });
 it('does not invent geometry for personal or unknown photographs',()=>{
  expect(measuredPlacement('avatar/custom_1','cap',false)).toBeNull();
 });
});
