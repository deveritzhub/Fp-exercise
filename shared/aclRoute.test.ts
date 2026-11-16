import { describe, expect, it } from 'vitest';
import { ACL_PHASES, ACL_REVIEW_BANNER, limbSymmetryIndex } from './aclRoute';

describe('ACL route defaults', () => {
  it('has five knee zones, each with a named boss and a review label', () => {
    expect(ACL_PHASES.map((p) => p.bossNl)).toEqual(['De Zwelling', 'De Stramme Reus', 'De Weegschaal', 'De Landing', 'De Terugkeer']);
    expect(ACL_PHASES.map((p) => p.zoneNl)).toEqual(['De Poort', 'Het Pad', 'De Krachtbron', 'De Springsprong', 'Het Veld']);
    for (const phase of ACL_PHASES) {
      expect(phase.criteria.length).toBeGreaterThan(0);
      for (const c of phase.criteria) {
        expect(c.clinicalNl).toContain('Standaardwaarde');
        expect(c.clinicalNl.length).toBeLessThanOrEqual(600);
        expect(c.clinicalEn.length).toBeLessThanOrEqual(600);
        expect(c.labelNl.length).toBeLessThanOrEqual(80);
      }
    }
    expect(ACL_REVIEW_BANNER.nl).toMatch(/fysiotherapeut/);
  });

  it('computes limb symmetry on the server side of the formula', () => {
    expect(limbSymmetryIndex(36, 50, 'higher')).toBe(72);
    expect(limbSymmetryIndex(30, 50, 'higher')).toBe(60);
    expect(limbSymmetryIndex(2.5, 2, 'lower')).toBe(80);
    expect(limbSymmetryIndex(10, 0, 'higher')).toBeNull();
  });

  it('uses the example bars from the route: 90, 120, 70, 80, 90 and ACL-RSI 65', () => {
    const target = (phase: number, key: string) => ACL_PHASES[phase - 1].criteria.find((c) => c.measureKey === key)!.target;
    expect(target(1, 'knee_extension')).toBe(0);
    expect(target(1, 'knee_flexion')).toBe(90);
    expect(target(2, 'knee_flexion')).toBe(120);
    expect(target(3, 'lsi_quad')).toBe(70);
    expect(target(4, 'lsi_quad')).toBe(80);
    expect(target(4, 'lsi_hop_single')).toBe(0);
    expect(ACL_PHASES[3].criteria[1].mode).toBe('recorded');
    expect(target(5, 'lsi_quad')).toBe(90);
    expect(target(5, 'lsi_hop_timed')).toBe(90);
    expect(ACL_PHASES[4].criteria.find((c) => c.measureKey === 'lsi_hop_timed')!.lsiBetter).toBe('lower');
    expect(target(5, 'acl_rsi')).toBe(65);
  });
});
