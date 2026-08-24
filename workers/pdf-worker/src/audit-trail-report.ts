// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import type { AuditTrailReportPayload, PDFGenerationData, ReportPdfOptions } from './report-types';
import { buildRepeatedChromePdfOptions, escapeHtml } from './report-layout';

const safeText = (value: unknown): string => escapeHtml(String(value ?? ''));

const formatTimestamp = (timestamp: string, timezone?: string): string => {
	const parsed = new Date(timestamp);
	if (Number.isNaN(parsed.getTime())) {
		return timestamp;
	}

	if (!timezone) {
		return parsed.toISOString();
	}

	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			month: '2-digit',
			day: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
			timeZoneName: 'short',
		}).formatToParts(parsed);

		const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
		return `${get('month')}/${get('day')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')} ${get('timeZoneName')}`;
	} catch {
		return parsed.toISOString();
	}
};

const renderEntryDetailsSummary = (entry: Record<string, unknown>): string => {
	const details = (entry.details ?? {}) as Record<string, unknown>;
	const caseNumber = typeof details.caseNumber === 'string' ? details.caseNumber : '';
	const workflowPhase = typeof details.workflowPhase === 'string' ? details.workflowPhase : '';
	const fileName = typeof details.fileName === 'string' ? details.fileName : '';

	const summaryRows = [
		caseNumber ? `<div><strong>Case:</strong> ${safeText(caseNumber)}</div>` : '',
		workflowPhase ? `<div><strong>Phase:</strong> ${safeText(workflowPhase)}</div>` : '',
		fileName ? `<div><strong>File:</strong> ${safeText(fileName)}</div>` : '',
	].filter(Boolean);

	if (summaryRows.length === 0) {
		return '<div class="entry-meta-muted">No structured summary fields available.</div>';
	}

	return summaryRows.join('');
};

const renderRawJsonAppendix = (entry: unknown): string => {
	if (entry === null || entry === undefined) {
		return '';
	}

	let rawJson: string;
	try {
		rawJson = JSON.stringify(entry, null, 2) ?? '';
	} catch {
		return '';
	}

	if (!rawJson) {
		return '';
	}

	return `
    <div class="entry-raw-json">
      <div class="entry-raw-label">Raw JSON Entry</div>
      <pre>${escapeHtml(rawJson)}</pre>
    </div>
  `;
};

export const isAuditTrailReportMode = (data: PDFGenerationData): boolean => data.reportMode === 'audit-trail';

export const getAuditTrailPayload = (data: PDFGenerationData): AuditTrailReportPayload => {
	const payload = data.auditTrailReport;

	if (!payload) {
		throw new Error('Audit trail report payload is required when reportMode is audit-trail');
	}

	return payload;
};

export const renderAuditTrailReport = (data: PDFGenerationData): string => {
	const payload = getAuditTrailPayload(data);
	const entries = payload.entries || [];
	const timezone = data.userTimezone;

	const entrySections = entries
		.map((entry, index) => {
			const entryRecord = entry as Record<string, unknown>;
			const timestamp = typeof entryRecord.timestamp === 'string' ? entryRecord.timestamp : 'unknown';
			const action = typeof entryRecord.action === 'string' ? entryRecord.action : 'unknown';
			const result = typeof entryRecord.result === 'string' ? entryRecord.result : 'unknown';
			const userEmail = typeof entryRecord.userEmail === 'string' ? entryRecord.userEmail : 'unknown';
			const userId = typeof entryRecord.userId === 'string' ? entryRecord.userId : 'unknown';

			return `
      <section class="entry-section">
        <h3 class="entry-title">Entry ${index + 1} of ${entries.length}</h3>
        <div class="entry-core-grid">
          <div><strong>Timestamp:</strong> ${safeText(formatTimestamp(timestamp, timezone))}</div>
          <div><strong>Action:</strong> ${safeText(action)}</div>
          <div><strong>Result:</strong> ${safeText(result)}</div>
          <div><strong>User Email:</strong> ${safeText(userEmail)}</div>
          <div><strong>User ID:</strong> ${safeText(userId)}</div>
        </div>
        <div class="entry-meta">
          ${renderEntryDetailsSummary(entryRecord)}
        </div>
        ${renderRawJsonAppendix(entry)}
      </section>
    `;
		})
		.join('');

	return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        font-family: Arial, sans-serif;
        color: #1f2933;
        background: #ffffff;
      }
      body {
        box-sizing: border-box;
      }
      .report-body {
        width: 100%;
        box-sizing: border-box;
      }
      .summary {
        border: 1px solid #d0d7de;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        page-break-inside: avoid;
      }
      .summary h1 {
        margin: 0 0 8px;
        font-size: 22px;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px 12px;
        font-size: 12px;
      }
      .entry-section {
        border: 1px solid #d0d7de;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
        page-break-inside: avoid;
      }
      .entry-title {
        margin: 0 0 8px;
        font-size: 14px;
      }
      .entry-core-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px 12px;
        font-size: 11px;
      }
      .entry-meta {
        margin-top: 10px;
        font-size: 11px;
        color: #334155;
      }
      .entry-meta-muted {
        color: #64748b;
        font-style: italic;
      }
      .entry-raw-json {
        margin-top: 12px;
        border-top: 1px dashed #c5ced8;
        padding-top: 10px;
      }
      .entry-raw-label {
        font-size: 10px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #475569;
        margin-bottom: 6px;
        font-weight: 700;
      }
      .entry-raw-json pre {
        margin: 0;
        padding: 10px;
        border: 1px solid #d0d7de;
        border-radius: 6px;
        background: #f8fafc;
        color: #0f172a;
        font-size: 10px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <div class="report-body">
      <section class="summary">
        <h1>Case Audit Trail Report</h1>
        <div class="summary-grid">
          <div><strong>Case Number:</strong> ${safeText(payload.caseNumber)}</div>
          <div><strong>Exported At:</strong> ${safeText(formatTimestamp(payload.exportedAt, timezone))}</div>
          <div><strong>Range Start:</strong> ${safeText(formatTimestamp(payload.exportRangeStart, timezone))}</div>
          <div><strong>Range End:</strong> ${safeText(formatTimestamp(payload.exportRangeEnd, timezone))}</div>
          <div><strong>Total Entries (All Parts):</strong> ${safeText(payload.totalEntries)}</div>
          <div><strong>This Part:</strong> ${safeText(payload.chunkIndex)} of ${safeText(payload.totalChunks)}</div>
          <div><strong>Entries in Part:</strong> ${safeText(entries.length)}</div>
          <div><strong>Raw JSON Appendix:</strong> Included when available</div>
        </div>
      </section>
      ${entrySections}
    </div>
  </body>
</html>
`;
};

export const getAuditTrailPdfOptions = (data: PDFGenerationData): Partial<ReportPdfOptions> => {
	const payload = getAuditTrailPayload(data);

	return {
		format: 'letter',
		...buildRepeatedChromePdfOptions({
			headerLeft: data.currentDate,
			headerCenter: 'Case Audit Trail Report',
			headerRight: `Case ${payload.caseNumber}`,
			headerDetailLeft: `Entries ${payload.totalEntries}`,
			headerDetailRight: `Part ${payload.chunkIndex}/${payload.totalChunks}`,
			footerLeft: 'Striae Audit Export',
			footerCenter: payload.exportedAt,
			footerRight: `Case ${payload.caseNumber}`,
			includePageNumbers: true,
		}),
	};
};
