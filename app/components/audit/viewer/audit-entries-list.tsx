import { type ValidationAuditEntry } from '~/types';
import { formatAuditTimestamp, getAuditActionIcon, getAuditStatusIcon } from './audit-viewer-utils';
import styles from '../user-audit.module.css';

interface AuditEntriesListProps {
  entries: ValidationAuditEntry[];
}

export const AuditEntriesList = ({ entries }: AuditEntriesListProps) => {
  return (
    <div className={styles.entriesList}>
      <h3>Activity Log ({entries.length} entries)</h3>
      {entries.length === 0 ? (
        <div className={styles.noEntries}>
          <p>No activities match the current filters.</p>
        </div>
      ) : (
        entries.map((entry, index) => (
          <div key={index} className={`${styles.entry} ${styles[entry.result]}`}>
            <div className={styles.entryHeader}>
              <div className={styles.entryIcons}>
                <span className={styles.actionIcon}>{getAuditActionIcon(entry.action)}</span>
                <span className={styles.statusIcon}>{getAuditStatusIcon(entry.result)}</span>
              </div>
              <div className={styles.entryTitle}>
                <span className={styles.action}>{entry.action.toUpperCase().replace(/-/g, ' ')}</span>
                <span className={styles.fileName}>{entry.details.fileName}</span>
              </div>
              <div className={styles.entryTimestamp}>{formatAuditTimestamp(entry.timestamp)}</div>
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

              {entry.action === 'confirmation-import' && entry.details.reviewerBadgeId && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Reviewer Badge/ID:</span>
                  <span className={styles.badgeTag}>{entry.details.reviewerBadgeId}</span>
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
            </div>
          </div>
        ))
      )}
    </div>
  );
};
