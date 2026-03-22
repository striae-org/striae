import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import type {
  BulletAnnotationData,
  CartridgeCaseAnnotationData,
  ShotshellAnnotationData,
} from '~/types/annotations';
import {
  type ClassType,
} from './class-details-shared';
import { BulletSection, CartridgeCaseSection, ShotshellSection } from './class-details-sections';
import { useClassDetailsState } from './use-class-details-state';
import styles from './notes.module.css';

interface ClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classType: ClassType | '';
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

const ClassDetailsModalContent = ({
  isOpen,
  onClose,
  classType,
  bulletData,
  cartridgeCaseData,
  shotshellData,
  onSave,
  showNotification,
  isReadOnly = false,
}: ClassDetailsModalProps) => {
  const {
    bullet,
    cartridgeCase,
    shotshell,
    isSaving,
    setIsSaving,
    buildSaveData,
  } = useClassDetailsState({
    bulletData,
    cartridgeCaseData,
    shotshellData,
  });

  const { requestClose, overlayProps, getCloseButtonProps } = useOverlayDismiss({ isOpen, onClose });

  if (!isOpen) return null;

  const showBullet = classType === 'Bullet' || classType === 'Other' || classType === '';
  const showCartridge = classType === 'Cartridge Case' || classType === 'Other' || classType === '';
  const showShotshell = classType === 'Shotshell' || classType === 'Other' || classType === '';
  const showHeaders = classType === 'Other' || classType === '';

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
    <div
      className={styles.modalOverlay}
      aria-label="Close class details dialog"
      {...overlayProps}
    >
      <div className={`${styles.modal} ${styles.classDetailsModal}`}>
        <button {...getCloseButtonProps({ ariaLabel: 'Close class details dialog' })}>×</button>
        <h5 className={styles.modalTitle}>Class Characteristic Details</h5>
        <div className={styles.classDetailsContent}>
          {showBullet && (
            <BulletSection
              showHeader={showHeaders}
              isReadOnly={isReadOnly}
              bullet={bullet}
            />
          )}

          {showCartridge && (
            <CartridgeCaseSection
              showHeader={showHeaders}
              isReadOnly={isReadOnly}
              cartridgeCase={cartridgeCase}
            />
          )}

          {showShotshell && (
            <ShotshellSection
              showHeader={showHeaders}
              isReadOnly={isReadOnly}
              shotshell={shotshell}
            />
          )}
        </div>
        <div className={styles.modalButtons}>
          <button
            onClick={handleSave}
            className={styles.saveButton}
            disabled={isSaving || isReadOnly}
            aria-busy={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={requestClose}
            className={styles.cancelButton}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export const ClassDetailsModal = (props: ClassDetailsModalProps) => {
  if (!props.isOpen) return null;

  return <ClassDetailsModalContent {...props} />;
};
