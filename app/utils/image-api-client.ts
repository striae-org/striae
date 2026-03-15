import type { User } from 'firebase/auth';
import { type ImageUploadResponse } from '~/types';

const IMAGE_API_BASE = '/api/image';

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

  return fetch(`${IMAGE_API_BASE}${normalizedPath}`, {
    ...init,
    headers
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

  if (typeof userWithOptionalToken.getIdToken !== 'function') {
    throw new Error('Unable to authenticate upload: missing Firebase token provider');
  }

  let idToken: string;
  try {
    idToken = await userWithOptionalToken.getIdToken();
  } catch {
    throw new Error('Unable to authenticate upload: failed to retrieve Firebase token');
  }

  if (!idToken) {
    throw new Error('Unable to authenticate upload: empty Firebase token');
  }

  const proxyUploadResult = await uploadWithXhr(
    `${IMAGE_API_BASE}/`,
    `Bearer ${idToken}`,
    file,
    onProgress
  );

  if (proxyUploadResult.status < 200 || proxyUploadResult.status >= 300) {
    throw new Error(`Upload failed with status ${proxyUploadResult.status}`);
  }

  return parseUploadResponse(proxyUploadResult.responseText);
}
