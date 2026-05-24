export { loadCaseExportActions, type CaseExportActionsModule } from '~/utils/data/operations/case-export-loader';

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
