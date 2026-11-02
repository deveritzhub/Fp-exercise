import { describe, expect, it } from 'vitest';
import { dailyMission, type MissionProgram } from './dailyMission';

const p = (id: string, scheduled: number, done = false, paused = false, open = false): MissionProgram => ({
  id,
  title: 'Synthetic session ' + id,
  today: { scheduled, done },
  paused,
  openSession: open ? { id: 'synthetic-session-' + id } : null,
});

describe('daily patient mission', () => {
  it('does not invent a mission for a patient without programmes', () => {
    expect(dailyMission([])).toMatchObject({ status: 'none', completed: 0, total: 0, next: null });
  });

  it('does not pressure patients to train on scheduled rest days', () => {
    expect(dailyMission([p('a', 0)])).toMatchObject({ status: 'none', progress: 0, next: null });
  });

  it('uses the already prescribed programme as the mission', () => {
    const result = dailyMission([p('a', 3)]);
    expect(result).toMatchObject({ status: 'ready', total: 1, completed: 0, progress: 0 });
    expect(result.next?.id).toBe('a');
  });

  it('prefers to resume an open session over starting another', () => {
    const result = dailyMission([p('new', 3), p('resume', 0, false, false, true)]);
    expect(result.next?.id).toBe('resume');
    expect(result.total).toBe(2);
  });

  it('does not give an open session completion credit even when the day is marked done', () => {
    const result = dailyMission([p('reopened', 3, true, false, true)]);
    expect(result).toMatchObject({ status: 'ready', completed: 0, progress: 0 });
  });

  it('shows an honest completed mission based on scheduled sessions', () => {
    expect(dailyMission([p('a', 3, true), p('b', 4, true)])).toMatchObject({
      status: 'done', completed: 2, total: 2, progress: 100, next: null,
    });
  });

  it('excludes paused programmes from activity and surfaces their paused status', () => {
    expect(dailyMission([p('paused', 3, false, true)])).toMatchObject({
      status: 'paused', completed: 0, total: 0, paused: 1, next: null,
    });
  });

  it('prioritises a safety pause even when another prescribed session is available', () => {
    const result = dailyMission([p('paused', 3, false, true), p('ready', 2)]);
    expect(result).toMatchObject({ status: 'paused', paused: 1, completed: 0, total: 1 });
    expect(result.next?.id).toBe('ready');
  });

  it('never claims everything is completed if another programme is paused', () => {
    expect(dailyMission([p('complete', 2, true), p('paused', 2, false, true)])).toMatchObject({
      status: 'paused', paused: 1, completed: 1, total: 1, next: null,
    });
  });

  it('counts only the work that was prescribed and not paused', () => {
    expect(dailyMission([p('a', 2, true), p('b', 3), p('c', 1, false, true)])).toMatchObject({
      status: 'ready', completed: 1, total: 2, progress: 50, paused: 1,
    });
  });
});
