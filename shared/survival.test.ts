import { describe, expect, it } from 'vitest';
import { energyLevel, sleepScore, stiffnessLevel, survivalStatus, waterTarget } from './survival';

describe('survival meters', () => {
  it('water target ~30 ml/kg between 1.5 and 3 L', () => {
    expect(waterTarget(70)).toBe(2100);
    expect(waterTarget(40)).toBe(1500);
    expect(waterTarget(140)).toBe(3000);
    expect(waterTarget(null)).toBe(1800);
  });
  it('sleep: 7–9 hours scores full on hours, feeling rested adds the rest', () => {
    expect(sleepScore(8, 5)).toBe(100);
    expect(sleepScore(8, 1)).toBe(75);
    expect(sleepScore(5, 3)).toBeLessThan(60);
  });
  it('energy drops with training load and rises with rest; never below 5', () => {
    const rested = energyLevel({ sleepScore: 90, loadToday: 0, loadYesterday: 0, restDay: true, waterRatio: 1 });
    const heavy = energyLevel({ sleepScore: 90, loadToday: 80, loadYesterday: 60, restDay: false, waterRatio: 1 });
    expect(rested).toBe(100);
    expect(heavy).toBeLessThan(rested);
    expect(energyLevel({ sleepScore: 0, loadToday: 500, loadYesterday: 500, restDay: false, waterRatio: 0 })).toBe(5);
  });
  it('stiffness grows after an hour without moving', () => {
    expect(stiffnessLevel(0.5)).toBe(0);
    expect(stiffnessLevel(3)).toBe(28);
    expect(stiffnessLevel(20)).toBe(100);
  });
  it('buffs and tips, never penalties', () => {
    const s = survivalStatus({ waterRatio: 1.1, sleepScore: 90, sleepHours: 8, energy: 80, stiffness: 10, movedToday: true, hour: 16 });
    expect(s.map((x) => x.key)).toEqual(['hydrated', 'rested', 'moving']);
    const tips = survivalStatus({ waterRatio: 0.2, sleepScore: 40, sleepHours: 5, energy: 30, stiffness: 70, movedToday: false, hour: 15 });
    expect(tips.every((x) => x.kind === 'tip')).toBe(true);
    expect(tips.map((x) => x.key)).toEqual(['tired', 'thirsty', 'stiff', 'short_sleep']);
  });
});
