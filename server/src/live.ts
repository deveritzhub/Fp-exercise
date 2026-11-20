import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import { config } from './config';
import { resolveSession } from './auth/service';
import { withUser } from './db';
import { SESSION_COOKIE } from './middleware';
import { LIVE_SAYINGS } from '../../shared/live';

/**
 * Playing together: friends see each other walk through the village, live. Only patients with a
 * hero who share with friends connect, and what one sends goes only to accepted friends who share
 * too. A friend is named by the friendship id (both already know it), never by a patient id. What
 * can be said is a short list of fixed sayings, no free text.
 */

type Friend = { fid: string; pid: string };
type Pose = { x: number; z: number; f: number; zone: string; w: 0 | 1 | 2; act?: string };
type Client = { pid: string; ws: WebSocket; name: string; look: unknown; friends: Map<string, Friend>; pose: Pose | null; tokens: number; refill: number; alive: boolean; refresh?: NodeJS.Timeout };

const clients = new Map<string, Set<Client>>();
const MAX_MSG = 600;
const ZONE = /^[a-z0-9:_-]{1,40}$/;
const ACTS = new Set(['strike', 'shoot', 'cast', 'wave', 'sit']);

const cookieOf = (req: IncomingMessage, name: string) => {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
};

const send = (c: Client, msg: unknown) => {
  if (c.ws.readyState === c.ws.OPEN) c.ws.send(JSON.stringify(msg));
};

/** Everyone online who is a friend of `c`, with the friendship that links them. */
function onlineFriends(c: Client): { other: Client; fid: string }[] {
  const out: { other: Client; fid: string }[] = [];
  for (const f of c.friends.values()) {
    for (const other of clients.get(f.pid) ?? []) {
      // Both sides must still count each other as a friend (it may have ended a moment ago).
      if ([...other.friends.values()].some((x) => x.pid === c.pid)) out.push({ other, fid: f.fid });
    }
  }
  return out;
}

async function loadFriends(userId: string, pid: string) {
  return withUser(userId, async (tx) => {
    const me = (await tx.query('SELECT hero_name, share_with_friends, frame, build, skin, hair, hair_color, eye_color, beard, glasses, outfit, sport, gear FROM patient_heroes WHERE patient_id = $1', [pid])).rows[0];
    if (!me?.share_with_friends) return null;
    const rows = (await tx.query('SELECT * FROM app.hero_live_friends($1)', [pid])).rows;
    const look = { frame: me.frame, build: me.build, skin: me.skin, hair: me.hair, hairColor: me.hair_color, eyeColor: me.eye_color, beard: me.beard, glasses: me.glasses, outfit: me.outfit, sport: me.sport, gear: me.gear };
    return { name: me.hero_name as string, look, friends: new Map(rows.map((r) => [r.friend_id as string, { fid: r.friendship_id as string, pid: r.friend_id as string }])) };
  });
}

/** Reads a pose from a client, or null when anything in it is off. */
function readPose(m: Record<string, unknown>): Pose | null {
  const num = (v: unknown, lim: number) => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= lim ? Math.round(v * 100) / 100 : null);
  const x = num(m.x, 2000);
  const z = num(m.z, 2000);
  const f = num(m.f, 100);
  if (x === null || z === null || f === null || typeof m.zone !== 'string' || !ZONE.test(m.zone)) return null;
  const w = m.w === 1 ? 1 : m.w === 2 ? 2 : 0;
  const act = typeof m.act === 'string' && ACTS.has(m.act) ? m.act : undefined;
  return { x, z, f, zone: m.zone, w, act };
}

function onMessage(c: Client, raw: Buffer) {
  // A few messages a second are plenty (and all a fair client sends); the rest is dropped.
  const now = Date.now();
  c.tokens = Math.min(30, c.tokens + ((now - c.refill) / 1000) * 15);
  c.refill = now;
  if (c.tokens < 1 || raw.length > MAX_MSG) return;
  c.tokens -= 1;
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw.toString('utf8'));
  } catch {
    return;
  }
  if (m.t === 'pos') {
    const pose = readPose(m);
    if (!pose) return;
    c.pose = pose;
    for (const { other, fid } of onlineFriends(c)) send(other, { t: 'pos', id: fid, ...pose });
  } else if (m.t === 'say' && typeof m.k === 'string' && LIVE_SAYINGS.some((s) => s.key === m.k)) {
    for (const { other, fid } of onlineFriends(c)) send(other, { t: 'say', id: fid, k: m.k });
  }
}

function join(c: Client) {
  const set = clients.get(c.pid) ?? new Set<Client>();
  set.add(c);
  clients.set(c.pid, set);
  const here = onlineFriends(c);
  // Who is here already, and to them: someone arrived.
  send(c, { t: 'hello', friends: here.map(({ other, fid }) => ({ id: fid, name: other.name, look: other.look, ...(other.pose ?? {}) })) });
  for (const { other, fid } of here) send(other, { t: 'join', id: fid, name: c.name, look: c.look, ...(c.pose ?? {}) });
}

function leave(c: Client) {
  clearInterval(c.refresh);
  const set = clients.get(c.pid);
  if (!set) return;
  // Friends hear of it before the client is gone from the list (so they can still be found).
  const still = set.size > 1;
  if (!still) for (const { other, fid } of onlineFriends(c)) send(other, { t: 'leave', id: fid });
  set.delete(c);
  if (!set.size) clients.delete(c.pid);
}

/** Adds the live link (`/api/live`) to the HTTP server. */
export function attachLive(server: Server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const path = (req.url ?? '').split('?')[0];
    if (path !== '/api/live') return;
    const refuse = (code: number) => {
      socket.write(`HTTP/1.1 ${code} ${code === 401 ? 'Unauthorized' : 'Forbidden'}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };
    // Only pages of this app connect (a session cookie alone is not enough).
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin && origin !== config.appOrigin && !(host && (origin === `http://${host}` || origin === `https://${host}`))) return refuse(403);
    const token = cookieOf(req, SESSION_COOKIE);
    if (!token) return refuse(401);
    void (async () => {
      try {
        const user = await resolveSession(token);
        if (!user?.patient) return refuse(user ? 403 : 401);
        const pid = user.patient.id;
        const loaded = await loadFriends(user.id, pid);
        if (!loaded) return refuse(403);
        wss.handleUpgrade(req, socket, head, (ws) => {
          const c: Client = { pid, ws, name: loaded.name, look: loaded.look, friends: loaded.friends, pose: null, tokens: 30, refill: Date.now(), alive: true };
          join(c);
          // Friendships change now and then: look again every minute.
          c.refresh = setInterval(() => {
            void loadFriends(user.id, pid).then((again) => {
              if (!again) return ws.close(4003, 'sharing_off');
              const before = new Set([...c.friends.keys()]);
              c.friends = again.friends;
              // A new friend online: say hello both ways.
              for (const { other, fid } of onlineFriends(c)) {
                if (before.has(other.pid)) continue;
                send(c, { t: 'join', id: fid, name: other.name, look: other.look, ...(other.pose ?? {}) });
                send(other, { t: 'join', id: fid, name: c.name, look: c.look, ...(c.pose ?? {}) });
              }
            }).catch(() => undefined);
          }, 60_000);
          ws.on('message', (data) => onMessage(c, data as Buffer));
          ws.on('pong', () => { c.alive = true; });
          ws.on('close', () => leave(c));
          ws.on('error', () => ws.terminate());
        });
      } catch {
        refuse(403);
      }
    })();
  });
  // Dead connections (a phone that went to sleep) are cleared up.
  const beat = setInterval(() => {
    for (const set of clients.values()) for (const c of set) {
      if (!c.alive) {
        c.ws.terminate();
        continue;
      }
      c.alive = false;
      c.ws.ping();
    }
  }, 25_000);
  beat.unref();
  return wss;
}
