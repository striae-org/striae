import paths from '~/config/config.json';

const ACCOUNT_HASH = typeof paths.account_hash === 'string' ? paths.account_hash.trim() : '';

export async function getAccountHash(): Promise<string> {
  if (!ACCOUNT_HASH) {
    throw new Error('ACCOUNT_HASH is not configured in app/config/config.json');
  }

  return ACCOUNT_HASH;
}