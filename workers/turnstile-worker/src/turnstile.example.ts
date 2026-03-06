/* Cloudflare Turnstile Worker
   Ensure you have your secret key stored as an environment variable for your worker */

interface Env {
  CFT_SECRET_KEY: string;
}

interface TurnstileRequest {
  'cf-turnstile-response': string;
}

interface TurnstileVerificationRequest {
  secret: string;
  response: string;
  remoteip: string;
}

interface TurnstileVerificationResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

interface APIResponse {
  success: boolean;
  error?: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN', // CHANGE THIS TO YOUR DOMAIN
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const createResponse = (body: APIResponse, status: number = 200): Response => 
  new Response(JSON.stringify(body), { 
    status, 
    headers: CORS_HEADERS 
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return createResponse({ success: false, error: 'Method Not Allowed' }, 405);
    }

    try {
      const { 'cf-turnstile-response': token }: TurnstileRequest = await request.json();
      const ip = request.headers.get('CF-Connecting-IP') || '';

      if (!token) {
        return createResponse({ success: false, error: 'Token missing' }, 400);
      }

      const verificationPayload: TurnstileVerificationRequest = {
        secret: env.CFT_SECRET_KEY,
        response: token,
        remoteip: ip,
      };

      const verificationResponse = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(verificationPayload),
        }
      );

      const outcome: TurnstileVerificationResponse = await verificationResponse.json();
      
      return createResponse(
        { success: outcome.success, error: outcome.success ? undefined : 'Verification failed' }, 
        outcome.success ? 200 : 400
      );

    } catch (error) {
      console.error('Error:', error);
      return createResponse({ success: false, error: 'Internal Server Error' }, 500);
    }
  }
};