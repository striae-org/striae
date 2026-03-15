import type { User } from 'firebase/auth';

const PDF_API_BASE = '/api/pdf';

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

  if (typeof userWithOptionalToken.getIdToken !== 'function') {
    throw new Error('Unable to authenticate request: missing Firebase token provider');
  }

  let idToken: string;
  try {
    idToken = await userWithOptionalToken.getIdToken();
  } catch {
    throw new Error('Unable to authenticate request: failed to retrieve Firebase token');
  }

  if (!idToken) {
    throw new Error('Unable to authenticate request: empty Firebase token');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${idToken}`);

  return fetch(`${PDF_API_BASE}${normalizedPath}`, {
    ...init,
    headers
  });
}
