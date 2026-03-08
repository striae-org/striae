import type { ActionCodeSettings } from 'firebase/auth';
import paths from '~/config/config.json';

const AUTH_ROUTE_PATH = '/';
const DEFAULT_CONTINUE_PATH = '/';

const normalizedBaseUrl = paths.url.replace(/\/$/, '');
const appOrigin = new URL(normalizedBaseUrl).origin;

const normalizeContinuePath = (continuePath?: string): string => {
  if (!continuePath || continuePath.trim().length === 0) {
    return DEFAULT_CONTINUE_PATH;
  }

  if (!continuePath.startsWith('/') || continuePath.startsWith('//')) {
    return DEFAULT_CONTINUE_PATH;
  }

  return continuePath;
};

export const buildActionCodeSettings = (continuePath?: string): ActionCodeSettings => {
  const safeContinuePath = normalizeContinuePath(continuePath);

  return {
    url: `${normalizedBaseUrl}${safeContinuePath}`,
  };
};

export const getSafeContinuePath = (continueUrl: string | null | undefined): string => {
  if (!continueUrl || continueUrl.trim().length === 0) {
    return DEFAULT_CONTINUE_PATH;
  }

  try {
    const parsedUrl = new URL(continueUrl, appOrigin);
    if (parsedUrl.origin !== appOrigin) {
      return DEFAULT_CONTINUE_PATH;
    }

    const safePath = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    return safePath.startsWith('/') ? safePath : DEFAULT_CONTINUE_PATH;
  } catch {
    return DEFAULT_CONTINUE_PATH;
  }
};

export const getAuthActionRoutePath = (): string => AUTH_ROUTE_PATH;
