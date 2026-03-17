import { verifyFirebaseIdentityFromRequest } from '../_shared/firebase-auth';

interface PdfProxyContext {
  request: Request;
  env: Env;
}

const SUPPORTED_METHODS = new Set(['POST', 'OPTIONS']);
const PDF_UPSTREAM_TIMEOUT_MS = 90_000;

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
  const routePrefix = '/api/pdf';
  if (!url.pathname.startsWith(routePrefix)) {
    return null;
  }

  const remainder = url.pathname.slice(routePrefix.length);
  return remainder.length > 0 ? remainder : '/';
}

export const onRequest = async ({ request, env }: PdfProxyContext): Promise<Response> => {
  if (!SUPPORTED_METHODS.has(request.method)) {
    return textResponse('Method not allowed', 405);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Allow': 'POST, OPTIONS',
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

  if (!env.PDF_WORKER_DOMAIN || !env.PDF_WORKER_AUTH) {
    return textResponse('PDF service not configured', 502);
  }

  const pdfWorkerBaseUrl = normalizeWorkerBaseUrl(env.PDF_WORKER_DOMAIN);
  const upstreamUrl = `${pdfWorkerBaseUrl}${proxyPath}${requestUrl.search}`;

  const upstreamHeaders = new Headers();
  const contentTypeHeader = request.headers.get('Content-Type');
  if (contentTypeHeader) {
    upstreamHeaders.set('Content-Type', contentTypeHeader);
  }

  const acceptHeader = request.headers.get('Accept');
  if (acceptHeader) {
    upstreamHeaders.set('Accept', acceptHeader);
  }

  upstreamHeaders.set('X-Custom-Auth-Key', env.PDF_WORKER_AUTH);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: request.body,
      signal: AbortSignal.timeout(PDF_UPSTREAM_TIMEOUT_MS)
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      return textResponse('Upstream PDF service timed out', 504);
    }

    return textResponse('Upstream PDF service unavailable', 502);
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
