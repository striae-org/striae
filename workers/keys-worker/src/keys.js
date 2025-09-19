/**
 * @typedef {Object} Env
 * @property {string} R2_KEY_SECRET
 * @property {string} ACCOUNT_HASH
 * @property {string} IMAGES_API_TOKEN
 * @property {string} USER_DB_AUTH
 * @property {string} KEYS_AUTH 
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://dev.striae.org',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'text/plain'
};

const hasValidHeader = (request, env) => 
  request.headers.get("X-Custom-Auth-Key") === env.KEYS_AUTH;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (!hasValidHeader(request, env)) {
      return new Response('Forbidden', { 
        status: 403,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace('/', '');
    
    // Handle regular key retrieval
    if (request.method === 'GET') {
      const keyName = path;
      
      if (!keyName) {
        return new Response('Key name required', { 
          status: 400,
          headers: corsHeaders 
        });
      }

      if (!(keyName in env)) {
        return new Response('Key not found', { 
          status: 404,
          headers: corsHeaders 
        });
      }

      return new Response(env[keyName], {
        headers: corsHeaders
      });
    }

    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }
};