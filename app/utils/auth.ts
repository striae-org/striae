import paths from '~/config/config.json';

const KEYS_URL = paths.keys_url;
const KEYS_AUTH = paths.keys_auth;

type KeyType = 'USER_DB_AUTH' | 'R2_KEY_SECRET' | 'IMAGES_API_TOKEN' | 'ACCOUNT_HASH' | 'INFINITY_ADMIN_TOKEN';

async function getApiKey(keyType: KeyType): Promise<string> {
  const keyResponse = await fetch(`${KEYS_URL}/${keyType}`, {
    headers: {
      'X-Custom-Auth-Key': KEYS_AUTH
    }
  });
  if (!keyResponse.ok) {
    throw new Error(`Failed to retrieve ${keyType}`);
  }
  return keyResponse.text();
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

export async function getAdminApiToken(): Promise<string> {
  return getApiKey('INFINITY_ADMIN_TOKEN');
}