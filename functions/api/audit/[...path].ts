import { authenticateFirebaseRequest } from '../_lib/firebase-auth';
import { jsonResponse, methodNotAllowed } from '../_lib/http';

type AuditEntryPayload = {
  userId?: string;
};

const API_PREFIX = '/api/audit';

function resolveWorkerBaseUrl(domain: string): string {
  const trimmedDomain = domain.trim();
  if (trimmedDomain.length === 0) {
    throw new Error('Audit worker domain is not configured');
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

function isEntriesPath(pathSegments: string[]): boolean {
  return pathSegments.length === 1 && pathSegments[0] === 'entries';
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'GET, POST, OPTIONS',
        'Cache-Control': 'no-store'
      }
    });
  }

  if (!['GET', 'POST'].includes(request.method)) {
    return methodNotAllowed(['GET', 'POST', 'OPTIONS']);
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

  if (!isEntriesPath(pathSegments)) {
    return jsonResponse(404, {
      success: false,
      error: 'Unknown audit endpoint'
    });
  }

  const auditWorkerAuth = typeof env.R2_KEY_SECRET === 'string' ? env.R2_KEY_SECRET.trim() : '';
  if (!auditWorkerAuth) {
    return jsonResponse(503, {
      success: false,
      error: 'Audit worker auth is not configured'
    });
  }

  let workerBaseUrl: string;
  try {
    workerBaseUrl = resolveWorkerBaseUrl(env.AUDIT_WORKER_DOMAIN);
  } catch (error) {
    return jsonResponse(503, {
      success: false,
      error: error instanceof Error ? error.message : 'Audit worker routing is unavailable'
    });
  }

  const targetUrl = new URL('/audit/', `${workerBaseUrl}/`);

  let requestBody: BodyInit | undefined;
  if (request.method === 'GET') {
    const requestedUserId = requestUrl.searchParams.get('userId');
    if (requestedUserId && requestedUserId !== authenticatedUser.uid) {
      return jsonResponse(403, {
        success: false,
        error: 'Forbidden'
      });
    }

    targetUrl.searchParams.set('userId', authenticatedUser.uid);

    const startDate = requestUrl.searchParams.get('startDate');
    if (startDate) {
      targetUrl.searchParams.set('startDate', startDate);
    }

    const endDate = requestUrl.searchParams.get('endDate');
    if (endDate) {
      targetUrl.searchParams.set('endDate', endDate);
    }
  }

  if (request.method === 'POST') {
    let parsedBody: AuditEntryPayload;
    try {
      parsedBody = await request.json() as AuditEntryPayload;
    } catch {
      return jsonResponse(400, {
        success: false,
        error: 'Invalid JSON payload'
      });
    }

    const requestedUserId = typeof parsedBody.userId === 'string' ? parsedBody.userId.trim() : '';
    if (requestedUserId && requestedUserId !== authenticatedUser.uid) {
      return jsonResponse(403, {
        success: false,
        error: 'Forbidden'
      });
    }

    const normalizedUserId = requestedUserId || authenticatedUser.uid;
    const normalizedBody: AuditEntryPayload = {
      ...parsedBody,
      userId: normalizedUserId
    };

    targetUrl.searchParams.set('userId', normalizedUserId);
    requestBody = JSON.stringify(normalizedBody);
  }

  const proxyHeaders = new Headers();
  proxyHeaders.set('X-Custom-Auth-Key', auditWorkerAuth);
  proxyHeaders.set('Accept', 'application/json');

  if (request.method === 'POST') {
    proxyHeaders.set('Content-Type', 'application/json; charset=utf-8');
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
