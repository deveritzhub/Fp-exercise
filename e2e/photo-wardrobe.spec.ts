import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
test('every item and overlapping outfits across six catalog avatars',async({page})=>{
 test.skip(!fs.existsSync('.local-photo-review/m_s9_soft__champion.png'),'Download the complete fixed catalog with --all');
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1220,height:1450});
 await page.route('**/api/hero-assets/**',r=>r.fulfill({path:path.resolve('.local-photo-review',new URL(r.request().url()).pathname.split('/').at(-1)!+'.png'),contentType:'image/png'}));
 for(const key of ['f_s5_full_h2','f_s7_full_h4','f_s1_lean','m_s5_full','m_s9_muscular_h3','m_s1_lean_h4']){
  await page.goto('/photo-fit-review.html?wardrobe='+key);
  await expect(page.locator('[data-wardrobe-item]')).toHaveCount(29);
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
  await expect(page.locator('[data-photo-identity]')).toHaveCount(5);
  // A neck accessory must visually cover the chest band, not be cut by it.
  const order=await page.locator('[data-wardrobe-item]').last().locator('[data-photo-gear]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-photo-gear')));
  expect(order.indexOf('scarf')).toBeGreaterThan(order.indexOf('hr_band'));
  await page.waitForTimeout(500);
  await page.screenshot({path:`docs/photo-fitting/catalog/wardrobe-${key}.png`,fullPage:true,animations:'disabled'});
 }
 expect(errors).toEqual([]);
});
