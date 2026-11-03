import {expect,test} from '@playwright/test';
import {login} from './helpers';

/** Synthetic database only: staff may record objective measurements for assigned patients. */
test('outcomes are validated, practice-isolated and included in export',async ({browser})=>{
  const ctx=await browser.newContext();
  const page=await ctx.newPage();
  await login(page,'eigenaar@praktijk-a.test');
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
  const impossibleDate=await page.request.post(`/api/patients/${patient.id}/outcomes`,{data:{...input,measuredOn:'2026-02-31'}});
  expect(impossibleDate.status()).toBe(400);
  // A patient can export only their own clinical measurements, not access the staff endpoint.
  const patientCtx=await browser.newContext();
  const patientPage=await patientCtx.newPage();
  await login(patientPage,'patient@praktijk-a.test');
  const selfExport=await patientPage.request.get('/api/patient/export');
  expect(selfExport.status()).toBe(200);
  const ownData=await selfExport.json();
  expect(ownData.outcomeMeasurements.some((o:any)=>o.metric==='Knie flexie'&&Number(o.value)===123)).toBe(true);
  const forbiddenStaffView=await patientPage.request.get(`/api/patients/${patient.id}/progress`);
  expect(forbiddenStaffView.status()).not.toBe(200);
  await patientCtx.close();
  const bad=await page.request.post(`/api/patients/${patient.id}/outcomes`,{data:{...input,value:5000}});
  expect(bad.status()).toBe(400);
  // Clinician-facing form: a real measured outcome appears in the timeline after saving.
  await page.goto(`/app/patienten/${patient.id}`);
  await page.getByRole('button',{name:'Meetmoment vastleggen'}).click();
  await page.getByLabel('Meetdomein').selectOption('function');
  await page.getByLabel('Testnaam / schaal').fill('PSFS fictief');
  await page.getByLabel('Gemeten waarde').fill('7');
  await page.getByRole('button',{name:'Meetmoment opslaan'}).click();
  await expect(page.getByText('PSFS fictief')).toBeVisible();
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
