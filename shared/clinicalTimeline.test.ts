import { describe, expect, it } from 'vitest';
import { clinicalTimeline, reviewSignals, type SessionObservation } from './clinicalTimeline';
const s = (id: string, at: string | null, pain: number | null, difficulty: number | null, feedback: string | null = null, reviewedAt: string | null = null): SessionObservation =>
  ({ id, completedAt: at, pain, difficulty, feedback, reviewedAt });
describe('read-only therapist clinical timeline', () => {
  it('sorts completed sessions chronologically without mutating input', () => {
    const input = [s('b','2026-03-02T10:00:00Z',4,3),s('a','2026-03-01T10:00:00Z',6,5)];
    expect(clinicalTimeline(input).map(x=>x.id)).toEqual(['a','b']);
    expect(input[0].id).toBe('b');
  });
  it('ignores incomplete and invalid session dates', () => {
    expect(clinicalTimeline([s('a',null,2,2),s('b','not-a-date',2,2)])).toEqual([]);
  });
  it('preserves missing values as null rather than inventing measurements', () => {
    expect(clinicalTimeline([s('a','2026-03-01',null,null)])[0]).toMatchObject({pain:null,difficulty:null});
  });
  it('rejects out of range or nonfinite self-report scores', () => {
    expect(clinicalTimeline([s('a','2026-03-01',11,-1),s('b','2026-03-02',NaN,Infinity)]).map(p=>[p.pain,p.difficulty])).toEqual([[null,null],[null,null]]);
  });
  it('marks unreviewed high pain as needing human review, not a diagnosis', () => {
    expect(reviewSignals(clinicalTimeline([s('a','2026-03-01',6,4)])).unreviewedCount).toBe(1);
  });
  it('does not flag reviewed high pain again', () => {
    expect(reviewSignals(clinicalTimeline([s('a','2026-03-01',8,4,null,'2026-03-02')])).unreviewedCount).toBe(0);
  });
  it('flags an unreviewed feedback note regardless of score', () => {
    expect(reviewSignals(clinicalTimeline([s('a','2026-03-01',2,4,'Pain after exercise')])).unreviewedCount).toBe(1);
  });
  it('does not count a missing pain score as zero', () => {
    expect(reviewSignals(clinicalTimeline([s('a','2026-03-01',null,3)])).latestPain).toBeNull();
  });
  it('reports observed change only when two valid scores exist', () => {
    const p=clinicalTimeline([s('a','2026-03-01',7,3),s('b','2026-03-02',4,2)]);
    expect(reviewSignals(p).painChange).toBe(-3);
    expect(reviewSignals(p.slice(0,1)).painChange).toBeNull();
  });
  it('never fabricates ROM, strength, function or confidence fields', () => {
    const point=clinicalTimeline([s('a','2026-03-01',3,2)])[0];
    expect(Object.keys(point).sort()).toEqual(['at','difficulty','feedback','id','pain','reviewed']);
  });
});
