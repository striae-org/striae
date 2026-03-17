import { launch } from "@cloudflare/puppeteer";
import type { PDFGenerationData, PDFGenerationRequest, ReportModule } from './report-types';

interface Env {
  BROWSER: Fetcher;
  PDF_WORKER_AUTH: string;
}

const DEFAULT_REPORT_FORMAT = 'striae';
const BROWSER_LAUNCH_TIMEOUT_MS = 25_000;
const PAGE_CONTENT_TIMEOUT_MS = 25_000;
const IMAGE_SETTLE_TIMEOUT_MS = 10_000;
const PDF_RENDER_TIMEOUT_MS = 45_000;

const reportModuleLoaders: Record<string, () => Promise<ReportModule>> = {
  // Default Striae report format module
  striae: () => import('./formats/format-striae'),
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

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function waitForImagesToSettle(page: { evaluate: <T>(pageFunction: () => Promise<T>) => Promise<T> }): Promise<void> {
  await withTimeout(
    page.evaluate(async () => {
      const images = Array.from(document.images);

      await Promise.all(images.map((image) => {
        if (image.complete) {
          return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      }));
    }),
    IMAGE_SETTLE_TIMEOUT_MS,
    'image settle'
  ).catch(() => {
    // Continue generating the report even if some image requests are slow.
  });
}

function normalizeReportFormat(format: unknown): string {
  if (typeof format !== 'string') {
    return DEFAULT_REPORT_FORMAT;
  }

  const normalized = format.trim().toLowerCase();
  return normalized || DEFAULT_REPORT_FORMAT;
}

function resolveReportRequest(payload: unknown): { reportFormat: string; data: PDFGenerationData } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const record = payload as Record<string, unknown>;
  const reportFormat = normalizeReportFormat(record.reportFormat);

  if (record.data && typeof record.data === 'object') {
    return {
      reportFormat,
      data: record.data as PDFGenerationData,
    };
  }

  // Backward compatibility: accept legacy top-level payload shape.
  const legacyData: Record<string, unknown> = { ...record };
  delete legacyData.reportFormat;
  delete legacyData.data;

  return {
    reportFormat,
    data: legacyData as PDFGenerationData,
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (!hasValidHeader(request, env)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    if (request.method === 'POST') {
      let browser: Awaited<ReturnType<typeof launch>> | undefined;

      try {
        const payload = await request.json() as PDFGenerationData | PDFGenerationRequest;
        const { reportFormat, data } = resolveReportRequest(payload);

        browser = await withTimeout(launch(env.BROWSER), BROWSER_LAUNCH_TIMEOUT_MS, 'browser launch');
        const page = await browser.newPage();

        // Render report from module selected by report format name.
        const document = await renderReport(reportFormat, data);
        await page.setContent(document, {
          waitUntil: 'domcontentloaded',
          timeout: PAGE_CONTENT_TIMEOUT_MS,
        });
        await waitForImagesToSettle(page);

        const pdfBuffer = await withTimeout(
          page.pdf({
            printBackground: true,
            format: 'letter',
            margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
          }),
          PDF_RENDER_TIMEOUT_MS,
          'PDF render'
        );

        return new Response(new Uint8Array(pdfBuffer), {
          headers: {
            ...corsHeaders,
            'content-type': 'application/pdf',
          },
        });
      } catch (error) {
        if (isTimeoutError(error)) {
          return new Response(JSON.stringify({ error: 'PDF generation timed out' }), {
            status: 504,
            headers: { ...corsHeaders, 'content-type': 'application/json' },
          });
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        });
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  },
};
