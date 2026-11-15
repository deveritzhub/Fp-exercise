import { useCallback, useEffect, useRef, useState } from 'react';
import { parseHeartRateMeasurement, summariseHeartRate, validBpm, type HrSample, type HrSource, type HrSummary } from '@shared/heartRate';

/**
 * Live heart rate during a workout. Two ways in:
 * - the app's bridge (`window.FPHealth.heartRate`), set by the Android/iPhone app: it passes on what the
 *   watch or the phone's health platform measures;
 * - Web Bluetooth: a chest strap or watch that sends the standard Heart Rate service (Chrome on Android
 *   and on a computer; not on an iPhone in the browser).
 * Nothing is stored here: the samples live in memory and only the summary goes along with the workout.
 */
type Bridge = { heartRate?: { start: (onBpm: (bpm: number) => void) => Promise<HrSource> | HrSource; stop: () => void } };
declare global {
  interface Window { FPHealth?: Bridge }
}
// Web Bluetooth, as far as it is used here (not in TypeScript's DOM types).
type BtChar = EventTarget & { value?: DataView; startNotifications: () => Promise<unknown> };
type BtDevice = EventTarget & { gatt?: { connected: boolean; connect: () => Promise<{ getPrimaryService: (s: string) => Promise<{ getCharacteristic: (c: string) => Promise<BtChar> }> }>; disconnect: () => void } };
type Bt = { requestDevice: (o: { filters: { services: string[] }[] }) => Promise<BtDevice> };
const bt = () => (navigator as unknown as { bluetooth?: Bt }).bluetooth;

export type HrState = 'off' | 'connecting' | 'on' | 'lost';
export const heartRateWay = (): 'bridge' | 'bluetooth' | null => (typeof window === 'undefined' ? null : window.FPHealth?.heartRate ? 'bridge' : bt() ? 'bluetooth' : null);

export function useHeartRate() {
  const [state, setState] = useState<HrState>('off');
  const [bpm, setBpm] = useState<number | null>(null);
  const samples = useRef<HrSample[]>([]);
  const source = useRef<HrSource>('bluetooth');
  const device = useRef<BtDevice | null>(null);
  const viaBridge = useRef(false);

  const onBpm = useCallback((v: number) => {
    if (!validBpm(v)) return;
    setBpm(v);
    setState('on');
    const now = Date.now();
    const last = samples.current[samples.current.length - 1];
    // At most one sample every two seconds: plenty for an average, small in memory.
    if (!last || now - last.t >= 2000) samples.current.push({ t: now, bpm: v });
  }, []);

  const listen = useCallback(async (d: BtDevice) => {
    const server = await d.gatt!.connect();
    const ch = await (await server.getPrimaryService('heart_rate')).getCharacteristic('heart_rate_measurement');
    ch.addEventListener('characteristicvaluechanged', () => {
      const v = ch.value;
      if (!v) return;
      const b = parseHeartRateMeasurement(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
      if (b !== null) onBpm(b);
    });
    await ch.startNotifications();
  }, [onBpm]);

  const connect = useCallback(async (): Promise<'ok' | 'cancelled' | 'failed'> => {
    setState('connecting');
    try {
      const bridge = window.FPHealth?.heartRate;
      if (bridge) {
        viaBridge.current = true;
        source.current = await bridge.start(onBpm);
        setState('on');
        return 'ok';
      }
      const api = bt();
      if (!api) throw new Error('unsupported');
      const d = await api.requestDevice({ filters: [{ services: ['heart_rate'] }] });
      device.current = d;
      source.current = 'bluetooth';
      // Out of range for a moment: try once to pick it up again, else say so.
      d.addEventListener('gattserverdisconnected', () => {
        setState('lost');
        setBpm(null);
        void listen(d).catch(() => undefined);
      });
      await listen(d);
      setState('on');
      return 'ok';
    } catch (e) {
      setState('off');
      // Closing the device chooser is a choice, not an error.
      return e instanceof Error && e.name === 'NotFoundError' ? 'cancelled' : 'failed';
    }
  }, [listen, onBpm]);

  const disconnect = useCallback(() => {
    if (viaBridge.current) window.FPHealth?.heartRate?.stop();
    viaBridge.current = false;
    try { device.current?.gatt?.disconnect(); } catch { /* already gone */ }
    device.current = null;
    setState('off');
    setBpm(null);
  }, []);
  useEffect(() => disconnect, [disconnect]);

  const summary = useCallback((): HrSummary | null => summariseHeartRate(samples.current, source.current), []);
  return { way: heartRateWay(), state, bpm, connect, disconnect, summary };
}
