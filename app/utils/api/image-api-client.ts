// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import type { User } from 'firebase/auth';
import { type ImageUploadResponse, type SignedImageUrlResponse } from '~/types';

const IMAGE_API_BASE = '/api/image';

function normalizePath(path: string): string {
	if (!path) {
		return '/';
	}

	return path.startsWith('/') ? path : `/${path}`;
}

export async function fetchImageApi(user: User, path: string, init: RequestInit = {}): Promise<Response> {
	const normalizedPath = normalizePath(path);
	const userWithOptionalToken = user as User & { getIdToken?: () => Promise<string> };

	if (typeof userWithOptionalToken.getIdToken !== 'function') {
		throw new Error('Unable to authenticate request: missing Firebase token provider');
	}

	let idToken: string;
	try {
		idToken = await userWithOptionalToken.getIdToken();
	} catch {
		throw new Error('Unable to authenticate request: failed to retrieve Firebase token');
	}

	if (!idToken) {
		throw new Error('Unable to authenticate request: empty Firebase token');
	}

	const headers = new Headers(init.headers);
	headers.set('Authorization', `Bearer ${idToken}`);

	return fetch(`${IMAGE_API_BASE}${normalizedPath}`, {
		...init,
		headers,
	});
}

interface XhrUploadResult {
	status: number;
	responseText: string;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isUploadErrorsArray(value: unknown): value is Array<{ code: number; message: string }> {
	return (
		Array.isArray(value) &&
		value.every(
			(entry) =>
				typeof entry === 'object' &&
				entry !== null &&
				'code' in entry &&
				typeof entry.code === 'number' &&
				'message' in entry &&
				typeof entry.message === 'string',
		)
	);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isUploadSuccessResponse(value: unknown): value is ImageUploadResponse {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as {
		success?: unknown;
		result?: unknown;
		errors?: unknown;
		messages?: unknown;
	};

	if (candidate.success !== true || !candidate.result || typeof candidate.result !== 'object') {
		return false;
	}

	const result = candidate.result as {
		id?: unknown;
		filename?: unknown;
		uploaded?: unknown;
	};

	return (
		isNonEmptyString(result.id) &&
		isNonEmptyString(result.filename) &&
		isNonEmptyString(result.uploaded) &&
		isUploadErrorsArray(candidate.errors) &&
		isStringArray(candidate.messages)
	);
}

function uploadWithXhr(
	targetUrl: string,
	authorizationValue: string,
	file: File,
	onProgress?: (progress: number) => void,
): Promise<XhrUploadResult> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const formData = new FormData();
		formData.append('file', file);

		xhr.upload.addEventListener('progress', (event) => {
			if (event.lengthComputable && onProgress) {
				const progress = Math.round((event.loaded / event.total) * 100);
				onProgress(progress);
			}
		});

		xhr.addEventListener('load', () => {
			resolve({
				status: xhr.status,
				responseText: xhr.responseText,
			});
		});

		xhr.addEventListener('error', () => {
			reject(new Error('Upload failed'));
		});

		xhr.open('POST', targetUrl);
		xhr.setRequestHeader('Authorization', authorizationValue);
		xhr.send(formData);
	});
}

function parseUploadResponse(payload: string): ImageUploadResponse {
	const parsed = JSON.parse(payload) as unknown;

	if (parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string' && parsed.error.trim()) {
		throw new Error(parsed.error);
	}

	if (!isUploadSuccessResponse(parsed)) {
		const errorMessage =
			parsed && typeof parsed === 'object' && 'errors' in parsed && Array.isArray(parsed.errors)
				? parsed.errors
						.map((entry) =>
							typeof entry === 'object' && entry && 'message' in entry && typeof entry.message === 'string'
								? entry.message
								: 'Upload failed',
						)
						.join(', ')
				: 'Upload failed';
		throw new Error(errorMessage);
	}

	return parsed;
}

function parseSignedUrlResponse(payload: string): SignedImageUrlResponse {
	const parsed = JSON.parse(payload) as SignedImageUrlResponse;
	if (!parsed.success || !parsed.result?.url || !parsed.result?.fileId || !parsed.result?.expiresAt) {
		throw new Error('Signed URL response is invalid');
	}

	return parsed;
}

export async function createSignedImageUrlApi(user: User, fileId: string, expiresInSeconds?: number): Promise<SignedImageUrlResponse> {
	const response = await fetchImageApi(user, `/${encodeURIComponent(fileId)}/signed-url`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify(typeof expiresInSeconds === 'number' ? { expiresInSeconds } : {}),
	});

	if (!response.ok) {
		throw new Error(`Signed URL request failed with status ${response.status}`);
	}

	const parsed = parseSignedUrlResponse(await response.text());
	const rawUrl = parsed.result.url;
	let normalizedUrl = rawUrl;

	if (rawUrl.startsWith('/')) {
		normalizedUrl = new URL(rawUrl, window.location.origin).toString();
	}

	return {
		...parsed,
		result: {
			...parsed.result,
			url: normalizedUrl,
		},
	};
}

export async function uploadImageApi(user: User, file: File, onProgress?: (progress: number) => void): Promise<ImageUploadResponse> {
	const userWithOptionalToken = user as User & { getIdToken?: () => Promise<string> };

	if (typeof userWithOptionalToken.getIdToken !== 'function') {
		throw new Error('Unable to authenticate upload: missing Firebase token provider');
	}

	let idToken: string;
	try {
		idToken = await userWithOptionalToken.getIdToken();
	} catch {
		throw new Error('Unable to authenticate upload: failed to retrieve Firebase token');
	}

	if (!idToken) {
		throw new Error('Unable to authenticate upload: empty Firebase token');
	}

	const proxyUploadResult = await uploadWithXhr(`${IMAGE_API_BASE}/`, `Bearer ${idToken}`, file, onProgress);

	if (proxyUploadResult.status < 200 || proxyUploadResult.status >= 300) {
		try {
			parseUploadResponse(proxyUploadResult.responseText);
		} catch (error) {
			if (error instanceof Error && error.message !== 'Upload failed') {
				throw error;
			}
		}

		throw new Error(`Upload failed with status ${proxyUploadResult.status}`);
	}

	return parseUploadResponse(proxyUploadResult.responseText);
}
