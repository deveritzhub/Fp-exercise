import { test, expect } from '@playwright/test';
import { GEAR, DEFAULT_LOOK, onePerSlot } from '../shared/hero';
import { mkdirSync, writeFileSync } from 'node:fs';
import { expectAccessible } from './helpers';

test('thumbnails come from the actual worn models and have sensible physical sizes', async ({ page }) => {
  test.setTimeout(120000);
  mkdirSync('web/public/hero3d/items',{recursive:true});
  await page.goto('/hero3d-items.html');
  await page.waitForFunction(()=>'hero3dItemReview' in window);
  const results = [];
  const images: { key:string; bytes:Buffer }[] = [];
  for (const item of GEAR) {
    const result = await page.evaluate(async key => { return (window as unknown as {hero3dItemReview:{renderItem:(key:string)=>Promise<{key:string;size:number[];meshes:number}>}}).hero3dItemReview.renderItem(key); },item.key);
    expect(result.meshes,item.key).toBeGreaterThan(0);
    expect(result.size.every((x:number)=>Number.isFinite(x)&&x>=0),item.key).toBe(true);
    expect(Math.max(...result.size),item.key).toBeGreaterThan(.01);
    expect(Math.max(...result.size),item.key).toBeLessThan(2.2);
    images.push({key:item.key,bytes:await page.locator('canvas').screenshot({omitBackground:true})});
    results.push(result);
  }
  mkdirSync('docs/hero3d-clothing',{recursive:true});
  writeFileSync('docs/hero3d-clothing/items.json',JSON.stringify(results,null,2)+'\n');
  // Writing Vite's public assets while rendering would reload the page midway through a set.
  for (const {key,bytes} of images) writeFileSync(`web/public/hero3d/items/${key}.png`,bytes);
});

test('all eight fitted kits and long outfits render, turn, equip and unequip', async ({ page }) => {
  test.setTimeout(480000);
  mkdirSync('docs/hero3d-clothing',{recursive:true});
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:500,height:850});
  for (const frame of ['m','f']) for (const build of ['slim','average','athletic','full']) {
    await page.goto(`/hero3d-review.html?frame=${frame}&build=${build}&hair=${frame==='m'?'short':'bun'}&skin=s5&outfit=forest&gear=`);
    const hero = page.getByTestId('hero-3d');
    await expect(hero).toHaveAttribute('data-state','ready',{timeout:45000});
    await hero.screenshot({path:`docs/hero3d-clothing/${frame}-${build}-base.png`});
    for (const key of ['tracksuit','sport_ski','champion']) {
      await page.evaluate(async key=>{(window as unknown as {hero3dReview:{setGear:(gear:string[])=>void}}).hero3dReview.setGear([key]);},key);
      await expect(hero).toHaveAttribute('data-state','ready',{timeout:30000});
      // Let React, the asynchronous texture gate and reduced-motion dirty frame finish.
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await hero.screenshot({path:`docs/hero3d-clothing/${frame}-${build}-${key}.png`});
    }
    const full=['cap','headphones','pin','yoga_mat','captain','watch','gloves','belt','shin_guards','gold_shoes','tracksuit','sport_item'];
    await page.evaluate(gear=>(window as unknown as {hero3dReview:{setGear:(gear:string[])=>void}}).hero3dReview.setGear(gear),full);
    await expect(hero).toHaveAttribute('data-state','ready',{timeout:30000});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await hero.screenshot({path:`docs/hero3d-clothing/${frame}-${build}-equipped.png`});
    await page.getByRole('button',{name:'Draai naar rechts'}).press('Enter');
    await page.getByRole('button',{name:'Draai naar rechts'}).press('Enter');
    await hero.screenshot({path:`docs/hero3d-clothing/${frame}-${build}-side.png`});
    const bounds = await page.evaluate(async()=>{return(window as unknown as {hero3dReview:{checkEquipment:()=>Promise<{key:string;slot:string;min:number[];max:number[];size:number[]}[]>}}).hero3dReview.checkEquipment();});
    for (const item of bounds) {
      expect(item.size.every((x:number)=>Number.isFinite(x)&&x>=0),`${frame}/${build}/${item.key}`).toBe(true);
      expect(Math.max(...item.size),item.key).toBeGreaterThan(.005);
      if(item.key==='headphones') expect(item.min[1]).toBeGreaterThan(1.35);
      if(item.slot==='head') expect(item.min[1],item.key).toBeGreaterThan(1.35);
      if(item.slot==='feet') expect(item.max[1],item.key).toBeLessThan(.5);
    }
  }
  for(const [pose,time] of [['walk',.2],['walk',.65],['run',.18],['cheer',.4]] as const) {
    const gear='cap,headphones,pin,yoga_mat,captain,watch,gloves,belt,shin_guards,gold_shoes,tracksuit,sport_item';
    await page.goto(`/hero3d-review.html?frame=f&build=full&hair=bun&gear=${gear}&pose=${pose}&time=${time}`);
    await expect(page.getByTestId('hero-3d')).toHaveAttribute('data-state','ready',{timeout:45000});
    await page.getByTestId('hero-3d').screenshot({path:`docs/hero3d-clothing/motion-${pose}-${time}.png`});
  }
  expect(errors).toEqual([]);
});

test('3D inventory reuses every equip action, shop preview, purchase and persisted gear on a phone', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({width:390,height:844});
  const state = {hero:{...DEFAULT_LOOK,frame:'f',build:'full',hair:'bun',heroName:'Testheld',sports:[],createdAt:'2026-01-01'},gear:{owned:GEAR.map(g=>g.key).filter(k=>k!=='champion'),equipped:[] as string[],coins:9999,score:0},showcase:[],trophies:[],skills:[],badges:[],level:{level:1,xp:0},totalLevel:1,metrics:null,logs:{protein:{},weight:{},survival:{water:{}},steps:{},trainings:[]},checkin:{}};
  let writes=0;
  await page.route('**/api/**', async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/auth/me')return route.fulfill({json:{user:{id:'synthetic',fullName:'Testheld',locale:'nl',emailVerified:true,memberships:[],patient:{id:'synthetic',kind:'personal',practiceName:'Test'}}}});
    if(path==='/api/patient/hero/gear'){writes++;state.gear.equipped=route.request().postDataJSON().equipped;return route.fulfill({json:{ok:true}});}
    if(path==='/api/patient/hero/shop'){writes++;const key=route.request().postDataJSON().item;state.gear.owned.push(key);state.gear.equipped=onePerSlot([...state.gear.equipped,key]);return route.fulfill({json:{ok:true}});}
    if(path==='/api/patient/hero')return route.fulfill({json:state});
    return route.fulfill({json:{}});
  });
  await page.goto('/p/held/inventaris');
  await page.getByRole('button',{name:'3D-weergave',exact:true}).click();
  const hero=page.getByTestId('hero-3d');
  await expect(hero).toHaveAttribute('data-state','ready',{timeout:45000});
  await page.locator('.rpg-stage').screenshot({path:'docs/hero3d-clothing/inventory-mobile-base.png'});
  const tracksuit=GEAR.find(g=>g.key==='tracksuit')!;
  await page.getByRole('button').filter({hasText:tracksuit.nl}).filter({hasText:'Aandoen'}).last().press('Enter');
  await expect.poll(()=>state.gear.equipped.includes('tracksuit')).toBe(true);
  await page.reload();
  await expect(page.getByRole('button',{name:'3D-weergave',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(hero).toHaveAttribute('data-state','ready',{timeout:45000});
  const beforePreview=writes;
  const champion=GEAR.find(g=>g.key==='champion')!;
  await page.getByRole('button',{name:`Passen: ${champion.nl}`,exact:true}).last().click();
  await expect(page.getByRole('status').filter({hasText:'Paskamer'})).toBeVisible();
  expect(writes).toBe(beforePreview);
  expect(state.gear.equipped).toEqual(['tracksuit']);
  await hero.scrollIntoViewIfNeeded();
  await hero.screenshot({path:'docs/hero3d-clothing/inventory-mobile-preview.png'});
  await page.getByRole('button',{name:'Preview sluiten',exact:true}).click();
  for(const item of GEAR.filter(g=>g.key!=='champion')) {
    if(state.gear.equipped.includes(item.key))continue;
    const tile=page.getByRole('button').filter({hasText:item.nl}).filter({hasText:'Aandoen'}).last();
    await expect(tile).toBeEnabled();
    await tile.press('Enter');
    await expect.poll(()=>state.gear.equipped.includes(item.key)).toBe(true);
  }
  await hero.scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute('data-state','ready',{timeout:30000});
  await page.locator('.rpg-stage').screenshot({path:'docs/hero3d-clothing/inventory-mobile-equipped.png'});
  await page.getByRole('button',{name:`Kopen ${champion.price} muntjes: ${champion.nl}`,exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Nieuw in je collectie'})).toBeVisible();
  await expect(page.getByRole('dialog').locator('img')).toHaveAttribute('src',/\/hero3d\/items\/champion\.png/);
  expect(state.gear.equipped).toContain('champion');
  expect(state.gear.equipped).not.toContain('team_kit');
  await page.getByRole('dialog').screenshot({path:'docs/hero3d-clothing/legendary-reveal.png'});
  await page.getByRole('button',{name:'Verder',exact:true}).click();
  await hero.scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute('data-state','ready',{timeout:30000});
  await page.locator('.rpg-stage').screenshot({path:'docs/hero3d-clothing/inventory-mobile-champion.png'});
  await page.getByRole('button',{name:'Draai naar rechts'}).press('Enter');
  await expectAccessible(page,'3D inventory');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  for(const key of [...state.gear.equipped]) {
    const item=GEAR.find(g=>g.key===key)!;
    const tile=page.getByRole('button').filter({hasText:item.nl}).filter({hasText:'Uittrekken'}).last();
    await expect(tile).toBeEnabled();
    await tile.press('Enter');
    await expect.poll(()=>state.gear.equipped.includes(key)).toBe(false);
  }
  await expect.poll(()=>state.gear.equipped).toEqual([]);
  await page.reload();
  await expect(hero).toHaveAttribute('data-state','ready',{timeout:45000});
});
