import { use, useCallback, useMemo, useState } from 'react';
import { AuthContext } from '~/contexts/auth.context';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import { exportAuditPDF } from '~/components/actions/export-audit-pdf';
import { Toast, type ToastType } from '~/components/toast/toast';
import { AuditViewerHeader } from './viewer/audit-viewer-header';
import { AuditUserInfoCard } from './viewer/audit-user-info-card';
import { AuditActivitySummary } from './viewer/audit-activity-summary';
import { AuditFiltersPanel } from './viewer/audit-filters-panel';
import { AuditEntriesList } from './viewer/audit-entries-list';
import { summarizeAuditEntries } from './viewer/audit-viewer-utils';
import { useAuditViewerData } from './viewer/use-audit-viewer-data';
import { useAuditViewerFilters } from './viewer/use-audit-viewer-filters';
import styles from './user-audit.module.css';

interface UserAuditViewerProps {
  isOpen: boolean;
  onClose: () => void;
  caseNumber?: string; // Optional: filter by specific case
  title?: string; // Optional: custom title
}

export const UserAuditViewer = ({ isOpen, onClose, caseNumber, title }: UserAuditViewerProps) => {
  const { user } = use(AuthContext);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<ToastType>('success');
  const [toastMessage, setToastMessage] = useState('');
  const [toastDuration, setToastDuration] = useState(4000);

  const {
    filterAction,
    setFilterAction,
    filterResult,
    setFilterResult,
    filterCaseNumber,
    caseNumberInput,
    setCaseNumberInput,
    filterBadgeId,
    badgeIdInput,
    setBadgeIdInput,
    dateRange,
    customStartDate,
    customEndDate,
    customStartDateInput,
    customEndDateInput,
    setCustomStartDateInput,
    setCustomEndDateInput,
    handleApplyCaseFilter,
    handleClearCaseFilter,
    handleApplyBadgeFilter,
    handleClearBadgeFilter,
    handleApplyCustomDateRange,
    handleClearCustomDateRange,
    handleDateRangeChange,
    getFilteredEntries,
    dateRangeDisplay,
    effectiveCaseNumber
  } = useAuditViewerFilters(caseNumber);

  const {
    auditEntries,
    userData,
    loading,
    error,
    isArchivedReadOnlyCase,
    bundledAuditWarning,
    loadAuditData
  } = useAuditViewerData({
    isOpen,
    user,
    effectiveCaseNumber,
    dateRange,
    customStartDate,
    customEndDate
  });

  const filteredEntries = useMemo(() => getFilteredEntries(auditEntries), [auditEntries, getFilteredEntries]);
  const auditSummary = useMemo(() => summarizeAuditEntries(auditEntries), [auditEntries]);

  const {
    requestClose,
    overlayProps
  } = useOverlayDismiss({
    isOpen,
    onClose
  });

  const userBadgeId = userData?.badgeId?.trim() || '';
  const isCaseScopedViewer = Boolean(effectiveCaseNumber?.trim());

  const handleExportPdf = useCallback(async () => {
    if (!user || !effectiveCaseNumber || isExportingPdf) {
      return;
    }

    const displayName = user.displayName?.trim() || '';
    const [firstFromDisplayName, ...lastFromDisplayNameParts] = displayName.split(/\s+/).filter(Boolean);

    await exportAuditPDF({
      user,
      caseNumber: effectiveCaseNumber,
      userCompany: userData?.company,
      userFirstName: firstFromDisplayName || userData?.firstName || '',
      userLastName: lastFromDisplayNameParts.join(' ') || userData?.lastName || '',
      userBadgeId,
      setIsExportingPDF: setIsExportingPdf,
      setToastType,
      setToastMessage,
      setShowToast,
      setToastDuration
    });
  }, [
    effectiveCaseNumber,
    isExportingPdf,
    user,
    userBadgeId,
    userData?.company,
    userData?.firstName,
    userData?.lastName
  ]);

  if (!isOpen) return null;

  return (
    <>
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={toastDuration}
      />
      <div
        className={styles.overlay}
        aria-label="Close audit trail dialog"
        {...overlayProps}
      >
        <div className={styles.modal}>
          <AuditViewerHeader
            title={title || (effectiveCaseNumber ? `Audit Trail - Case ${effectiveCaseNumber}` : 'My Audit Trail')}
            onClose={requestClose}
            onExportPdf={isCaseScopedViewer ? () => void handleExportPdf() : undefined}
            canExportPdf={isCaseScopedViewer && auditEntries.length > 0 && !loading && !error}
            isExportingPdf={isExportingPdf}
          />

          <div className={styles.content}>
            {loading && (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading your audit trail...this may take a while for longer time ranges</p>
              </div>
            )}

            {error && (
              <div className={styles.error}>
                <p>Error: {error}</p>
                <button onClick={loadAuditData} className={styles.retryButton}>
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && (
              <>
                {isArchivedReadOnlyCase && (
                  <div className={bundledAuditWarning ? styles.archivedWarning : styles.archivedNotice}>
                    <p>
                      {bundledAuditWarning || 'Viewing bundled audit trail data from this imported archived case package.'}
                    </p>
                  </div>
                )}

                {/* User Information Section */}
                {user && (
                  <AuditUserInfoCard user={user} userData={userData} userBadgeId={userBadgeId} />
                )}

                {/* Summary Section */}
                <AuditActivitySummary
                  caseNumber={caseNumber}
                  filterCaseNumber={filterCaseNumber}
                  dateRangeDisplay={dateRangeDisplay}
                  summary={auditSummary}
                />

                {isCaseScopedViewer && (
                  <div className={styles.exportScopeNote}>
                    Export PDF always includes full case history from case creation through now, regardless of current filters.
                  </div>
                )}

                {/* Filters */}
                <AuditFiltersPanel
                  dateRange={dateRange}
                  customStartDate={customStartDate}
                  customEndDate={customEndDate}
                  customStartDateInput={customStartDateInput}
                  customEndDateInput={customEndDateInput}
                  caseNumber={caseNumber}
                  filterCaseNumber={filterCaseNumber}
                  caseNumberInput={caseNumberInput}
                  filterBadgeId={filterBadgeId}
                  badgeIdInput={badgeIdInput}
                  filterAction={filterAction}
                  filterResult={filterResult}
                  onDateRangeChange={handleDateRangeChange}
                  onCustomStartDateInputChange={setCustomStartDateInput}
                  onCustomEndDateInputChange={setCustomEndDateInput}
                  onApplyCustomDateRange={handleApplyCustomDateRange}
                  onClearCustomDateRange={handleClearCustomDateRange}
                  onCaseNumberInputChange={setCaseNumberInput}
                  onApplyCaseFilter={handleApplyCaseFilter}
                  onClearCaseFilter={handleClearCaseFilter}
                  onBadgeIdInputChange={setBadgeIdInput}
                  onApplyBadgeFilter={handleApplyBadgeFilter}
                  onClearBadgeFilter={handleClearBadgeFilter}
                  onFilterActionChange={setFilterAction}
                  onFilterResultChange={setFilterResult}
                />

                {/* Entries List */}
                <AuditEntriesList entries={filteredEntries} />

              </>
            )}

            {auditEntries.length === 0 && !loading && !error && (
              <div className={styles.noData}>
                <p>
                  {isArchivedReadOnlyCase
                    ? 'No bundled audit trail entries are available for this imported archived case.'
                    : 'No audit trail available. Your activities will appear here as you use Striae.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
