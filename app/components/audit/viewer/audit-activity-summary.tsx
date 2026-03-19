import styles from '../user-audit.module.css';

interface AuditActivitySummaryProps {
  caseNumber?: string;
  filterCaseNumber: string;
  dateRangeDisplay: string;
  totalEntries: number;
  successfulEntries: number;
  failedEntries: number;
  loginSessions: number;
  securityIncidents: number;
}

export const AuditActivitySummary = ({
  caseNumber,
  filterCaseNumber,
  dateRangeDisplay,
  totalEntries,
  successfulEntries,
  failedEntries,
  loginSessions,
  securityIncidents,
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
  );
};
