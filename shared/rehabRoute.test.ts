import { describe, expect, it } from 'vitest';
import { rehabRoute, inspectedPhase, type RehabPhase } from './rehabRoute';

const sample: RehabPhase[] = [
  { no: 3, name: 'Return to sport', goal: 'Sport tasks', weeks: '24–36', status: 'next' },
  { no: 1, name: 'Early recovery', goal: 'Normal gait', weeks: '0–6', status: 'done' },
  { no: 2, name: 'Strength', goal: 'Improved control', weeks: '6–24', status: 'current' },
];

describe('patient-safe rehabilitation route', () => {
  it('keeps the canonical phase order without mutating the API payload', () => {
    expect(rehabRoute(sample, 2).ordered.map((p) => p.no)).toEqual([1, 2, 3]);
    expect(sample.map((p) => p.no)).toEqual([3, 1, 2]);
  });
  it('uses the backend current status, not timeline or XP', () => {
    expect(rehabRoute(sample, 2).current?.name).toBe('Strength');
    expect(rehabRoute(sample, 99).current?.no).toBe(2);
  });
  it('counts only phases marked done by the server', () => {
    expect(rehabRoute(sample, 2)).toMatchObject({ completed: 1, total: 3 });
  });
  it('does not infer recovery or unlock from the next phase week range', () => {
    const result = rehabRoute(sample, 2);
    expect(result.ordered[2]).toMatchObject({ no: 3, status: 'next' });
  });
  it('allows a read-only preview of a future phase', () => {
    expect(inspectedPhase(sample, 3, 2)?.status).toBe('next');
    expect(rehabRoute(sample, 2).current?.no).toBe(2);
  });
  it('supports a completed phase preview without moving the current phase', () => {
    expect(inspectedPhase(sample, 1, 2)?.status).toBe('done');
    expect(rehabRoute(sample, 2).current?.no).toBe(2);
  });
  it('falls back to the active phase when an invalid selection is supplied', () => {
    expect(inspectedPhase(sample, 400, 2)?.no).toBe(2);
  });
  it('does not manufacture phase data for an unphased programme', () => {
    expect(rehabRoute([], null)).toMatchObject({ ordered: [], current: null, total: 0, completed: 0 });
    expect(inspectedPhase([], null, null)).toBeNull();
  });
  it('preserves patient-facing goals verbatim', () => {
    expect(inspectedPhase(sample, 3, 2)?.goal).toBe('Sport tasks');
  });
  it('falls back safely when there is no current marker', () => {
    const phases = sample.filter((p) => p.no !== 2);
    expect(inspectedPhase(phases, null, null)?.no).toBe(1);
    expect(rehabRoute(phases, null).current).toBeNull();
  });
});
