import { launch } from "@cloudflare/puppeteer";
import type { PDFGenerationData, PDFGenerationRequest, ReportModule } from './report-types';

interface Env {
  BROWSER: Fetcher;
}

const DEFAULT_REPORT_FORMAT = 'striae';

const reportModuleLoaders: Record<string, () => Promise<ReportModule>> = {
  // Default Striae report format module
  striae: () => import('./format-striae'),
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

    if (request.method === 'POST') {
      let browser: Awaited<ReturnType<typeof launch>> | undefined;

      try {
        const payload = await request.json() as PDFGenerationData | PDFGenerationRequest;
        const { reportFormat, data } = resolveReportRequest(payload);

        browser = await launch(env.BROWSER);
        const page = await browser.newPage();

        // Render report from module selected by report format name.
        const document = await renderReport(reportFormat, data);
        await page.setContent(document);

        const pdfBuffer = await page.pdf({
          printBackground: true,
          format: 'letter',
          margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
        });

        return new Response(new Uint8Array(pdfBuffer), {
          headers: {
            ...corsHeaders,
            'content-type': 'application/pdf',
          },
        });
      } catch (error) {
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
