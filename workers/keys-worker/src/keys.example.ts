interface Env {
  R2_KEY_SECRET: string;
  ACCOUNT_HASH: string;
  IMAGES_API_TOKEN: string;
  USER_DB_AUTH: string;
  KEYS_AUTH: string;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'text/plain'
};

const hasValidHeader = (request: Request, env: Env): boolean => 
  request.headers.get("X-Custom-Auth-Key") === env.KEYS_AUTH;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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

      // Type assertion needed here since TypeScript doesn't know that keyName exists in env
      const keyValue = env[keyName as keyof Env];
      
      return new Response(keyValue, {
        headers: corsHeaders
      });
    }

    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }
};