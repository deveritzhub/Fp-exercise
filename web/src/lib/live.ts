import { useEffect, useRef, useState } from 'react';
import type { FigureLook } from '@/components/hero/HumanFigure';

/** A friend in the village, as last heard: where, which way, walking (1) or running (2), and what they do. */
export type LiveFriend = {
  id: string;
  name: string;
  look: FigureLook | null;
  x: number;
  z: number;
  f: number;
  zone: string;
  w: 0 | 1 | 2;
  act?: string;
  /** When the last step came in (performance.now()). */
  at: number;
  /** The last saying, and when. */
  say?: { k: string; at: number };
};
export type LiveSend = (msg: { t: 'pos'; x: number; z: number; f: number; zone: string; w: 0 | 1 | 2; act?: string } | { t: 'say'; k: string }) => void;

/**
 * The live link to friends who play at the same time (only when sharing with friends is on). The
 * friends' places are kept in a ref (the 3D world reads it every frame); who is online is state.
 */
export function useLive(enabled: boolean, onSay?: (who: LiveFriend, k: string) => void) {
  const friends = useRef(new Map<string, LiveFriend>());
  const [online, setOnline] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<'off' | 'connecting' | 'on'>('off');
  const ws = useRef<WebSocket | null>(null);
  const sayRef = useRef(onSay);
  sayRef.current = onSay;

  useEffect(() => {
    if (!enabled || typeof WebSocket === 'undefined') return;
    let closed = false;
    let retry = 0;
    let timer = 0;
    const list = () => setOnline([...friends.current.values()].map((f) => ({ id: f.id, name: f.name })));
    const upsert = (m: Record<string, unknown>) => {
      const id = String(m.id);
      const was = friends.current.get(id);
      const next: LiveFriend = {
        id,
        name: typeof m.name === 'string' ? m.name : was?.name ?? '',
        look: (m.look as FigureLook | undefined) ?? was?.look ?? null,
        x: typeof m.x === 'number' ? m.x : was?.x ?? 0,
        z: typeof m.z === 'number' ? m.z : was?.z ?? 0,
        f: typeof m.f === 'number' ? m.f : was?.f ?? 0,
        zone: typeof m.zone === 'string' ? m.zone : was?.zone ?? '',
        w: m.w === 1 || m.w === 2 ? m.w : 0,
        act: typeof m.act === 'string' ? m.act : undefined,
        at: performance.now(),
        say: was?.say,
      };
      friends.current.set(id, next);
      return next;
    };
    const open = () => {
      if (closed) return;
      setStatus('connecting');
      const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/live`;
      const sock = new WebSocket(url);
      ws.current = sock;
      sock.onopen = () => {
        retry = 0;
        setStatus('on');
      };
      sock.onmessage = (e) => {
        let m: Record<string, unknown>;
        try {
          m = JSON.parse(String(e.data));
        } catch {
          return;
        }
        if (m.t === 'hello' && Array.isArray(m.friends)) {
          friends.current.clear();
          for (const f of m.friends as Record<string, unknown>[]) upsert(f);
          list();
        } else if (m.t === 'join') {
          upsert(m);
          list();
        } else if (m.t === 'pos') {
          upsert(m);
        } else if (m.t === 'leave') {
          friends.current.delete(String(m.id));
          list();
        } else if (m.t === 'say' && typeof m.k === 'string') {
          const f = friends.current.get(String(m.id));
          if (f) {
            f.say = { k: m.k, at: performance.now() };
            sayRef.current?.(f, m.k);
          }
        }
      };
      sock.onclose = (e) => {
        ws.current = null;
        friends.current.clear();
        list();
        setStatus('off');
        // Not allowed (sharing off, logged out): no point trying again. Otherwise back off and retry.
        if (closed || e.code === 4003) return;
        retry = Math.min(retry + 1, 6);
        timer = window.setTimeout(open, 1000 * 2 ** retry);
      };
    };
    open();
    return () => {
      closed = true;
      window.clearTimeout(timer);
      ws.current?.close();
      ws.current = null;
      friends.current.clear();
      setOnline([]);
      setStatus('off');
    };
  }, [enabled]);

  const send: LiveSend = (msg) => {
    const sock = ws.current;
    if (sock && sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify(msg));
  };
  return { friends, online, status, send };
}
