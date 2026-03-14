import { authenticateFirebaseRequest } from '../_lib/firebase-auth';
import { jsonResponse, methodNotAllowed } from '../_lib/http';

const API_PREFIX = '/api/user';

function resolveWorkerBaseUrl(domain: string): string {
  const trimmedDomain = domain.trim();
  if (trimmedDomain.length === 0) {
    throw new Error('User worker domain is not configured');
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

function getUidFromSuffix(pathSuffix: string): string | null {
  const segments = pathSuffix.split('/').filter(Boolean);
  return segments.length > 0 ? segments[0] : null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'GET, PUT, DELETE, OPTIONS',
        'Cache-Control': 'no-store'
      }
    });
  }

  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) {
    return methodNotAllowed(['GET', 'PUT', 'DELETE', 'OPTIONS']);
  }

  const authenticatedUser = await authenticateFirebaseRequest(request, env);
  if (!authenticatedUser) {
    return jsonResponse(401, {
      success: false,
      error: 'Unauthorized'
    });
  }

  const userWorkerAuth = typeof env.USER_DB_AUTH === 'string' ? env.USER_DB_AUTH.trim() : '';
  if (!userWorkerAuth) {
    return jsonResponse(503, {
      success: false,
      error: 'User worker auth is not configured'
    });
  }

  const requestUrl = new URL(request.url);
  const pathSuffix = getPathSuffix(requestUrl.pathname);
  const targetUid = getUidFromSuffix(pathSuffix);

  if (!targetUid) {
    return jsonResponse(400, {
      success: false,
      error: 'Missing user identifier in request path'
    });
  }

  if (targetUid !== authenticatedUser.uid) {
    return jsonResponse(403, {
      success: false,
      error: 'Forbidden'
    });
  }

  let workerBaseUrl: string;
  try {
    workerBaseUrl = resolveWorkerBaseUrl(env.USER_WORKER_DOMAIN);
  } catch (error) {
    return jsonResponse(503, {
      success: false,
      error: error instanceof Error ? error.message : 'User worker routing is unavailable'
    });
  }

  const targetUrl = new URL(`${pathSuffix}${requestUrl.search}`, `${workerBaseUrl}/`);
  const proxyHeaders = new Headers();
  proxyHeaders.set('X-Custom-Auth-Key', userWorkerAuth);

  const contentType = request.headers.get('Content-Type');
  if (contentType) {
    proxyHeaders.set('Content-Type', contentType);
  }

  const acceptHeader = request.headers.get('Accept');
  if (acceptHeader) {
    proxyHeaders.set('Accept', acceptHeader);
  }

  const hasRequestBody = request.method !== 'GET' && request.method !== 'HEAD';

  const workerResponse = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: proxyHeaders,
    body: hasRequestBody ? request.body : undefined
  });

  return new Response(workerResponse.body, {
    status: workerResponse.status,
    headers: workerResponse.headers
  });
};
