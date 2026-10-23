export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(code);
  }
}

const PRACTICE_KEY = 'fp.practice';
export const getActivePractice = () => {
  try {
    return localStorage.getItem(PRACTICE_KEY);
  } catch {
    return null;
  }
};
export const setActivePractice = (id: string) => {
  try {
    localStorage.setItem(PRACTICE_KEY, id);
  } catch {
    /* storage unavailable */
  }
};

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = { 'x-requested-with': 'fp' };
  const practice = getActivePractice();
  if (practice) headers['x-practice-id'] = practice;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch('/api' + path, { method, headers, body: payload, credentials: 'same-origin', signal });
  } catch (e) {
    if (signal?.aborted) throw e; // superseded request (e.g. a newer search): not a network problem
    throw new ApiError(0, 'network_error');
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string })?.error ?? 'unknown_error', (data as { details?: unknown })?.details);
  return data as T;
}

function safeJson(t: string) {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

export const api = {
  get: <T>(p: string, signal?: AbortSignal) => request<T>('GET', p, undefined, signal),
  post: <T = { ok: boolean }>(p: string, b: unknown = {}) => request<T>('POST', p, b),
  put: <T = { ok: boolean }>(p: string, b: unknown = {}) => request<T>('PUT', p, b),
  patch: <T = { ok: boolean }>(p: string, b: unknown = {}) => request<T>('PATCH', p, b),
  del: <T = { ok: boolean }>(p: string) => request<T>('DELETE', p),
  upload: <T>(p: string, file: File) => {
    const f = new FormData();
    f.append('file', file);
    return request<T>('POST', p, f);
  },
};

export const mediaUrl = (id: string | null | undefined) => (id ? `/api/media/${id}` : null);

export const qs = (params: Record<string, string | number | undefined | null | false>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};
