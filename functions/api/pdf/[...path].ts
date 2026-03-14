import { authenticateFirebaseRequest } from '../_lib/firebase-auth';
import { jsonResponse, methodNotAllowed } from '../_lib/http';

type PdfFacadeEnv = Env & {
  PDF_WORKER_AUTH?: string;
};

const API_PREFIX = '/api/pdf';

function resolveWorkerBaseUrl(domain: string): string {
  const trimmedDomain = domain.trim();
  if (trimmedDomain.length === 0) {
    throw new Error('PDF worker domain is not configured');
  }

  const withProtocol = /^https?:\/\//i.test(trimmedDomain)
    ? trimmedDomain
    : `https://${trimmedDomain}`;

  return withProtocol.replace(/\/+$/, '');
}

function getPathSuffix(pathname: string): string {
  if (!pathname.startsWith(API_PREFIX)) {
    return '/';
  }

  const suffix = pathname.slice(API_PREFIX.length);
  return suffix.length > 0 ? suffix : '/';
}

function getPdfWorkerAuth(env: PdfFacadeEnv): string {
  const pdfWorkerAuth = typeof env.PDF_WORKER_AUTH === 'string' ? env.PDF_WORKER_AUTH.trim() : '';
  if (!pdfWorkerAuth) {
    throw new Error('PDF worker auth is not configured');
  }

  return pdfWorkerAuth;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'POST, OPTIONS',
        'Cache-Control': 'no-store'
      }
    });
  }

  if (request.method !== 'POST') {
    return methodNotAllowed(['POST', 'OPTIONS']);
  }

  const authenticatedUser = await authenticateFirebaseRequest(request, env);
  if (!authenticatedUser) {
    return jsonResponse(401, {
      success: false,
      error: 'Unauthorized'
    });
  }

  const requestUrl = new URL(request.url);
  const pathSuffix = getPathSuffix(requestUrl.pathname);
  const pathSegments = pathSuffix.split('/').filter(Boolean);

  if (pathSegments.length !== 1 || pathSegments[0] !== 'generate') {
    return jsonResponse(404, {
      success: false,
      error: 'Unknown PDF endpoint'
    });
  }

  let workerBaseUrl: string;
  let pdfWorkerAuth: string;
  try {
    workerBaseUrl = resolveWorkerBaseUrl(env.PDF_WORKER_DOMAIN);
    pdfWorkerAuth = getPdfWorkerAuth(env as PdfFacadeEnv);
  } catch (error) {
    return jsonResponse(503, {
      success: false,
      error: error instanceof Error ? error.message : 'PDF worker routing is unavailable'
    });
  }

  const proxyHeaders = new Headers();
  proxyHeaders.set('X-Custom-Auth-Key', pdfWorkerAuth);

  const contentType = request.headers.get('Content-Type');
  if (contentType) {
    proxyHeaders.set('Content-Type', contentType);
  }

  const acceptHeader = request.headers.get('Accept');
  if (acceptHeader) {
    proxyHeaders.set('Accept', acceptHeader);
  }

  const workerResponse = await fetch(`${workerBaseUrl}/`, {
    method: 'POST',
    headers: proxyHeaders,
    body: request.body
  });

  return new Response(workerResponse.body, {
    status: workerResponse.status,
    headers: workerResponse.headers
  });
};
