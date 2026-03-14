import { authenticateFirebaseRequest } from '../_lib/firebase-auth';
import { jsonResponse, methodNotAllowed } from '../_lib/http';

const API_PREFIX = '/api/data';

type ForensicSigningRequest = {
  userId?: string;
};

function resolveWorkerBaseUrl(domain: string): string {
  const trimmedDomain = domain.trim();
  if (trimmedDomain.length === 0) {
    throw new Error('Data worker domain is not configured');
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

function isForensicSigningPath(pathSuffix: string): boolean {
  return pathSuffix.startsWith('/api/forensic/');
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'GET, POST, PUT, DELETE, OPTIONS',
        'Cache-Control': 'no-store'
      }
    });
  }

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) {
    return methodNotAllowed(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
  }

  const authenticatedUser = await authenticateFirebaseRequest(request, env);
  if (!authenticatedUser) {
    return jsonResponse(401, {
      success: false,
      error: 'Unauthorized'
    });
  }

  const dataWorkerAuth = typeof env.R2_KEY_SECRET === 'string' ? env.R2_KEY_SECRET.trim() : '';
  if (!dataWorkerAuth) {
    return jsonResponse(503, {
      success: false,
      error: 'Data worker auth is not configured'
    });
  }

  const requestUrl = new URL(request.url);
  const pathSuffix = getPathSuffix(requestUrl.pathname);

  if (pathSuffix === '/') {
    return jsonResponse(400, {
      success: false,
      error: 'Missing data path in request'
    });
  }

  let requestBody: BodyInit | undefined;
  if (isForensicSigningPath(pathSuffix)) {
    if (request.method !== 'POST') {
      return methodNotAllowed(['POST', 'OPTIONS']);
    }

    let signingBody: ForensicSigningRequest;
    try {
      signingBody = await request.json() as ForensicSigningRequest;
    } catch {
      return jsonResponse(400, {
        success: false,
        error: 'Invalid JSON payload'
      });
    }

    if (signingBody.userId !== authenticatedUser.uid) {
      return jsonResponse(403, {
        success: false,
        error: 'Forbidden'
      });
    }

    requestBody = JSON.stringify(signingBody);
  } else {
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

    const hasRequestBody = request.method !== 'GET' && request.method !== 'HEAD';
    requestBody = hasRequestBody ? (request.body ?? undefined) : undefined;
  }

  let workerBaseUrl: string;
  try {
    workerBaseUrl = resolveWorkerBaseUrl(env.DATA_WORKER_DOMAIN);
  } catch (error) {
    return jsonResponse(503, {
      success: false,
      error: error instanceof Error ? error.message : 'Data worker routing is unavailable'
    });
  }

  const targetUrl = new URL(`${pathSuffix}${requestUrl.search}`, `${workerBaseUrl}/`);
  const proxyHeaders = new Headers();
  proxyHeaders.set('X-Custom-Auth-Key', dataWorkerAuth);

  const contentType = request.headers.get('Content-Type');
  if (contentType) {
    proxyHeaders.set('Content-Type', contentType);
  } else if (isForensicSigningPath(pathSuffix)) {
    proxyHeaders.set('Content-Type', 'application/json; charset=utf-8');
  }

  const acceptHeader = request.headers.get('Accept');
  if (acceptHeader) {
    proxyHeaders.set('Accept', acceptHeader);
  }

  const workerResponse = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: proxyHeaders,
    body: requestBody
  });

  return new Response(workerResponse.body, {
    status: workerResponse.status,
    headers: workerResponse.headers
  });
};
