// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import type { FileData, ItemType } from '~/types';
import type { FileConfirmationSummary } from '~/utils/data';

export type FilesModalSortBy = 'recent' | 'filename' | 'confirmation' | 'itemType';

export type FilesModalConfirmationFilter = 'all' | 'pending' | 'confirmed' | 'none-requested';

export type FilesModalItemTypeFilter = 'all' | 'Bullet' | 'Cartridge Case' | 'Shotshell' | 'Other';

export interface FilesModalPreferences {
	sortBy: FilesModalSortBy;
	confirmationFilter: FilesModalConfirmationFilter;
	itemTypeFilter: FilesModalItemTypeFilter;
}

export type FileConfirmationById = Record<string, FileConfirmationSummary>;

const DEFAULT_CONFIRMATION_SUMMARY: FileConfirmationSummary = {
	includeConfirmation: false,
	isConfirmed: false,
	updatedAt: '',
};

function getFileConfirmationState(fileId: string, statusById: FileConfirmationById): FileConfirmationSummary {
	return statusById[fileId] || DEFAULT_CONFIRMATION_SUMMARY;
}

function getSummaryItemTypes(summary: FileConfirmationSummary): ItemType[] {
	const types = [summary.leftItemType, summary.rightItemType].filter((value): value is ItemType => Boolean(value));

	return Array.from(new Set(types));
}

function getPrimaryItemType(summary: FileConfirmationSummary): ItemType | undefined {
	const [first] = getSummaryItemTypes(summary);
	return first;
}

function getConfirmationRank(summary: FileConfirmationSummary): number {
	if (summary.includeConfirmation && !summary.isConfirmed) {
		return 0;
	}

	if (summary.includeConfirmation && summary.isConfirmed) {
		return 1;
	}

	return 2;
}

function getItemTypeRank(itemType: ItemType | undefined): number {
	if (itemType === 'Bullet') {
		return 0;
	}

	if (itemType === 'Cartridge Case') {
		return 1;
	}

	if (itemType === 'Shotshell') {
		return 2;
	}

	if (itemType === 'Other') {
		return 3;
	}

	return 4;
}

function parseTimestamp(value: string): number {
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? 0 : parsed;
}

function matchesConfirmationFilter(summary: FileConfirmationSummary, confirmationFilter: FilesModalConfirmationFilter): boolean {
	if (confirmationFilter === 'all') {
		return true;
	}

	if (confirmationFilter === 'pending') {
		return summary.includeConfirmation && !summary.isConfirmed;
	}

	if (confirmationFilter === 'confirmed') {
		return summary.includeConfirmation && summary.isConfirmed;
	}

	return !summary.includeConfirmation;
}

function matchesItemTypeFilter(summary: FileConfirmationSummary, itemTypeFilter: FilesModalItemTypeFilter): boolean {
	if (itemTypeFilter === 'all') {
		return true;
	}

	const itemTypes = getSummaryItemTypes(summary);

	if (itemTypeFilter === 'Other') {
		// Treat legacy/unset item types as Other for filtering.
		return itemTypes.length === 0 || itemTypes.includes('Other');
	}

	return itemTypes.includes(itemTypeFilter);
}

function matchesSearch(file: FileData, query: string): boolean {
	const normalized = query.trim().toLowerCase();
	if (!normalized) {
		return true;
	}

	return file.originalFilename.toLowerCase().includes(normalized);
}

export function filterFilesForModal(
	files: FileData[],
	preferences: FilesModalPreferences,
	statusById: FileConfirmationById,
	searchQuery: string,
): FileData[] {
	return files.filter((file) => {
		const summary = getFileConfirmationState(file.id, statusById);

		return (
			matchesSearch(file, searchQuery) &&
			matchesConfirmationFilter(summary, preferences.confirmationFilter) &&
			matchesItemTypeFilter(summary, preferences.itemTypeFilter)
		);
	});
}

function compareFileNames(a: string, b: string): number {
	return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function sortFilesForModal(files: FileData[], sortBy: FilesModalSortBy, statusById: FileConfirmationById): FileData[] {
	const next = [...files];

	if (sortBy === 'recent') {
		return next.sort((left, right) => {
			const difference = parseTimestamp(right.uploadedAt) - parseTimestamp(left.uploadedAt);
			if (difference !== 0) {
				return difference;
			}

			return compareFileNames(left.originalFilename, right.originalFilename);
		});
	}

	if (sortBy === 'filename') {
		return next.sort((left, right) => compareFileNames(left.originalFilename, right.originalFilename));
	}

	if (sortBy === 'confirmation') {
		return next.sort((left, right) => {
			const leftSummary = getFileConfirmationState(left.id, statusById);
			const rightSummary = getFileConfirmationState(right.id, statusById);
			const difference = getConfirmationRank(leftSummary) - getConfirmationRank(rightSummary);

			if (difference !== 0) {
				return difference;
			}

			return compareFileNames(left.originalFilename, right.originalFilename);
		});
	}

	return next.sort((left, right) => {
		const leftSummary = getFileConfirmationState(left.id, statusById);
		const rightSummary = getFileConfirmationState(right.id, statusById);
		const difference = getItemTypeRank(getPrimaryItemType(leftSummary)) - getItemTypeRank(getPrimaryItemType(rightSummary));

		if (difference !== 0) {
			return difference;
		}

		return compareFileNames(left.originalFilename, right.originalFilename);
	});
}

export function getFilesForModal(
	files: FileData[],
	preferences: FilesModalPreferences,
	statusById: FileConfirmationById,
	searchQuery: string,
): FileData[] {
	return sortFilesForModal(filterFilesForModal(files, preferences, statusById, searchQuery), preferences.sortBy, statusById);
}
