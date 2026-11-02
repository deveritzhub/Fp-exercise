import type { TodayViewProgram } from './todayView';

/**
 * A mission reflects ONLY sessions already prescribed or already started.
 * No extra work, time estimate, XP or medical progression is invented.
 * Paused programmes never become actionable missions.
 */
export type MissionProgram = TodayViewProgram & { id: string; title: string };

export type DailyMission<T extends MissionProgram> = {
  status: 'ready' | 'paused' | 'done' | 'none';
  completed: number;
  total: number;
  progress: number;
  paused: number;
  next: T | null;
};

export function dailyMission<T extends MissionProgram>(programs: readonly T[]): DailyMission<T> {
  const active = programs.filter((p) => !p.paused && (p.today.scheduled > 0 || Boolean(p.openSession)));
  const completed = active.filter((p) => p.today.scheduled > 0 && p.today.done && !p.openSession).length;
  const unfinished = active.filter((p) => !p.today.done || Boolean(p.openSession));
  // Resume a workout already in progress before suggesting a new one.
  const next = unfinished.find((p) => Boolean(p.openSession)) ?? unfinished[0] ?? null;
  const paused = programs.filter((p) => p.paused).length;
  const status = next ? 'ready' : paused ? 'paused' : completed ? 'done' : 'none';
  const total = active.length;
  return {
    status,
    completed,
    total,
    progress: total ? Math.round((completed / total) * 100) : 0,
    paused,
    next,
  };
}
