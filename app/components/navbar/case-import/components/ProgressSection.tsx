import styles from '../case-import.module.css';

interface ProgressState {
	stage: string;
	progress: number;
	details?: string;
}

interface ProgressSectionProps {
	importProgress: ProgressState | null;
}

export const ProgressSection = ({ importProgress }: ProgressSectionProps) => {
	if (!importProgress) return null;

	const progressPercent = Math.round(importProgress.progress);
	const isComplete = importProgress.progress >= 100;

	return (
		<div className={styles.progressSection} role="region" aria-live="polite" aria-label="Import progress">
			<div className={styles.progressText}>
				{importProgress.stage}
				{importProgress.details && <span className={styles.progressDetails}> - {importProgress.details}</span>}
			</div>
			<div
				className={styles.progressBar}
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={importProgress.progress}
				aria-valuetext={`${progressPercent}% complete${isComplete ? ' - Import finished' : ''}`}
				aria-label="Case import progress"
			>
				<div className={styles.progressFill} style={{ width: `${importProgress.progress}%` }} />
			</div>
			<div className={styles.progressPercent}>{progressPercent}%</div>
		</div>
	);
};
