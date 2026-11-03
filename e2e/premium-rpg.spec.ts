import { test, expect } from '@playwright/test';
import { GEAR, DEFAULT_LOOK, onePerSlot, HERO_OPTIONS } from '../shared/hero';
import { mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

// Network fixture only: never connects to patient storage or the production API.
test('all cosmetics, persistence, previews, character variants and keyboard', async ({page}) => {
  test.setTimeout(180000);
  const errors:string[]=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('console', m=> {if(m.type()==='error')errors.push(m.text())});
  const state = {hero:{...DEFAULT_LOOK,heroName:'Testheld',sports:[],createdAt:'2026-01-01'},gear:{owned:GEAR.map(g=>g.key),equipped:[] as string[],coins:9999,score:0},showcase:[],trophies:[],skills:[],badges:[],level:{level:1,xp:0},totalLevel:1,metrics:null,logs:{protein:{},weight:{},survival:{water:{}},steps:{},trainings:[]},checkin:{}};
  let writes=0;
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/auth/me') return route.fulfill({json:{user:{id:'synthetic',fullName:'Testheld',locale:'nl',emailVerified:true,memberships:[],patient:{id:'synthetic',kind:'personal',practiceName:'Test'}}}});
    if(path==='/api/patient/hero/gear'){writes++;state.gear.equipped=route.request().postDataJSON().equipped;return route.fulfill({json:{ok:true}});}
    if(path==='/api/patient/hero/shop'){writes++;const key=route.request().postDataJSON().item;state.gear.owned.push(key);state.gear.equipped=onePerSlot([...state.gear.equipped,key]);return route.fulfill({json:{ok:true}});}
    if(path==='/api/patient/hero'){state.gear.score=GEAR.filter(g=>state.gear.equipped.includes(g.key)).reduce((n,g)=>n+g.score,0);return route.fulfill({json:state});}
    return route.fulfill({json:{}});
  });
  mkdirSync('docs/rpg-screenshots',{recursive:true});
  await page.goto('/p/held/inventaris');
  const character=page.getByRole('img',{name:'Je geïllustreerde held met je gedragen uitrusting'});
  await expect(character).toBeVisible();
  await page.locator('.rpg-stage').screenshot({style:'header, nav { visibility:hidden !important }',path:'docs/rpg-screenshots/unequipped.png'});
  for(const item of GEAR){

    const tile=page.getByRole('button').filter({has:page.locator('span', {hasText:item.nl})}).filter({hasText:'Aandoen'}).last();
    await tile.click();
    await expect(character.locator(`[data-rpg-item="${item.key}"]`)).toHaveCount(1);
    const box=await character.locator(`[data-rpg-item="${item.key}"]`).boundingBox();
    expect(box?.width).toBeGreaterThan(5);expect(box?.height).toBeGreaterThan(4);
    await page.reload();await expect(character.locator(`[data-rpg-item="${item.key}"]`)).toHaveCount(1);
    await page.getByRole('button',{pressed:true}).filter({hasText:item.nl}).last().click();
    await expect(character.locator(`[data-rpg-item="${item.key}"]`)).toHaveCount(0);
  }
  const full=['crown','medal','pin','yoga_mat','captain','watch','gloves','belt','shin_guards','gold_shoes','champion','sport_item'];
  for(const [i,build] of ['slim','athletic','full'].entries()){
    Object.assign(state.hero,{build,frame:i===1?'m':'f',hair:['long','afro','bun'][i],skin:['s2','s7','s10'][i]});state.gear.equipped=full;
    await page.reload();await expect(character.locator('[data-rpg-item]')).toHaveCount(12);
    await page.locator('.rpg-stage').screenshot({style:'header, nav { visibility:hidden !important }',path:`docs/rpg-screenshots/equipped-${build}.png`});
  }
  for(const frame of HERO_OPTIONS.frame) for(const build of HERO_OPTIONS.build) for(const hair of HERO_OPTIONS.hair){
    Object.assign(state.hero,{frame,build,hair});state.gear.equipped=full;
    await page.reload();await expect(character.locator('[data-rpg-item]')).toHaveCount(12);
    const outside=await character.locator('[data-rpg-item]').evaluateAll(nodes=>nodes.filter(n=>{const b=(n as SVGGraphicsElement).getBBox();return b.x < 0 || b.x+b.width > 200 || b.y < -10 || b.y+b.height > 430}).map(n=>n.getAttribute('data-rpg-item')));
    expect(outside,`${frame}/${build}/${hair}`).toEqual([]);
    // Neck decoration must remain above the belt; back item precedes the visible body.
    const medal=await character.locator('[data-rpg-item="medal"]').boundingBox();
    const belt=await character.locator('[data-rpg-item="belt"]').boundingBox();
    expect(medal!.y+medal!.height).toBeLessThan(belt!.y);
    expect(await character.locator('[data-rpg-item]').first().getAttribute('data-rpg-item')).toBe('yoga_mat');
  }
  await page.getByRole('button',{name:'Ontwerp bekijken'}).click();
  await expect(page.getByRole('dialog').locator('[data-rpg-item="master_cape"]')).toBeVisible();
  await page.getByRole('dialog').screenshot({path:'docs/rpg-screenshots/master-cape-preview.png'});
  await page.keyboard.press('Escape');
  await page.locator('[aria-labelledby="gear-title"]').screenshot({style:'header, nav { visibility:hidden !important }',path:'docs/rpg-screenshots/collection.png'});
  state.gear.owned=state.gear.owned.filter(k=>k!=='cap');await page.reload();
  const before=writes;await page.getByRole('button',{name:'Passen: '+GEAR.find(g=>g.key==='cap')!.nl,exact:true}).click();
  await expect(character.locator('[data-rpg-item="cap"]')).toHaveCount(1);expect(writes).toBe(before);
  await page.getByRole('button',{name:'Preview sluiten'}).click();await expect(character.locator('[data-rpg-item="crown"]')).toHaveCount(1);
  await page.getByRole('button',{name:/Kopen .*: .*pet/i}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('dialog').screenshot({animations:'disabled',path:'docs/rpg-screenshots/loot.png'});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button',{name:/Hoofd:.*Wijzigen/}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await expect(character).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('.rpg-stage').screenshot({style:'header, nav { visibility:hidden !important }',path:'docs/rpg-screenshots/mobile.png'});
  await expect(character.locator('.rpg-item').first()).toHaveCSS('animation-name','none');
  await page.getByRole('button',{name:'Fotoweergave',exact:true}).click();await expect(character).toHaveCount(0);
  await page.getByRole('button',{name:'RPG-weergave',exact:true}).click();await expect(character).toBeVisible();
  const results=await new AxeBuilder({page:page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page']}).include('[aria-labelledby="gear-title"]').withTags(['wcag2a','wcag2aa']).analyze();
  expect(errors).toEqual([]);
  expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
});
