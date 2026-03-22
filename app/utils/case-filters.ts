export type CasesModalSortBy = 'recent' | 'alphabetical';

export type CasesModalConfirmationFilter =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'none-requested';

export interface CasesModalPreferences {
  sortBy: CasesModalSortBy;
  confirmationFilter: CasesModalConfirmationFilter;
  showArchivedOnly: boolean;
}

export interface CasesModalCaseItem {
  caseNumber: string;
  createdAt: string;
  archived: boolean;
  isReadOnly: boolean;
}

export interface CaseConfirmationStatusValue {
  includeConfirmation: boolean;
  isConfirmed: boolean;
}

const DEFAULT_CASE_CONFIRMATION_STATUS: CaseConfirmationStatusValue = {
  includeConfirmation: false,
  isConfirmed: false,
};

function compareCaseNumbersAlphabetically(a: string, b: string): number {
  const getComponents = (value: string) => {
    const numbers = value.match(/\d+/g)?.map(Number) || [];
    const letters = value.match(/[A-Za-z]+/g)?.join('') || '';
    return { numbers, letters };
  };

  const left = getComponents(a);
  const right = getComponents(b);

  const maxLength = Math.max(left.numbers.length, right.numbers.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftNumber = left.numbers[index] || 0;
    const rightNumber = right.numbers[index] || 0;

    if (leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }
  }

  return left.letters.localeCompare(right.letters);
}

function parseTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function matchesConfirmationFilter(
  caseNumber: string,
  confirmationFilter: CasesModalConfirmationFilter,
  caseConfirmationStatus: Record<string, CaseConfirmationStatusValue>
): boolean {
  if (confirmationFilter === 'all') {
    return true;
  }

  const status = caseConfirmationStatus[caseNumber] || DEFAULT_CASE_CONFIRMATION_STATUS;

  if (confirmationFilter === 'pending') {
    return status.includeConfirmation && !status.isConfirmed;
  }

  if (confirmationFilter === 'confirmed') {
    return status.includeConfirmation && status.isConfirmed;
  }

  return !status.includeConfirmation;
}

export function filterCasesForModal(
  cases: CasesModalCaseItem[],
  preferences: CasesModalPreferences,
  caseConfirmationStatus: Record<string, CaseConfirmationStatusValue>
): CasesModalCaseItem[] {
  const archiveFilteredCases = preferences.showArchivedOnly
    ? cases.filter((entry) => entry.archived && !entry.isReadOnly)
    : cases.filter((entry) => !entry.archived && !entry.isReadOnly);

  return archiveFilteredCases.filter((entry) =>
    matchesConfirmationFilter(entry.caseNumber, preferences.confirmationFilter, caseConfirmationStatus)
  );
}

export function sortCasesForModal(
  cases: CasesModalCaseItem[],
  sortBy: CasesModalSortBy
): CasesModalCaseItem[] {
  const next = [...cases];

  if (sortBy === 'recent') {
    return next.sort((left, right) => {
      const difference = parseTimestamp(right.createdAt) - parseTimestamp(left.createdAt);
      if (difference !== 0) {
        return difference;
      }

      return compareCaseNumbersAlphabetically(left.caseNumber, right.caseNumber);
    });
  }

  return next.sort((left, right) =>
    compareCaseNumbersAlphabetically(left.caseNumber, right.caseNumber)
  );
}

export function getCasesForModal(
  cases: CasesModalCaseItem[],
  preferences: CasesModalPreferences,
  caseConfirmationStatus: Record<string, CaseConfirmationStatusValue>
): CasesModalCaseItem[] {
  return sortCasesForModal(
    filterCasesForModal(cases, preferences, caseConfirmationStatus),
    preferences.sortBy
  );
}
