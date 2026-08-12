import type { User } from 'firebase/auth';
import { type FileUploadResponse, type SignedFileUrlResponse } from '~/types';

const FILES_API_BASE = '/api/files';

function normalizePath(path: string): string {
  if (!path) {
    return '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

export async function fetchFilesApi(
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

  return fetch(`${FILES_API_BASE}${normalizedPath}`, {
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

function parseUploadResponse(payload: string): FileUploadResponse {
  const parsed = JSON.parse(payload) as FileUploadResponse;
  if (!parsed.success || !parsed.result?.id) {
    const errorMessage = parsed.errors?.map((entry) => entry.message).join(', ') || 'Upload failed';
    throw new Error(errorMessage);
  }

  return parsed;
}

function parseSignedUrlResponse(payload: string): SignedFileUrlResponse {
  const parsed = JSON.parse(payload) as SignedFileUrlResponse;
  if (!parsed.success || !parsed.result?.url || !parsed.result?.fileId || !parsed.result?.expiresAt) {
    throw new Error('Signed URL response is invalid');
  }

  return parsed;
}

export async function createSignedFileUrlApi(
  user: User,
  fileId: string,
  expiresInSeconds?: number
): Promise<SignedFileUrlResponse> {
  const response = await fetchFilesApi(user, `/${encodeURIComponent(fileId)}/signed-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(
      typeof expiresInSeconds === 'number'
        ? { expiresInSeconds }
        : {}
    )
  });

  if (!response.ok) {
    throw new Error(`Signed URL request failed with status ${response.status}`);
  }

  const parsed = parseSignedUrlResponse(await response.text());
  const rawUrl = parsed.result.url;
  let normalizedUrl = rawUrl;

  if (rawUrl.startsWith('/')) {
    normalizedUrl = new URL(rawUrl, window.location.origin).toString();
  }

  return {
    ...parsed,
    result: {
      ...parsed.result,
      url: normalizedUrl
    }
  };
}

export async function uploadOtherFileApi(
  user: User,
  file: File,
  onProgress?: (progress: number) => void
): Promise<FileUploadResponse> {
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
    `${FILES_API_BASE}/`,
    `Bearer ${idToken}`,
    file,
    onProgress
  );

  if (proxyUploadResult.status < 200 || proxyUploadResult.status >= 300) {
    throw new Error(`Upload failed with status ${proxyUploadResult.status}`);
  }

  return parseUploadResponse(proxyUploadResult.responseText);
}
