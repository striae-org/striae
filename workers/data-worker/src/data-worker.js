const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://dev.striae.org',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

const createResponse = (data, status = 200) => new Response(
  JSON.stringify(data), 
  { status, headers: corsHeaders }
);

const hasValidHeader = (request, env) => 
  request.headers.get("X-Custom-Auth-Key") === env.R2_KEY_SECRET;

export default {
  async fetch(request, env) {       
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    if (!hasValidHeader(request, env)) {
      return createResponse({ error: 'Forbidden' }, 403);
    }

    try {
      const url = new URL(request.url);
      const filename = url.pathname.slice(1) || 'data.json';
      
      if (!filename.endsWith('.json')) {
        return createResponse({ error: 'Invalid file type. Only JSON files are allowed.' }, 400);
      }

      const bucket = env.STRIAE_DATA;
      
      switch (request.method) {
        case "GET": {
          const file = await bucket.get(filename);
          if (!file) {
            return createResponse([], 200);
          }
          const data = JSON.parse(await file.text());
          return createResponse(data);
        }

        case "PUT": {
          const newData = await request.json();
          await bucket.put(filename, JSON.stringify(newData)); // Replace instead of push
          return createResponse({ success: true });
        }

        case "DELETE": {
          const file = await bucket.get(filename);
          if (!file) {
            return createResponse({ error: 'File not found' }, 404);
          }
          await bucket.delete(filename);
          return createResponse({ success: true });
        }

        default:
          return createResponse({ error: 'Method not allowed' }, 405);
      }
    } catch (error) {
      console.error('Worker error:', error);
      return createResponse({ error: error.message }, 500);
    }
  }
};