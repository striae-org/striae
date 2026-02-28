interface Env {
  R2_KEY_SECRET: string;
  STRIAE_DATA: R2Bucket;
}

interface SuccessResponse {
  success: boolean;
}

interface ErrorResponse {
  error: string;
}

type APIResponse = SuccessResponse | ErrorResponse | any[] | Record<string, any>;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

const createResponse = (data: APIResponse, status: number = 200): Response => new Response(
  JSON.stringify(data), 
  { status, headers: corsHeaders }
);

const hasValidHeader = (request: Request, env: Env): boolean => 
  request.headers.get("X-Custom-Auth-Key") === env.R2_KEY_SECRET;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {       
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    if (!hasValidHeader(request, env)) {
      return createResponse({ error: 'Forbidden' }, 403);
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const bucket = env.STRIAE_DATA;

      // Handle regular file operations
      const filename = pathname.slice(1) || 'data.json';
      
      if (!filename.endsWith('.json')) {
        return createResponse({ error: 'Invalid file type. Only JSON files are allowed.' }, 400);
      }
      
      switch (request.method) {
        case "GET": {
          const file = await bucket.get(filename);
          if (!file) {
            return createResponse([], 200);
          }
          const fileText = await file.text();
          const data = JSON.parse(fileText);
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return createResponse({ error: errorMessage }, 500);
    }
  }
};