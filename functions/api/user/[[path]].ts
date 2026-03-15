import { verifyFirebaseIdentityFromRequest } from '../_shared/firebase-auth';

interface UserProxyContext {
  request: Request;
  env: Env;
}

const SUPPORTED_METHODS = new Set(['GET', 'PUT', 'DELETE', 'OPTIONS']);
const USER_EXISTS_PATH_PREFIX = '/exists/';

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

function jsonResponse(payload: Record<string, unknown>, status: number = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8'
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
  const routePrefix = '/api/user';
  if (!url.pathname.startsWith(routePrefix)) {
    return null;
  }

  const remainder = url.pathname.slice(routePrefix.length);
  return remainder.length > 0 ? remainder : '/';
}

function extractUserIdFromProxyPath(proxyPath: string): string | null {
  const firstSegment = proxyPath.split('/').filter(Boolean)[0];
  if (!firstSegment) {
    return null;
  }

  try {
    return decodeURIComponent(firstSegment);
  } catch {
    return null;
  }
}

function extractExistenceCheckUserId(proxyPath: string): string | null {
  if (!proxyPath.startsWith(USER_EXISTS_PATH_PREFIX)) {
    return null;
  }

  const remainder = proxyPath.slice(USER_EXISTS_PATH_PREFIX.length);
  const firstSegment = remainder.split('/').filter(Boolean)[0];
  if (!firstSegment) {
    return null;
  }

  try {
    return decodeURIComponent(firstSegment);
  } catch {
    return null;
  }
}

export const onRequest = async ({ request, env }: UserProxyContext): Promise<Response> => {
  if (!SUPPORTED_METHODS.has(request.method)) {
    return textResponse('Method not allowed', 405);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Allow': 'GET, PUT, DELETE, OPTIONS',
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
  if (!proxyPath) {
    return textResponse('Not Found', 404);
  }

  if (!env.USER_WORKER_DOMAIN || !env.USER_DB_AUTH) {
    return textResponse('User service not configured', 502);
  }

  const userWorkerBaseUrl = normalizeWorkerBaseUrl(env.USER_WORKER_DOMAIN);

  const existenceCheckUserId = extractExistenceCheckUserId(proxyPath);
  if (existenceCheckUserId !== null) {
    if (request.method !== 'GET') {
      return textResponse('Method not allowed', 405);
    }

    let existenceResponse: Response;
    try {
      existenceResponse = await fetch(
        `${userWorkerBaseUrl}/${encodeURIComponent(existenceCheckUserId)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Custom-Auth-Key': env.USER_DB_AUTH
          }
        }
      );
    } catch {
      return textResponse('Upstream user service unavailable', 502);
    }

    if (existenceResponse.status === 404) {
      return jsonResponse({ exists: false });
    }

    if (!existenceResponse.ok) {
      return textResponse('Upstream user service unavailable', 502);
    }

    return jsonResponse({ exists: true });
  }

  const requestedUserId = extractUserIdFromProxyPath(proxyPath);
  if (!requestedUserId) {
    return textResponse('Missing user identifier', 400);
  }

  if (requestedUserId !== identity.uid) {
    return textResponse('Forbidden', 403);
  }
  const upstreamUrl = `${userWorkerBaseUrl}${proxyPath}${requestUrl.search}`;

  const upstreamHeaders = new Headers();
  const contentTypeHeader = request.headers.get('Content-Type');
  if (contentTypeHeader) {
    upstreamHeaders.set('Content-Type', contentTypeHeader);
  }

  const acceptHeader = request.headers.get('Accept');
  if (acceptHeader) {
    upstreamHeaders.set('Accept', acceptHeader);
  }

  upstreamHeaders.set('X-Custom-Auth-Key', env.USER_DB_AUTH);

  const shouldForwardBody = request.method !== 'GET' && request.method !== 'HEAD';

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: shouldForwardBody ? request.body : undefined
    });
  } catch {
    return textResponse('Upstream user service unavailable', 502);
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
