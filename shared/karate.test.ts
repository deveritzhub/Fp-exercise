import { describe, it, expect } from 'vitest';
import { BELTS, examReady, nextItems, validItem } from './karate';
import { stiffnessWithSteps } from './survival';

describe('karate belts', () => {
  it('twelve grades from white to shodan, every kyu with its own list', () => {
    expect(BELTS.map((b) => b.key)).toEqual(['white', 'kyu10', 'kyu9', 'kyu8', 'kyu7', 'kyu6', 'kyu5', 'kyu4', 'kyu3', 'kyu2', 'kyu1', 'dan1']);
    for (const b of BELTS.slice(1)) expect(b.items.length).toBeGreaterThanOrEqual(6);
    // The second grade of a colour carries the stripe.
    expect(BELTS.filter((b) => b.stripe).map((b) => b.key)).toEqual(['kyu9', 'kyu7', 'kyu5', 'kyu3', 'kyu1']);
    expect(BELTS[1].items.find((i) => i.cat === 'stamina')?.nl).toBe('15 push-ups, 40 sit-ups, 15 squats');
    expect(BELTS[11].items.find((i) => i.cat === 'kumite')?.en).toBe('Jiyu kumite 20 × 60 seconds');
  });
  it('the exam opens only when the whole list of the next belt is ticked', () => {
    const all = nextItems(0);
    expect(examReady(0, new Set(all.slice(1)))).toBe(false);
    expect(examReady(0, new Set(all))).toBe(true);
    expect(examReady(11, new Set())).toBe(false);
    expect(validItem('1:0')).toBe(true);
    expect(validItem('0:0')).toBe(false);
    expect(validItem('1:99')).toBe(false);
    expect(validItem('x')).toBe(false);
  });
});

describe('steps and stiffness', () => {
  it('steps take away up to seven tenths of the stiffness', () => {
    expect(stiffnessWithSteps(80, 0, 6000)).toBe(80);
    expect(stiffnessWithSteps(80, 3000, 6000)).toBe(52);
    expect(stiffnessWithSteps(80, 9000, 6000)).toBe(24);
    expect(stiffnessWithSteps(80, 500, 0)).toBe(80);
  });
});
