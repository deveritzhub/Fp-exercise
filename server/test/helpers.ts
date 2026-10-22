import { createApp } from '../src/app';
import { seed, DEMO_PASSWORD, DEMO_USERS } from '../db/seed';

export const app = createApp();
export type Seed = Awaited<ReturnType<typeof seed>>;

export async function seedDb(activity = false) {
  return seed(process.env.DATABASE_OWNER_URL, { activity, quiet: true });
}

/** Minimal cookie-aware API client around app.request (no network). */
export class Client {
  cookie = '';
  practiceId?: string;
  constructor(public label = 'anon') {}

  async req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const h: Record<string, string> = { 'x-requested-with': 'fp', ...headers };
    if (this.cookie) h.cookie = this.cookie;
    if (this.practiceId) h['x-practice-id'] = this.practiceId;
    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      h['content-type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await app.request('/api' + path, { method, headers: h, body: payload });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, body: json, headers: res.headers };
  }
  get = (p: string, h?: Record<string, string>) => this.req('GET', p, undefined, h);
  post = (p: string, b?: unknown) => this.req('POST', p, b ?? {});
  put = (p: string, b?: unknown) => this.req('PUT', p, b ?? {});
  patch = (p: string, b?: unknown) => this.req('PATCH', p, b ?? {});
  del = (p: string) => this.req('DELETE', p);
}

export async function login(who: keyof typeof DEMO_USERS) {
  const c = new Client(who);
  const r = await c.post('/auth/login', { email: DEMO_USERS[who].email, password: DEMO_PASSWORD });
  if (r.status !== 200) throw new Error(`login ${who} failed: ${r.status} ${JSON.stringify(r.body)}`);
  return c;
}
