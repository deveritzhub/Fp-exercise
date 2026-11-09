import { expect, test } from '@playwright/test';
import { DEFAULT_LOOK } from '../shared/hero';
import { ACL_REWARDS, wearableAclReward } from '../shared/aclRewards';

test('ACL quest equipment follows the illustrated body instead of floating at thumbnail coordinates', async ({ page }) => {
  test.setTimeout(90000);
  const state = {
    hero: { ...DEFAULT_LOOK, frame:'m', build:'athletic', hair:'short', heroName:'Fictieve testheld', createdAt:'2026-01-01', sports:[] },
    gear: { owned:[], equipped:[] as string[], coins:0, score:0 },
    showcase:[], wallBadges:[], trophies:[], skills:[], badges:[], level:{level:1,xp:0}, totalLevel:1,
    metrics:null, logs:{protein:{},weight:{},survival:{water:{}},steps:{},trainings:[]}, checkin:{},
  };
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if(path==='/api/auth/me')return route.fulfill({json:{user:{id:'synthetic',fullName:'Testheld',locale:'nl',emailVerified:true,memberships:[],patient:{id:'synthetic',kind:'personal',practiceName:'Test'}}}});
    if(path==='/api/patient/hero')return route.fulfill({json:state});
    return route.fulfill({json:{}});
  });
  await page.addInitScript(() => sessionStorage.setItem('fp.inventory.illustrated','true'));
  const stage = page.getByRole('img', { name:'Je geïllustreerde held met je gedragen uitrusting' });
  const wears = ACL_REWARDS.filter(item => wearableAclReward(item.key));
  for(const build of ['slim','athletic','full'] as const){
    state.hero.build=build;
    for(const item of wears){
      state.gear.equipped=[item.key];
      await page.goto('/p/held/inventaris');
      await expect(stage).toBeVisible();
      const piece=stage.locator(`[data-rpg-item="${item.key}"]`);
      await expect(piece, build+' '+item.key).toHaveCount(1);
      const rect=await piece.evaluate(n=>{
        const b=(n as SVGGraphicsElement).getBBox();
        return {x:b.x,y:b.y,width:b.width,height:b.height};
      });
      expect(rect.width,build+' '+item.key).toBeGreaterThan(3);
      expect(rect.height,build+' '+item.key).toBeGreaterThan(3);
      expect(rect.x,build+' '+item.key).toBeGreaterThanOrEqual(-6);
      expect(rect.x+rect.width,build+' '+item.key).toBeLessThanOrEqual(206);
      expect(rect.y,build+' '+item.key).toBeGreaterThanOrEqual(-11);
      expect(rect.y+rect.height,build+' '+item.key).toBeLessThanOrEqual(425);
      if(['iron_brace','rune_guard'].includes(item.key))expect(rect.y,build+' '+item.key).toBeGreaterThan(250);
      if(['pilgrim_boots','wing_shoes'].includes(item.key))expect(rect.y,build+' '+item.key).toBeGreaterThan(364);
      if(item.key==='champion_helm')expect(rect.y+rect.height,build+' '+item.key).toBeLessThan(66);
    }
  }
  state.gear.equipped=['wind_cape','champion_helm','iron_brace','pilgrim_boots','smith_hammer','golden_hinge'];
  await page.goto('/p/held/inventaris');
  await expect(stage).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect(stage.locator('[data-rpg-item]')).toHaveCount(state.gear.equipped.length);
  const jpg=await page.locator('.rpg-stage').screenshot({type:'jpeg',quality:40,animations:'disabled'});
  console.log('FP_ACL_FIT_JPEG:athletic:'+jpg.toString('base64'));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
