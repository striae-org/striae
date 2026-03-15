interface FirebaseLookupUser {
  localId?: string;
  email?: string;
  emailVerified?: boolean;
}

interface FirebaseLookupResponse {
  users?: FirebaseLookupUser[];
}

export interface VerifiedFirebaseIdentity {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

const FIREBASE_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

function extractBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.get('Authorization');
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  const normalizedToken = token.trim();
  return normalizedToken.length > 0 ? normalizedToken : null;
}

export async function verifyFirebaseIdentityFromRequest(
  request: Request,
  env: Env
): Promise<VerifiedFirebaseIdentity | null> {
  const idToken = extractBearerToken(request);
  if (!idToken) {
    return null;
  }

  const lookupUrl = `${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(env.API_KEY)}`;

  let lookupResponse: Response;
  try {
    lookupResponse = await fetch(lookupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idToken })
    });
  } catch {
    return null;
  }

  if (!lookupResponse.ok) {
    return null;
  }

  const payload = await lookupResponse.json().catch(() => null) as FirebaseLookupResponse | null;
  const user = payload?.users?.[0];

  if (!user || typeof user.localId !== 'string' || user.localId.trim().length === 0) {
    return null;
  }

  return {
    uid: user.localId,
    email: typeof user.email === 'string' ? user.email : null,
    emailVerified: user.emailVerified === true
  };
}
