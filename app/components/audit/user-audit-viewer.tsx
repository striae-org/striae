import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '~/contexts/auth.context';
import { auditService } from '~/services/audit.service';
import { auditExportService } from '~/services/audit-export.service';
import { ValidationAuditEntry, AuditAction, AuditResult, AuditTrail, UserData, WorkflowPhase } from '~/types';
import { getUserData } from '~/utils/permissions';
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
  const [dateRange, setDateRange] = useState<'1d' | '7d' | '30d' | '90d' | 'custom'>('1d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [customStartDateInput, setCustomStartDateInput] = useState<string>('');
  const [customEndDateInput, setCustomEndDateInput] = useState<string>('');
  const [auditTrail, setAuditTrail] = useState<AuditTrail | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadAuditData();
      loadUserData();
    }
  }, [isOpen, user, dateRange, customStartDate, customEndDate, filterCaseNumber, caseNumber]);

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

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      const data = await getUserData(user);
      setUserData(data);
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Don't set error state for user data failure, just log it
    }
  };

  const loadAuditData = async () => {
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
  };

  const handleApplyCaseFilter = () => {
    setFilterCaseNumber(caseNumberInput.trim());
  };

  const handleClearCaseFilter = () => {
    setCaseNumberInput('');
    setFilterCaseNumber('');
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

  const getFilteredEntries = (): ValidationAuditEntry[] => {
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
      return actionMatch && resultMatch;
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
        <div className={styles.header}>
          <h2 className={styles.title}>
            {title || (caseNumber ? `Audit Trail - Case ${caseNumber}` : 'My Audit Trail')}
          </h2>
          <div className={styles.headerActions}>
            {auditEntries.length > 0 && (
              <div className={styles.exportButtons}>
                <button 
                  onClick={handleExportCSV}
                  className={styles.exportButton}
                  title="CSV - Individual entry log with summary data"
                >
                  📊 CSV
                </button>
                <button 
                  onClick={handleExportJSON}
                  className={styles.exportButton}
                  title="JSON - Complete log data for version capture and auditing"
                >
                  📄 JSON
                </button>
                <button 
                  onClick={handleGenerateReport}
                  className={styles.exportButton}
                  title="Summary report only"
                >
                  📋 Report
                </button>
              </div>
            )}
            <button className={styles.closeButton} onClick={onClose}>×</button>
          </div>
        </div>

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
                <div className={styles.summary}>
                  <h3>User Information</h3>
                  <div className={styles.userInfoContent}>
                    <div className={styles.userInfoItem}>
                      Name: <strong>
                        {userData ? `${userData.firstName} ${userData.lastName}` : user.displayName || 'Not provided'}
                      </strong>
                    </div>
                    <div className={styles.userInfoItem}>
                      Email: <strong>{user.email || 'Not provided'}</strong>
                    </div>
                    <div className={styles.userInfoItem}>
                      Lab/Company: <strong>{userData?.company || 'Not provided'}</strong>
                    </div>
                    <div className={styles.userInfoItem}>
                      User ID: <strong>{user.uid}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Section */}
              <div className={styles.summary}>
                <h3>
                  {(caseNumber || filterCaseNumber.trim()) 
                    ? `Case Activity Summary - ${caseNumber || filterCaseNumber.trim()} (${getDateRangeDisplay()})`
                    : `Activity Summary (${getDateRangeDisplay()})`
                  }
                </h3>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <span className={styles.label}>Total Activities:</span>
                    <span className={styles.value}>{totalEntries}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.label}>Successful:</span>
                    <span className={styles.value}>{successfulEntries}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.label}>Failed:</span>
                    <span className={styles.value}>{failedEntries}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.label}>Login Sessions:</span>
                    <span className={styles.value}>{loginSessions}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.label}>Security Incidents:</span>
                    <span className={`${styles.value} ${securityIncidents > 0 ? styles.warning : ''}`}>
                      {securityIncidents}
                    </span>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className={styles.filters}>
                <div className={styles.filterGroup}>
                  <label htmlFor="dateRange">Time Period:</label>
                  <select 
                    id="dateRange"
                    value={dateRange} 
                    onChange={(e) => {
                      const newRange = e.target.value as '1d' | '7d' | '30d' | '90d' | 'custom';
                      setDateRange(newRange);
                      // When switching to custom, populate inputs with current applied values
                      if (newRange === 'custom') {
                        setCustomStartDateInput(customStartDate);
                        setCustomEndDateInput(customEndDate);
                      }
                    }}
                    className={styles.filterSelect}
                  >
                    <option value="1d">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Custom Date Range Inputs */}
                {dateRange === 'custom' && (
                  <div className={styles.customDateRange}>
                    <div className={styles.customDateInputs}>
                      <div className={styles.filterGroup}>
                        <label htmlFor="startDate">Start Date:</label>
                        <input
                          type="date"
                          id="startDate"
                          value={customStartDateInput}
                          onChange={(e) => setCustomStartDateInput(e.target.value)}
                          className={styles.filterInput}
                          max={customEndDateInput || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className={styles.filterGroup}>
                        <label htmlFor="endDate">End Date:</label>
                        <input
                          type="date"
                          id="endDate"
                          value={customEndDateInput}
                          onChange={(e) => setCustomEndDateInput(e.target.value)}
                          className={styles.filterInput}
                          min={customStartDateInput}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className={styles.dateRangeButtons}>
                        {(customStartDateInput || customEndDateInput) && (
                          <button
                            type="button"
                            onClick={handleApplyCustomDateRange}
                            className={styles.filterButton}
                            title="Apply custom date range"
                          >
                            Apply Dates
                          </button>
                        )}
                        {(customStartDate || customEndDate) && (
                          <button
                            type="button"
                            onClick={handleClearCustomDateRange}
                            className={styles.clearButton}
                            title="Clear custom date range"
                          >
                            Clear Dates
                          </button>
                        )}
                      </div>
                    </div>
                    {(customStartDate || customEndDate) && (
                      <div className={styles.activeFilter}>
                        <small>
                          Custom range: 
                          {customStartDate && <strong> from {new Date(customStartDate).toLocaleDateString()}</strong>}
                          {customEndDate && <strong> to {new Date(customEndDate).toLocaleDateString()}</strong>}
                        </small>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.filterGroup}>
                  <label htmlFor="caseFilter">Case Number:</label>
                  <div className={styles.inputWithButton}>
                    <input
                      type="text"
                      id="caseFilter"
                      value={caseNumberInput}
                      onChange={(e) => setCaseNumberInput(e.target.value)}
                      className={styles.filterInput}
                      placeholder="Enter case number..."
                      disabled={!!caseNumber} // Disable if already viewing a specific case
                      title={caseNumber ? "Case filter disabled - viewing specific case" : "Enter complete case number and click Filter"}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && caseNumberInput.trim() && !caseNumber) {
                          handleApplyCaseFilter();
                        }
                      }}
                    />
                    {!caseNumber && (
                      <div className={styles.caseFilterButtons}>
                        {caseNumberInput.trim() && (
                          <button
                            type="button"
                            onClick={handleApplyCaseFilter}
                            className={styles.filterButton}
                            title="Apply case filter"
                          >
                            Filter
                          </button>
                        )}
                        {filterCaseNumber && (
                          <button
                            type="button"
                            onClick={handleClearCaseFilter}
                            className={styles.clearButton}
                            title="Clear case filter"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {filterCaseNumber && !caseNumber && (
                    <div className={styles.activeFilter}>
                      <small>Filtering by case: <strong>{filterCaseNumber}</strong></small>
                    </div>
                  )}
                </div>

                <div className={styles.filterGroup}>
                  <label htmlFor="actionFilter">Activity Type:</label>
                  <select 
                    id="actionFilter"
                    value={filterAction} 
                    onChange={(e) => setFilterAction(e.target.value as AuditAction | 'all')}
                    className={styles.filterSelect}
                  >
                    <option value="all">All Activities</option>
                    <optgroup label="User Sessions">
                      <option value="user-login">Login</option>
                      <option value="user-logout">Logout</option>
                    </optgroup>
                    <optgroup label="Case Management">
                      <option value="case-create">Case Create</option>
                      <option value="case-rename">Case Rename</option>
                      <option value="case-delete">Case Delete</option>
                      <option value="case-export">Case Export</option>
                      <option value="case-import">Case Import</option>
                    </optgroup>
                    <optgroup label="File Operations">
                      <option value="file-upload">File Upload</option>
                      <option value="file-access">File Access</option>
                      <option value="file-delete">File Delete</option>
                    </optgroup>
                    <optgroup label="Annotations">
                      <option value="annotation-create">Annotation Create</option>
                      <option value="annotation-edit">Annotation Edit</option>
                      <option value="annotation-delete">Annotation Delete</option>
                    </optgroup>
                    <optgroup label="Confirmation Activity">
                      <option value="confirmation-create">Confirmation Create</option>
                      <option value="confirmation-export">Confirmation Export</option>
                      <option value="confirmation-import">Confirmation Import</option>
                    </optgroup>
                    <optgroup label="Documents">
                      <option value="pdf-generate">PDF Generate</option>
                    </optgroup>
                    <optgroup label="Security">
                      <option value="security-violation">Security Violation</option>
                    </optgroup>
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label htmlFor="resultFilter">Result:</label>
                  <select 
                    id="resultFilter"
                    value={filterResult} 
                    onChange={(e) => setFilterResult(e.target.value as AuditResult | 'all')}
                    className={styles.filterSelect}
                  >
                    <option value="all">All Results</option>
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                    <option value="warning">Warning</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              {/* Entries List */}
              <div className={styles.entriesList}>
                <h3>Activity Log ({getFilteredEntries().length} entries)</h3>
                {getFilteredEntries().length === 0 ? (
                  <div className={styles.noEntries}>
                    <p>No activities match the current filters.</p>
                  </div>
                ) : (
                  getFilteredEntries().map((entry, index) => (
                    <div key={index} className={`${styles.entry} ${styles[entry.result]}`}>
                      <div className={styles.entryHeader}>
                        <div className={styles.entryIcons}>
                          <span className={styles.actionIcon}>{getActionIcon(entry.action)}</span>
                          <span className={styles.statusIcon}>{getStatusIcon(entry.result)}</span>
                        </div>
                        <div className={styles.entryTitle}>
                          <span className={styles.action}>{entry.action.toUpperCase().replace(/-/g, ' ')}</span>
                          <span className={styles.fileName}>{entry.details.fileName}</span>
                        </div>
                        <div className={styles.entryTimestamp}>
                          {formatTimestamp(entry.timestamp)}
                        </div>
                      </div>

                      {/* Basic Details */}
                      <div className={styles.entryDetails}>
                        {entry.details.caseNumber && (
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Case:</span>
                            <span className={styles.detailValue}>{entry.details.caseNumber}</span>
                          </div>
                        )}

                        {entry.result === 'failure' && entry.details.validationErrors.length > 0 && (
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Error:</span>
                            <span className={styles.detailValue}>{entry.details.validationErrors[0]}</span>
                          </div>
                        )}

                        {/* Session Details for Login/Logout */}
                        {(entry.action === 'user-login' || entry.action === 'user-logout') && entry.details.sessionDetails && (
                          <>
                            {entry.details.sessionDetails.userAgent && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>User Agent:</span>
                                <span className={styles.detailValue}>{entry.details.sessionDetails.userAgent}</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Security Details */}
                        {entry.action === 'security-violation' && entry.details.securityDetails && (
                          <>
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>Severity:</span>
                              <span className={`${styles.detailValue} ${styles.severity} ${styles[entry.details.securityDetails.severity || 'low']}`}>
                                {(entry.details.securityDetails.severity || 'low').toUpperCase()}
                              </span>
                            </div>
                            {entry.details.securityDetails.incidentType && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Type:</span>
                                <span className={styles.detailValue}>{entry.details.securityDetails.incidentType}</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* File Operation Details */}
                        {(entry.action === 'file-upload' || entry.action === 'file-delete' || entry.action === 'file-access') && entry.details.fileDetails && (
                          <>
                            {/* File ID */}
                            {entry.details.fileDetails.fileId && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>File ID:</span>
                                <span className={styles.detailValue}>{entry.details.fileDetails.fileId}</span>
                              </div>
                            )}
                            
                            {/* Original Filename */}
                            {entry.details.fileDetails.originalFileName && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Original Filename:</span>
                                <span className={styles.detailValue}>{entry.details.fileDetails.originalFileName}</span>
                              </div>
                            )}
                            
                            {/* File Size */}
                            {entry.details.fileDetails.fileSize > 0 && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>File Size:</span>
                                <span className={styles.detailValue}>
                                  {(entry.details.fileDetails.fileSize / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                            )}
                            
                            {/* Access Method/Upload Method */}
                            {entry.details.fileDetails.uploadMethod && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>
                                  {entry.action === 'file-access' ? 'Access Method' : 'Upload Method'}:
                                </span>
                                <span className={styles.detailValue}>{entry.details.fileDetails.uploadMethod}</span>
                              </div>
                            )}
                            
                            {/* Delete Reason */}
                            {entry.details.fileDetails.deleteReason && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Reason:</span>
                                <span className={styles.detailValue}>{entry.details.fileDetails.deleteReason}</span>
                              </div>
                            )}
                            
                            {/* Access Source */}
                            {entry.details.fileDetails.sourceLocation && entry.action === 'file-access' && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Access Source:</span>
                                <span className={styles.detailValue}>{entry.details.fileDetails.sourceLocation}</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Annotation Details */}
                        {(entry.action === 'annotation-create' || entry.action === 'annotation-edit' || entry.action === 'annotation-delete') && entry.details.fileDetails && (
                          <>
                            {/* File ID */}
                            {entry.details.fileDetails.fileId && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>File ID:</span>
                                <span className={styles.detailValue}>{entry.details.fileDetails.fileId}</span>
                              </div>
                            )}
                            
                            {/* Original Filename */}
                            {entry.details.fileDetails.originalFileName && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Original Filename:</span>
                                <span className={styles.detailValue}>{entry.details.fileDetails.originalFileName}</span>
                              </div>
                            )}
                            
                            {/* Annotation Type */}
                            {entry.details.annotationDetails?.annotationType && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Annotation Type:</span>
                                <span className={styles.detailValue}>{entry.details.annotationDetails.annotationType}</span>
                              </div>
                            )}
                            
                            {/* Tool Used */}
                            {entry.details.annotationDetails?.tool && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Tool:</span>
                                <span className={styles.detailValue}>{entry.details.annotationDetails.tool}</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* PDF Generation and Confirmation Details */}
                        {(entry.action === 'pdf-generate' || entry.action === 'confirm') && entry.details.fileDetails && (
                          <>
                            {/* Source File ID */}
                            {entry.details.fileDetails.fileId && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>{entry.action === 'pdf-generate' ? 'Source File ID:' : 'Original Image ID:'}</span>
                                <span className={styles.detailValue}>{entry.details.fileDetails.fileId}</span>
                              </div>
                            )}
                            
                            {/* Source Original Filename */}
                            {entry.details.fileDetails.originalFileName && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>{entry.action === 'pdf-generate' ? 'Source Filename:' : 'Original Filename:'}</span>
                                <span className={styles.detailValue}>{entry.details.fileDetails.originalFileName}</span>
                              </div>
                            )}

                            {/* Confirmation ID (for confirm actions) */}
                            {entry.action === 'confirm' && entry.details.confirmationId && (
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Confirmation ID:</span>
                                <span className={styles.detailValue}>{entry.details.confirmationId}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
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