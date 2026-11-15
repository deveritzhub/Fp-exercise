/**
 * Heart rate during a workout. The beats come from a Bluetooth chest strap or watch (the standard
 * Heart Rate service) in the browser, or from the phone's health platform through the app's bridge.
 * Only a summary is kept with the workout: average, highest, lowest and how long it was measured.
 */
export const HR_LIMITS = { min: 30, max: 240, maxSeconds: 6 * 3600 } as const;
export type HrSource = 'bluetooth' | 'health_connect' | 'healthkit';
export const HR_SOURCES: HrSource[] = ['bluetooth', 'health_connect', 'healthkit'];
export type HrSummary = { avg: number; max: number; min: number; seconds: number; source: HrSource };

/** Bluetooth "Heart Rate Measurement" (0x2A37): flags, then the rate as 8 or 16 bits. */
export function parseHeartRateMeasurement(bytes: ArrayLike<number>): number | null {
  if (bytes.length < 2) return null;
  const sixteen = (bytes[0] & 0x01) === 1;
  if (sixteen && bytes.length < 3) return null;
  const bpm = sixteen ? bytes[1] | (bytes[2] << 8) : bytes[1];
  return validBpm(bpm) ? bpm : null;
}

export const validBpm = (bpm: number) => Number.isFinite(bpm) && bpm >= HR_LIMITS.min && bpm <= HR_LIMITS.max;

export type HrSample = { t: number; bpm: number };
/**
 * Average weighted by time (a strap sends about once a second, a watch far less often), so a long
 * quiet stretch counts for its real length. A gap of more than 30 s is not counted as measured.
 */
export function summariseHeartRate(samples: HrSample[], source: HrSource): HrSummary | null {
  const ok = samples.filter((s) => validBpm(s.bpm)).sort((a, b) => a.t - b.t);
  if (ok.length < 2) return null;
  let weighted = 0;
  let ms = 0;
  for (let i = 1; i < ok.length; i++) {
    const dt = Math.min(30_000, ok[i].t - ok[i - 1].t);
    if (dt <= 0) continue;
    weighted += ((ok[i].bpm + ok[i - 1].bpm) / 2) * dt;
    ms += dt;
  }
  if (ms < 10_000) return null;
  const all = ok.map((s) => s.bpm);
  return { avg: Math.round(weighted / ms), max: Math.max(...all), min: Math.min(...all), seconds: Math.min(HR_LIMITS.maxSeconds, Math.round(ms / 1000)), source };
}
