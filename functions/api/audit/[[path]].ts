import { verifyFirebaseIdentityFromRequest } from '../_shared/firebase-auth';

interface AuditProxyContext {
  request: Request;
  env: Env;
}

const SUPPORTED_METHODS = new Set(['GET', 'POST', 'OPTIONS']);
const AUDIT_PATH_PREFIX = '/audit/';

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

function normalizeWorkerBaseUrl(workerDomain: string): string {
  if (typeof workerDomain !== 'string' || workerDomain.trim().length === 0) {
    throw new Error('Invalid worker domain');
  }

  const trimmedDomain = workerDomain.trim().replace(/\/+$/, '');
  if (trimmedDomain.startsWith('http://') || trimmedDomain.startsWith('https://')) {
    return trimmedDomain;
  }

  return `https://${trimmedDomain}`;
}

function extractProxyPath(url: URL): string | null {
  const routePrefix = '/api/audit';
  if (!url.pathname.startsWith(routePrefix)) {
    return null;
  }

  const remainder = url.pathname.slice(routePrefix.length);
  return remainder.length > 0 ? remainder : '/';
}

function extractRequestedUserId(url: URL): string | null {
  const userId = url.searchParams.get('userId');
  if (!userId) {
    return null;
  }

  const normalizedUserId = userId.trim();
  return normalizedUserId.length > 0 ? normalizedUserId : null;
}

export const onRequest = async ({ request, env }: AuditProxyContext): Promise<Response> => {
  if (!SUPPORTED_METHODS.has(request.method)) {
    return textResponse('Method not allowed', 405);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Allow': 'GET, POST, OPTIONS',
        'Cache-Control': 'no-store'
      }
    });
  }

  const identity = await verifyFirebaseIdentityFromRequest(request, env);
  if (!identity) {
    return textResponse('Unauthorized', 401);
  }

  const requestUrl = new URL(request.url);
  const proxyPath = extractProxyPath(requestUrl);
  if (!proxyPath || !proxyPath.startsWith(AUDIT_PATH_PREFIX)) {
    return textResponse('Not Found', 404);
  }

  const requestedUserId = extractRequestedUserId(requestUrl);
  if (!requestedUserId) {
    return textResponse('Missing user identifier', 400);
  }

  if (requestedUserId !== identity.uid) {
    return textResponse('Forbidden', 403);
  }

  if (!env.AUDIT_WORKER_DOMAIN || !env.R2_KEY_SECRET) {
    return textResponse('Audit service not configured', 502);
  }

  const auditWorkerBaseUrl = normalizeWorkerBaseUrl(env.AUDIT_WORKER_DOMAIN);
  const upstreamUrl = `${auditWorkerBaseUrl}${proxyPath}${requestUrl.search}`;

  let bodyToForward: BodyInit | undefined;
  if (request.method === 'POST') {
    const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!payload || typeof payload !== 'object') {
      return textResponse('Invalid audit payload', 400);
    }

    const payloadUserId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
    if (payloadUserId.length > 0 && payloadUserId !== identity.uid) {
      return textResponse('Forbidden', 403);
    }

    payload.userId = identity.uid;
    bodyToForward = JSON.stringify(payload);
  }

  const upstreamHeaders = new Headers();
  const contentTypeHeader = request.headers.get('Content-Type');
  if (contentTypeHeader) {
    upstreamHeaders.set('Content-Type', contentTypeHeader);
  }

  if (request.method === 'POST' && !upstreamHeaders.has('Content-Type')) {
    upstreamHeaders.set('Content-Type', 'application/json');
  }

  const acceptHeader = request.headers.get('Accept');
  if (acceptHeader) {
    upstreamHeaders.set('Accept', acceptHeader);
  }

  upstreamHeaders.set('X-Custom-Auth-Key', env.R2_KEY_SECRET);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: bodyToForward
    });
  } catch {
    return textResponse('Upstream audit service unavailable', 502);
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  if (!responseHeaders.has('Cache-Control')) {
    responseHeaders.set('Cache-Control', 'no-store');
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders
  });
};
