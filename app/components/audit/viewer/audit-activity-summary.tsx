import type { AuditViewerSummaryStats } from './audit-viewer-utils';
import styles from '../user-audit.module.css';

interface AuditActivitySummaryProps {
  caseNumber?: string;
  filterCaseNumber: string;
  dateRangeDisplay: string;
  summary: AuditViewerSummaryStats;
}

export const AuditActivitySummary = ({
  caseNumber,
  filterCaseNumber,
  dateRangeDisplay,
  summary,
}: AuditActivitySummaryProps) => {
  const activeCaseNumber = caseNumber || filterCaseNumber.trim();

  return (
    <div className={styles.summary}>
      <h3>
        {activeCaseNumber
          ? `Case Activity Summary - ${activeCaseNumber} (${dateRangeDisplay})`
          : `Activity Summary (${dateRangeDisplay})`}
      </h3>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span className={styles.label}>Total Activities:</span>
          <span className={styles.value}>{summary.totalEntries}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.label}>Successful:</span>
          <span className={styles.value}>{summary.successfulEntries}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.label}>Failed:</span>
          <span className={styles.value}>{summary.failedEntries}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.label}>Login Sessions:</span>
          <span className={styles.value}>{summary.loginSessions}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.label}>Security Incidents:</span>
          <span className={`${styles.value} ${summary.securityIncidents > 0 ? styles.warning : ''}`}>
            {summary.securityIncidents}
          </span>
        </div>
      </div>
    </div>
  );
};
