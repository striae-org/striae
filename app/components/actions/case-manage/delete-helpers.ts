// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import type { User } from 'firebase/auth';
import { type CaseData, type FileData } from '~/types';
import { fetchImageApi } from '~/utils/api';
import { deleteFileAnnotations, getCaseData, updateCaseData } from '~/utils/data';
import { type DeleteFileWithoutAuditOptions, type DeleteFileWithoutAuditResult } from './types';

export const deleteFileWithoutAudit = async (
	user: User,
	caseNumber: string,
	fileId: string,
	options: DeleteFileWithoutAuditOptions = {},
): Promise<DeleteFileWithoutAuditResult> => {
	const caseData = await getCaseData(user, caseNumber, {
		skipValidation: options.skipValidation === true,
	});
	if (!caseData) {
		throw new Error('Case not found');
	}

	const fileToDelete = (caseData.files || []).find((f: FileData) => f.id === fileId);
	if (!fileToDelete) {
		throw new Error('File not found in case');
	}

	let imageMissing = false;

	const imageResponse = await fetchImageApi(user, `/${encodeURIComponent(fileId)}`, {
		method: 'DELETE',
	});

	if (!imageResponse.ok && imageResponse.status === 404) {
		imageMissing = true;
	}

	if (!imageResponse.ok && imageResponse.status !== 404) {
		throw new Error(`Failed to delete image: ${imageResponse.status} ${imageResponse.statusText}`);
	}

	await deleteFileAnnotations(user, caseNumber, fileId, {
		skipValidation: options.skipValidation === true,
	});

	if (options.skipCaseDataUpdate === true) {
		return {
			imageMissing,
			fileName: fileToDelete.originalFilename,
		};
	}

	const updatedData: CaseData = {
		...caseData,
		files: (caseData.files || []).filter((f: FileData) => f.id !== fileId),
	};

	await updateCaseData(user, caseNumber, updatedData);

	return {
		imageMissing,
		fileName: fileToDelete.originalFilename,
	};
};
