import { describe, it, expect } from 'vitest';
import { BELTS, examReady, nextItems, validItem } from './karate';
import { stiffnessWithSteps } from './survival';

describe('karate belts', () => {
  it('seven belts from white to black, each after white with a list', () => {
    expect(BELTS.map((b) => b.key)).toEqual(['white', 'orange', 'blue', 'yellow', 'green', 'brown', 'black']);
    for (const b of BELTS.slice(1)) expect(b.items.length).toBeGreaterThanOrEqual(5);
  });
  it('the exam opens only when the whole list of the next belt is ticked', () => {
    const all = nextItems(0);
    expect(examReady(0, new Set(all.slice(1)))).toBe(false);
    expect(examReady(0, new Set(all))).toBe(true);
    expect(examReady(6, new Set())).toBe(false);
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
