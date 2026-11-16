import { describe, expect, it } from 'vitest';
import { parseHeartRateMeasurement, summariseHeartRate } from './heartRate';

describe('heart rate', () => {
  it('reads the Bluetooth measurement in 8 and 16 bits and refuses nonsense', () => {
    expect(parseHeartRateMeasurement([0x00, 72])).toBe(72);
    expect(parseHeartRateMeasurement([0x01, 0x2c, 0x00])).toBe(44);
    expect(parseHeartRateMeasurement([0x00, 0])).toBeNull();
    expect(parseHeartRateMeasurement([0x01, 0xff, 0xff])).toBeNull();
    expect(parseHeartRateMeasurement([0x00])).toBeNull();
  });
  it('averages by time, not by number of samples', () => {
    // 60 s at 100, then 20 s at 160 with samples every second: more samples must not weigh more.
    const s = [{ t: 0, bpm: 100 }, { t: 30_000, bpm: 100 }, { t: 60_000, bpm: 100 }];
    for (let i = 1; i <= 20; i++) s.push({ t: 60_000 + i * 1000, bpm: 160 });
    const r = summariseHeartRate(s, 'bluetooth')!;
    expect(r.max).toBe(160);
    expect(r.min).toBe(100);
    expect(r.seconds).toBe(80);
    expect(r.avg).toBeGreaterThan(110);
    expect(r.avg).toBeLessThan(120);
  });
  it('a gap is not counted as measured time, and too little is no summary', () => {
    expect(summariseHeartRate([{ t: 0, bpm: 90 }, { t: 600_000, bpm: 90 }], 'healthkit')!.seconds).toBe(30);
    expect(summariseHeartRate([{ t: 0, bpm: 90 }, { t: 5000, bpm: 92 }], 'bluetooth')).toBeNull();
    expect(summariseHeartRate([{ t: 0, bpm: 90 }], 'bluetooth')).toBeNull();
  });
});
