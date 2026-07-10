import { useMemo, useState, type MouseEvent } from 'react';
import { type ValidationAuditEntry } from '~/types';
import { formatAuditTimestamp, getAuditActionIcon, getAuditStatusIcon } from './audit-viewer-utils';
import styles from '../user-audit.module.css';

interface AuditEntriesListProps {
  entries: ValidationAuditEntry[];
}

const isConfirmationImportEntry = (entry: ValidationAuditEntry): boolean => {
  return (
    entry.action === 'confirmation-import' ||
    (entry.action === 'import' && entry.details.workflowPhase === 'confirmation')
  );
};

const isConfirmationEvent = (entry: ValidationAuditEntry): boolean => {
  return (
    entry.action === 'confirmation-create' ||
    entry.action === 'confirmation-export' ||
    entry.action === 'confirmation-import' ||
    entry.action === 'confirm' ||
    (entry.action === 'import' && entry.details.workflowPhase === 'confirmation') ||
    (entry.action === 'export' && entry.details.workflowPhase === 'confirmation')
  );
};

const supportsFullDetailsToggle = (entry: ValidationAuditEntry): boolean => {
  return (
    entry.action === 'annotation-create' ||
    entry.action === 'annotation-edit' ||
    entry.action === 'annotation-delete' ||
    isConfirmationEvent(entry)
  );
};

const getEntryKey = (entry: ValidationAuditEntry): string => {
  return `${entry.timestamp}-${entry.userId}-${entry.action}-${entry.details.fileName || ''}-${entry.details.confirmationId || ''}`;
};

export const AuditEntriesList = ({ entries }: AuditEntriesListProps) => {
  const [expandedEntryKeys, setExpandedEntryKeys] = useState<Set<string>>(() => new Set());

  const expandableEntries = useMemo(() => {
    return new Set(entries.filter(supportsFullDetailsToggle).map(getEntryKey));
  }, [entries]);

  const toggleExpanded = (entryKey: string) => {
    setExpandedEntryKeys((current) => {
      const next = new Set(current);

      if (next.has(entryKey)) {
        next.delete(entryKey);
      } else {
        next.add(entryKey);
      }

      return next;
    });
  };

  const handleToggleClick = (event: MouseEvent<HTMLButtonElement>, entryKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    toggleExpanded(entryKey);
  };

  return (
    <div className={styles.entriesList}>
      <h3>Activity Log ({entries.length} entries)</h3>
      {entries.length === 0 ? (
        <div className={styles.noEntries}>
          <p>No activities match the current filters.</p>
        </div>
      ) : (
        entries.map((entry) => {
          const entryKey = getEntryKey(entry);
          const isExpandable = expandableEntries.has(entryKey);
          const isExpanded = expandedEntryKeys.has(entryKey);

          return (
            <div
              key={entryKey}
              className={`${styles.entry} ${styles[entry.result]}`}
            >
              <div className={styles.entryHeader}>
                <div className={styles.entryIcons}>
                  <span className={styles.actionIcon}>{getAuditActionIcon(entry.action)}</span>
                  <span className={styles.statusIcon}>{getAuditStatusIcon(entry.result)}</span>
                </div>
                <div className={styles.entryTitle}>
                  <span className={styles.action}>{entry.action.toUpperCase().replace(/-/g, ' ')}</span>
                  <span className={styles.fileName}>{entry.details.fileName}</span>
                </div>

                <div className={styles.entryHeaderActions}>
                  <div className={styles.entryTimestamp}>{formatAuditTimestamp(entry.timestamp)}</div>
                  {isExpandable && (
                    <button
                      type="button"
                      className={styles.entryDetailsToggle}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Hide full entry details' : 'Show full entry details'}
                      onClick={(event) => handleToggleClick(event, entryKey)}
                    >
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.entryDetails}>
                {entry.details.caseNumber && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Case:</span>
                    <span className={styles.detailValue}>{entry.details.caseNumber}</span>
                  </div>
                )}

              {entry.details.userProfileDetails?.badgeId && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Badge/ID:</span>
                  <span className={styles.badgeTag}>{entry.details.userProfileDetails.badgeId}</span>
                </div>
              )}

              {isConfirmationImportEntry(entry) && entry.details.reviewerBadgeId && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Confirming Examiner Badge/ID:</span>
                  <span className={styles.badgeTag}>{entry.details.reviewerBadgeId}</span>
                </div>
              )}

              {isConfirmationImportEntry(entry) &&
                entry.details.caseDetails?.confirmedFileNames &&
                entry.details.caseDetails.confirmedFileNames.length > 0 && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Confirmed Files:</span>
                    <span className={styles.detailValue}>
                      {entry.details.caseDetails.confirmedFileNames.join(', ')}
                    </span>
                  </div>
                )}

              {entry.result === 'failure' && entry.details.validationErrors.length > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Error:</span>
                  <span className={styles.detailValue}>{entry.details.validationErrors[0]}</span>
                </div>
              )}

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

              {entry.action === 'security-violation' && entry.details.securityDetails && (
                <>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Severity:</span>
                    <span
                      className={`${styles.detailValue} ${styles.severity} ${styles[entry.details.securityDetails.severity || 'low']}`}
                    >
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

              {(entry.action === 'file-upload' || entry.action === 'file-delete' || entry.action === 'file-access') && entry.details.fileDetails && (
                <>
                  {entry.details.fileDetails.fileId && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>File ID:</span>
                      <span className={styles.detailValue}>{entry.details.fileDetails.fileId}</span>
                    </div>
                  )}

                  {entry.details.fileDetails.originalFileName && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Original Filename:</span>
                      <span className={styles.detailValue}>{entry.details.fileDetails.originalFileName}</span>
                    </div>
                  )}

                  {entry.details.fileDetails.fileSize > 0 && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>File Size:</span>
                      <span className={styles.detailValue}>
                        {(entry.details.fileDetails.fileSize / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  )}

                  {entry.details.fileDetails.uploadMethod && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>
                        {entry.action === 'file-access' ? 'Access Method' : 'Upload Method'}:
                      </span>
                      <span className={styles.detailValue}>{entry.details.fileDetails.uploadMethod}</span>
                    </div>
                  )}

                  {entry.details.fileDetails.deleteReason && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Reason:</span>
                      <span className={styles.detailValue}>{entry.details.fileDetails.deleteReason}</span>
                    </div>
                  )}

                  {entry.details.fileDetails.sourceLocation && entry.action === 'file-access' && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Access Source:</span>
                      <span className={styles.detailValue}>{entry.details.fileDetails.sourceLocation}</span>
                    </div>
                  )}
                </>
              )}

              {(entry.action === 'annotation-create' || entry.action === 'annotation-edit' || entry.action === 'annotation-delete') && entry.details.fileDetails && (
                <>
                  {entry.details.fileDetails.fileId && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>File ID:</span>
                      <span className={styles.detailValue}>{entry.details.fileDetails.fileId}</span>
                    </div>
                  )}

                  {entry.details.fileDetails.originalFileName && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Original Filename:</span>
                      <span className={styles.detailValue}>{entry.details.fileDetails.originalFileName}</span>
                    </div>
                  )}

                  {entry.details.annotationDetails?.annotationType && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Annotation Type:</span>
                      <span className={styles.detailValue}>{entry.details.annotationDetails.annotationType}</span>
                    </div>
                  )}

                  {entry.details.annotationDetails?.tool && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Tool:</span>
                      <span className={styles.detailValue}>{entry.details.annotationDetails.tool}</span>
                    </div>
                  )}
                </>
              )}

                {(entry.action === 'pdf-generate' || entry.action === 'confirm') && entry.details.fileDetails && (
                  <>
                    {entry.details.fileDetails.fileId && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>
                          {entry.action === 'pdf-generate' ? 'Source File ID:' : 'Original Image ID:'}
                        </span>
                        <span className={styles.detailValue}>{entry.details.fileDetails.fileId}</span>
                      </div>
                    )}

                    {entry.details.fileDetails.originalFileName && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>
                          {entry.action === 'pdf-generate' ? 'Source Filename:' : 'Original Filename:'}
                        </span>
                        <span className={styles.detailValue}>{entry.details.fileDetails.originalFileName}</span>
                      </div>
                    )}

                    {entry.action === 'confirm' && entry.details.confirmationId && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Confirmation ID:</span>
                        <span className={styles.detailValue}>{entry.details.confirmationId}</span>
                      </div>
                    )}
                  </>
                )}

                {isExpandable && isExpanded && (
                  <div className={styles.expandedDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Full Entry Details:</span>
                    </div>
                    <pre className={styles.expandedDetailsCode}>
                      {JSON.stringify(entry, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
