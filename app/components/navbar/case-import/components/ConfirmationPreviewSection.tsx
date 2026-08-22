import { type ConfirmationImportPreview } from '~/types';
import styles from '../case-import.module.css';

function formatDate(isoDate: string | undefined): string {
	if (!isoDate) return 'Unknown';
	const date = new Date(isoDate);
	if (Number.isNaN(date.getTime())) return isoDate;
	return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

interface ConfirmationPreviewSectionProps {
	confirmationPreview: ConfirmationImportPreview | null;
	isLoadingPreview: boolean;
}

export const ConfirmationPreviewSection = ({ confirmationPreview, isLoadingPreview }: ConfirmationPreviewSectionProps) => {
	if (isLoadingPreview) {
		return (
			<div className={styles.previewSection}>
				<div className={styles.previewLoading}>Loading confirmation information...</div>
			</div>
		);
	}

	if (!confirmationPreview) return null;

	return (
		<div className={styles.previewSection}>
			<h3 className={styles.previewTitle}>Confirmation Import Preview</h3>
			<div className={styles.previewMeta}>
				<div className={styles.previewMetaRow}>
					<span className={styles.previewMetaLabel}>Case</span>
					<span className={styles.previewMetaValue}>{confirmationPreview.caseNumber}</span>
				</div>
				{(confirmationPreview.exportedByName || confirmationPreview.exportedBy) && (
					<div className={styles.previewMetaRow}>
						<span className={styles.previewMetaLabel}>Exported by</span>
						<span className={styles.previewMetaValue}>{confirmationPreview.exportedByName || confirmationPreview.exportedBy}</span>
					</div>
				)}
				{confirmationPreview.exportedByCompany && (
					<div className={styles.previewMetaRow}>
						<span className={styles.previewMetaLabel}>Organization</span>
						<span className={styles.previewMetaValue}>{confirmationPreview.exportedByCompany}</span>
					</div>
				)}
				<div className={styles.previewMetaRow}>
					<span className={styles.previewMetaLabel}>Exported</span>
					<span className={styles.previewMetaValue}>{formatDate(confirmationPreview.exportDate)}</span>
				</div>
				<div className={styles.previewMetaRow}>
					<span className={styles.previewMetaLabel}>Confirmations</span>
					<span className={styles.previewMetaValue}>{confirmationPreview.totalConfirmations}</span>
				</div>
			</div>
		</div>
	);
};
