import { verifyFirebaseIdentityFromRequest } from '../_shared/firebase-auth';

interface DataProxyContext {
  request: Request;
  env: Env;
}

const SUPPORTED_METHODS = new Set(['GET', 'PUT', 'DELETE', 'POST', 'OPTIONS']);
const UNSCOPED_PATH_PREFIXES = ['/api/forensic/'];

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
  const routePrefix = '/api/data';
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

function isUnscopedProxyPath(proxyPath: string): boolean {
  return UNSCOPED_PATH_PREFIXES.some((prefix) => proxyPath.startsWith(prefix));
}

export const onRequest = async ({ request, env }: DataProxyContext): Promise<Response> => {
  if (!SUPPORTED_METHODS.has(request.method)) {
    return textResponse('Method not allowed', 405);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Allow': 'GET, PUT, DELETE, POST, OPTIONS',
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

  if (!isUnscopedProxyPath(proxyPath)) {
    const requestedUserId = extractUserIdFromProxyPath(proxyPath);
    if (!requestedUserId) {
      return textResponse('Missing user identifier', 400);
    }

    if (requestedUserId !== identity.uid) {
      return textResponse('Forbidden', 403);
    }
  }

  if (!env.DATA_WORKER_DOMAIN || !env.R2_KEY_SECRET) {
    return textResponse('Data service not configured', 502);
  }

  const dataWorkerBaseUrl = normalizeWorkerBaseUrl(env.DATA_WORKER_DOMAIN);
  const upstreamUrl = `${dataWorkerBaseUrl}${proxyPath}${requestUrl.search}`;

  const upstreamHeaders = new Headers();
  const contentTypeHeader = request.headers.get('Content-Type');
  if (contentTypeHeader) {
    upstreamHeaders.set('Content-Type', contentTypeHeader);
  }

  const acceptHeader = request.headers.get('Accept');
  if (acceptHeader) {
    upstreamHeaders.set('Accept', acceptHeader);
  }

  upstreamHeaders.set('X-Custom-Auth-Key', env.R2_KEY_SECRET);

  const shouldForwardBody = request.method !== 'GET' && request.method !== 'HEAD';

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: shouldForwardBody ? request.body : undefined
    });
  } catch {
    return textResponse('Upstream data service unavailable', 502);
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
