const API_BASE = "https://api.cloudflare.com/client/v4/accounts";

/**
 * CORS headers to allow requests from the Striae app
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

const createResponse = (data, status = 200) => new Response(
  typeof data === 'string' ? data : JSON.stringify(data), 
  { status, headers: corsHeaders }
);

const hasValidToken = (request, env) => {
  const authHeader = request.headers.get("Authorization");
  const expectedToken = `Bearer ${env.API_TOKEN}`;
  console.log('Auth check:', {
    received: authHeader ? '[REDACTED]' : 'None',
    match: authHeader === expectedToken
  });
  return authHeader === expectedToken;
};

/**
 * Handle image upload requests
 */
async function handleImageUpload(request, env) {
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
  const data = await response.json();
  return createResponse(data, response.status);
}

/**
 * Handle image delete requests
 */

async function handleImageDelete(request, env) {
  if (!hasValidToken(request, env)) {
    return createResponse({ error: 'Unauthorized' }, 403);
  }

  const url = new URL(request.url);
  const imageId = url.pathname.split('/').pop();
  const endpoint = `${API_BASE}/${env.ACCOUNT_ID}/images/v1/${imageId}`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${env.API_TOKEN}`,
    }
  });
  const data = await response.json();
  return createResponse(data, response.status);
}

/**
 * Handle Signed URL generation
 */

const EXPIRATION = 60 * 60; // 1 hour

const bufferToHex = buffer =>
  [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');

async function generateSignedUrl(url, env) {
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
  url.searchParams.set('exp', expiry);

  const stringToSign = url.pathname + '?' + url.searchParams.toString();
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign));
  const sig = bufferToHex(new Uint8Array(mac).buffer);

  // Add signature
  url.searchParams.set('sig', sig);

  // Return the modified URL with signature and expiration
  return new Response(url.toString(), {
    headers: corsHeaders
  });
}

async function handleImageServing(request, env) {
  if (!hasValidToken(request, env)) {
    return createResponse({ error: 'Unauthorized' }, 403);
  }

  const url = new URL(request.url);
  const imageDeliveryURL = new URL(
    url.pathname.slice(1).replace('https:/imagedelivery.net', 'https://imagedelivery.net')
  );
  return generateSignedUrl(imageDeliveryURL, env);
}

/**
 * Main worker functions
 */

export default {
  async fetch(request, env) {
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
      return createResponse({ error: error.message }, 500);
    }
  }
};

