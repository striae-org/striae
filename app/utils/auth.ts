import paths from '~/config/config.json';
import { auth } from '~/services/firebase';

const KEYS_URL = typeof paths.keys_url === 'string' ? paths.keys_url : '';
const KEYS_AUTH = typeof paths.keys_auth === 'string' ? paths.keys_auth : '';
const PAGES_KEYS_API_BASE = '/api/keys';

type KeyType = 'USER_DB_AUTH' | 'R2_KEY_SECRET' | 'IMAGES_API_TOKEN' | 'ACCOUNT_HASH' | 'PDF_WORKER_AUTH';

class ApiKeyRetrievalError extends Error {
  public readonly fallbackAllowed: boolean;

  constructor(message: string, fallbackAllowed: boolean) {
    super(message);
    this.name = 'ApiKeyRetrievalError';
    this.fallbackAllowed = fallbackAllowed;
  }
}

async function getApiKeyFromPagesFacade(keyType: KeyType): Promise<string> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new ApiKeyRetrievalError('No authenticated user available for key retrieval', true);
  }

  const idToken = await currentUser.getIdToken().catch(() => '');
  if (!idToken) {
    throw new ApiKeyRetrievalError('Failed to resolve Firebase ID token for key retrieval', true);
  }

  const keyResponse = await fetch(`${PAGES_KEYS_API_BASE}/${encodeURIComponent(keyType)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Accept': 'text/plain'
    }
  });

  if (!keyResponse.ok) {
    const fallbackAllowed = keyResponse.status === 404 || keyResponse.status >= 500;
    throw new ApiKeyRetrievalError(
      `Failed to retrieve ${keyType} from Pages Functions facade`,
      fallbackAllowed
    );
  }

  return keyResponse.text();
}

async function getApiKeyFromLegacyWorker(keyType: KeyType): Promise<string> {
  if (!KEYS_URL || !KEYS_AUTH) {
    throw new Error('Legacy keys worker configuration is unavailable');
  }

  const keyResponse = await fetch(`${KEYS_URL}/${keyType}`, {
    headers: {
      'X-Custom-Auth-Key': KEYS_AUTH
    }
  });

  if (!keyResponse.ok) {
    throw new Error(`Failed to retrieve ${keyType} from legacy keys worker`);
  }

  return keyResponse.text();
}

async function getApiKey(keyType: KeyType): Promise<string> {
  try {
    return await getApiKeyFromPagesFacade(keyType);
  } catch (error) {
    const fallbackAllowed = error instanceof ApiKeyRetrievalError ? error.fallbackAllowed : true;

    if (!fallbackAllowed) {
      throw error;
    }

    try {
      return await getApiKeyFromLegacyWorker(keyType);
    } catch (legacyError) {
      if (error instanceof Error && legacyError instanceof Error) {
        throw new Error(`${error.message}; legacy fallback failed: ${legacyError.message}`);
      }

      throw legacyError;
    }
  }
}

export async function getUserApiKey(): Promise<string> {
  return getApiKey('USER_DB_AUTH');
}

export async function getDataApiKey(): Promise<string> {
  return getApiKey('R2_KEY_SECRET');
}

export async function getImageApiKey(): Promise<string> {
  return getApiKey('IMAGES_API_TOKEN');
}

export async function getAccountHash(): Promise<string> {
  return getApiKey('ACCOUNT_HASH');
}

export async function getPdfApiKey(): Promise<string> {
  return getApiKey('PDF_WORKER_AUTH');
}