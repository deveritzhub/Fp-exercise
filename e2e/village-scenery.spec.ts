import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

async function capture(page:Page,name:string){
  mkdirSync('docs/village-review',{recursive:true});
  await expect(page.getByRole('button',{name:'Naar de put',exact:true})).toBeVisible();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:'docs/village-review/'+name+'.png'});
  if(process.env.FP_VILLAGE_INLINE_PREVIEW==='1'){
    console.log('FP_VILLAGE_IMAGE '+JSON.stringify({name,base64:(await page.screenshot({type:'jpeg',quality:65})).toString('base64')}));
  }
}

test('synthetic village renders on desktop and phone and keeps its keyboard routes',async({page})=>{
  test.setTimeout(360000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',route=>route.fulfill({json:{}}));
  await page.addInitScript(()=>localStorage.setItem('fp.village.fx','off'));
  mkdirSync('docs/village-review',{recursive:true});
  const label=process.env.FP_VILLAGE_REVIEW_LABEL??'review';
  for(const [name,width,height] of [['desktop',1100,760],['mobile',390,844]] as const){
    await page.setViewportSize({width,height});
    await page.goto('/village-review.html');
    const village=page.getByTestId('walk-village');
    await expect(village).toHaveAttribute('data-state','ready',{timeout:60000});
    await expect(village).toHaveAttribute('data-hero','model',{timeout:60000});
    await expect(village).toHaveAttribute('data-ground','painted',{timeout:60000});
    await page.waitForLoadState('networkidle');
    await capture(page,label+'-'+name);
    console.log('FP_VILLAGE_STATS '+JSON.stringify({name:label+'-'+name,calls:await village.getAttribute('data-calls'),tris:await village.getAttribute('data-tris')}));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  const village=page.getByTestId('walk-village');
  await page.getByRole('button',{name:'Naar de put',exact:true}).press('Enter');
  await expect(page.getByTestId('review-arrival')).toHaveText('well',{timeout:60000});
  await capture(page,label+'-well-detail');
  await page.getByRole('button',{name:'Naar de praktijk',exact:true}).press('Enter');
  await expect(village).toHaveAttribute('data-zone','practice',{timeout:120000});
  expect(errors).toEqual([]);
});

test('a street corner shows the bench and flowers in their existing footprint',async({page})=>{
  test.setTimeout(120000);
  await page.route('**/api/**',route=>route.fulfill({json:{}}));
  await page.addInitScript(()=>localStorage.setItem('fp.village.fx','off'));
  await page.setViewportSize({width:1100,height:760});
  await page.goto('/village-review.html?view=stables');
  const village=page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-hero','model',{timeout:60000});
  await expect(village).toHaveAttribute('data-ground','painted',{timeout:60000});
  await page.waitForLoadState('networkidle');
  // Use the real camera control to see the bench beside the hero instead of directly behind her.
  await page.getByRole('button',{name:'Draai naar links',exact:true}).press('Enter');
  await expect(village).toHaveAttribute('data-cam','-0.79',{timeout:20000});
  await capture(page,(process.env.FP_VILLAGE_REVIEW_LABEL??'review')+'-doorstep');
});

test('village also renders with its normal colour grade',async({page})=>{
  test.setTimeout(120000);
  await page.route('**/api/**',route=>route.fulfill({json:{}}));
  await page.addInitScript(()=>localStorage.setItem('fp.village.fx','on'));
  await page.setViewportSize({width:1100,height:760});
  await page.goto('/village-review.html');
  const village=page.getByTestId('walk-village');
  await expect(village).toHaveAttribute('data-hero','model',{timeout:60000});
  await expect(village).toHaveAttribute('data-ground','painted',{timeout:60000});
  await page.waitForLoadState('networkidle');
  const name=(process.env.FP_VILLAGE_REVIEW_LABEL??'review')+'-graded';
  await capture(page,name);
});
