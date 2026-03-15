import type { User } from 'firebase/auth';
import paths from '~/config/config.json';
import { getImageApiKey } from './auth';
import { type ImageUploadResponse } from '~/types';

const IMAGE_API_BASE = '/api/image';
const IMAGE_WORKER_URL = paths.image_worker_url;
const PROXY_FALLBACK_STATUSES = new Set([401, 403, 404, 405, 500, 502, 503, 504]);

function normalizePath(path: string): string {
  if (!path) {
    return '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

export async function fetchImageApi(
  user: User,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const normalizedPath = normalizePath(path);
  const userWithOptionalToken = user as User & { getIdToken?: () => Promise<string> };

  if (typeof userWithOptionalToken.getIdToken === 'function') {
    let idToken: string | null = null;

    try {
      idToken = await userWithOptionalToken.getIdToken();
    } catch {
      idToken = null;
    }

    if (idToken) {
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${idToken}`);

      try {
        const proxyResponse = await fetch(`${IMAGE_API_BASE}${normalizedPath}`, {
          ...init,
          headers
        });

        if (!PROXY_FALLBACK_STATUSES.has(proxyResponse.status)) {
          return proxyResponse;
        }
      } catch {
        // Temporary fallback while the proxy route rolls out through all environments.
      }
    }
  }

  const apiKey = await getImageApiKey();
  const legacyHeaders = new Headers(init.headers);
  legacyHeaders.delete('Authorization');
  legacyHeaders.set('Authorization', `Bearer ${apiKey}`);

  return fetch(`${IMAGE_WORKER_URL}${normalizedPath}`, {
    ...init,
    headers: legacyHeaders
  });
}

interface XhrUploadResult {
  status: number;
  responseText: string;
}

function uploadWithXhr(
  targetUrl: string,
  authorizationValue: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<XhrUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      resolve({
        status: xhr.status,
        responseText: xhr.responseText
      });
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', targetUrl);
    xhr.setRequestHeader('Authorization', authorizationValue);
    xhr.send(formData);
  });
}

function parseUploadResponse(payload: string): ImageUploadResponse {
  const parsed = JSON.parse(payload) as ImageUploadResponse;
  if (!parsed.success || !parsed.result?.id) {
    const errorMessage = parsed.errors?.map((entry) => entry.message).join(', ') || 'Upload failed';
    throw new Error(errorMessage);
  }

  return parsed;
}

export async function uploadImageApi(
  user: User,
  file: File,
  onProgress?: (progress: number) => void
): Promise<ImageUploadResponse> {
  const userWithOptionalToken = user as User & { getIdToken?: () => Promise<string> };

  if (typeof userWithOptionalToken.getIdToken === 'function') {
    let idToken: string | null = null;

    try {
      idToken = await userWithOptionalToken.getIdToken();
    } catch {
      idToken = null;
    }

    if (idToken) {
      try {
        const proxyUploadResult = await uploadWithXhr(
          `${IMAGE_API_BASE}/`,
          `Bearer ${idToken}`,
          file,
          onProgress
        );

        if (!PROXY_FALLBACK_STATUSES.has(proxyUploadResult.status)) {
          if (proxyUploadResult.status >= 200 && proxyUploadResult.status < 300) {
            return parseUploadResponse(proxyUploadResult.responseText);
          }

          throw new Error(`Upload failed with status ${proxyUploadResult.status}`);
        }
      } catch {
        // Temporary fallback while the proxy route rolls out through all environments.
      }
    }
  }

  const apiKey = await getImageApiKey();
  const legacyUploadResult = await uploadWithXhr(
    `${IMAGE_WORKER_URL}/`,
    `Bearer ${apiKey}`,
    file,
    onProgress
  );

  if (legacyUploadResult.status < 200 || legacyUploadResult.status >= 300) {
    throw new Error(`Upload failed with status ${legacyUploadResult.status}`);
  }

  return parseUploadResponse(legacyUploadResult.responseText);
}
