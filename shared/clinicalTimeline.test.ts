import { describe, expect, it } from 'vitest';
import { clinicalTimeline, type RecordedSession } from './clinicalTimeline';
const s = (id: string, date: string|null, pain: number|null, difficulty: number|null, reviewedAt: string|null=null, feedback: string|null=null): RecordedSession =>
({id,completedAt:date,pain,difficulty,reviewedAt,feedback,logs:[]});
describe('clinical timeline uses recorded facts only',()=>{
  it('does not invent progress if no session is completed',()=>{
    const d=clinicalTimeline([s('a',null,4,3)]);
    expect(d.points).toHaveLength(0);expect(d.latestPain).toBeNull();expect(d.available.rom).toBe(false);
  });
  it('sorts by recorded date and caps display',()=>{
    const d=clinicalTimeline([s('c','2026-02-03',2,2),s('a','2026-02-01',5,6),s('b','2026-02-02',4,4)],2);
    expect(d.points.map(p=>p.id)).toEqual(['b','c']);
  });
  it('keeps absent values null and never derives ROM or function from pain',()=>{
    const d=clinicalTimeline([s('a','2026-02-01',7,null)]);
    expect(d.points[0].exertion).toBeNull();
    expect(d.available).toMatchObject({pain:true,perceivedExertion:false,rom:false,strength:false,function:false,confidence:false});
  });
  it('rejects out-of-scale or invalid self-reported scores',()=>{
    const d=clinicalTimeline([s('a','2026-02-01',13,-1),s('b','2026-02-02',NaN,Infinity)]);
    expect(d.points.map(p=>[p.pain,p.exertion])).toEqual([[null,null],[null,null]]);
  });
  it('flags reviewable pain and comments without making a diagnosis',()=>{
    const d=clinicalTimeline([s('a','2026-02-01',6,4),s('b','2026-02-02',2,4,'2026-02-03'),s('c','2026-02-04',null,5,null,'Needs help')]);
    expect(d.reviewCount).toBe(2);expect(d.latestPain).toBe(2);
  });
  it('does not treat missing pain as zero',()=>{
    const d=clinicalTimeline([s('a','2026-02-01',null,3)]);
    expect(d.latestPain).toBeNull(); expect(d.hasPain).toBe(false);
  });
});
