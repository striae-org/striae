interface Env {
  API_TOKEN: string;
  ACCOUNT_ID: string;
  HMAC_KEY: string;
}

interface CloudflareImagesResponse {
  success: boolean;
  errors?: Array<{
    code: number;
    message: string;
  }>;
  messages?: string[];
  result?: {
    id: string;
    filename: string;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
  };
}

interface ErrorResponse {
  error: string;
}

type APIResponse = CloudflareImagesResponse | ErrorResponse | string;

const API_BASE = "https://api.cloudflare.com/client/v4/accounts";

/**
 * CORS headers to allow requests from the Striae app
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

const createResponse = (data: APIResponse, status: number = 200): Response => new Response(
  typeof data === 'string' ? data : JSON.stringify(data), 
  { status, headers: corsHeaders }
);

const hasValidToken = (request: Request, env: Env): boolean => {
  const authHeader = request.headers.get("Authorization");
  const expectedToken = `Bearer ${env.API_TOKEN}`;
  return authHeader === expectedToken;
};

/**
 * Handle image upload requests
 */
async function handleImageUpload(request: Request, env: Env): Promise<Response> {
  if (!hasValidToken(request, env)) {
    return createResponse({ error: 'Unauthorized' }, 403);
  }

  const formData = await request.formData();
  const endpoint = `${API_BASE}/${env.ACCOUNT_ID}/images/v1`;

  // Add requireSignedURLs to form data
  formData.append('requireSignedURLs', 'true');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.API_TOKEN}`,
    },
    body: formData
  });
  
  const data: CloudflareImagesResponse = await response.json();
  return createResponse(data, response.status);
}

/**
 * Handle image delete requests
 */
async function handleImageDelete(request: Request, env: Env): Promise<Response> {
  if (!hasValidToken(request, env)) {
    return createResponse({ error: 'Unauthorized' }, 403);
  }

  const url = new URL(request.url);
  const imageId = url.pathname.split('/').pop();
  
  if (!imageId) {
    return createResponse({ error: 'Image ID is required' }, 400);
  }
  
  const endpoint = `${API_BASE}/${env.ACCOUNT_ID}/images/v1/${imageId}`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${env.API_TOKEN}`,
    }
  });
  
  const data: CloudflareImagesResponse = await response.json();
  return createResponse(data, response.status);
}

/**
 * Handle Signed URL generation
 */
const EXPIRATION = 60 * 60; // 1 hour

const bufferToHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');

async function generateSignedUrl(url: URL, env: Env): Promise<Response> {
  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(env.HMAC_KEY);
  const key = await crypto.subtle.importKey(
    'raw',
    secretKeyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Add expiration
  const expiry = Math.floor(Date.now() / 1000) + EXPIRATION;
  url.searchParams.set('exp', expiry.toString());

  const stringToSign = url.pathname + '?' + url.searchParams.toString();
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign));
  const sig = bufferToHex(mac);

  // Add signature
  url.searchParams.set('sig', sig);

  // Return the modified URL with signature and expiration
  return new Response(url.toString(), {
    headers: corsHeaders
  });
}

async function handleImageServing(request: Request, env: Env): Promise<Response> {
  if (!hasValidToken(request, env)) {
    return createResponse({ error: 'Unauthorized' }, 403);
  }

  const url = new URL(request.url);
  const pathWithoutSlash = url.pathname.slice(1);
  const imageDeliveryURL = new URL(
    pathWithoutSlash.replace('https:/imagedelivery.net', 'https://imagedelivery.net')
  );
  
  return generateSignedUrl(imageDeliveryURL, env);
}

/**
 * Main worker functions
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (request.method) {
        case 'POST':
          return handleImageUpload(request, env);
        case 'GET':
          return handleImageServing(request, env);
        case 'DELETE':
          return handleImageDelete(request, env);
        default:
          return createResponse({ error: 'Method not allowed' }, 405);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return createResponse({ error: errorMessage }, 500);
    }
  }
};