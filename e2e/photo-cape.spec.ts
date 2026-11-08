import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
test('future cape is rendered behind four catalog bodies',async({page})=>{
 test.skip(!fs.existsSync('.local-photo-review/m_s5_full.png'),'Download fixed catalog with --all');
 await page.setViewportSize({width:1120,height:460});
 await page.route('**/api/hero-assets/**',r=>r.fulfill({path:path.resolve('.local-photo-review',new URL(r.request().url()).pathname.split('/').at(-1)!+'.png'),contentType:'image/png'}));
 await page.goto('/photo-fit-review.html?cape=1');
 await expect(page.locator('[data-photo-gear=master_cape]')).toHaveCount(4);
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
 await page.waitForTimeout(400);
 await page.screenshot({path:'docs/photo-fitting/catalog/master-cape-photo.png',fullPage:true,animations:'disabled'});
 expect(await page.locator('[data-photo-gear=master_cape]').evaluateAll(nodes=>nodes.every(n=>n.nextElementSibling?.tagName.toLowerCase()==='image'))).toBe(true);
});
