import type { User } from 'firebase/auth';
import { type CreateAuditEntryParams } from '~/types';

type AnnotationSnapshot = Record<string, unknown> & {
  type?: 'measurement' | 'identification' | 'comparison' | 'note' | 'region';
  position?: { x: number; y: number };
  size?: { width: number; height: number };
};

const toAnnotationSnapshot = (value: unknown): AnnotationSnapshot | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  return value as AnnotationSnapshot;
};

interface BuildAnnotationCreateAuditParamsInput {
  user: User;
  annotationId: string;
  annotationType: 'measurement' | 'identification' | 'comparison' | 'note' | 'region';
  annotationData: unknown;
  caseNumber: string;
  tool?: string;
  imageFileId?: string;
  originalImageFileName?: string;
}

export const buildAnnotationCreateAuditParams = (
  input: BuildAnnotationCreateAuditParamsInput
): CreateAuditEntryParams => {
  const annotationSnapshot = toAnnotationSnapshot(input.annotationData);

  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'annotation-create',
    result: 'success',
    fileName: `annotation-${input.annotationId}.json`,
    fileType: 'json-data',
    validationErrors: [],
    caseNumber: input.caseNumber,
    workflowPhase: 'casework',
    annotationDetails: {
      annotationId: input.annotationId,
      annotationType: input.annotationType,
      annotationData: input.annotationData,
      tool: input.tool,
      canvasPosition: annotationSnapshot?.position,
      annotationSize: annotationSnapshot?.size
    },
    fileDetails: input.imageFileId || input.originalImageFileName
      ? {
          fileId: input.imageFileId,
          originalFileName: input.originalImageFileName,
          fileSize: 0,
          mimeType: 'image/*',
          uploadMethod: 'api'
        }
      : undefined
  };
};

interface BuildAnnotationEditAuditParamsInput {
  user: User;
  annotationId: string;
  previousValue: unknown;
  newValue: unknown;
  caseNumber: string;
  tool?: string;
  imageFileId?: string;
  originalImageFileName?: string;
}

export const buildAnnotationEditAuditParams = (
  input: BuildAnnotationEditAuditParamsInput
): CreateAuditEntryParams => {
  const newValueSnapshot = toAnnotationSnapshot(input.newValue);

  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'annotation-edit',
    result: 'success',
    fileName: `annotation-${input.annotationId}.json`,
    fileType: 'json-data',
    validationErrors: [],
    caseNumber: input.caseNumber,
    workflowPhase: 'casework',
    annotationDetails: {
      annotationId: input.annotationId,
      annotationType: newValueSnapshot?.type,
      annotationData: input.newValue,
      previousValue: input.previousValue,
      tool: input.tool
    },
    fileDetails: input.imageFileId || input.originalImageFileName
      ? {
          fileId: input.imageFileId,
          originalFileName: input.originalImageFileName,
          fileSize: 0,
          mimeType: 'image/*',
          uploadMethod: 'api'
        }
      : undefined
  };
};

interface BuildAnnotationDeleteAuditParamsInput {
  user: User;
  annotationId: string;
  annotationData: unknown;
  caseNumber: string;
  deleteReason?: string;
  imageFileId?: string;
  originalImageFileName?: string;
}

export const buildAnnotationDeleteAuditParams = (
  input: BuildAnnotationDeleteAuditParamsInput
): CreateAuditEntryParams => {
  const annotationSnapshot = toAnnotationSnapshot(input.annotationData);

  return {
    userId: input.user.uid,
    userEmail: input.user.email || '',
    action: 'annotation-delete',
    result: 'success',
    fileName: `annotation-${input.annotationId}.json`,
    fileType: 'json-data',
    validationErrors: [],
    caseNumber: input.caseNumber,
    workflowPhase: 'casework',
    annotationDetails: {
      annotationId: input.annotationId,
      annotationType: annotationSnapshot?.type,
      annotationData: input.annotationData,
      tool: input.deleteReason
    },
    fileDetails: input.imageFileId || input.originalImageFileName
      ? {
          fileId: input.imageFileId,
          originalFileName: input.originalImageFileName,
          fileSize: 0,
          mimeType: 'image/*',
          uploadMethod: 'api'
        }
      : undefined
  };
};
