// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import {
	type FilesModalPreferences,
	type FilesModalSortBy,
	type FilesModalConfirmationFilter,
	type FilesModalItemTypeFilter,
} from '~/utils/data/file-filters';

const FILES_MODAL_PREFERENCES_STORAGE_KEY = 'striae.filesModal.preferences';

export const DEFAULT_FILES_MODAL_PREFERENCES: FilesModalPreferences = {
	sortBy: 'recent',
	confirmationFilter: 'all',
	itemTypeFilter: 'all',
};

function parseStoredPreferences(value: string | null): FilesModalPreferences {
	if (!value) {
		return DEFAULT_FILES_MODAL_PREFERENCES;
	}

	try {
		const parsed = JSON.parse(value) as Partial<FilesModalPreferences>;

		const sortBy: FilesModalSortBy =
			parsed.sortBy === 'filename' || parsed.sortBy === 'confirmation' || parsed.sortBy === 'itemType' || parsed.sortBy === 'recent'
				? parsed.sortBy
				: DEFAULT_FILES_MODAL_PREFERENCES.sortBy;

		const confirmationFilter: FilesModalConfirmationFilter =
			parsed.confirmationFilter === 'pending' ||
			parsed.confirmationFilter === 'confirmed' ||
			parsed.confirmationFilter === 'none-requested' ||
			parsed.confirmationFilter === 'all'
				? parsed.confirmationFilter
				: DEFAULT_FILES_MODAL_PREFERENCES.confirmationFilter;

		// Validate 'itemTypeFilter' property
		const itemTypeFilter: FilesModalItemTypeFilter =
			parsed.itemTypeFilter === 'Bullet' ||
			parsed.itemTypeFilter === 'Cartridge Case' ||
			parsed.itemTypeFilter === 'Shotshell' ||
			parsed.itemTypeFilter === 'Other' ||
			parsed.itemTypeFilter === 'all'
				? parsed.itemTypeFilter
				: 'all';

		return {
			sortBy,
			confirmationFilter,
			itemTypeFilter,
		};
	} catch {
		return DEFAULT_FILES_MODAL_PREFERENCES;
	}
}

function loadFilesModalPreferences(): FilesModalPreferences {
	if (typeof window === 'undefined') {
		return DEFAULT_FILES_MODAL_PREFERENCES;
	}

	return parseStoredPreferences(window.localStorage.getItem(FILES_MODAL_PREFERENCES_STORAGE_KEY));
}

export function useFileListPreferences() {
	const [preferences, setPreferences] = useState<FilesModalPreferences>(() => loadFilesModalPreferences());

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		window.localStorage.setItem(FILES_MODAL_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
	}, [preferences]);

	const setSortBy = (sortBy: FilesModalSortBy) => {
		setPreferences((current) => ({ ...current, sortBy }));
	};

	const setConfirmationFilter = (confirmationFilter: FilesModalConfirmationFilter) => {
		setPreferences((current) => ({ ...current, confirmationFilter }));
	};

	const setItemTypeFilter = (itemTypeFilter: FilesModalItemTypeFilter) => {
		setPreferences((current) => ({ ...current, itemTypeFilter }));
	};

	const resetPreferences = () => {
		setPreferences(DEFAULT_FILES_MODAL_PREFERENCES);
	};

	return {
		preferences,
		setSortBy,
		setConfirmationFilter,
		setItemTypeFilter,
		resetPreferences,
	};
}
