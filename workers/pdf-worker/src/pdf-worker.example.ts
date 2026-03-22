import type { PDFGenerationData, PDFGenerationRequest, ReportModule } from './report-types';

interface Env {
  BROWSER: Fetcher;
  PDF_WORKER_AUTH: string;
  ACCOUNT_ID: string;
  BROWSER_API_TOKEN: string;
}

const BROWSER_PDF_TIMEOUT_MS = 90_000;
const BROWSER_RENDERING_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

const DEFAULT_PDF_OPTIONS = {
  printBackground: true,
  format: 'letter',
  margin: {
    top: '0.5in',
    bottom: '0.5in',
    left: '0.5in',
    right: '0.5in',
  },
};

const reportModuleLoaders: Record<string, () => Promise<ReportModule>> = {
  // Default Striae report format module
  striae: () => import('./formats/format-striae'),
  // Additional formats can be added here
  primershear: () => import('./formats/format-primer-shear'),

};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
};

const hasValidHeader = (request: Request, env: Env): boolean =>
  request.headers.get('X-Custom-Auth-Key') === env.PDF_WORKER_AUTH;

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    /timed out/i.test(error.message)
  );
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

class MissingSecretError extends Error {
  readonly secretKey: string;

  constructor(key: string) {
    super(`Worker is missing required secret: ${key}`);
    this.name = 'MissingSecretError';
    this.secretKey = key;
  }
}

function getRequiredSecret(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new MissingSecretError(name);
  }

  return normalized;
}

function resolveReportRequest(payload: unknown): PDFGenerationRequest {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Request body must be a JSON object');
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.reportFormat !== 'string' || record.reportFormat.trim().length === 0) {
    throw new Error('Request body must include a non-empty reportFormat');
  }

  if (!record.data || typeof record.data !== 'object' || Array.isArray(record.data)) {
    throw new Error('Request body must include a data object');
  }

  const data = record.data as Record<string, unknown>;
  if (typeof data.currentDate !== 'string' || data.currentDate.trim().length === 0) {
    throw new Error('Request body data must include a non-empty currentDate');
  }

  return {
    reportFormat: record.reportFormat.trim().toLowerCase(),
    data: record.data as PDFGenerationData,
  };
}

async function renderReport(reportFormat: string, data: PDFGenerationData): Promise<string> {
  const loader = reportModuleLoaders[reportFormat];

  if (!loader) {
    const supportedFormats = Object.keys(reportModuleLoaders).sort().join(', ');
    throw new Error(`Unsupported report format "${reportFormat}". Supported formats: ${supportedFormats}`);
  }

  const reportModule = await loader();
  return reportModule.renderReport(data);
}

async function renderPdfViaRestEndpoint(env: Env, html: string): Promise<Response> {
  const accountId = getRequiredSecret(env.ACCOUNT_ID, 'ACCOUNT_ID');
  const browserApiToken = getRequiredSecret(env.BROWSER_API_TOKEN, 'BROWSER_API_TOKEN');

  const endpoint = `${BROWSER_RENDERING_API_BASE}/${accountId}/browser-rendering/pdf`;
  const requestBody = JSON.stringify({
    html,
    pdfOptions: DEFAULT_PDF_OPTIONS,
  });

  let endpointResponse: Response;

  try {
    endpointResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${browserApiToken}`,
        'Content-Type': 'application/json',
      },
      body: requestBody,
      signal: AbortSignal.timeout(BROWSER_PDF_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown browser endpoint error';
    return jsonResponse(
      {
        error: 'Unable to reach Browser Rendering endpoint',
        endpoint,
        message,
      },
      isTimeoutError(error) ? 504 : 502
    );
  }

  if (!endpointResponse.ok) {
    const failureText = await endpointResponse.text().catch(() => '');
    return jsonResponse(
      {
        error: 'Browser Rendering endpoint returned an error',
        endpoint,
        status: endpointResponse.status,
        details: failureText.slice(0, 512) || endpointResponse.statusText || 'Unknown endpoint failure',
      },
      endpointResponse.status === 504 ? 504 : 502
    );
  }

  const responseHeaders = new Headers(endpointResponse.headers);
  if (!responseHeaders.has('content-type')) {
    responseHeaders.set('content-type', 'application/pdf');
  }

  if (!responseHeaders.has('cache-control')) {
    responseHeaders.set('cache-control', 'no-store');
  }

  for (const [headerName, headerValue] of Object.entries(corsHeaders)) {
    responseHeaders.set(headerName, headerValue);
  }

  return new Response(endpointResponse.body, {
    status: endpointResponse.status,
    statusText: endpointResponse.statusText,
    headers: responseHeaders,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (!hasValidHeader(request, env)) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    if (request.method === 'POST') {
      try {
        const payload = await request.json() as unknown;
        const { reportFormat, data } = resolveReportRequest(payload);
        const document = await renderReport(reportFormat, data);

        return await renderPdfViaRestEndpoint(env, document);
      } catch (error) {
        if (error instanceof MissingSecretError) {
          console.error(`[pdf-worker] Configuration error: ${error.message}`);
          return jsonResponse(
            { error: 'Worker configuration error', missing_secret: error.secretKey },
            502
          );
        }

        if (isTimeoutError(error)) {
          const timeoutMessage = error instanceof Error ? error.message : 'PDF generation timed out';
          return jsonResponse({ error: timeoutMessage }, 504);
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return jsonResponse({ error: errorMessage }, 500);
      }
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  },
};
