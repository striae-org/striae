import { authenticateFirebaseRequest } from '../_lib/firebase-auth';
import { jsonResponse, methodNotAllowed, textResponse } from '../_lib/http';

const API_PREFIX = '/api/image';
const DEFAULT_IMAGE_VARIANT = 'striae';
const SIGNED_URL_EXPIRATION_SECONDS = 60 * 60;
const SAFE_VARIANT_PATTERN = /^[A-Za-z0-9_-]+$/;

function resolveWorkerBaseUrl(domain: string): string {
  const trimmedDomain = domain.trim();
  if (trimmedDomain.length === 0) {
    throw new Error('Image worker domain is not configured');
  }

  const withProtocol = /^https?:\/\//i.test(trimmedDomain)
    ? trimmedDomain
    : `https://${trimmedDomain}`;

  return withProtocol.replace(/\/+$/, '');
}

function getPathSuffix(pathname: string): string {
  if (!pathname.startsWith(API_PREFIX)) {
    return '/';
  }

  const suffix = pathname.slice(API_PREFIX.length);
  return suffix.length > 0 ? suffix : '/';
}

function getImageWorkerAuth(env: Env): string {
  const imageWorkerAuth = typeof env.API_TOKEN === 'string' ? env.API_TOKEN.trim() : '';
  if (!imageWorkerAuth) {
    throw new Error('Image worker auth is not configured');
  }

  return imageWorkerAuth;
}

function getImageDeliveryAccountHash(env: Env): string {
  const accountHash = typeof env.ACCOUNT_HASH === 'string' ? env.ACCOUNT_HASH.trim() : '';
  if (!accountHash) {
    throw new Error('Image delivery account hash is not configured');
  }

  return accountHash;
}

function getImageDeliveryHmacKey(env: Env): string {
  const hmacKey = typeof env.HMAC_KEY === 'string' ? env.HMAC_KEY.trim() : '';
  if (!hmacKey) {
    throw new Error('Image signing key is not configured');
  }

  return hmacKey;
}

function normalizeVariant(rawVariant: string | null): string | null {
  const candidate = rawVariant?.trim() || DEFAULT_IMAGE_VARIANT;
  if (!SAFE_VARIANT_PATTERN.test(candidate)) {
    return null;
  }

  return candidate;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function createSignedImageUrl(
  imageId: string,
  variant: string,
  accountHash: string,
  hmacKey: string
): Promise<string> {
  const deliveryUrl = new URL(
    `https://imagedelivery.net/${accountHash}/${encodeURIComponent(imageId)}/${variant}`
  );
  const expirationTimestamp = Math.floor(Date.now() / 1000) + SIGNED_URL_EXPIRATION_SECONDS;
  deliveryUrl.searchParams.set('exp', expirationTimestamp.toString());

  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(hmacKey);
  const importedKey = await crypto.subtle.importKey(
    'raw',
    secretKeyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const stringToSign = `${deliveryUrl.pathname}?${deliveryUrl.searchParams.toString()}`;
  const signedBuffer = await crypto.subtle.sign('HMAC', importedKey, encoder.encode(stringToSign));
  deliveryUrl.searchParams.set('sig', bufferToHex(signedBuffer));

  return deliveryUrl.toString();
}

async function proxyImageUpload(request: Request, env: Env): Promise<Response> {
  const imageWorkerAuth = getImageWorkerAuth(env);
  const workerBaseUrl = resolveWorkerBaseUrl(env.IMAGES_WORKER_DOMAIN);

  const proxyHeaders = new Headers();
  proxyHeaders.set('Authorization', `Bearer ${imageWorkerAuth}`);

  const contentType = request.headers.get('Content-Type');
  if (contentType) {
    proxyHeaders.set('Content-Type', contentType);
  }

  const acceptHeader = request.headers.get('Accept');
  if (acceptHeader) {
    proxyHeaders.set('Accept', acceptHeader);
  }

  const workerResponse = await fetch(`${workerBaseUrl}/`, {
    method: 'POST',
    headers: proxyHeaders,
    body: request.body
  });

  return new Response(workerResponse.body, {
    status: workerResponse.status,
    headers: workerResponse.headers
  });
}

async function proxyImageDelete(request: Request, env: Env, imageId: string): Promise<Response> {
  const imageWorkerAuth = getImageWorkerAuth(env);
  const workerBaseUrl = resolveWorkerBaseUrl(env.IMAGES_WORKER_DOMAIN);

  const proxyHeaders = new Headers();
  proxyHeaders.set('Authorization', `Bearer ${imageWorkerAuth}`);

  const acceptHeader = request.headers.get('Accept');
  if (acceptHeader) {
    proxyHeaders.set('Accept', acceptHeader);
  }

  const workerResponse = await fetch(`${workerBaseUrl}/${encodeURIComponent(imageId)}`, {
    method: 'DELETE',
    headers: proxyHeaders
  });

  return new Response(workerResponse.body, {
    status: workerResponse.status,
    headers: workerResponse.headers
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'GET, POST, DELETE, OPTIONS',
        'Cache-Control': 'no-store'
      }
    });
  }

  if (!['GET', 'POST', 'DELETE'].includes(request.method)) {
    return methodNotAllowed(['GET', 'POST', 'DELETE', 'OPTIONS']);
  }

  const authenticatedUser = await authenticateFirebaseRequest(request, env);
  if (!authenticatedUser) {
    return jsonResponse(401, {
      success: false,
      error: 'Unauthorized'
    });
  }

  const requestUrl = new URL(request.url);
  const pathSuffix = getPathSuffix(requestUrl.pathname);
  const pathSegments = pathSuffix.split('/').filter(Boolean);

  if (request.method === 'POST') {
    if (pathSegments.length !== 1 || pathSegments[0] !== 'upload') {
      return jsonResponse(404, {
        success: false,
        error: 'Unknown image upload endpoint'
      });
    }

    try {
      return await proxyImageUpload(request, env);
    } catch (error) {
      return jsonResponse(503, {
        success: false,
        error: error instanceof Error ? error.message : 'Image upload routing failed'
      });
    }
  }

  if (request.method === 'DELETE') {
    if (pathSegments.length !== 1) {
      return jsonResponse(400, {
        success: false,
        error: 'Image identifier is required'
      });
    }

    const [imageId] = pathSegments;
    if (!imageId) {
      return jsonResponse(400, {
        success: false,
        error: 'Image identifier is required'
      });
    }

    try {
      return await proxyImageDelete(request, env, imageId);
    } catch (error) {
      return jsonResponse(503, {
        success: false,
        error: error instanceof Error ? error.message : 'Image deletion routing failed'
      });
    }
  }

  if (pathSegments.length !== 1 || pathSegments[0] !== 'signed-url') {
    return jsonResponse(404, {
      success: false,
      error: 'Unknown image endpoint'
    });
  }

  const imageId = requestUrl.searchParams.get('imageId')?.trim() || '';
  if (!imageId) {
    return jsonResponse(400, {
      success: false,
      error: 'imageId query parameter is required'
    });
  }

  const variant = normalizeVariant(requestUrl.searchParams.get('variant'));
  if (!variant) {
    return jsonResponse(400, {
      success: false,
      error: 'Invalid image variant requested'
    });
  }

  try {
    const accountHash = getImageDeliveryAccountHash(env);
    const hmacKey = getImageDeliveryHmacKey(env);
    const signedUrl = await createSignedImageUrl(imageId, variant, accountHash, hmacKey);

    return textResponse(200, signedUrl);
  } catch (error) {
    return jsonResponse(503, {
      success: false,
      error: error instanceof Error ? error.message : 'Image signing service is unavailable'
    });
  }
};
