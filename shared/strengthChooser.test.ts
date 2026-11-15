import { describe, expect, it } from 'vitest';
import { adviceFormat, matchSchedules, SCHEDULES } from './strengthChooser';

const all = Object.entries(SCHEDULES).map(([k, v]) => ({ sourceKey: k, daysPerWeek: v.days }));
const keys = (r: { template: { sourceKey: string | null } }[]) => r.map((m) => m.template.sourceKey);

describe('strength schedule chooser', () => {
  it('puts the exact match first: upper/lower 4× for muscle growth', () => {
    const r = matchSchedules(all, { format: 'bovenonder', days: 4, goal: 'spiergroei' });
    expect(r[0].template.sourceKey).toBe('kr5_hyp_upper_lower_4d');
    expect(r[0].exact).toBe(true);
  });
  it('full body 3× for muscle growth offers the gym and the dumbbell schedule as exact matches', () => {
    const r = matchSchedules(all, { format: 'fullbody', days: 3, goal: 'spiergroei' });
    expect(keys(r.filter((m) => m.exact)).sort()).toEqual(['kr5_hyp_dumbbell_3d', 'kr5_hyp_fullbody_3d']);
  });
  it('"weet ik niet" uses the advised format for the number of days', () => {
    expect(adviceFormat(2)).toBe('fullbody');
    expect(adviceFormat(4)).toBe('bovenonder');
    expect(adviceFormat(6)).toBe('ppl');
    expect(matchSchedules(all, { format: 'any', days: 6, goal: 'spiergroei' })[0].template.sourceKey).toBe('kr_ppl_6d');
  });
  it('leaves out schedules more than one day off and unknown own templates', () => {
    const r = matchSchedules([...all, { sourceKey: null, daysPerWeek: 2 }, { sourceKey: 'eigen_schema', daysPerWeek: 2 }], { format: 'fullbody', days: 2, goal: 'beginnen' });
    for (const m of r) expect(m.daysOff).toBeLessThanOrEqual(1);
    expect(keys(r)).not.toContain(null);
    expect(keys(r)).not.toContain('eigen_schema');
    expect(r[0].template.sourceKey).toBe('kr2_fullbody_2d');
  });
  it('the real number of training days of a template wins over the default', () => {
    const r = matchSchedules([{ sourceKey: 'kr5_hyp_fullbody_3d', daysPerWeek: 2 }], { format: 'fullbody', days: 2, goal: 'spiergroei' });
    expect(r[0].exact).toBe(true);
  });
});
