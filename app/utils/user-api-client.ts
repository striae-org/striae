import type { User } from 'firebase/auth';
import paths from '~/config/config.json';
import { getUserApiKey } from './auth';

const USER_API_BASE = '/api/user';
const USER_EXISTS_API_BASE = '/api/user/exists';
const USER_WORKER_URL = paths.user_worker_url;
const PROXY_FALLBACK_STATUSES = new Set([401, 403, 404, 405, 500, 502, 503, 504]);

function normalizePath(path: string): string {
  if (!path) {
    return '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

export async function fetchUserApi(
  user: User,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const normalizedPath = normalizePath(path);
  const userWithOptionalToken = user as User & { getIdToken?: () => Promise<string> };

  if (typeof userWithOptionalToken.getIdToken === 'function') {
    let idToken: string | null = null;

    try {
      idToken = await userWithOptionalToken.getIdToken();
    } catch {
      idToken = null;
    }

    if (idToken) {
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${idToken}`);

      try {
        const proxyResponse = await fetch(`${USER_API_BASE}${normalizedPath}`, {
          ...init,
          headers
        });

        if (!PROXY_FALLBACK_STATUSES.has(proxyResponse.status)) {
          return proxyResponse;
        }
      } catch {
        // Temporary fallback while the proxy route rolls out through all environments.
      }
    }
  }

  const apiKey = await getUserApiKey();
  const legacyHeaders = new Headers(init.headers);
  legacyHeaders.delete('Authorization');
  legacyHeaders.set('X-Custom-Auth-Key', apiKey);

  return fetch(`${USER_WORKER_URL}${normalizedPath}`, {
    ...init,
    headers: legacyHeaders
  });
}

export async function checkUserExistsApi(user: User, targetUid: string): Promise<boolean> {
  const encodedTargetUid = encodeURIComponent(targetUid);
  const userWithOptionalToken = user as User & { getIdToken?: () => Promise<string> };

  if (typeof userWithOptionalToken.getIdToken === 'function') {
    let idToken: string | null = null;

    try {
      idToken = await userWithOptionalToken.getIdToken();
    } catch {
      idToken = null;
    }

    if (idToken) {
      try {
        const proxyResponse = await fetch(`${USER_EXISTS_API_BASE}/${encodedTargetUid}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Accept': 'application/json'
          }
        });

        if (proxyResponse.ok) {
          const responseData = await proxyResponse.json().catch(() => null) as {
            exists?: boolean;
          } | null;

          if (typeof responseData?.exists === 'boolean') {
            return responseData.exists;
          }

          return true;
        }

        if (!PROXY_FALLBACK_STATUSES.has(proxyResponse.status)) {
          return false;
        }
      } catch {
        // Temporary fallback while the proxy route rolls out through all environments.
      }
    }
  }

  const apiKey = await getUserApiKey();
  const legacyResponse = await fetch(`${USER_WORKER_URL}/${encodedTargetUid}`, {
    method: 'GET',
    headers: {
      'X-Custom-Auth-Key': apiKey
    }
  });

  return legacyResponse.status === 200;
}
