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

function extractProxyPath(url: URL): string | null {
  const routePrefix = '/api/image';
  if (!url.pathname.startsWith(routePrefix)) {
    return null;
  }

  const remainder = url.pathname.slice(routePrefix.length);
  if (remainder.length === 0) {
    return '/';
  }

  const normalizedRemainder = remainder.startsWith('/') ? remainder : `/${remainder}`;
  const encodedPath = normalizedRemainder.slice(1);

  try {
    const decodedPath = decodeURIComponent(encodedPath);
    if (decodedPath.length > 0) {
      return decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}`;
    }
  } catch {
    // Keep legacy behavior for non-encoded paths.
  }

  return normalizedRemainder;
}

function resolveImageWorkerToken(env: Env): string {
  const imageToken = typeof env.IMAGES_API_TOKEN === 'string' ? env.IMAGES_API_TOKEN.trim() : '';
  if (imageToken.length > 0) {
    return imageToken;
  }

  const apiToken = typeof env.API_TOKEN === 'string' ? env.API_TOKEN.trim() : '';
  if (apiToken.length > 0) {
    return apiToken;
  }

  return '';
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
  const proxyPath = extractProxyPath(requestUrl);
  if (!proxyPath) {
    return textResponse('Not Found', 404);
  }

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
