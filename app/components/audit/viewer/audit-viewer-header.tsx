// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import styles from '../user-audit.module.css';

interface AuditViewerHeaderProps {
	title: string;
	onClose: () => void;
	onExportPdf?: () => void;
	canExportPdf?: boolean;
	isExportingPdf?: boolean;
}

export const AuditViewerHeader = ({
	title,
	onClose,
	onExportPdf,
	canExportPdf = false,
	isExportingPdf = false,
}: AuditViewerHeaderProps) => {
	return (
		<div className={styles.header}>
			<h2 className={styles.title}>{title}</h2>
			<div className={styles.headerActions}>
				{onExportPdf && (
					<button type="button" className={styles.exportButton} onClick={onExportPdf} disabled={!canExportPdf || isExportingPdf}>
						{isExportingPdf ? 'Exporting PDF...' : 'Export PDF'}
					</button>
				)}
				<button className={styles.closeButton} onClick={onClose}>
					×
				</button>
			</div>
		</div>
	);
};
