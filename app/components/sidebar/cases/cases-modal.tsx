import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import { useCaseListPreferences, DEFAULT_CASES_MODAL_PREFERENCES } from '~/hooks/useCaseListPreferences';
import {
  type CasesModalCaseItem,
  type CasesModalSortBy,
  type CasesModalConfirmationFilter,
  getCasesForModal,
} from '~/utils/data/case-filters';
import {
  archiveCase,
  deleteCase,
  renameCase,
  validateCaseNumber,
} from '~/components/actions/case-manage';
import { RenameCaseModal } from '../../navbar/case-modals/rename-case-modal';
import { ArchiveCaseModal } from '../../navbar/case-modals/archive-case-modal';
import { DeleteCaseModal } from '../../navbar/case-modals/delete-case-modal';
import {
  ensureCaseConfirmationSummary,
  getCaseData,
  getConfirmationSummaryDocument,
  getUserCases,
  getUserReadOnlyCases,
} from '~/utils/data';
import { fetchFiles } from '~/components/actions/image-manage';
import styles from './cases-modal.module.css';

interface CasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCase: (caseNum: string) => void;
  currentCase: string;
  user: User;
  confirmationSaveVersion?: number;
}

interface CaseConfirmationStatus {
  [caseNum: string]: { includeConfirmation: boolean; isConfirmed: boolean };
}

const CASES_PER_PAGE = 10;

const DEFAULT_CONFIRMATION_STATUS = {
  includeConfirmation: false,
  isConfirmed: false,
};

const getCaseUpdatedLabel = (createdAt: string): string => {
  const parsed = Date.parse(createdAt);

  if (Number.isNaN(parsed)) {
    return 'Date unavailable';
  }

  return new Date(parsed).toLocaleDateString();
};

export const CasesModal = ({
  isOpen,
  onClose,
  onSelectCase,
  currentCase,
  user,
  confirmationSaveVersion = 0
}: CasesModalProps) => {
  const [allCases, setAllCases] = useState<CasesModalCaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCaseNumber, setSelectedCaseNumber] = useState<string | null>(currentCase || null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const caseRowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const {
    preferences,
    setSortBy,
    setConfirmationFilter,
    setShowArchivedOnly,
    resetPreferences,
  } = useCaseListPreferences();
  const {
    requestClose,
    overlayProps,
    getCloseButtonProps
  } = useOverlayDismiss({
    isOpen,
    onClose
  });
  const [caseConfirmationStatus, setCaseConfirmationStatus] = useState<CaseConfirmationStatus>({});
  const caseConfirmationStatusRef = useRef<CaseConfirmationStatus>({});

  const loadCases = useCallback(async () => {
    try {
      const [ownedCases, readOnlyCases] = await Promise.all([
        getUserCases(user),
        getUserReadOnlyCases(user),
      ]);

      const ownedCaseEntries = await Promise.all(
        ownedCases.map(async (entry) => {
          const caseData = await getCaseData(user, entry.caseNumber).catch(() => null);

          return {
            caseNumber: entry.caseNumber,
            createdAt: entry.createdAt,
            archived: caseData?.archived === true,
            isReadOnly: false,
          } as CasesModalCaseItem;
        })
      );

      const readOnlyEntries: CasesModalCaseItem[] = readOnlyCases.map((entry) => ({
        caseNumber: entry.caseNumber,
        createdAt: entry.importedAt,
        archived: false,
        isReadOnly: true,
      }));

      const mergedCasesMap = new Map<string, CasesModalCaseItem>();
      [...ownedCaseEntries, ...readOnlyEntries].forEach((entry) => {
        if (!mergedCasesMap.has(entry.caseNumber)) {
          mergedCasesMap.set(entry.caseNumber, entry);
        }
      });

      setAllCases(Array.from(mergedCasesMap.values()));
      setSelectedCaseNumber((previous) => previous ?? (currentCase || null));
    } catch (err) {
      console.error('Failed to load cases:', err);
      setError('Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  }, [user, currentCase]);

  useEffect(() => {
    caseConfirmationStatusRef.current = caseConfirmationStatus;
  }, [caseConfirmationStatus]);

  const startLoading = () => {
    setIsLoading(true);
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      const loadingTimer = window.setTimeout(() => {
        startLoading();
      }, 0);

      void loadCases();

      return () => {
        window.clearTimeout(loadingTimer);
      };
    }
  }, [isOpen, loadCases]);

  const archiveScopedCases = useMemo(() => {
    if (preferences.showArchivedOnly) {
      return allCases.filter((entry) => entry.archived && !entry.isReadOnly);
    }

    return allCases.filter((entry) => !entry.archived && !entry.isReadOnly);
  }, [allCases, preferences.showArchivedOnly]);

  const visibleCases = useMemo(() => {
    const baseCases = getCasesForModal(allCases, preferences, caseConfirmationStatus);
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return baseCases;
    }

    return baseCases.filter((entry) =>
      entry.caseNumber.toLowerCase().includes(normalizedQuery)
    );
  }, [allCases, preferences, caseConfirmationStatus, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(visibleCases.length / CASES_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(totalPages - 1);
    }
  }, [currentPage, totalPages]);

  const paginatedCases = visibleCases.slice(
    currentPage * CASES_PER_PAGE,
    (currentPage + 1) * CASES_PER_PAGE
  );

  const hasCustomPreferences =
    preferences.sortBy !== DEFAULT_CASES_MODAL_PREFERENCES.sortBy ||
    preferences.confirmationFilter !== DEFAULT_CASES_MODAL_PREFERENCES.confirmationFilter ||
    preferences.showArchivedOnly !== DEFAULT_CASES_MODAL_PREFERENCES.showArchivedOnly;

  const selectedCase = useMemo(
    () => allCases.find((entry) => entry.caseNumber === selectedCaseNumber) ?? null,
    [allCases, selectedCaseNumber]
  );

  const canRenameSelectedCase = Boolean(
    selectedCase && !selectedCase.archived && !selectedCase.isReadOnly
  );

  const canArchiveSelectedCase = Boolean(
    selectedCase && !selectedCase.archived && !selectedCase.isReadOnly
  );

  const canDeleteSelectedCase = Boolean(
    selectedCase && selectedCase.caseNumber !== currentCase && !selectedCase.isReadOnly
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [preferences.sortBy, preferences.confirmationFilter, preferences.showArchivedOnly]);

  useEffect(() => {
    if (paginatedCases.length === 0) {
      setFocusedIndex(0);
      return;
    }

    if (focusedIndex > paginatedCases.length - 1) {
      setFocusedIndex(paginatedCases.length - 1);
    }
  }, [paginatedCases, focusedIndex]);

  useEffect(() => {
    if (!selectedCaseNumber) {
      return;
    }

    const exists = allCases.some((entry) => entry.caseNumber === selectedCaseNumber);
    if (!exists) {
      setSelectedCaseNumber(null);
    }
  }, [allCases, selectedCaseNumber]);

  const hydrateCaseConfirmationStatuses = useCallback(async (caseNumbers: string[]) => {
    const missingCaseNumbers = caseNumbers.filter(
      (caseNum) => !caseConfirmationStatusRef.current[caseNum]
    );

    if (missingCaseNumbers.length === 0) {
      return;
    }

    const caseStatusPromises = missingCaseNumbers.map(async (caseNum) => {
      try {
        const files = await fetchFiles(user, caseNum);
        const caseSummary = await ensureCaseConfirmationSummary(user, caseNum, files);

        return {
          caseNum,
          includeConfirmation: caseSummary.includeConfirmation,
          isConfirmed: caseSummary.isConfirmed,
        };
      } catch (err) {
        console.error(`Error fetching confirmation status for case ${caseNum}:`, err);
        return {
          caseNum,
          includeConfirmation: false,
          isConfirmed: false,
        };
      }
    });

    const results = await Promise.all(caseStatusPromises);

    setCaseConfirmationStatus((previous) => {
      const next = { ...previous };

      results.forEach((result) => {
        next[result.caseNum] = {
          includeConfirmation: result.includeConfirmation,
          isConfirmed: result.isConfirmed,
        };
      });

      return next;
    });
  }, [user]);

  // Fetch confirmation status only for currently visible paginated cases
  useEffect(() => {
    let isCancelled = false;

    const loadConfirmationSummary = async () => {
      if (!isOpen) {
        return;
      }

      const summary = await getConfirmationSummaryDocument(user).catch((err) => {
        console.error('Failed to load confirmation summary:', err);
        return null;
      });

      if (!summary || isCancelled) {
        return;
      }

      const statuses: CaseConfirmationStatus = {};
      for (const [caseNum, entry] of Object.entries(summary.cases)) {
        statuses[caseNum] = {
          includeConfirmation: entry.includeConfirmation,
          isConfirmed: entry.isConfirmed
        };
      }

      setCaseConfirmationStatus(statuses);
    };

    loadConfirmationSummary();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, user, confirmationSaveVersion]);

  useEffect(() => {
    if (!isOpen || paginatedCases.length === 0) {
      return;
    }

    void hydrateCaseConfirmationStatuses(paginatedCases.map((entry) => entry.caseNumber));
  }, [isOpen, paginatedCases, hydrateCaseConfirmationStatuses]);

  useEffect(() => {
    if (!isOpen || preferences.confirmationFilter === 'all' || archiveScopedCases.length === 0) {
      return;
    }

    void hydrateCaseConfirmationStatuses(archiveScopedCases.map((entry) => entry.caseNumber));
  }, [
    isOpen,
    preferences.confirmationFilter,
    archiveScopedCases,
    hydrateCaseConfirmationStatuses,
  ]);

  const handleSelectCase = (caseNum: string, index: number) => {
    setSelectedCaseNumber(caseNum);
    setFocusedIndex(index);
  };

  const handleOpenSelectedCase = () => {
    if (!selectedCaseNumber) {
      return;
    }

    onSelectCase(selectedCaseNumber);
    requestClose();
  };

  const handleRenameSelectedCase = async () => {
    if (!selectedCase || !canRenameSelectedCase) {
      setActionNotice({
        type: 'warning',
        message: 'Selected case cannot be renamed.',
      });
      return;
    }

    setActionNotice(null);
    setIsRenameModalOpen(true);
  };

  const handleRenameSelectedCaseSubmit = async (nextCaseName: string) => {
    if (!selectedCase) {
      setActionNotice({
        type: 'error',
        message: 'No selected case to rename.',
      });
      return;
    }

    const nextCaseNumber = nextCaseName.trim();
    if (!nextCaseNumber) {
      setActionNotice({
        type: 'error',
        message: 'Provide a new case number.',
      });
      return;
    }

    if (!validateCaseNumber(nextCaseNumber)) {
      setActionNotice({
        type: 'error',
        message: 'Invalid case number format.',
      });
      return;
    }

    setIsRunningAction(true);
    setActionNotice(null);

    try {
      await renameCase(user, selectedCase.caseNumber, nextCaseNumber);
      await loadCases();
      setSelectedCaseNumber(nextCaseNumber);
      setIsRenameModalOpen(false);

      if (selectedCase.caseNumber === currentCase) {
        onSelectCase(nextCaseNumber);
      }

      setActionNotice({
        type: 'success',
        message: `Case renamed to ${nextCaseNumber}.`,
      });
    } catch (renameError) {
      setActionNotice({
        type: 'error',
        message: renameError instanceof Error ? renameError.message : 'Failed to rename case.',
      });
    } finally {
      setIsRunningAction(false);
    }
  };

  const handleArchiveSelectedCase = async () => {
    if (!selectedCase || !canArchiveSelectedCase) {
      setActionNotice({
        type: 'warning',
        message: 'Selected case cannot be archived.',
      });
      return;
    }

    setActionNotice(null);
    setIsArchiveModalOpen(true);
  };

  const handleArchiveSelectedCaseSubmit = async (archiveReason: string) => {
    if (!selectedCase) {
      setActionNotice({
        type: 'error',
        message: 'No selected case to archive.',
      });
      return;
    }

    setIsRunningAction(true);
    setActionNotice(null);

    try {
      await archiveCase(user, selectedCase.caseNumber, archiveReason);
      await loadCases();
      setIsArchiveModalOpen(false);

      if (selectedCase.caseNumber === currentCase) {
        onSelectCase(selectedCase.caseNumber);
      }

      setActionNotice({
        type: 'success',
        message: 'Case archived successfully.',
      });
    } catch (archiveError) {
      setActionNotice({
        type: 'error',
        message: archiveError instanceof Error ? archiveError.message : 'Failed to archive case.',
      });
    } finally {
      setIsRunningAction(false);
    }
  };

  const handleDeleteSelectedCase = async () => {
    if (!selectedCase || !canDeleteSelectedCase) {
      const isCurrentCaseSelection = selectedCase?.caseNumber === currentCase;

      setActionNotice({
        type: 'warning',
        message: isCurrentCaseSelection
          ? 'Open a different case before deleting this one.'
          : 'Selected case cannot be deleted.',
      });
      return;
    }

    setActionNotice(null);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSelectedCaseSubmit = async () => {
    if (!selectedCase) {
      setActionNotice({
        type: 'error',
        message: 'No selected case to delete.',
      });
      return;
    }

    setIsRunningAction(true);
    setActionNotice(null);

    try {
      const deleteResult = await deleteCase(user, selectedCase.caseNumber);
      await loadCases();
      setSelectedCaseNumber(null);
      setIsDeleteModalOpen(false);

      if (deleteResult.missingImages.length > 0) {
        setActionNotice({
          type: 'warning',
          message: `Case deleted. ${deleteResult.missingImages.length} image(s) were missing and skipped.`,
        });
      } else {
        setActionNotice({
          type: 'success',
          message: 'Case deleted successfully.',
        });
      }
    } catch (deleteError) {
      setActionNotice({
        type: 'error',
        message: deleteError instanceof Error ? deleteError.message : 'Failed to delete case.',
      });
    } finally {
      setIsRunningAction(false);
    }
  };

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    caseNum: string,
    index: number
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(index + 1, paginatedCases.length - 1);
      setFocusedIndex(nextIndex);
      window.requestAnimationFrame(() => {
        caseRowRefs.current[nextIndex]?.focus();
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = Math.max(index - 1, 0);
      setFocusedIndex(nextIndex);
      window.requestAnimationFrame(() => {
        caseRowRefs.current[nextIndex]?.focus();
      });
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectCase(caseNum, index);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      aria-label="Close cases dialog"
      {...overlayProps}
    >
      <div className={styles.modal}>
        <header className={styles.modalHeader}>
          <h2>All Cases</h2>
          <button className={styles.closeButton} {...getCloseButtonProps({ ariaLabel: 'Close cases dialog' })}>&times;</button>
        </header>

        <div className={styles.modalContent}>
          {isLoading ? (
            <p className={styles.loading}>Loading cases...</p>
          ) : error ? (
            <p className={styles.error}>{error}</p>
          ) : allCases.length === 0 ? (
            <p className={styles.emptyState}>No cases found</p>
          ) : (
            <>
              <section className={styles.controlsSection} aria-label="Case list controls">
                <div className={styles.controlGroup}>
                  <label htmlFor="cases-sort">Sort</label>
                  <select
                    id="cases-sort"
                    value={preferences.sortBy}
                    onChange={(event) => setSortBy(event.target.value as CasesModalSortBy)}
                  >
                    <option value="recent">Most Recent</option>
                    <option value="alphabetical">Numerical/Alphabetical</option>
                  </select>
                </div>

                <div className={styles.controlGroup}>
                  <label htmlFor="cases-confirmation-filter">Confirmation</label>
                  <select
                    id="cases-confirmation-filter"
                    value={preferences.confirmationFilter}
                    onChange={(event) =>
                      setConfirmationFilter(event.target.value as CasesModalConfirmationFilter)
                    }
                  >
                    <option value="all">All Cases</option>
                    <option value="pending">Pending Confirmation</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="none-requested">None Requested</option>
                  </select>
                </div>

                <label className={styles.archiveToggle}>
                  <input
                    type="checkbox"
                    checked={preferences.showArchivedOnly}
                    onChange={(event) => setShowArchivedOnly(event.target.checked)}
                  />
                  Archived only
                </label>

                <button
                  type="button"
                  className={styles.resetButton}
                  onClick={resetPreferences}
                  disabled={!hasCustomPreferences && searchQuery.trim().length === 0}
                >
                  Reset
                </button>
              </section>

              <div className={styles.searchSection}>
                <label htmlFor="case-search">Search case number</label>
                <input
                  id="case-search"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Type to filter case numbers"
                  className={styles.searchInput}
                />
              </div>

              <p className={styles.caseCount}>
                {visibleCases.length} shown of {allCases.length} total cases
              </p>

              {actionNotice && (
                <p
                  className={`${styles.actionNotice} ${
                    actionNotice.type === 'error'
                      ? styles.actionNoticeError
                      : actionNotice.type === 'warning'
                        ? styles.actionNoticeWarning
                        : styles.actionNoticeSuccess
                  }`}
                >
                  {actionNotice.message}
                </p>
              )}

              {visibleCases.length === 0 ? (
                <p className={styles.emptyState}>No cases match your filters</p>
              ) : (
                <ul className={styles.casesList} role="radiogroup" aria-label="Cases list">
                  {paginatedCases.map((caseEntry, index) => {
                    const caseNum = caseEntry.caseNumber;
                    const confirmationStatus = caseConfirmationStatus[caseNum] || DEFAULT_CONFIRMATION_STATUS;
                    const isSelected = selectedCaseNumber === caseNum;
                    const confirmationLabel = confirmationStatus.includeConfirmation
                      ? confirmationStatus.isConfirmed
                        ? 'Confirmed'
                        : 'Pending'
                      : 'None Requested';

                    let confirmationClass = '';

                    if (confirmationStatus.includeConfirmation) {
                      confirmationClass = confirmationStatus.isConfirmed
                        ? styles.caseItemConfirmed
                        : styles.caseItemNotConfirmed;
                    }

                    return (
                      <li key={caseNum}>
                        <div
                          ref={(node) => {
                            caseRowRefs.current[index] = node;
                          }}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={focusedIndex === index ? 0 : -1}
                          className={`${styles.caseItem} ${isSelected ? styles.active : ''} ${confirmationClass}`}
                          onClick={() => handleSelectCase(caseNum, index)}
                          onFocus={() => setFocusedIndex(index)}
                          onKeyDown={(event) => handleRowKeyDown(event, caseNum, index)}
                        >
                          <input
                            type="radio"
                            name="case-selection"
                            checked={isSelected}
                            onChange={() => handleSelectCase(caseNum, index)}
                            onClick={(event) => event.stopPropagation()}
                            className={styles.caseSelector}
                            aria-label={`Select case ${caseNum}`}
                          />

                          <div className={styles.caseDetails}>
                            <input
                              type="text"
                              readOnly
                              value={caseNum}
                              className={styles.caseNumberInput}
                              aria-label={`Case number ${caseNum}`}
                              onClick={(event) => event.stopPropagation()}
                            />
                            <span className={styles.caseMetaText}>
                              Created: {getCaseUpdatedLabel(caseEntry.createdAt)}
                            </span>
                          </div>

                          <span
                            className={`${styles.confirmationBadge} ${confirmationClass}`}
                            aria-label={`Confirmation status: ${confirmationLabel}`}
                          >
                            {confirmationLabel}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        <div className={styles.footerActions}>
          <div className={styles.maintenanceActions}>
            <button
              type="button"
              className={styles.secondaryActionButton}
              onClick={() => {
                setSearchQuery('');
                resetPreferences();
              }}
              disabled={isRunningAction}
            >
              Clear Filters
            </button>
            <button
              type="button"
              className={`${styles.secondaryActionButton} ${styles.renameActionButton}`}
              onClick={handleRenameSelectedCase}
              disabled={!canRenameSelectedCase || isRunningAction}
            >
              Rename Selected
            </button>
            <button
              type="button"
              className={`${styles.secondaryActionButton} ${styles.archiveActionButton}`}
              onClick={handleArchiveSelectedCase}
              disabled={!canArchiveSelectedCase || isRunningAction}
            >
              Archive Selected
            </button>
            <button
              type="button"
              className={`${styles.secondaryActionButton} ${styles.deleteActionButton}`}
              onClick={handleDeleteSelectedCase}
              disabled={!canDeleteSelectedCase || isRunningAction}
            >
              Delete Selected
            </button>
          </div>

          <button
            type="button"
            className={styles.openSelectedButton}
            onClick={handleOpenSelectedCase}
            disabled={!selectedCaseNumber || isRunningAction}
          >
            {isRunningAction ? 'Working...' : 'Open Selected Case'}
          </button>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 0}
              >
                Previous
              </button>
              <span>{currentPage + 1} of {totalPages} ({visibleCases.length} filtered cases)</span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages - 1}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <RenameCaseModal
        isOpen={isRenameModalOpen}
        currentCase={selectedCase?.caseNumber || ''}
        isSubmitting={isRunningAction}
        onClose={() => setIsRenameModalOpen(false)}
        onSubmit={handleRenameSelectedCaseSubmit}
      />

      <ArchiveCaseModal
        isOpen={isArchiveModalOpen}
        currentCase={selectedCase?.caseNumber || ''}
        isSubmitting={isRunningAction}
        onClose={() => setIsArchiveModalOpen(false)}
        onSubmit={handleArchiveSelectedCaseSubmit}
      />

      <DeleteCaseModal
        isOpen={isDeleteModalOpen}
        currentCase={selectedCase?.caseNumber || ''}
        isSubmitting={isRunningAction}
        onClose={() => setIsDeleteModalOpen(false)}
        onSubmit={handleDeleteSelectedCaseSubmit}
      />
    </div>
  );
};