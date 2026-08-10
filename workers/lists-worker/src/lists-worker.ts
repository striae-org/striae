import type { Env } from './types';

const JSON_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
};

/** Routes map URL path segment to the KV key used in STRIAE_LISTS. */
const ROUTE_TO_KV_KEY: Record<string, string> = {
  members: 'allow',
  primershear: 'primershear',
};

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

/**
 * Constant-time string comparison to mitigate timing side-channels on auth checks.
 * Both strings are encoded to bytes and compared with a full XOR pass.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function isAuthorized(request: Request, secret: string): boolean {
  if (!secret) return false;
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return timingSafeEqual(auth.slice(7), secret);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const segment = url.pathname.replace(/^\/+|\/+$/g, '');
    const kvKey = ROUTE_TO_KV_KEY[segment];

    if (!kvKey) {
      return jsonResponse({ error: 'Not found' }, 404);
    }

    if (request.method === 'GET') {
      if (!isAuthorized(request, env.LISTS_ADMIN_SECRET)) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
      const raw = (await env.STRIAE_LISTS.get(kvKey)) ?? '';
      const list = raw ? raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean).join(',') : '';
      return jsonResponse({ list });
    }

    if (request.method === 'POST' || request.method === 'DELETE') {
      if (!isAuthorized(request, env.LISTS_ADMIN_SECRET)) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      let body: { entry?: unknown };
      try {
        body = await request.json() as { entry?: unknown };
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
      }

      const entry = typeof body.entry === 'string' ? body.entry.trim().toLowerCase() : '';
      if (!entry) {
        return jsonResponse({ error: 'Missing or empty entry' }, 400);
      }

      const current = (await env.STRIAE_LISTS.get(kvKey)) ?? '';
      const entries = current ? current.split(',').map(e => e.trim().toLowerCase()).filter(Boolean) : [];

      if (request.method === 'POST') {
        if (!entries.includes(entry)) {
          entries.push(entry);
        }
        await env.STRIAE_LISTS.put(kvKey, entries.join(','));
        return jsonResponse({ ok: true });
      }

      // DELETE
      const filtered = entries.filter(e => e !== entry);
      await env.STRIAE_LISTS.put(kvKey, filtered.join(','));
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  },
};
