export function jsonResponse(status: number, body: unknown, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

export function textResponse(status: number, body: string, headers: HeadersInit = {}): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

export function methodNotAllowed(allowedMethods: string[]): Response {
  return jsonResponse(
    405,
    {
      success: false,
      error: 'Method not allowed'
    },
    {
      Allow: allowedMethods.join(', ')
    }
  );
}
