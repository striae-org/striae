import styles from '../user-audit.module.css';

interface AuditViewerHeaderProps {
  title: string;
  hasEntries: boolean;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onGenerateReport: () => void;
  onClose: () => void;
}

export const AuditViewerHeader = ({
  title,
  hasEntries,
  onExportCSV,
  onExportJSON,
  onGenerateReport,
  onClose,
}: AuditViewerHeaderProps) => {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.headerActions}>
        {hasEntries && (
          <div className={styles.exportButtons}>
            <button
              onClick={onExportCSV}
              className={styles.exportButton}
              title="CSV - Individual entry log with summary data"
            >
              📊 CSV
            </button>
            <button
              onClick={onExportJSON}
              className={styles.exportButton}
              title="JSON - Complete log data for version capture and auditing"
            >
              📄 JSON
            </button>
            <button
              onClick={onGenerateReport}
              className={styles.exportButton}
              title="Summary report only"
            >
              📋 Report
            </button>
          </div>
        )}
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
};
