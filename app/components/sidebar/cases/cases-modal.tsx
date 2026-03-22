import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import { listCases } from '~/components/actions/case-manage';
import { ensureCaseConfirmationSummary, getConfirmationSummaryDocument } from '~/utils/data';
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

export const CasesModal = ({
  isOpen,
  onClose,
  onSelectCase,
  currentCase,
  user,
  confirmationSaveVersion = 0
}: CasesModalProps) => {
  const [cases, setCases] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const {
    requestClose,
    overlayProps,
    getCloseButtonProps
  } = useOverlayDismiss({
    isOpen,
    onClose
  });
  const [caseConfirmationStatus, setCaseConfirmationStatus] = useState<{
    [caseNum: string]: { includeConfirmation: boolean; isConfirmed: boolean }
  }>({});
  const CASES_PER_PAGE = 10;

  const startLoading = () => {
    setIsLoading(true);
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      const loadingTimer = window.setTimeout(() => {
        startLoading();
      }, 0);
      
      listCases(user)
        .then(fetchedCases => {
          setCases(fetchedCases);
        })
        .catch(err => {
          console.error('Failed to load cases:', err);
          setError('Failed to load cases');
        })
        .finally(() => {
          setIsLoading(false);
        });

      return () => {
        window.clearTimeout(loadingTimer);
      };
    }
  }, [isOpen, user]);

  const paginatedCases = cases.slice(
    currentPage * CASES_PER_PAGE,
    (currentPage + 1) * CASES_PER_PAGE
  );

  const totalPages = Math.ceil(cases.length / CASES_PER_PAGE);

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

      const statuses: { [caseNum: string]: { includeConfirmation: boolean; isConfirmed: boolean } } = {};
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
    let isCancelled = false;

    const fetchCaseConfirmationStatuses = async () => {
      const visibleCases = cases.slice(
        currentPage * CASES_PER_PAGE,
        (currentPage + 1) * CASES_PER_PAGE
      );

      if (!isOpen || visibleCases.length === 0) {
        return;
      }

      const missingCaseNumbers = visibleCases.filter((caseNum) => !caseConfirmationStatus[caseNum]);
      if (missingCaseNumbers.length === 0) {
        return;
      }

      const caseStatusPromises = missingCaseNumbers.map(async (caseNum) => {
        try {
          const files = await fetchFiles(user, caseNum, { skipValidation: true });

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

      // Wait for all case status fetches to complete
      const results = await Promise.all(caseStatusPromises);

      if (isCancelled) {
        return;
      }

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
    };

    fetchCaseConfirmationStatuses();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, currentPage, cases, user, caseConfirmationStatus]);

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
          ) : cases.length === 0 ? (
            <p className={styles.emptyState}>No cases found</p>
          ) : (
            <ul className={styles.casesList}>
              {paginatedCases.map((caseNum) => {
                const confirmationStatus = caseConfirmationStatus[caseNum];
                let confirmationClass = '';
                
                if (confirmationStatus?.includeConfirmation) {
                  confirmationClass = confirmationStatus.isConfirmed 
                    ? styles.caseItemConfirmed 
                    : styles.caseItemNotConfirmed;
                }

                return (
                  <li key={caseNum}>
                    <button
                      className={`${styles.caseItem} ${currentCase === caseNum ? styles.active : ''} ${confirmationClass}`}
                      onClick={() => {
                        onSelectCase(caseNum);
                        requestClose();
                      }}
                    >
                      {caseNum}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 0}
            >
              Previous
            </button>
            <span>{currentPage + 1} of {totalPages} ({cases.length} total cases)</span>
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
  );
};