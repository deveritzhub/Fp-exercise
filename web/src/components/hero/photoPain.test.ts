import { describe, it, expect } from 'vitest';
import { BODY_AREAS } from '@shared/hero';
import { photoFitProfiles } from './photoFit';
import { photoPainPoints } from './photoPain';

describe('pain areas on the hero photo', () => {
  const fits = Object.entries(photoFitProfiles).filter(([k]) => !k.includes('__')).slice(0, 40);
  it('places every area inside the picture for every measured photo', () => {
    for (const [key, fit] of fits) {
      const pts = photoPainPoints(fit);
      for (const a of BODY_AREAS) {
        const p = pts[a.key];
        expect(p, `${key} ${a.key}`).toBeTruthy();
        expect(p[0] > 0 && p[0] < 1 && p[1] > 0 && p[1] < 1, `${key} ${a.key}`).toBe(true);
      }
    }
  });
  it('front: the person\'s right is on the viewer\'s left; back: their left is on the left', () => {
    for (const [key, fit] of fits) {
      const p = photoPainPoints(fit);
      expect(p.knee_r[0], key).toBeLessThan(p.knee_l[0]);
      expect(p.shoulder_r[0], key).toBeLessThan(p.shoulder_l[0]);
      expect(p.calf_l[0], key).toBeLessThan(p.calf_r[0]);
      // Top to bottom on the body.
      expect(p.head[1]).toBeLessThan(p.chest[1]);
      expect(p.hip_l[1]).toBeLessThan(p.knee_l[1]);
      expect(p.knee_l[1]).toBeLessThan(p.ankle_l[1]);
    }
  });
});
