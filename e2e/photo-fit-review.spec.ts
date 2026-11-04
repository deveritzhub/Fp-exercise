import {GEAR,GEAR_TIERS} from '../shared/hero';
import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const assets=path.resolve('.local-photo-review');
test.skip(!fs.existsSync(path.join(assets,'avatar.png')), 'Run the documented photographic review asset downloader first.');
test('photographic fitting review',async({page})=>{
 await page.setViewportSize({width:1540,height:730});
 await page.route('**/api/hero-assets/**',async route=>{const u=new URL(route.request().url());const parts=u.pathname.split('/');let key=parts.at(-1)!;if(parts.at(-2)==='shop')key='shop_'+key;const path=`${assets}/${key}.png`;if(fs.existsSync(path))await route.fulfill({path,contentType:'image/png'});else await route.abort();});
 const errors:string[]=[];page.on('pageerror', e=>errors.push(e.message));
 await page.goto('/photo-fit-review.html');await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete));await page.waitForTimeout(1000);await expect(page.locator('[data-photo-gear=cap]')).toHaveCount(1);await expect(page.locator('[data-photo-gear=gold_shoes]')).toHaveCount(4);await page.screenshot({path:`${assets}/review.png`});
 for(let i=0;i<4;i++){await page.goto('/photo-fit-review.html?catalog='+i);await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete));await page.waitForTimeout(500);await page.screenshot({path:`${assets}/catalog-${i}.png`,fullPage:true});}
 await page.goto('/photo-fit-review.html?matrix');await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete));await page.waitForTimeout(500);await expect(page.locator('[data-photo-gear=cap]')).toHaveCount(7);await page.screenshot({path:`${assets}/matrix.png`,fullPage:true});expect(errors).toEqual([]);
});

test('photographic inventory equips and keeps photographic preview on mobile', async ({page})=>{
  test.setTimeout(120000);
  const state={hero:{heroName:'Visuele test',skin:'s5',hair:'ponytail',outfit:'forest',frame:'f',build:'average',sports:[]},gear:{owned:['cap','wristbands','gold_shoes'],equipped:['wristbands','gold_shoes'],coins:999,score:90},showcase:[],trophies:[],skills:[],badges:[],level:{level:1,xp:0},totalLevel:1,metrics:null,logs:{protein:{},weight:{},survival:{water:{}},steps:{},trainings:[]},checkin:{}};
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());const parts=url.pathname.split('/');let key=parts.at(-1)!;
    if(url.pathname.includes('/hero-assets/')){
      if(parts.at(-2)==='shop')key='shop_'+key;
      const file=path.join(assets,key+'.png');
      return fs.existsSync(file)?route.fulfill({path:file,contentType:'image/png'}):route.abort();
    }
    if(url.pathname==='/api/auth/me')return route.fulfill({json:{user:{id:'synthetic',fullName:'Test',locale:'nl',memberships:[],patient:{id:'synthetic',kind:'personal'}}}});
    if(url.pathname==='/api/patient/hero/gear'){state.gear.equipped=route.request().postDataJSON().equipped;return route.fulfill({json:{ok:true}});}
    if(url.pathname==='/api/patient/hero')return route.fulfill({json:state});
    return route.fulfill({json:{}});
  });
  // This inventory fixture represents a returning user; the welcome tour has its own tests.
  await page.addInitScript(() => localStorage.setItem('fp.tour.v1', 'done'));
  await page.goto('/p/held/inventaris');
  const photo=page.getByRole('img',{name:'Je fotorealistische held met je gedragen uitrusting'});
  await expect(photo).toBeVisible();
  await page.getByRole('button',{name:/Pet.*Aandoen/}).click();
  await expect(photo.locator('[data-photo-gear=cap]')).toHaveCount(1);
  await page.reload();await expect(photo.locator('[data-photo-gear=cap]')).toHaveCount(1);
  await page.getByRole('button',{name:'Passen: Kroon',exact:true}).click();
  await expect(photo.locator('[data-photo-gear=crown]')).toHaveCount(1);
  expect(state.gear.equipped).toContain('cap');expect(state.gear.equipped).not.toContain('crown');
  await page.getByRole('button',{name:'Preview sluiten'}).click();
  await expect(photo.locator('[data-photo-gear=cap]')).toHaveCount(1);
  await page.locator('.rpg-stage').screenshot({path:`${assets}/inventory.png`,style:'header, nav { visibility:hidden !important }'});
  await page.locator('[aria-labelledby="gear-title"]').screenshot({path:`${assets}/shop-tiers.png`,style:'header, nav { visibility:hidden !important }'});
  state.gear.owned=GEAR.map(g=>g.key);state.gear.equipped=[];await page.reload();
  for(const item of GEAR){
    const card=page.locator(`[data-item="${item.key}"]`).first();
    await expect(card).toContainText(`Tier ${item.tier} · ${GEAR_TIERS[item.tier-1].nl}`);await expect(card).toContainText(`Itemlevel ${item.itemLevel}`);
    await card.click();await expect(card).toHaveAttribute('aria-pressed','true');
    if(['tracksuit','team_kit','champion'].includes(item.key)) await expect(photo.locator(`img[src$="__${item.key}"]`)).toBeVisible();
    else expect(await photo.locator(`[data-photo-gear="${item.key}"]`).count()).toBeGreaterThan(0);
    await page.reload();await expect(page.locator(`[data-item="${item.key}"]`).first()).toHaveAttribute('aria-pressed','true');
    await page.locator(`[data-item="${item.key}"]`).first().click();
    await expect(page.locator(`[data-item="${item.key}"]`).first()).toHaveAttribute('aria-pressed','false');
  }
  state.gear.equipped=['cap','wristbands','gold_shoes'];await page.reload();
  await page.locator('[aria-labelledby="gear-title"]').screenshot({path:`${assets}/inventory-tiers.png`,style:'header, nav { visibility:hidden !important }'});
  await page.setViewportSize({width:390,height:844});
  await page.locator('.rpg-stage').screenshot({path:`${assets}/inventory-mobile.png`,style:'header, nav { visibility:hidden !important }'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});
