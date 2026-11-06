import {describe,expect,it} from 'vitest';
import {aggregateTeamDay,publicTeamSummary,type TeamDay} from './teamQuest';
const p=(token:string, overrides:Partial<TeamDay>={}):TeamDay=>({participantToken:token,optedIn:true,prescribed:true,didPlan:false,restDay:false,medicalHold:false,...overrides});
describe('privacy-safe future cooperative quest boundaries',()=>{
 it('requires two independent opt-ins',()=>expect(aggregateTeamDay([p('a'),p('b',{optedIn:false})]).status).toBe('not_started'));
 it('protects prescribed rest as successful participation',()=>expect(aggregateTeamDay([p('a',{restDay:true}),p('b',{didPlan:true})])).toMatchObject({contributed:2,protectedRest:1,status:'complete'}));
 it('never requires someone on medical hold to exercise',()=>expect(aggregateTeamDay([p('a',{medicalHold:true}),p('b',{didPlan:true})])).toMatchObject({contributed:2,protectedRest:1,status:'complete'}));
 it('does not count extra non-prescribed training',()=>expect(aggregateTeamDay([p('a',{prescribed:false,didPlan:true}),p('b',{didPlan:true})])).toMatchObject({contributed:1,status:'in_progress'}));
 it('never outputs participant tokens or health facts to friends',()=>{
  const x=publicTeamSummary(aggregateTeamDay([p('secret1',{medicalHold:true}),p('secret2',{didPlan:true})]));
  expect(Object.keys(x).sort()).toEqual(['available','status']);
  expect(JSON.stringify(x)).not.toMatch(/secret|medicalHold|restDay|pain|practice|contributed|participants/);
 });
 it('only exposes a coarse summary for a cohort of at least five',()=>{
  const d=aggregateTeamDay([p('a',{didPlan:true}),p('b',{didPlan:true}),p('c',{didPlan:true}),p('d',{didPlan:true}),p('e',{didPlan:true})]);
  expect(publicTeamSummary(d)).toEqual({available:true,participantsBand:'5+',status:'complete'});
 });
});
