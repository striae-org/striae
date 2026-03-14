import { authenticateFirebaseRequest } from '../_lib/firebase-auth';
import { jsonResponse, methodNotAllowed, textResponse } from '../_lib/http';

type KeyType = 'USER_DB_AUTH' | 'R2_KEY_SECRET' | 'IMAGES_API_TOKEN' | 'ACCOUNT_HASH' | 'PDF_WORKER_AUTH';

type KeysFacadeEnv = Env & {
  PDF_WORKER_AUTH?: string;
};

const KEY_TYPE_TO_ENV: Record<KeyType, keyof KeysFacadeEnv> = {
  USER_DB_AUTH: 'USER_DB_AUTH',
  R2_KEY_SECRET: 'R2_KEY_SECRET',
  IMAGES_API_TOKEN: 'IMAGES_API_TOKEN',
  ACCOUNT_HASH: 'ACCOUNT_HASH',
  PDF_WORKER_AUTH: 'PDF_WORKER_AUTH'
};

function parseKeyType(value: string | undefined): KeyType | null {
  if (!value) {
    return null;
  }

  if (value in KEY_TYPE_TO_ENV) {
    return value as KeyType;
  }

  return null;
}

export const onRequest: PagesFunction<Env, 'keyType'> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'GET, OPTIONS',
        'Cache-Control': 'no-store'
      }
    });
  }

  if (request.method !== 'GET') {
    return methodNotAllowed(['GET', 'OPTIONS']);
  }

  const authenticatedUser = await authenticateFirebaseRequest(request, env);
  if (!authenticatedUser) {
    return jsonResponse(401, {
      success: false,
      error: 'Unauthorized'
    });
  }

  const keyTypeParam = Array.isArray(params.keyType) ? params.keyType[0] : params.keyType;
  const keyType = parseKeyType(keyTypeParam);
  if (!keyType) {
    return jsonResponse(400, {
      success: false,
      error: 'Invalid key type requested'
    });
  }

  const envKey = KEY_TYPE_TO_ENV[keyType];
  const keyValue = (env as KeysFacadeEnv)[envKey];

  if (typeof keyValue !== 'string' || keyValue.trim().length === 0) {
    return jsonResponse(503, {
      success: false,
      error: 'Requested key is unavailable'
    });
  }

  return textResponse(200, keyValue);
};
