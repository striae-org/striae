import type { User } from 'firebase/auth';
import { type AnnotationData } from '~/types';

export interface FileConfirmationSummary {
  includeConfirmation: boolean;
  isConfirmed: boolean;
  updatedAt: string;
}

export interface CaseConfirmationSummary {
  includeConfirmation: boolean;
  isConfirmed: boolean;
  updatedAt: string;
  filesById: Record<string, FileConfirmationSummary>;
}

export interface UserConfirmationSummaryDocument {
  version: number;
  updatedAt: string;
  cases: Record<string, CaseConfirmationSummary>;
}

export interface ConfirmationSummaryEnsureOptions {
  forceRefresh?: boolean;
  maxAgeMs?: number;
}

export interface ConfirmationSummaryTelemetry {
  ensureCalls: number;
  caseCacheHits: number;
  caseMisses: number;
  forceRefreshCalls: number;
  staleCaseRefreshes: number;
  staleFileRefreshes: number;
  missingFileRefreshes: number;
  removedFileEntries: number;
  refreshedFileEntries: number;
  summaryWrites: number;
}

export const CONFIRMATION_SUMMARY_VERSION = 1;
export const DEFAULT_CONFIRMATION_SUMMARY_MAX_AGE_MS = 5 * 60 * 1000;

const CONFIRMATION_SUMMARY_LOG_INTERVAL = 25;

const confirmationSummaryTelemetry: ConfirmationSummaryTelemetry = {
  ensureCalls: 0,
  caseCacheHits: 0,
  caseMisses: 0,
  forceRefreshCalls: 0,
  staleCaseRefreshes: 0,
  staleFileRefreshes: 0,
  missingFileRefreshes: 0,
  removedFileEntries: 0,
  refreshedFileEntries: 0,
  summaryWrites: 0
};

export function getConfirmationSummaryTelemetry(): ConfirmationSummaryTelemetry {
  return { ...confirmationSummaryTelemetry };
}

export function resetConfirmationSummaryTelemetry(): void {
  for (const key of Object.keys(confirmationSummaryTelemetry) as Array<keyof ConfirmationSummaryTelemetry>) {
    confirmationSummaryTelemetry[key] = 0;
  }
}

function getGlobalDebugFlag(): boolean {
  const globalScope = globalThis as unknown as {
    __STRIAE_DEBUG_CONFIRMATION_CACHE__?: boolean;
  };

  return globalScope.__STRIAE_DEBUG_CONFIRMATION_CACHE__ === true;
}

function getLocalStorageDebugFlag(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    return window.localStorage.getItem('striae.debug.confirmationCache') === 'true';
  } catch {
    return false;
  }
}

function shouldLogConfirmationSummaryTelemetry(): boolean {
  return getGlobalDebugFlag() || getLocalStorageDebugFlag();
}

function maybeLogConfirmationSummaryTelemetrySnapshot(): void {
  if (!shouldLogConfirmationSummaryTelemetry()) {
    return;
  }

  if (
    confirmationSummaryTelemetry.ensureCalls === 0 ||
    confirmationSummaryTelemetry.ensureCalls % CONFIRMATION_SUMMARY_LOG_INTERVAL !== 0
  ) {
    return;
  }

  const totalCaseLookups =
    confirmationSummaryTelemetry.caseCacheHits + confirmationSummaryTelemetry.caseMisses;
  const caseCacheHitRate =
    totalCaseLookups > 0
      ? Math.round((confirmationSummaryTelemetry.caseCacheHits / totalCaseLookups) * 100)
      : 0;

  console.info('[confirmation-cache] summary', {
    ensureCalls: confirmationSummaryTelemetry.ensureCalls,
    caseCacheHitRate,
    caseCacheHits: confirmationSummaryTelemetry.caseCacheHits,
    caseMisses: confirmationSummaryTelemetry.caseMisses,
    forceRefreshCalls: confirmationSummaryTelemetry.forceRefreshCalls,
    staleCaseRefreshes: confirmationSummaryTelemetry.staleCaseRefreshes,
    missingFileRefreshes: confirmationSummaryTelemetry.missingFileRefreshes,
    staleFileRefreshes: confirmationSummaryTelemetry.staleFileRefreshes,
    refreshedFileEntries: confirmationSummaryTelemetry.refreshedFileEntries,
    removedFileEntries: confirmationSummaryTelemetry.removedFileEntries,
    summaryWrites: confirmationSummaryTelemetry.summaryWrites
  });
}

export function trackEnsureCall(): void {
  confirmationSummaryTelemetry.ensureCalls += 1;
  maybeLogConfirmationSummaryTelemetrySnapshot();
}

export function trackCaseMiss(): void {
  confirmationSummaryTelemetry.caseMisses += 1;
}

export function trackCaseHit(): void {
  confirmationSummaryTelemetry.caseCacheHits += 1;
}

export function trackForceRefreshCall(): void {
  confirmationSummaryTelemetry.forceRefreshCalls += 1;
}

export function trackStaleCaseRefresh(): void {
  confirmationSummaryTelemetry.staleCaseRefreshes += 1;
}

export function trackMissingFileRefresh(): void {
  confirmationSummaryTelemetry.missingFileRefreshes += 1;
}

export function trackStaleFileRefresh(): void {
  confirmationSummaryTelemetry.staleFileRefreshes += 1;
}

export function trackRemovedFileEntry(): void {
  confirmationSummaryTelemetry.removedFileEntries += 1;
}

export function trackRefreshedFileEntry(): void {
  confirmationSummaryTelemetry.refreshedFileEntries += 1;
}

export function trackSummaryWrite(): void {
  confirmationSummaryTelemetry.summaryWrites += 1;
}

export function getIsoNow(): string {
  return new Date().toISOString();
}

export function createEmptyConfirmationSummary(): UserConfirmationSummaryDocument {
  return {
    version: CONFIRMATION_SUMMARY_VERSION,
    updatedAt: getIsoNow(),
    cases: {}
  };
}

export function buildConfirmationSummaryPath(user: User): string {
  return `/${encodeURIComponent(user.uid)}/meta/confirmation-status.json`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeFileConfirmationSummary(value: unknown): FileConfirmationSummary {
  if (!isPlainObject(value)) {
    return {
      includeConfirmation: false,
      isConfirmed: false,
      updatedAt: getIsoNow()
    };
  }

  return {
    includeConfirmation: value.includeConfirmation === true,
    isConfirmed: value.isConfirmed === true,
    updatedAt: typeof value.updatedAt === 'string' && value.updatedAt.length > 0 ? value.updatedAt : getIsoNow()
  };
}

export function isStaleTimestamp(timestamp: string, maxAgeMs: number): boolean {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return true;
  }

  return Date.now() - parsed > maxAgeMs;
}

export function computeCaseConfirmationAggregate(filesById: Record<string, FileConfirmationSummary>): {
  includeConfirmation: boolean;
  isConfirmed: boolean;
} {
  const statuses = Object.values(filesById);
  const filesRequiringConfirmation = statuses.filter((entry) => entry.includeConfirmation);
  const includeConfirmation = filesRequiringConfirmation.length > 0;
  const isConfirmed = includeConfirmation ? filesRequiringConfirmation.every((entry) => entry.isConfirmed) : false;

  return {
    includeConfirmation,
    isConfirmed
  };
}

export function toFileConfirmationSummary(annotationData: AnnotationData | null): FileConfirmationSummary {
  const includeConfirmation = annotationData?.includeConfirmation === true;

  return {
    includeConfirmation,
    isConfirmed: includeConfirmation && !!annotationData?.confirmationData,
    updatedAt: getIsoNow()
  };
}

export function normalizeConfirmationSummaryDocument(payload: unknown): UserConfirmationSummaryDocument {
  if (!isPlainObject(payload) || !isPlainObject(payload.cases)) {
    return createEmptyConfirmationSummary();
  }

  const normalizedCases: Record<string, CaseConfirmationSummary> = {};

  for (const [caseNumber, rawCaseEntry] of Object.entries(payload.cases)) {
    if (!isPlainObject(rawCaseEntry) || !isPlainObject(rawCaseEntry.filesById)) {
      continue;
    }

    const filesById: Record<string, FileConfirmationSummary> = {};
    for (const [fileId, rawFileEntry] of Object.entries(rawCaseEntry.filesById)) {
      filesById[fileId] = normalizeFileConfirmationSummary(rawFileEntry);
    }

    const aggregate = computeCaseConfirmationAggregate(filesById);

    normalizedCases[caseNumber] = {
      includeConfirmation: aggregate.includeConfirmation,
      isConfirmed: aggregate.isConfirmed,
      updatedAt:
        typeof rawCaseEntry.updatedAt === 'string' && rawCaseEntry.updatedAt.length > 0
          ? rawCaseEntry.updatedAt
          : getIsoNow(),
      filesById
    };
  }

  return {
    version:
      typeof payload.version === 'number' && Number.isFinite(payload.version)
        ? payload.version
        : CONFIRMATION_SUMMARY_VERSION,
    updatedAt:
      typeof payload.updatedAt === 'string' && payload.updatedAt.length > 0
        ? payload.updatedAt
        : getIsoNow(),
    cases: normalizedCases
  };
}