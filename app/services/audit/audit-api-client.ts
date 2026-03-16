import type { User } from 'firebase/auth';
import { auth } from '~/services/firebase';

const AUDIT_API_BASE = '/api/audit';

function normalizePath(path: string): string {
  if (!path) {
    return '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

export async function fetchAuditApi(path: string, init: RequestInit = {}): Promise<Response> {
  const normalizedPath = normalizePath(path);
  const currentUserWithOptionalToken = auth.currentUser as User & { getIdToken?: () => Promise<string> };

  if (!currentUserWithOptionalToken || typeof currentUserWithOptionalToken.getIdToken !== 'function') {
    throw new Error('Unable to authenticate audit request: missing Firebase token provider');
  }

  let idToken: string;
  try {
    idToken = await currentUserWithOptionalToken.getIdToken();
  } catch {
    throw new Error('Unable to authenticate audit request: failed to retrieve Firebase token');
  }

  if (!idToken) {
    throw new Error('Unable to authenticate audit request: empty Firebase token');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${idToken}`);

  return fetch(`${AUDIT_API_BASE}${normalizedPath}`, {
    ...init,
    headers
  });
}
