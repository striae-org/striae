import type { User } from 'firebase/auth';
import type { AnnotationData } from '~/types';

import { fetchDataApi } from '../../api';
import { canAccessCase, validateUserSession } from '../permissions';
import {
  DEFAULT_CONFIRMATION_SUMMARY_MAX_AGE_MS,
  buildConfirmationSummaryPath,
  computeCaseConfirmationAggregate,
  getIsoNow,
  isStaleTimestamp,
  normalizeConfirmationSummaryDocument,
  toFileConfirmationSummary,
  trackCaseHit,
  trackCaseMiss,
  trackEnsureCall,
  trackForceRefreshCall,
  trackMissingFileRefresh,
  trackRefreshedFileEntry,
  trackRemovedFileEntry,
  trackStaleCaseRefresh,
  trackStaleFileRefresh,
  trackSummaryWrite,
  type CaseConfirmationSummary,
  type ConfirmationSummaryEnsureOptions,
  type FileConfirmationSummary,
  type UserConfirmationSummaryDocument
} from '../confirmation-summary/summary-core';

async function saveConfirmationSummaryDocument(
  user: User,
  summary: UserConfirmationSummaryDocument
): Promise<void> {
  const response = await fetchDataApi(user, buildConfirmationSummaryPath(user), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(summary)
  });

  if (!response.ok) {
    throw new Error(`Failed to save confirmation summary: ${response.status} ${response.statusText}`);
  }
}

async function getFileAnnotationsForSummary(
  user: User,
  caseNumber: string,
  fileId: string
): Promise<AnnotationData | null> {
  try {
    const response = await fetchDataApi(
      user,
      `/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/${encodeURIComponent(fileId)}/data.json`,
      {
        method: 'GET'
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch file annotations: ${response.status} ${response.statusText}`);
    }

    return await response.json() as AnnotationData;
  } catch (error) {
    console.error(`Error fetching annotations for ${caseNumber}/${fileId}:`, error);
    return null;
  }
}

export const getConfirmationSummaryDocument = async (
  user: User
): Promise<UserConfirmationSummaryDocument> => {
  const sessionValidation = await validateUserSession(user);
  if (!sessionValidation.valid) {
    throw new Error(`Session validation failed: ${sessionValidation.reason}`);
  }

  const response = await fetchDataApi(user, buildConfirmationSummaryPath(user), {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch confirmation summary: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json().catch(() => null) as unknown;
  return normalizeConfirmationSummaryDocument(payload);
};

export const getCaseConfirmationSummary = async (
  user: User,
  caseNumber: string
): Promise<CaseConfirmationSummary | null> => {
  const summary = await getConfirmationSummaryDocument(user);
  return summary.cases[caseNumber] ?? null;
};

export const ensureCaseConfirmationSummary = async (
  user: User,
  caseNumber: string,
  files: Array<{ id: string }>,
  options: ConfirmationSummaryEnsureOptions = {}
): Promise<CaseConfirmationSummary> => {
  trackEnsureCall();

  const sessionValidation = await validateUserSession(user);
  if (!sessionValidation.valid) {
    throw new Error(`Session validation failed: ${sessionValidation.reason}`);
  }

  const accessCheck = await canAccessCase(user, caseNumber);
  if (!accessCheck.allowed) {
    throw new Error(`Access denied: ${accessCheck.reason}`);
  }

  const summary = await getConfirmationSummaryDocument(user);
  const existingCase = summary.cases[caseNumber];
  const filesById: Record<string, FileConfirmationSummary> = existingCase ? { ...existingCase.filesById } : {};
  const fileIds = new Set(files.map((file) => file.id));
  const maxAgeMs =
    typeof options.maxAgeMs === 'number' && Number.isFinite(options.maxAgeMs) && options.maxAgeMs > 0
      ? options.maxAgeMs
      : DEFAULT_CONFIRMATION_SUMMARY_MAX_AGE_MS;
  const caseIsStale =
    options.forceRefresh === true ||
    !existingCase ||
    isStaleTimestamp(existingCase.updatedAt, maxAgeMs);

  if (!existingCase) {
    trackCaseMiss();
  } else {
    trackCaseHit();
  }

  if (options.forceRefresh === true) {
    trackForceRefreshCall();
  }

  if (caseIsStale) {
    trackStaleCaseRefresh();
  }

  let changed = !existingCase;

  for (const fileId of Object.keys(filesById)) {
    if (!fileIds.has(fileId)) {
      delete filesById[fileId];
      trackRemovedFileEntry();
      changed = true;
    }
  }

  const filesToRefresh = files
    .map((file) => {
      const existingFileSummary = filesById[file.id];
      if (!existingFileSummary) {
        return {
          fileId: file.id,
          reason: 'missing' as const
        };
      }

      if (caseIsStale) {
        return {
          fileId: file.id,
          reason: 'stale' as const
        };
      }

      if (isStaleTimestamp(existingFileSummary.updatedAt, maxAgeMs)) {
        return {
          fileId: file.id,
          reason: 'stale' as const
        };
      }

      return null;
    })
    .filter((entry) => entry !== null);

  for (const entry of filesToRefresh) {
    if (entry.reason === 'missing') {
      trackMissingFileRefresh();
    } else {
      trackStaleFileRefresh();
    }
  }

  if (filesToRefresh.length > 0) {
    const refreshedFiles = await Promise.all(
      filesToRefresh.map(async (entry) => {
        const annotations = await getFileAnnotationsForSummary(user, caseNumber, entry.fileId);
        return {
          fileId: entry.fileId,
          summary: toFileConfirmationSummary(annotations)
        };
      })
    );

    for (const refreshedFile of refreshedFiles) {
      filesById[refreshedFile.fileId] = refreshedFile.summary;
      trackRefreshedFileEntry();
      changed = true;
    }
  }

  const aggregate = computeCaseConfirmationAggregate(filesById);
  const updatedCaseSummary: CaseConfirmationSummary = {
    includeConfirmation: aggregate.includeConfirmation,
    isConfirmed: aggregate.isConfirmed,
    updatedAt: getIsoNow(),
    filesById
  };

  const aggregateChanged =
    !existingCase ||
    existingCase.includeConfirmation !== updatedCaseSummary.includeConfirmation ||
    existingCase.isConfirmed !== updatedCaseSummary.isConfirmed;

  if (changed || aggregateChanged || caseIsStale) {
    summary.updatedAt = getIsoNow();
    summary.cases[caseNumber] = updatedCaseSummary;
    await saveConfirmationSummaryDocument(user, summary);
    trackSummaryWrite();
    return updatedCaseSummary;
  }

  return existingCase as CaseConfirmationSummary;
};

export const upsertFileConfirmationSummary = async (
  user: User,
  caseNumber: string,
  fileId: string,
  annotationData: AnnotationData | null
): Promise<void> => {
  const summary = await getConfirmationSummaryDocument(user);
  const caseSummary = summary.cases[caseNumber] ?? {
    includeConfirmation: false,
    isConfirmed: false,
    updatedAt: getIsoNow(),
    filesById: {}
  };

  caseSummary.filesById[fileId] = toFileConfirmationSummary(annotationData);

  const aggregate = computeCaseConfirmationAggregate(caseSummary.filesById);
  caseSummary.includeConfirmation = aggregate.includeConfirmation;
  caseSummary.isConfirmed = aggregate.isConfirmed;
  caseSummary.updatedAt = getIsoNow();

  summary.cases[caseNumber] = caseSummary;
  summary.updatedAt = getIsoNow();

  await saveConfirmationSummaryDocument(user, summary);
};

export const removeFileConfirmationSummary = async (
  user: User,
  caseNumber: string,
  fileId: string
): Promise<void> => {
  const summary = await getConfirmationSummaryDocument(user);
  const caseSummary = summary.cases[caseNumber];
  if (!caseSummary || !caseSummary.filesById[fileId]) {
    return;
  }

  delete caseSummary.filesById[fileId];

  const aggregate = computeCaseConfirmationAggregate(caseSummary.filesById);
  caseSummary.includeConfirmation = aggregate.includeConfirmation;
  caseSummary.isConfirmed = aggregate.isConfirmed;
  caseSummary.updatedAt = getIsoNow();

  summary.cases[caseNumber] = caseSummary;
  summary.updatedAt = getIsoNow();

  await saveConfirmationSummaryDocument(user, summary);
};

export const removeCaseConfirmationSummary = async (
  user: User,
  caseNumber: string
): Promise<void> => {
  const summary = await getConfirmationSummaryDocument(user);
  if (!summary.cases[caseNumber]) {
    return;
  }

  delete summary.cases[caseNumber];
  summary.updatedAt = getIsoNow();

  await saveConfirmationSummaryDocument(user, summary);
};
