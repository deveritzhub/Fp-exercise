import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
test('headphones follow ears with hair, hats and outfits',async({page})=>{
 test.skip(!fs.existsSync('.local-photo-review/m_s9_soft__champion.png'),'Download fixed catalog with --all');
 test.setTimeout(60000);
 await page.setViewportSize({width:960,height:1750});
 await page.route('**/api/hero-assets/**',r=>r.fulfill({path:path.resolve('.local-photo-review',new URL(r.request().url()).pathname.split('/').at(-1)!+'.png'),contentType:'image/png'}));
 for(const sheet of [0,1]){
  await page.goto('/photo-fit-review.html?headphone='+sheet);
  await expect(page.locator('[data-headphone-part=cup]')).toHaveCount(36);
  await expect(page.locator('[data-headphone-part=band]')).toHaveCount(18);
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
  await page.waitForTimeout(700);
  await page.screenshot({path:`docs/photo-fitting/catalog/headphones-closeup-${sheet}.png`,fullPage:true,animations:'disabled'});
 }
});
