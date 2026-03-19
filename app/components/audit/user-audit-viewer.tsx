import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '~/contexts/auth.context';
import { auditService, auditExportService } from '~/services/audit';
import { type ValidationAuditEntry, type AuditAction, type AuditResult, type AuditTrail, type UserData, type WorkflowPhase } from '~/types';
import { getUserData } from '~/utils/data';
import { AuditViewerHeader } from './viewer/audit-viewer-header';
import { AuditUserInfoCard } from './viewer/audit-user-info-card';
import { AuditActivitySummary } from './viewer/audit-activity-summary';
import { AuditFiltersPanel } from './viewer/audit-filters-panel';
import { AuditEntriesList } from './viewer/audit-entries-list';
import styles from './user-audit.module.css';

const isWorkflowPhase = (phase: unknown): phase is WorkflowPhase =>
  phase === 'casework' ||
  phase === 'case-export' ||
  phase === 'case-import' ||
  phase === 'confirmation' ||
  phase === 'user-management';

interface UserAuditViewerProps {
  isOpen: boolean;
  onClose: () => void;
  caseNumber?: string; // Optional: filter by specific case
  title?: string; // Optional: custom title
}

export const UserAuditViewer = ({ isOpen, onClose, caseNumber, title }: UserAuditViewerProps) => {
  const { user } = useContext(AuthContext);
  const [auditEntries, setAuditEntries] = useState<ValidationAuditEntry[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [filterAction, setFilterAction] = useState<AuditAction | 'all'>('all');
  const [filterResult, setFilterResult] = useState<AuditResult | 'all'>('all');
  const [filterCaseNumber, setFilterCaseNumber] = useState<string>('');
  const [caseNumberInput, setCaseNumberInput] = useState<string>('');
  const [filterBadgeId, setFilterBadgeId] = useState<string>('');
  const [badgeIdInput, setBadgeIdInput] = useState<string>('');
  const [dateRange, setDateRange] = useState<'1d' | '7d' | '30d' | '90d' | 'custom'>('1d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [customStartDateInput, setCustomStartDateInput] = useState<string>('');
  const [customEndDateInput, setCustomEndDateInput] = useState<string>('');
  const [auditTrail, setAuditTrail] = useState<AuditTrail | null>(null);

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

  const loadUserData = useCallback(async () => {
    if (!user) return;
    
    try {
      const data = await getUserData(user);
      setUserData(data);
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Don't set error state for user data failure, just log it
    }
  }, [user]);

  const loadAuditData = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError('');

    try {
      // Calculate date range
      let startDate: string | undefined;
      let endDate: string | undefined;
      
      if (dateRange === 'custom') {
        if (customStartDate) {
          startDate = new Date(customStartDate + 'T00:00:00').toISOString();
        }
        if (customEndDate) {
          endDate = new Date(customEndDate + 'T23:59:59').toISOString();
        }
        // If only one custom date is provided, handle it appropriately
        if (customStartDate && !customEndDate) {
          // If only start date, set end date to now
          const endDateObj = new Date();
          endDate = endDateObj.toISOString();
        } else if (!customStartDate && customEndDate) {
          // If only end date, set start date to 30 days before end date
          const startDateObj = new Date(customEndDate + 'T23:59:59');
          startDateObj.setDate(startDateObj.getDate() - 30);
          startDate = startDateObj.toISOString();
        }
      } else if (dateRange === '90d') {
        // For '90d' entries, get last 90 days to avoid loading too much data
        const startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - 90);
        startDate = startDateObj.toISOString();
        
        const endDateObj = new Date();
        endDate = endDateObj.toISOString();
      } else {
        // Handle predefined ranges like '1d', '7d', '30d'
        const days = parseInt(dateRange.replace('d', ''));
        const startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - days);
        startDate = startDateObj.toISOString();
        
        // Always set end date to now for proper range querying
        const endDateObj = new Date();
        endDate = endDateObj.toISOString();
      }

      // Get audit entries (filtered by case if specified)
      const effectiveCaseNumber = caseNumber || (filterCaseNumber.trim() || undefined);
      const entries = await auditService.getAuditEntriesForUser(user.uid, {
        caseNumber: effectiveCaseNumber,
        startDate,
        endDate,
        limit: effectiveCaseNumber ? 1000 : 500 // More entries for case-specific view
      });

      setAuditEntries(entries);

      // If case-specific, create audit trail for enhanced export functionality
      if (effectiveCaseNumber && entries.length > 0) {
        const trail: AuditTrail = {
          caseNumber: effectiveCaseNumber,
          workflowId: `workflow-${effectiveCaseNumber}-${user.uid}`,
          entries,
          summary: {
            totalEvents: entries.length,
            successfulEvents: entries.filter(e => e.result === 'success').length,
            failedEvents: entries.filter(e => e.result === 'failure').length,
            warningEvents: entries.filter(e => e.result === 'warning').length,
            workflowPhases: [...new Set(entries
              .map(e => e.details.workflowPhase)
              .filter(isWorkflowPhase))],
            participatingUsers: [...new Set(entries.map(e => e.userId))],
            startTimestamp: entries[entries.length - 1]?.timestamp || new Date().toISOString(),
            endTimestamp: entries[0]?.timestamp || new Date().toISOString(),
            complianceStatus: entries.some(e => e.result === 'failure') ? 'non-compliant' : 'compliant',
            securityIncidents: entries.filter(e => e.action === 'security-violation').length
          }
        };
        setAuditTrail(trail);
      } else {
        setAuditTrail(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  }, [
    user,
    dateRange,
    customStartDate,
    customEndDate,
    caseNumber,
    filterCaseNumber
  ]);

  useEffect(() => {
    if (isOpen && user) {
      loadAuditData();
      loadUserData();
    }
  }, [isOpen, user, loadAuditData, loadUserData]);

  const handleApplyCaseFilter = () => {
    setFilterCaseNumber(caseNumberInput.trim());
  };

  const handleClearCaseFilter = () => {
    setCaseNumberInput('');
    setFilterCaseNumber('');
  };

  const handleApplyBadgeFilter = () => {
    setFilterBadgeId(badgeIdInput.trim());
  };

  const handleClearBadgeFilter = () => {
    setBadgeIdInput('');
    setFilterBadgeId('');
  };

  const handleApplyCustomDateRange = () => {
    setCustomStartDate(customStartDateInput);
    setCustomEndDate(customEndDateInput);
  };

  const handleClearCustomDateRange = () => {
    setCustomStartDateInput('');
    setCustomEndDateInput('');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleDateRangeChange = (value: '1d' | '7d' | '30d' | '90d' | 'custom') => {
    setDateRange(value);
    if (value === 'custom') {
      setCustomStartDateInput(customStartDate);
      setCustomEndDateInput(customEndDate);
    }
  };

  const getFilteredEntries = (): ValidationAuditEntry[] => {
    const normalizedBadgeFilter = filterBadgeId.trim().toLowerCase();

    return auditEntries.filter(entry => {
      // Handle consolidation and mapping of actions
      let actionMatch: boolean;
      if (filterAction === 'all') {
        actionMatch = true;
      } else if (filterAction === 'confirmation-create') {
        // Accept both 'confirm' and 'confirmation-create' for this filter
        actionMatch = entry.action === 'confirm' || entry.action === 'confirmation-create';
      } else if (filterAction === 'case-export') {
        // Case exports use legacy 'export' action with 'case-export' workflowPhase
        actionMatch = entry.action === 'export' && entry.details.workflowPhase === 'case-export';
      } else if (filterAction === 'case-import') {
        // Case imports use legacy 'import' action with 'case-import' workflowPhase
        actionMatch = entry.action === 'import' && entry.details.workflowPhase === 'case-import';
      } else if (filterAction === 'confirmation-export') {
        // Confirmation exports use legacy 'export' action with 'confirmation' workflowPhase
        actionMatch = entry.action === 'export' && entry.details.workflowPhase === 'confirmation';
      } else if (filterAction === 'confirmation-import') {
        // Confirmation imports use legacy 'import' action with 'confirmation' workflowPhase
        actionMatch = entry.action === 'import' && entry.details.workflowPhase === 'confirmation';
      } else {
        // Direct action match for all other cases
        actionMatch = entry.action === filterAction;
      }
      
      const resultMatch = filterResult === 'all' || entry.result === filterResult;
      const entryBadgeId = entry.details.userProfileDetails?.badgeId?.trim().toLowerCase() || '';
      const badgeMatch = normalizedBadgeFilter === '' || entryBadgeId.includes(normalizedBadgeFilter);

      return actionMatch && resultMatch && badgeMatch;
    });
  };

  // Export functions
  const handleExportCSV = async () => {
    if (!user) return;
    
    const filteredEntries = getFilteredEntries();
    const effectiveCaseNumber = caseNumber || filterCaseNumber.trim();
    const identifier = effectiveCaseNumber || user.uid;
    const type = effectiveCaseNumber ? 'case' : 'user';
    const filename = auditExportService.generateFilename(type, identifier, 'csv');
    const exportContext = {
      user,
      scopeType: type,
      scopeIdentifier: identifier,
      caseNumber: effectiveCaseNumber || undefined
    } as const;
    
    try {
      if (auditTrail && effectiveCaseNumber) {
        // Use full audit trail export for case-specific data
        await auditExportService.exportAuditTrailToCSV(auditTrail, filename, exportContext);
      } else {
        // Use regular entry export for user data
        await auditExportService.exportToCSV(filteredEntries, filename, exportContext);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export audit trail to CSV');
    }
  };

  const handleExportJSON = async () => {
    if (!user) return;
    
    const filteredEntries = getFilteredEntries();
    const effectiveCaseNumber = caseNumber || filterCaseNumber.trim();
    const identifier = effectiveCaseNumber || user.uid;
    const type = effectiveCaseNumber ? 'case' : 'user';
    const filename = auditExportService.generateFilename(type, identifier, 'csv'); // Will be converted to .json
    const exportContext = {
      user,
      scopeType: type,
      scopeIdentifier: identifier,
      caseNumber: effectiveCaseNumber || undefined
    } as const;
    
    try {
      if (auditTrail && effectiveCaseNumber) {
        // Use full audit trail export for case-specific data
        await auditExportService.exportAuditTrailToJSON(auditTrail, filename, exportContext);
      } else {
        // Use regular entry export for user data
        await auditExportService.exportToJSON(filteredEntries, filename, exportContext);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export audit trail to JSON');
    }
  };

  const handleGenerateReport = async () => {
    if (!user) return;
    
    const filteredEntries = getFilteredEntries();
    const effectiveCaseNumber = caseNumber || filterCaseNumber.trim();
    const identifier = effectiveCaseNumber || user.uid;
    const type = effectiveCaseNumber ? 'case' : 'user';
    const filename = `${type}-audit-report-${identifier}-${new Date().toISOString().split('T')[0]}.txt`;
    const exportContext = {
      user,
      scopeType: type,
      scopeIdentifier: identifier,
      caseNumber: effectiveCaseNumber || undefined
    } as const;
    
    try {
      let reportContent: string;
      
      if (auditTrail && effectiveCaseNumber) {
        // Use audit trail report for case-specific data
        reportContent = await auditExportService.generateReportSummary(auditTrail, exportContext);
      } else {
        // Generate user-specific report
        const totalEntries = filteredEntries.length;
        const successfulActions = filteredEntries.filter(e => e.result === 'success').length;
        const failedActions = filteredEntries.filter(e => e.result === 'failure').length;
        
        const actionCounts = filteredEntries.reduce((acc, entry) => {
          acc[entry.action] = (acc[entry.action] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const dateRange = filteredEntries.length > 0 ? {
          earliest: new Date(Math.min(...filteredEntries.map(e => new Date(e.timestamp).getTime()))),
          latest: new Date(Math.max(...filteredEntries.map(e => new Date(e.timestamp).getTime())))
        } : null;

        reportContent = `${caseNumber ? 'CASE' : 'USER'} AUDIT REPORT
Generated: ${new Date().toISOString()}
${caseNumber ? `Case: ${caseNumber}` : `User: ${user.email}`}
${caseNumber ? '' : `User ID: ${user.uid}`}

=== SUMMARY ===
Total Actions: ${totalEntries}
Successful: ${successfulActions}
Failed: ${failedActions}
Success Rate: ${totalEntries > 0 ? ((successfulActions / totalEntries) * 100).toFixed(1) : 0}%

${dateRange ? `Date Range: ${dateRange.earliest.toLocaleDateString()} - ${dateRange.latest.toLocaleDateString()}` : 'No entries found'}

=== ACTION BREAKDOWN ===
${Object.entries(actionCounts)
  .sort(([,a], [,b]) => b - a)
  .map(([action, count]) => `${action}: ${count}`)
  .join('\n')}

=== RECENT ACTIVITIES ===
${filteredEntries.slice(0, 10).map(entry => 
  `${new Date(entry.timestamp).toLocaleString()} | ${entry.action} | ${entry.result}${entry.details.caseNumber ? ` | Case: ${entry.details.caseNumber}` : ''}`
).join('\n')}

Generated by Striae
`;

        reportContent = await auditExportService.appendSignedReportIntegrity(
          reportContent,
          exportContext,
          totalEntries
        );
      }
      
      // Create and download the report file
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Report generation failed:', error);
      setError('Failed to generate audit report');
    }
  };

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

  const getDateRangeDisplay = (): string => {
    switch (dateRange) {
      case '90d':
        return 'Last 90 Days';
      case 'custom':
        if (customStartDate && customEndDate) {
          const startFormatted = new Date(customStartDate).toLocaleDateString();
          const endFormatted = new Date(customEndDate).toLocaleDateString();
          return `${startFormatted} - ${endFormatted}`;
        } else if (customStartDate) {
          return `From ${new Date(customStartDate).toLocaleDateString()}`;
        } else if (customEndDate) {
          return `Until ${new Date(customEndDate).toLocaleDateString()}`;
        } else {
          return 'Custom Range';
        }
      default:
        return `Last ${dateRange}`;
    }
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
  const filteredEntries = getFilteredEntries();

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
          title={title || (caseNumber ? `Audit Trail - Case ${caseNumber}` : 'My Audit Trail')}
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
                dateRangeDisplay={getDateRangeDisplay()}
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
