type FirebaseLookupResponse = {
  users?: Array<{
    localId?: string;
    email?: string;
    emailVerified?: boolean;
  }>;
  error?: {
    message?: string;
  };
};

export type AuthenticatedFirebaseUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
};

const FIREBASE_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';
const AUTHORIZATION_PREFIX = 'Bearer ';

type FirebaseAuthEnv = {
  API_KEY: string;
};

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith(AUTHORIZATION_PREFIX)) {
    return null;
  }

  const token = authHeader.slice(AUTHORIZATION_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

async function lookupFirebaseUser(idToken: string, apiKey: string): Promise<AuthenticatedFirebaseUser | null> {
  const response = await fetch(`${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ idToken })
  });

  if (!response.ok) {
    return null;
  }

  const responseData = await response.json().catch(() => null) as FirebaseLookupResponse | null;
  const user = responseData?.users?.[0];

  if (!user?.localId) {
    return null;
  }

  return {
    uid: user.localId,
    email: typeof user.email === 'string' ? user.email : null,
    emailVerified: user.emailVerified === true
  };
}

export async function authenticateFirebaseRequest(
  request: Request,
  env: FirebaseAuthEnv
): Promise<AuthenticatedFirebaseUser | null> {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return null;
  }

  if (!env.API_KEY || env.API_KEY.trim().length === 0) {
    console.error('Firebase API key is not configured for API authentication.');
    return null;
  }

  try {
    return await lookupFirebaseUser(idToken, env.API_KEY);
  } catch (error) {
    console.error('Failed to verify Firebase token for API request:', error);
    return null;
  }
}
