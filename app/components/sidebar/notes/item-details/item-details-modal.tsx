// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import type { BulletAnnotationData, CartridgeCaseAnnotationData, ShotshellAnnotationData, ItemType } from '~/types/annotations';
import { BulletSection, CartridgeCaseSection, ShotshellSection } from './item-details-sections';
import { useItemDetailsState } from './use-item-details-state';
import styles from '../notes.module.css';

interface ItemDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	itemType: ItemType | '';
	bulletData?: BulletAnnotationData;
	cartridgeCaseData?: CartridgeCaseAnnotationData;
	shotshellData?: ShotshellAnnotationData;
	onSave: (
		bulletData: BulletAnnotationData | undefined,
		cartridgeCaseData: CartridgeCaseAnnotationData | undefined,
		shotshellData: ShotshellAnnotationData | undefined,
	) => void;
	showNotification?: (message: string, type: 'success' | 'error' | 'warning') => void;
	isReadOnly?: boolean;
}

const ItemDetailsModalContent = ({
	isOpen,
	onClose,
	itemType,
	bulletData,
	cartridgeCaseData,
	shotshellData,
	onSave,
	showNotification,
	isReadOnly = false,
}: ItemDetailsModalProps) => {
	const { bullet, cartridgeCase, shotshell, isSaving, setIsSaving, buildSaveData } = useItemDetailsState({
		bulletData,
		cartridgeCaseData,
		shotshellData,
	});

	const { requestClose, overlayProps, getCloseButtonProps } = useOverlayDismiss({ isOpen, onClose });

	if (!isOpen) return null;

	const showBullet = itemType === 'Bullet' || itemType === 'Other' || itemType === '';
	const showCartridge = itemType === 'Cartridge Case' || itemType === 'Other' || itemType === '';
	const showShotshell = itemType === 'Shotshell' || itemType === 'Other' || itemType === '';
	const showHeaders = itemType === 'Other' || itemType === '';

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const {
				bulletData: newBulletData,
				cartridgeCaseData: newCartridgeCaseData,
				shotshellData: newShotshellData,
			} = buildSaveData({
				showBullet,
				showCartridge,
				showShotshell,
			});

			await Promise.resolve(onSave(newBulletData, newCartridgeCaseData, newShotshellData));
			showNotification?.('Class details saved.', 'success');
			requestClose();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to save class details.';
			showNotification?.(message, 'error');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className={styles.modalOverlay} aria-label="Close class details dialog" {...overlayProps}>
			<div className={`${styles.modal} ${styles.itemDetailsModal}`}>
				<button {...getCloseButtonProps({ ariaLabel: 'Close class details dialog' })}>×</button>
				<h5 className={styles.modalTitle}>Class Characteristic Details</h5>
				<div className={styles.itemDetailsContent}>
					{showBullet && <BulletSection showHeader={showHeaders} isReadOnly={isReadOnly} bullet={bullet} />}

					{showCartridge && <CartridgeCaseSection showHeader={showHeaders} isReadOnly={isReadOnly} cartridgeCase={cartridgeCase} />}

					{showShotshell && <ShotshellSection showHeader={showHeaders} isReadOnly={isReadOnly} shotshell={shotshell} />}
				</div>
				<div className={`${styles.modalButtons} ${styles.itemDetailsModalButtons}`}>
					<button
						onClick={handleSave}
						className={`${styles.saveButton} ${styles.itemDetailsModalAction}`}
						disabled={isSaving || isReadOnly}
						aria-busy={isSaving}
					>
						{isSaving ? 'Saving...' : 'Save'}
					</button>
					<button onClick={requestClose} className={`${styles.cancelButton} ${styles.itemDetailsModalAction}`} disabled={isSaving}>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
};

export const ItemDetailsModal = (props: ItemDetailsModalProps) => {
	if (!props.isOpen) return null;

	return <ItemDetailsModalContent {...props} />;
};
