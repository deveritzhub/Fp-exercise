import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const profiles=JSON.parse(fs.readFileSync('web/src/components/hero/photoFitProfiles.json','utf8'));
test.skip(!fs.existsSync('.local-photo-review/m_s9_soft__champion.png'),'Download fixed catalog with scripts/download-photo-review.py --all');
test('all catalog poses, outfit identity and rear layering',async({page})=>{
 test.setTimeout(240000);
 const dir=path.resolve('.local-photo-review');
 const shots=path.resolve('docs/photo-fitting/catalog');
 fs.mkdirSync(shots,{recursive:true});
 const errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1020,height:1100});
 await page.route('**/api/hero-assets/**',async route=>{
   const key=new URL(route.request().url()).pathname.split('/').at(-1)!;
   const file=path.join(dir,key+'.png');
   if(!fs.existsSync(file))throw new Error('Missing fixed review asset '+key);
   await route.fulfill({path:file,contentType:'image/png'});
 });
 const keys=Object.keys(profiles).filter(k=>!k.includes('__')).sort();
 expect(keys).toHaveLength(240);
 for(let i=0;i<20;i++){
   await page.goto('/photo-fit-review.html?all='+i);
   await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
   await expect(page.locator('[data-review-key]')).toHaveCount(12);
   await expect(page.locator('[data-photo-gear=crown]')).toHaveCount(12);
   await expect(page.locator('[data-photo-gear=gloves]')).toHaveCount(24);
   await expect(page.locator('[data-photo-gear=gold_shoes]')).toHaveCount(24);
   await page.waitForTimeout(350);
   await page.screenshot({path:path.join(shots,`poses-${i}.png`),fullPage:true,animations:'disabled'});
 }
 for(let i=0;i<4;i++){
   await page.goto('/photo-fit-review.html?identity='+i);
   await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
   await expect(page.locator('[data-photo-identity]')).toHaveCount(6);
   await page.waitForTimeout(350);
   await page.screenshot({path:path.join(shots,`identity-${i}.png`),fullPage:true,animations:'disabled'});
 }
 for(let i=0;i<4;i++){
   await page.goto('/photo-fit-review.html?headwear='+i);
   await expect(page.locator('[data-photo-gear]')).toHaveCount(20);
   await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
   await page.waitForTimeout(350);
   await page.screenshot({path:path.join(shots,`headwear-${i}.png`),fullPage:true,animations:'disabled'});
 }
 // Each of the 720 hairstyle/outfit combinations keeps its selected head source.
 for(const outfit of ['tracksuit','team_kit','champion']) for(let i=0;i<20;i++){
   await page.goto('/photo-fit-review.html?all='+i+'&outfit='+outfit);
   await expect(page.locator('[data-photo-identity]')).toHaveCount(12);
   expect(await page.locator('[data-photo-identity]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-photo-identity')))).toEqual(keys.slice(i*12,i*12+12));
 }
 expect(errors).toEqual([]);
});
