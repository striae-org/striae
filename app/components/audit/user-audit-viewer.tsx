import { useContext, useEffect, useMemo } from 'react';
import { AuthContext } from '~/contexts/auth.context';
import { type AuditAction, type AuditResult } from '~/types';
import { AuditViewerHeader } from './viewer/audit-viewer-header';
import { AuditUserInfoCard } from './viewer/audit-user-info-card';
import { AuditActivitySummary } from './viewer/audit-activity-summary';
import { AuditFiltersPanel } from './viewer/audit-filters-panel';
import { AuditEntriesList } from './viewer/audit-entries-list';
import { useAuditViewerData } from './viewer/use-audit-viewer-data';
import { useAuditViewerFilters } from './viewer/use-audit-viewer-filters';
import { useAuditViewerExport } from './viewer/use-audit-viewer-export';
import styles from './user-audit.module.css';

interface UserAuditViewerProps {
  isOpen: boolean;
  onClose: () => void;
  caseNumber?: string; // Optional: filter by specific case
  title?: string; // Optional: custom title
}

export const UserAuditViewer = ({ isOpen, onClose, caseNumber, title }: UserAuditViewerProps) => {
  const { user } = useContext(AuthContext);
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
    setError,
    auditTrail,
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

  const {
    handleExportCSV,
    handleExportJSON,
    handleGenerateReport
  } = useAuditViewerExport({
    user,
    effectiveCaseNumber,
    filteredEntries,
    auditTrail,
    setError
  });

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  const getActionIcon = (action: AuditAction): string => {
    switch (action) {
      // User & Session Management
      case 'user-login': return '🔑';
      case 'user-logout': return '🚪';
      case 'user-profile-update': return '👤';
      case 'user-password-reset': return '🔒';
      // NEW: User Registration & Authentication
      case 'user-registration': return '📝';
      case 'email-verification': return '📧';
      case 'mfa-enrollment': return '🔐';
      case 'mfa-authentication': return '📱';
      
      // Case Management
      case 'case-create': return '📂';
      case 'case-rename': return '✏️';
      case 'case-delete': return '🗑️';
      
      // Confirmation Workflow
      case 'case-export': return '📤';
      case 'case-import': return '📥';
      case 'confirmation-create': return '✅';
      case 'confirmation-export': return '📤';
      case 'confirmation-import': return '📥';
      
      // File Operations
      case 'file-upload': return '⬆️';
      case 'file-delete': return '🗑️';
      case 'file-access': return '👁️';
      
      // Annotation Operations
      case 'annotation-create': return '✨';
      case 'annotation-edit': return '✏️';
      case 'annotation-delete': return '❌';
      
      // Document Generation
      case 'pdf-generate': return '📄';
      
      // Security & Monitoring
      case 'security-violation': return '🚨';
      
      // Legacy Actions
      case 'export': return '📤';
      case 'import': return '📥';
      case 'confirm': return '✓';
      
      default: return '📄';
    }
  };

  const getStatusIcon = (result: AuditResult): string => {
    switch (result) {
      case 'success': return '✅';
      case 'failure': return '❌';
      case 'warning': return '⚠️';
      case 'blocked': return '🛑';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  // Get summary statistics
  const totalEntries = auditEntries.length;
  const successfulEntries = auditEntries.filter(e => e.result === 'success').length;
  const failedEntries = auditEntries.filter(e => e.result === 'failure').length;
  const securityIncidents = auditEntries.filter(e => 
    e.action === 'security-violation'
  ).length;
  const loginSessions = auditEntries.filter(e => e.action === 'user-login').length;
  const userBadgeId = userData?.badgeId?.trim() || '';

  const handleOverlayMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleOverlayKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={handleOverlayMouseDown}
      onKeyDown={handleOverlayKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Close audit trail dialog"
    >
      <div className={styles.modal}>
        <AuditViewerHeader
          title={title || (effectiveCaseNumber ? `Audit Trail - Case ${effectiveCaseNumber}` : 'My Audit Trail')}
          hasEntries={auditEntries.length > 0}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          onGenerateReport={handleGenerateReport}
          onClose={onClose}
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
              {/* User Information Section */}
              {user && (
                <AuditUserInfoCard user={user} userData={userData} userBadgeId={userBadgeId} />
              )}

              {/* Summary Section */}
              <AuditActivitySummary
                caseNumber={caseNumber}
                filterCaseNumber={filterCaseNumber}
                dateRangeDisplay={dateRangeDisplay}
                totalEntries={totalEntries}
                successfulEntries={successfulEntries}
                failedEntries={failedEntries}
                loginSessions={loginSessions}
                securityIncidents={securityIncidents}
              />

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
              <AuditEntriesList
                entries={filteredEntries}
                getActionIcon={getActionIcon}
                getStatusIcon={getStatusIcon}
                formatTimestamp={formatTimestamp}
              />

            </>
          )}

          {auditEntries.length === 0 && !loading && !error && (
            <div className={styles.noData}>
              <p>No audit trail available. Your activities will appear here as you use Striae.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
