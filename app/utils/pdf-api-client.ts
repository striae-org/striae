import type { User } from 'firebase/auth';
import paths from '~/config/config.json';
import { getPdfApiKey } from './auth';

const PDF_API_BASE = '/api/pdf';
const PDF_WORKER_URL = paths.pdf_worker_url;
const PROXY_FALLBACK_STATUSES = new Set([401, 403, 404, 405, 500, 502, 503, 504]);

function normalizePath(path: string): string {
  if (!path) {
    return '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

export async function fetchPdfApi(
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
        const proxyResponse = await fetch(`${PDF_API_BASE}${normalizedPath}`, {
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

  const apiKey = await getPdfApiKey();
  const legacyHeaders = new Headers(init.headers);
  legacyHeaders.delete('Authorization');
  legacyHeaders.set('X-Custom-Auth-Key', apiKey);

  return fetch(`${PDF_WORKER_URL}${normalizedPath}`, {
    ...init,
    headers: legacyHeaders
  });
}
