import type * as CaseExportActions from '~/components/actions/case-export';

export type CaseExportActionsModule = typeof CaseExportActions;

let caseExportActionsPromise: Promise<CaseExportActionsModule> | null = null;

export const loadCaseExportActions = (): Promise<CaseExportActionsModule> => {
  if (!caseExportActionsPromise) {
    caseExportActionsPromise = import('~/components/actions/case-export').catch((error: unknown) => {
      // Clear cached failures so transient chunk/network errors can recover on retry.
      caseExportActionsPromise = null;
      throw error;
    });
  }

  return caseExportActionsPromise;
};

export const getExportProgressLabel = (progress: number): string => {
  if (progress < 30) {
    return 'Loading case data';
  }

  if (progress < 50) {
    return 'Preparing archive';
  }

  if (progress < 80) {
    return 'Adding images';
  }

  if (progress < 96) {
    return 'Finalizing';
  }

  return 'Downloading';
};
