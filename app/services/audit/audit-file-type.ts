import { type AuditFileType } from '~/types';

export const getAuditFileTypeFromMime = (mimeType: string): AuditFileType => {
  if (mimeType.startsWith('image/')) return 'image-file';
  if (mimeType === 'application/pdf') return 'pdf-document';
  if (mimeType === 'application/json') return 'json-data';
  if (mimeType === 'text/csv') return 'csv-export';
  return 'unknown';
};

export const isImageMimeType = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};
