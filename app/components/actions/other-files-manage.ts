// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import type { User } from 'firebase/auth';
import { createSignedFileUrlApi, fetchFilesApi, uploadOtherFileApi } from '~/utils/api';
import { canUploadFile, getCaseData, updateCaseData, canModifyCase } from '~/utils/data';
import type { CaseData, FileAccessResult, FileUploadResponse, OtherFileData } from '~/types';
import { auditService } from '~/services/audit';
import { getAuditFileTypeFromMime } from '~/services/audit/audit-file-type';

const MAX_OTHER_FILE_SIZE = 100 * 1024 * 1024;

export interface DeleteOtherFileResult {
	fileMissing: boolean;
	fileName: string;
}

export interface DeleteOtherFileOptions {
	skipValidation?: boolean;
	skipCaseDataUpdate?: boolean;
	suppressAudit?: boolean;
}

export const fetchOtherFiles = async (user: User, caseNumber: string, options?: { skipValidation?: boolean }): Promise<OtherFileData[]> => {
	const caseData = await getCaseData(user, caseNumber, { skipValidation: options?.skipValidation });
	return caseData?.otherFiles || [];
};

export const uploadOtherFile = async (
	user: User,
	caseNumber: string,
	file: File,
	uploadMethod: 'drag-drop' | 'file-picker' = 'file-picker',
	onProgress?: (progress: number) => void,
): Promise<OtherFileData> => {
	const startTime = Date.now();

	if (file.size > MAX_OTHER_FILE_SIZE) {
		throw new Error('File size must be less than or equal to 100 MB');
	}

	const caseData = await getCaseData(user, caseNumber);
	if (!caseData) {
		throw new Error('Case not found');
	}

	if (caseData.isReadOnly) {
		await auditService.logEvent({
			userId: user.uid,
			userEmail: user.email || '',
			action: 'file-upload',
			result: 'blocked',
			fileName: file.name,
			fileType: 'unknown',
			caseNumber,
			validationErrors: ['Read-only cases allow download only for associated files'],
		});
		throw new Error('Read-only cases allow download only for associated files');
	}

	const modifyPermission = await canModifyCase(user, caseNumber);
	if (!modifyPermission.allowed) {
		await auditService.logEvent({
			userId: user.uid,
			userEmail: user.email || '',
			action: 'file-upload',
			result: 'blocked',
			fileName: file.name,
			fileType: getAuditFileTypeFromMime(file.type),
			caseNumber,
			validationErrors: [modifyPermission.reason || 'You do not have permission to modify this case'],
		});
		throw new Error(modifyPermission.reason || 'You do not have permission to modify this case');
	}

	const permission = await canUploadFile(user, (caseData.files?.length || 0) + (caseData.otherFiles?.length || 0));
	if (!permission.canUpload) {
		await auditService.logFileUpload(user, file.name, file.size, file.type, uploadMethod, caseNumber, 'failure', Date.now() - startTime);
		throw new Error(permission.reason || 'You cannot upload more files to this case.');
	}

	try {
		const uploaded: FileUploadResponse = await uploadOtherFileApi(user, file, onProgress);
		const uploadedFileId = uploaded.result?.id;
		if (!uploadedFileId) {
			throw new Error('Upload failed');
		}

		const newFile: OtherFileData = {
			id: uploadedFileId,
			originalFilename: file.name,
			uploadedAt: new Date().toISOString(),
			contentType: file.type || 'application/octet-stream',
			byteLength: file.size,
			malwareScanState: uploaded.result?.malwareScan?.scanState,
			malwareScanHookState: uploaded.result?.malwareScan?.hookState,
			malwareScanUpdatedAt: uploaded.result?.malwareScan?.updatedAt,
			malwareScanHookConfigured: uploaded.result?.malwareScan?.hookConfigured,
			malwareScanHookError: uploaded.result?.malwareScan?.hookError,
		};

		const updatedData: CaseData = {
			...caseData,
			otherFiles: [...(caseData.otherFiles || []), newFile],
		};

		await updateCaseData(user, caseNumber, updatedData);

		await auditService.logFileUpload(
			user,
			file.name,
			file.size,
			file.type || 'application/octet-stream',
			uploadMethod,
			caseNumber,
			'success',
			Date.now() - startTime,
			uploadedFileId,
		);

		return newFile;
	} catch (error) {
		await auditService.logFileUpload(
			user,
			file.name,
			file.size,
			file.type || 'application/octet-stream',
			uploadMethod,
			caseNumber,
			'failure',
			Date.now() - startTime,
		);
		throw error;
	}
};

export const deleteOtherFile = async (
	user: User,
	caseNumber: string,
	fileId: string,
	deleteReason: string = 'User-requested deletion via associated files list',
	options: DeleteOtherFileOptions = {},
): Promise<DeleteOtherFileResult> => {
	const startTime = Date.now();
	let fileName = fileId;
	let fileToDelete: OtherFileData | undefined;

	try {
		const caseData = await getCaseData(user, caseNumber, {
			skipValidation: options.skipValidation === true,
		});
		if (!caseData) {
			throw new Error('Case not found');
		}

		if (caseData.isReadOnly && options.skipValidation !== true) {
			if (options.suppressAudit !== true) {
				await auditService.logEvent({
					userId: user.uid,
					userEmail: user.email || '',
					action: 'file-delete',
					result: 'blocked',
					fileName: fileId,
					fileType: 'unknown',
					caseNumber,
					validationErrors: ['Read-only cases allow download only for associated files'],
				});
			}
			throw new Error('Read-only cases allow download only for associated files');
		}

		if (options.skipValidation !== true) {
			const modifyPermission = await canModifyCase(user, caseNumber);
			if (!modifyPermission.allowed) {
				throw new Error(modifyPermission.reason || 'You do not have permission to modify this case');
			}
		}

		fileToDelete = (caseData.otherFiles || []).find((f: OtherFileData) => f.id === fileId);
		fileName = fileToDelete?.originalFilename || fileId;
		const fileSize = fileToDelete?.byteLength;

		const deleteResponse = await fetchFilesApi(user, `/${encodeURIComponent(fileId)}`, {
			method: 'DELETE',
		});

		let fileMissing = false;
		if (!deleteResponse.ok) {
			if (deleteResponse.status === 404) {
				fileMissing = true;
			} else {
				throw new Error(`Failed to delete file: ${deleteResponse.statusText}`);
			}
		}

		if (options.skipCaseDataUpdate !== true) {
			const updatedData: CaseData = {
				...caseData,
				otherFiles: (caseData.otherFiles || []).filter((f: OtherFileData) => f.id !== fileId),
			};
			await updateCaseData(user, caseNumber, updatedData);
		}

		if (options.suppressAudit !== true) {
			await auditService.logFileDeletion(user, fileName, fileSize, deleteReason, caseNumber, fileId, fileToDelete?.originalFilename);
		}

		return {
			fileMissing,
			fileName,
		};
	} catch (error) {
		if (options.suppressAudit !== true) {
			await auditService.logEvent({
				userId: user.uid,
				userEmail: user.email || '',
				action: 'file-delete',
				result: 'failure',
				fileName,
				fileType: 'unknown',
				caseNumber,
				validationErrors: [error instanceof Error ? error.message : 'Unknown error'],
				fileDetails: {
					fileId,
					fileSize: fileToDelete?.byteLength,
					deleteReason,
					originalFileName: fileToDelete?.originalFilename,
				},
				performanceMetrics: {
					processingTimeMs: Date.now() - startTime,
					fileSizeBytes: fileToDelete?.byteLength,
				},
			});
		}
		throw error;
	}
};

export const getOtherFileUrl = async (
	user: User,
	fileData: OtherFileData,
	caseNumber: string,
	accessReason?: string,
): Promise<FileAccessResult> => {
	const startTime = Date.now();
	const resolvedAccessReason = accessReason || 'Associated file download';

	try {
		const signedUrlResponse = await createSignedFileUrlApi(user, fileData.id);

		await auditService.logFileAccess(
			user,
			fileData.originalFilename || fileData.id,
			fileData.id,
			'download',
			caseNumber,
			'success',
			Date.now() - startTime,
			resolvedAccessReason,
			fileData.originalFilename,
			fileData.byteLength,
		);

		return {
			url: signedUrlResponse.result.url,
			revoke: () => {},
			urlType: 'signed',
			expiresAt: signedUrlResponse.result.expiresAt,
		};
	} catch (error) {
		await auditService.logFileAccess(
			user,
			fileData.originalFilename || fileData.id,
			fileData.id,
			'download',
			caseNumber,
			'failure',
			Date.now() - startTime,
			`Unexpected error during ${resolvedAccessReason}`,
			fileData.originalFilename,
			fileData.byteLength,
		);

		throw error;
	}
};
