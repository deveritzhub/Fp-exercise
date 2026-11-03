import {expect,test} from '@playwright/test';
import {login} from './helpers';

/** Synthetic database only: staff may record objective measurements for assigned patients. */
test('outcomes are validated, practice-isolated and included in export',async ({browser})=>{
  const ctx=await browser.newContext();
  const page=await ctx.newPage();
  await login(page,'therapeut@praktijk-a.test');
  const patients=await (await page.request.get('/api/patients?q=emma')).json();
  const patient=patients.items[0];
  expect(patient?.id).toBeTruthy();
  const input={domain:'rom',metric:'Knie flexie',value:123,unit:'degrees',side:'left',measuredOn:'2026-11-02',note:'Fictieve testmeting'};
  const created=await page.request.post(`/api/patients/${patient.id}/outcomes`,{data:input});
  expect(created.status()).toBe(201);
  const out=(await created.json()).item;
  expect(out).toMatchObject({domain:'rom',metric:'Knie flexie',value:123,unit:'degrees',side:'left'});
  const progress=await (await page.request.get(`/api/patients/${patient.id}/progress`)).json();
  expect(progress.outcomes.some((o:any)=>o.id===out.id)).toBe(true);
  const exportJson=await (await page.request.get(`/api/patients/${patient.id}/export`)).json();
  expect(exportJson.outcomeMeasurements.some((o:any)=>o.id===out.id)).toBe(true);
  const bad=await page.request.post(`/api/patients/${patient.id}/outcomes`,{data:{...input,value:5000}});
  expect(bad.status()).toBe(400);
  const ctxB=await browser.newContext();
  const pageB=await ctxB.newPage();
  await login(pageB,'therapeut@praktijk-b.test');
  const deniedRead=await pageB.request.get(`/api/patients/${patient.id}/progress`);
  expect(deniedRead.status()).toBe(404);
  const deniedWrite=await pageB.request.post(`/api/patients/${patient.id}/outcomes`,{data:input});
  expect(deniedWrite.status()).toBe(404);
  await ctxB.close();
  await ctx.close();
});
