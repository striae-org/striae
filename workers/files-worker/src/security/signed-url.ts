import type { Env, SignedAccessPayload } from '../types';

const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;
const MAX_SIGNED_URL_TTL_SECONDS = 86400;

function base64UrlEncode(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Uint8Array | null {
  if (!input || /[^A-Za-z0-9_-]/.test(input)) {
    return null;
  }

  const paddingLength = (4 - (input.length % 4)) % 4;
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(paddingLength);

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
}

export function normalizeSignedUrlTtlSeconds(requestedTtlSeconds: unknown, env: Env): number {
  const defaultFromEnv = Number.parseInt(env.FILES_SIGNED_URL_TTL_SECONDS ?? '', 10);
  const fallbackTtl = Number.isFinite(defaultFromEnv) && defaultFromEnv > 0
    ? defaultFromEnv
    : DEFAULT_SIGNED_URL_TTL_SECONDS;
  const requested = typeof requestedTtlSeconds === 'number' ? requestedTtlSeconds : fallbackTtl;
  const normalized = Math.floor(requested);

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallbackTtl;
  }

  return Math.min(normalized, MAX_SIGNED_URL_TTL_SECONDS);
}

export function requireSignedUrlConfig(env: Env): void {
  const resolvedSecret = (env.FILES_SIGNED_URL_SECRET || '').trim();
  if (resolvedSecret.length === 0) {
    throw new Error('Signed URL configuration is missing');
  }
}

export function parseSignedUrlBaseUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error(`FILES_SIGNED_URL_BASE_URL is not a valid absolute URL: "${raw}"`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`FILES_SIGNED_URL_BASE_URL must use http or https, got: "${parsed.protocol}"`);
  }

  if (parsed.search || parsed.hash) {
    throw new Error(`FILES_SIGNED_URL_BASE_URL must not include a query string or fragment: "${raw}"`);
  }

  return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/g, '');
}

async function getSignedUrlHmacKey(env: Env): Promise<CryptoKey> {
  const resolvedSecret = (env.FILES_SIGNED_URL_SECRET || '').trim();
  const keyBytes = new TextEncoder().encode(resolvedSecret);

  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSignedAccessPayload(
  payload: SignedAccessPayload,
  env: Env
): Promise<string> {
  const payloadJson = JSON.stringify(payload);
  const payloadBase64Url = base64UrlEncode(new TextEncoder().encode(payloadJson));
  const hmacKey = await getSignedUrlHmacKey(env);
  const signature = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(payloadBase64Url));
  const signatureBase64Url = base64UrlEncode(signature);

  return `${payloadBase64Url}.${signatureBase64Url}`;
}

export async function verifySignedAccessToken(
  token: string,
  fileId: string,
  env: Env
): Promise<boolean> {
  const tokenParts = token.split('.');
  if (tokenParts.length !== 2) {
    return false;
  }

  const [payloadBase64Url, signatureBase64Url] = tokenParts;
  if (!payloadBase64Url || !signatureBase64Url) {
    return false;
  }

  const signatureBytes = base64UrlDecode(signatureBase64Url);
  if (!signatureBytes) {
    return false;
  }

  const signatureBuffer = new Uint8Array(signatureBytes).buffer;
  const hmacKey = await getSignedUrlHmacKey(env);
  const signatureValid = await crypto.subtle.verify(
    'HMAC',
    hmacKey,
    signatureBuffer,
    new TextEncoder().encode(payloadBase64Url)
  );
  if (!signatureValid) {
    return false;
  }

  const payloadBytes = base64UrlDecode(payloadBase64Url);
  if (!payloadBytes) {
    return false;
  }

  let payload: SignedAccessPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as SignedAccessPayload;
  } catch {
    return false;
  }

  if (payload.fileId !== fileId) {
    return false;
  }

  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(payload.exp) || payload.exp <= nowEpochSeconds) {
    return false;
  }

  if (!Number.isInteger(payload.iat) || payload.iat > nowEpochSeconds + 300) {
    return false;
  }

  return typeof payload.nonce === 'string' && payload.nonce.length > 0;
}