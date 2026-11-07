import {describe,expect,it} from 'vitest';
import {chapterBossState} from './chapterBoss';
describe('clinician-gated chapter milestone',()=>{
  it('only describes a completed phase as past, never clinically cured',()=>expect(chapterBossState('done')).toBe('past'));
  it('describes current chapter as requiring assessment',()=>expect(chapterBossState('current')).toBe('review'));
  it('keeps future chapter locked',()=>expect(chapterBossState('next')).toBe('locked'));
});
