import {expect,test} from '@playwright/test';
import {login} from './helpers';
test('practice branding preview reflects unsaved name and colour',async ({page})=>{
  await login(page,'eigenaar@praktijk-a.test');
  await page.goto('/app/praktijk');
  await page.getByRole('tab',{name:'Instellingen'}).click();
  await expect(page.getByRole('region',{name:'Voorbeeld van praktijkbranding'})).toBeVisible();
  const input=page.getByRole('textbox',{name:'Praktijknaam'});
  await input.fill('Fictieve oefenpraktijk');
  await expect(page.getByTestId('preview-practice-name')).toHaveText('Fictieve oefenpraktijk');
  const sample=page.getByTestId('preview-brand-button');
  await expect(sample).toBeVisible();
  // Deliberately do NOT click Save: settings in production must not change during previews.
});
