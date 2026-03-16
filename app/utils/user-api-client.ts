import type { User } from 'firebase/auth';

const USER_API_BASE = '/api/user';
const USER_EXISTS_API_BASE = '/api/user/exists';

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

  return fetch(`${USER_API_BASE}${normalizedPath}`, {
    ...init,
    headers
  });
}

export async function checkUserExistsApi(user: User, targetUid: string): Promise<boolean> {
  const encodedTargetUid = encodeURIComponent(targetUid);
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

  const proxyResponse = await fetch(`${USER_EXISTS_API_BASE}/${encodedTargetUid}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Accept': 'application/json'
    }
  });

  if (proxyResponse.status === 404) {
    return false;
  }

  if (!proxyResponse.ok) {
    throw new Error(`Failed to verify user existence: ${proxyResponse.status}`);
  }

  const responseData = await proxyResponse.json().catch(() => null) as {
    exists?: boolean;
  } | null;

  if (typeof responseData?.exists === 'boolean') {
    return responseData.exists;
  }

  return true;
}
