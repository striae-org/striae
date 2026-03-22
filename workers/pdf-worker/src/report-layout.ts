import type { ReportPdfOptions } from './report-types';

interface ReportChromeTemplateConfig {
  headerLeft?: string;
  headerCenter?: string;
  headerRight?: string;
  headerDetailLeft?: string;
  headerDetailRight?: string;
  footerLeft?: string;
  footerCenter?: string;
  footerRight?: string;
  footerLeftImageSrc?: string;
  includePageNumbers?: boolean;
}

const HEADER_TEMPLATE_STYLES = `
  <style>
    .report-header {
      width: 100%;
      box-sizing: border-box;
      padding: 0 0.5in 8px;
      border-bottom: 2px solid #333333;
      color: #333333;
      font-family: Arial, sans-serif;
      font-size: 18px;
      font-weight: 700;
    }
    .report-header__content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
    }
    .report-header__details {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #d9d9d9;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #666666;
    }
    .report-header__cell {
      flex: 1 1 0;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .report-header__cell--left {
      text-align: left;
    }
    .report-header__cell--center {
      text-align: center;
    }
    .report-header__cell--right {
      text-align: right;
    }
    .report-header__detail {
      flex: 1 1 0;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .report-header__detail--left {
      text-align: left;
    }
    .report-header__detail--right {
      text-align: right;
    }
  </style>
`;

const FOOTER_TEMPLATE_STYLES = `
  <style>
    .report-footer {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 0.5in 0;
      border-top: 1px solid #cccccc;
      color: #666666;
      font-family: Arial, sans-serif;
      font-size: 9px;
    }
    .report-footer__content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
    }
    .report-footer__cell {
      flex: 1 1 0;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .report-footer__cell--left {
      display: flex;
      align-items: center;
      gap: 6px;
      text-align: left;
      font-weight: 500;
    }
    .report-footer__cell--center {
      text-align: center;
      color: #333333;
      font-weight: 600;
    }
    .report-footer__cell--right {
      text-align: right;
      font-style: italic;
    }
    .report-footer__page-count {
      font-style: normal;
      font-weight: 600;
      color: #333333;
    }
    .report-footer__separator {
      margin: 0 6px;
      color: #999999;
      font-style: normal;
    }
    .report-footer__icon {
      width: 12px;
      height: 12px;
      object-fit: contain;
      flex: 0 0 auto;
    }
  </style>
`;

export function escapeHtml(value: string | undefined): string {
  if (!value) {
    return '';
  }

  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTemplateCell(value: string | undefined, className: string): string {
  const content = value && value.trim().length > 0 ? escapeHtml(value.trim()) : '&nbsp;';
  return `<div class="${className}">${content}</div>`;
}

export function buildRepeatedChromePdfOptions(config: ReportChromeTemplateConfig): Partial<ReportPdfOptions> {
  const hasHeaderDetails = Boolean(
    (config.headerDetailLeft && config.headerDetailLeft.trim().length > 0) ||
    (config.headerDetailRight && config.headerDetailRight.trim().length > 0)
  );

  const headerDetails = hasHeaderDetails
    ? `
      <div class="report-header__details">
        ${renderTemplateCell(config.headerDetailLeft, 'report-header__detail report-header__detail--left')}
        ${renderTemplateCell(config.headerDetailRight, 'report-header__detail report-header__detail--right')}
      </div>
    `
    : '';

  const headerTemplate = `
    ${HEADER_TEMPLATE_STYLES}
    <div class="report-header">
      <div class="report-header__content">
        ${renderTemplateCell(config.headerLeft, 'report-header__cell report-header__cell--left')}
        ${renderTemplateCell(config.headerCenter, 'report-header__cell report-header__cell--center')}
        ${renderTemplateCell(config.headerRight, 'report-header__cell report-header__cell--right')}
      </div>
      ${headerDetails}
    </div>
  `;

  const footerLeftContent = config.footerLeft && config.footerLeft.trim().length > 0
    ? `<span>${escapeHtml(config.footerLeft.trim())}</span>`
    : '<span>&nbsp;</span>';

  const footerIcon = config.footerLeftImageSrc
    ? `<img class="report-footer__icon" src="${escapeHtml(config.footerLeftImageSrc)}" alt="" />`
    : '';

  const footerRightText = config.footerRight && config.footerRight.trim().length > 0
    ? `<span>${escapeHtml(config.footerRight.trim())}</span>`
    : '';

  const footerPageCount = config.includePageNumbers === false
    ? ''
    : `<span class="report-footer__page-count">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>`;

  const footerRightContent = footerRightText && footerPageCount
    ? `${footerRightText}<span class="report-footer__separator">|</span>${footerPageCount}`
    : footerRightText || footerPageCount || '&nbsp;';

  const footerTemplate = `
    ${FOOTER_TEMPLATE_STYLES}
    <div class="report-footer">
      <div class="report-footer__content">
        <div class="report-footer__cell report-footer__cell--left">${footerLeftContent}${footerIcon}</div>
        ${renderTemplateCell(config.footerCenter, 'report-footer__cell report-footer__cell--center')}
        <div class="report-footer__cell report-footer__cell--right">${footerRightContent}</div>
      </div>
    </div>
  `;

  return {
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    margin: {
      top: hasHeaderDetails ? '1.45in' : '1.15in',
      bottom: '0.8in',
    },
  };
}