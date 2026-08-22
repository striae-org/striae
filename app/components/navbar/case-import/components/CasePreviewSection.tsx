import { type CaseImportPreview } from '~/types';
import { ARCHIVED_REGULAR_CASE_BLOCK_MESSAGE, ARCHIVED_SELF_IMPORT_NOTE } from '~/utils/ui';
import styles from '../case-import.module.css';

interface CasePreviewSectionProps {
	casePreview: CaseImportPreview | null;
	isLoadingPreview: boolean;
	isArchivedRegularCaseImportBlocked?: boolean;
}

function formatDate(isoDate: string | undefined): string {
	if (!isoDate) return 'Unknown';

	const date = new Date(isoDate);
	if (Number.isNaN(date.getTime())) {
		return isoDate;
	}

	return date.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

export const CasePreviewSection = ({
	casePreview,
	isLoadingPreview,
	isArchivedRegularCaseImportBlocked = false,
}: CasePreviewSectionProps) => {
	if (isLoadingPreview) {
		return (
			<div className={styles.previewSection}>
				<div className={styles.previewLoading}>Loading case information...</div>
			</div>
		);
	}

	if (!casePreview) return null;

	return (
		<div className={styles.previewSection}>
			<h3 className={styles.previewTitle}>Case Import Preview</h3>
			<div className={styles.previewMeta}>
				<div className={styles.previewMetaRow}>
					<span className={styles.previewMetaLabel}>Case</span>
					<span className={styles.previewMetaValue}>{casePreview.caseNumber}</span>
				</div>
				{(casePreview.exportedByName ?? casePreview.exportedBy) && (
					<div className={styles.previewMetaRow}>
						<span className={styles.previewMetaLabel}>Exported by</span>
						<span className={styles.previewMetaValue}>{casePreview.exportedByName ?? casePreview.exportedBy}</span>
					</div>
				)}
				{casePreview.exportedByCompany && (
					<div className={styles.previewMetaRow}>
						<span className={styles.previewMetaLabel}>Organization</span>
						<span className={styles.previewMetaValue}>{casePreview.exportedByCompany}</span>
					</div>
				)}
				<div className={styles.previewMetaRow}>
					<span className={styles.previewMetaLabel}>Exported</span>
					<span className={styles.previewMetaValue}>{formatDate(casePreview.exportDate)}</span>
				</div>
				<div className={styles.previewMetaRow}>
					<span className={styles.previewMetaLabel}>Files</span>
					<span className={styles.previewMetaValue}>{casePreview.totalFiles}</span>
				</div>
				{casePreview.hashValid !== undefined && (
					<div className={styles.previewMetaRow}>
						<span className={styles.previewMetaLabel}>Integrity</span>
						<span className={casePreview.hashValid ? styles.previewValidBadge : styles.previewInvalidBadge}>
							{casePreview.hashValid ? 'Passed' : 'Failed'}
						</span>
					</div>
				)}
			</div>
			{casePreview.archived && !isArchivedRegularCaseImportBlocked && (
				<div className={styles.archivedImportNote}>{ARCHIVED_SELF_IMPORT_NOTE}</div>
			)}
			{isArchivedRegularCaseImportBlocked && (
				<div className={styles.archivedRegularCaseRiskNote}>{ARCHIVED_REGULAR_CASE_BLOCK_MESSAGE}</div>
			)}
		</div>
	);
};
