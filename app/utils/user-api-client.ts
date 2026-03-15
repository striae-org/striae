import type { User } from 'firebase/auth';
import paths from '~/config/config.json';
import { getUserApiKey } from './auth';

const USER_API_BASE = '/api/user';
const USER_WORKER_URL = paths.user_worker_url;

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

  const headers = new Headers(init.headers);
  const idToken = await user.getIdToken();
  headers.set('Authorization', `Bearer ${idToken}`);

  try {
    const proxyResponse = await fetch(`${USER_API_BASE}${normalizedPath}`, {
      ...init,
      headers
    });

    if (proxyResponse.status !== 404 && proxyResponse.status !== 405) {
      return proxyResponse;
    }
  } catch {
    // Temporary fallback while the proxy route rolls out through all environments.
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
