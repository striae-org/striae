import { useEffect, useState } from 'react';
import {
  type CasesModalPreferences,
  type CasesModalSortBy,
  type CasesModalConfirmationFilter,
} from '~/utils/case-filters';

const CASES_MODAL_PREFERENCES_STORAGE_KEY = 'striae.casesModal.preferences';

export const DEFAULT_CASES_MODAL_PREFERENCES: CasesModalPreferences = {
  sortBy: 'recent',
  confirmationFilter: 'all',
  showArchivedOnly: false,
};

function parseStoredPreferences(value: string | null): CasesModalPreferences {
  if (!value) {
    return DEFAULT_CASES_MODAL_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(value) as Partial<CasesModalPreferences>;

    const sortBy: CasesModalSortBy =
      parsed.sortBy === 'alphabetical' || parsed.sortBy === 'recent'
        ? parsed.sortBy
        : DEFAULT_CASES_MODAL_PREFERENCES.sortBy;

    const confirmationFilter: CasesModalConfirmationFilter =
      parsed.confirmationFilter === 'pending' ||
      parsed.confirmationFilter === 'confirmed' ||
      parsed.confirmationFilter === 'none-requested' ||
      parsed.confirmationFilter === 'all'
        ? parsed.confirmationFilter
        : DEFAULT_CASES_MODAL_PREFERENCES.confirmationFilter;

    const showArchivedOnly =
      typeof parsed.showArchivedOnly === 'boolean'
        ? parsed.showArchivedOnly
        : DEFAULT_CASES_MODAL_PREFERENCES.showArchivedOnly;

    return {
      sortBy,
      confirmationFilter,
      showArchivedOnly,
    };
  } catch {
    return DEFAULT_CASES_MODAL_PREFERENCES;
  }
}

function loadCasesModalPreferences(): CasesModalPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_CASES_MODAL_PREFERENCES;
  }

  return parseStoredPreferences(window.localStorage.getItem(CASES_MODAL_PREFERENCES_STORAGE_KEY));
}

export function useCaseListPreferences() {
  const [preferences, setPreferences] = useState<CasesModalPreferences>(() =>
    loadCasesModalPreferences()
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      CASES_MODAL_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences)
    );
  }, [preferences]);

  const setSortBy = (sortBy: CasesModalSortBy) => {
    setPreferences((current) => ({ ...current, sortBy }));
  };

  const setConfirmationFilter = (confirmationFilter: CasesModalConfirmationFilter) => {
    setPreferences((current) => ({ ...current, confirmationFilter }));
  };

  const setShowArchivedOnly = (showArchivedOnly: boolean) => {
    setPreferences((current) => ({ ...current, showArchivedOnly }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_CASES_MODAL_PREFERENCES);
  };

  return {
    preferences,
    setSortBy,
    setConfirmationFilter,
    setShowArchivedOnly,
    resetPreferences,
  };
}
