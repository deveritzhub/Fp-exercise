import { describe, expect, it } from 'vitest';
import { isActionableToday, summarizePatientDay, type TodayViewProgram } from './todayView';

function program(scheduled: number, done = false, paused = false, open = false): TodayViewProgram {
  return { today: { scheduled, done }, paused, openSession: open ? { id: 'synthetic' } : null };
}

describe('patient today dashboard', () => {
  it('shows a rest card only on a true rest day', () => {
    const day = summarizePatientDay([program(0)]);
    expect(day.showRestCard).toBe(true);
    expect(day.scheduled).toHaveLength(0);
    expect(day.resumeOther).toHaveLength(0);
  });

  it('prioritises an unfinished session over a misleading rest-day notice', () => {
    const day = summarizePatientDay([program(0, false, false, true)]);
    expect(day.showRestCard).toBe(false);
    expect(day.resumeOther).toHaveLength(1);
    expect(day.remaining).toBe(1);
  });

  it('keeps a paused programme visible without calling it completed', () => {
    const day = summarizePatientDay([program(3, false, true)]);
    expect(day.pausedToday).toBe(1);
    expect(day.remaining).toBe(0);
    expect(day.showRestCard).toBe(false);
    expect(isActionableToday(program(3, false, true))).toBe(false);
  });

  it('shows a paused programme even when no exercises were scheduled today', () => {
    const day = summarizePatientDay([program(0, false, true)]);
    expect(day.showRestCard).toBe(false);
    expect(day.resumeOther).toHaveLength(1);
    expect(day.remaining).toBe(0);
  });

  it('counts only active incomplete training among mixed programmes', () => {
    const day = summarizePatientDay([
      program(4, false),
      program(2, true),
      program(2, false, true),
      program(0, false, false, true),
    ]);
    expect(day.scheduled).toHaveLength(3);
    expect(day.remaining).toBe(2);
    expect(day.pausedToday).toBe(1);
    expect(day.resumeOther).toHaveLength(1);
  });
});
