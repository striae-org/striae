import { type CaseImportPreview } from '~/types';
import { ARCHIVED_REGULAR_CASE_BLOCK_MESSAGE, ARCHIVED_SELF_IMPORT_NOTE } from '~/utils/ui';
import styles from '../case-import.module.css';

interface ConfirmationDialogProps {
	showConfirmation: boolean;
	casePreview: CaseImportPreview | null;
	isArchivedRegularCaseImportBlocked?: boolean;
	archivedRegularCaseBlockMessage?: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export const ConfirmationDialog = ({
	showConfirmation,
	casePreview,
	isArchivedRegularCaseImportBlocked = false,
	archivedRegularCaseBlockMessage = ARCHIVED_REGULAR_CASE_BLOCK_MESSAGE,
	onConfirm,
	onCancel,
}: ConfirmationDialogProps) => {
	if (!showConfirmation || !casePreview) return null;

	const isEncrypted = casePreview.caseNumber === 'ENCRYPTED';
	const hasDetails = casePreview.archived || isArchivedRegularCaseImportBlocked;

	return (
		<div className={styles.confirmationOverlay}>
			<div className={styles.confirmationModal}>
				<div className={styles.confirmationContent}>
					<h3 className={styles.confirmationTitle}>Confirm Case Import</h3>
					<p className={styles.confirmationText}>
						Are you sure you want to import{isEncrypted ? ' this encrypted case' : ` case ${casePreview.caseNumber}`} for review?
					</p>

					{hasDetails && (
						<div className={styles.confirmationDetails}>
							{casePreview.archived && <div className={styles.archivedImportNote}>{ARCHIVED_SELF_IMPORT_NOTE}</div>}
							{isArchivedRegularCaseImportBlocked && (
								<div className={styles.archivedRegularCaseRiskNote}>{archivedRegularCaseBlockMessage}</div>
							)}
						</div>
					)}

					<div className={styles.confirmationButtons}>
						<button className={styles.confirmButton} onClick={onConfirm} disabled={isArchivedRegularCaseImportBlocked}>
							Confirm Import
						</button>
						<button className={styles.cancelButton} onClick={onCancel}>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
