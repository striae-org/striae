import { verifyFirebaseIdentityFromRequest } from '../_shared/firebase-auth';

interface ImageProxyContext {
  request: Request;
  env: Env;
}

const SUPPORTED_METHODS = new Set(['GET', 'POST', 'DELETE', 'OPTIONS']);

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

type ProxyPathResult =
  | { ok: true; path: string }
  | { ok: false; reason: 'not-found' | 'bad-encoding' };

function extractProxyPath(url: URL): ProxyPathResult {
  const routePrefix = '/api/image';
  if (!url.pathname.startsWith(routePrefix)) {
    return { ok: false, reason: 'not-found' };
  }

  const remainder = url.pathname.slice(routePrefix.length);
  if (remainder.length === 0) {
    return { ok: true, path: '/' };
  }

  const normalizedRemainder = remainder.startsWith('/') ? remainder : `/${remainder}`;
  const encodedPath = normalizedRemainder.slice(1);
  if (encodedPath.length === 0) {
    return { ok: true, path: normalizedRemainder };
  }

  try {
    const decodedPath = decodeURIComponent(encodedPath);
    return { ok: true, path: decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}` };
  } catch {
    return { ok: false, reason: 'bad-encoding' };
  }
}

function resolveImageWorkerToken(env: Env): string {
  return typeof env.IMAGES_API_TOKEN === 'string' ? env.IMAGES_API_TOKEN.trim() : '';
}

export const onRequest = async ({ request, env }: ImageProxyContext): Promise<Response> => {
  if (!SUPPORTED_METHODS.has(request.method)) {
    return textResponse('Method not allowed', 405);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Allow': 'GET, POST, DELETE, OPTIONS',
        'Cache-Control': 'no-store'
      }
    });
  }

  const identity = await verifyFirebaseIdentityFromRequest(request, env);
  if (!identity) {
    return textResponse('Unauthorized', 401);
  }

  const requestUrl = new URL(request.url);
  const proxyPathResult = extractProxyPath(requestUrl);
  if (!proxyPathResult.ok) {
    return proxyPathResult.reason === 'bad-encoding'
      ? textResponse('Bad Request: malformed image path encoding', 400)
      : textResponse('Not Found', 404);
  }

  const proxyPath = proxyPathResult.path;

  const imageWorkerToken = resolveImageWorkerToken(env);
  if (!env.IMAGES_WORKER_DOMAIN || !imageWorkerToken) {
    return textResponse('Image service not configured', 502);
  }

  const imageWorkerBaseUrl = normalizeWorkerBaseUrl(env.IMAGES_WORKER_DOMAIN);
  const upstreamUrl = `${imageWorkerBaseUrl}${proxyPath}${requestUrl.search}`;

  const upstreamHeaders = new Headers();
  const contentTypeHeader = request.headers.get('Content-Type');
  if (contentTypeHeader) {
    upstreamHeaders.set('Content-Type', contentTypeHeader);
  }

  const acceptHeader = request.headers.get('Accept');
  if (acceptHeader) {
    upstreamHeaders.set('Accept', acceptHeader);
  }

  upstreamHeaders.set('Authorization', `Bearer ${imageWorkerToken}`);

  const shouldForwardBody = request.method !== 'GET' && request.method !== 'HEAD';

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: shouldForwardBody ? request.body : undefined
    });
  } catch {
    return textResponse('Upstream image service unavailable', 502);
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
