import { useState, useEffect, Fragment } from 'react';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import type {
  BulletAnnotationData,
  CartridgeCaseAnnotationData,
  ShotshellAnnotationData,
} from '~/types/annotations';
import styles from './notes.module.css';

type ClassType = 'Bullet' | 'Cartridge Case' | 'Shotshell' | 'Other';

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

export const ClassDetailsModal = ({
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
  // Bullet local state
  const [bCaliber, setBCaliber] = useState('');
  const [bMass, setBMass] = useState('');
  const [bLgNumber, setBLgNumber] = useState('');
  const [bLgDirection, setBLgDirection] = useState('');
  const [bLWidths, setBLWidths] = useState<string[]>([]);
  const [bGWidths, setBGWidths] = useState<string[]>([]);
  const [bJacketMetal, setBJacketMetal] = useState('');
  const [bCoreMetal, setBCoreMetal] = useState('');
  const [bBulletType, setBBulletType] = useState('');

  // Cartridge Case local state
  const [cCaliber, setCCaliber] = useState('');
  const [cBrand, setCBrand] = useState('');
  const [cMetal, setCMetal] = useState('');
  const [cPrimerType, setCPrimerType] = useState('');
  const [cFpiShape, setCFpiShape] = useState('');
  const [cApertureShape, setCApertureShape] = useState('');
  const [cHasFpDrag, setCHasFpDrag] = useState(false);
  const [cHasExtractorMarks, setCHasExtractorMarks] = useState(false);
  const [cHasEjectorMarks, setCHasEjectorMarks] = useState(false);
  const [cHasChamberMarks, setCHasChamberMarks] = useState(false);
  const [cHasMagazineLipMarks, setCHasMagazineLipMarks] = useState(false);
  const [cHasPrimerShear, setCHasPrimerShear] = useState(false);
  const [cHasEjectionPortMarks, setCHasEjectionPortMarks] = useState(false);

  // Shotshell local state
  const [sGauge, setSGauge] = useState('');
  const [sShotSize, setSShotSize] = useState('');
  const [sMetal, setSMetal] = useState('');
  const [sBrand, setSBrand] = useState('');
  const [sFpiShape, setSFpiShape] = useState('');
  const [sHasExtractorMarks, setSHasExtractorMarks] = useState(false);
  const [sHasEjectorMarks, setSHasEjectorMarks] = useState(false);
  const [sHasChamberMarks, setSHasChamberMarks] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBCaliber(bulletData?.caliber || '');
      setBMass(bulletData?.mass || '');
      setBLgNumber(bulletData?.lgNumber !== undefined ? String(bulletData.lgNumber) : '');
      setBLgDirection(bulletData?.lgDirection || '');
      setBLWidths(bulletData?.lWidths || []);
      setBGWidths(bulletData?.gWidths || []);
      setBJacketMetal(bulletData?.jacketMetal || '');
      setBCoreMetal(bulletData?.coreMetal || '');
      setBBulletType(bulletData?.bulletType || '');

      setCCaliber(cartridgeCaseData?.caliber || '');
      setCBrand(cartridgeCaseData?.brand || '');
      setCMetal(cartridgeCaseData?.metal || '');
      setCPrimerType(cartridgeCaseData?.primerType || '');
      setCFpiShape(cartridgeCaseData?.fpiShape || '');
      setCApertureShape(cartridgeCaseData?.apertureShape || '');
      setCHasFpDrag(cartridgeCaseData?.hasFpDrag ?? false);
      setCHasExtractorMarks(cartridgeCaseData?.hasExtractorMarks ?? false);
      setCHasEjectorMarks(cartridgeCaseData?.hasEjectorMarks ?? false);
      setCHasChamberMarks(cartridgeCaseData?.hasChamberMarks ?? false);
      setCHasMagazineLipMarks(cartridgeCaseData?.hasMagazineLipMarks ?? false);
      setCHasPrimerShear(cartridgeCaseData?.hasPrimerShear ?? false);
      setCHasEjectionPortMarks(cartridgeCaseData?.hasEjectionPortMarks ?? false);

      setSGauge(shotshellData?.gauge || '');
      setSShotSize(shotshellData?.shotSize || '');
      setSMetal(shotshellData?.metal || '');
      setSBrand(shotshellData?.brand || '');
      setSFpiShape(shotshellData?.fpiShape || '');
      setSHasExtractorMarks(shotshellData?.hasExtractorMarks ?? false);
      setSHasEjectorMarks(shotshellData?.hasEjectorMarks ?? false);
      setSHasChamberMarks(shotshellData?.hasChamberMarks ?? false);
    }
  }, [isOpen, bulletData, cartridgeCaseData, shotshellData]);

  const { requestClose, overlayProps, getCloseButtonProps } = useOverlayDismiss({ isOpen, onClose });

  if (!isOpen) return null;

  const lgCount = Math.max(0, Math.min(30, Number(bLgNumber) || 0));

  const handleLWidth = (i: number, val: string) =>
    setBLWidths(prev => { const next = [...prev]; next[i] = val; return next; });

  const handleGWidth = (i: number, val: string) =>
    setBGWidths(prev => { const next = [...prev]; next[i] = val; return next; });

  const showBullet = classType === 'Bullet' || classType === 'Other' || classType === '';
  const showCartridge = classType === 'Cartridge Case' || classType === 'Other' || classType === '';
  const showShotshell = classType === 'Shotshell' || classType === 'Other' || classType === '';
  const showHeaders = classType === 'Other' || classType === '';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newBulletData: BulletAnnotationData | undefined = showBullet ? {
        caliber: bCaliber || undefined,
        mass: bMass || undefined,
        lgNumber: bLgNumber ? Number(bLgNumber) : undefined,
        lgDirection: bLgDirection || undefined,
        lWidths: bLWidths.some(Boolean) ? bLWidths : undefined,
        gWidths: bGWidths.some(Boolean) ? bGWidths : undefined,
        jacketMetal: bJacketMetal || undefined,
        coreMetal: bCoreMetal || undefined,
        bulletType: bBulletType || undefined,
      } : undefined;

      const newCartridgeCaseData: CartridgeCaseAnnotationData | undefined = showCartridge ? {
        caliber: cCaliber || undefined,
        brand: cBrand || undefined,
        metal: cMetal || undefined,
        primerType: cPrimerType || undefined,
        fpiShape: cFpiShape || undefined,
        apertureShape: cApertureShape || undefined,
        hasFpDrag: cHasFpDrag || undefined,
        hasExtractorMarks: cHasExtractorMarks || undefined,
        hasEjectorMarks: cHasEjectorMarks || undefined,
        hasChamberMarks: cHasChamberMarks || undefined,
        hasMagazineLipMarks: cHasMagazineLipMarks || undefined,
        hasPrimerShear: cHasPrimerShear || undefined,
        hasEjectionPortMarks: cHasEjectionPortMarks || undefined,
      } : undefined;

      const newShotshellData: ShotshellAnnotationData | undefined = showShotshell ? {
        gauge: sGauge || undefined,
        shotSize: sShotSize || undefined,
        metal: sMetal || undefined,
        brand: sBrand || undefined,
        fpiShape: sFpiShape || undefined,
        hasExtractorMarks: sHasExtractorMarks || undefined,
        hasEjectorMarks: sHasEjectorMarks || undefined,
        hasChamberMarks: sHasChamberMarks || undefined,
      } : undefined;

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
            <div className={styles.classDetailsSection}>
              {showHeaders && <h6 className={styles.classDetailsSectionHeader}>Bullet</h6>}
              <div className={styles.classDetailsFieldGrid}>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Caliber</span>
                  <input
                    type="text"
                    value={bCaliber}
                    onChange={(e) => setBCaliber(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. .38 Special"
                  />
                </div>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Mass</span>
                  <input
                    type="text"
                    value={bMass}
                    onChange={(e) => setBMass(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. 158 gr"
                  />
                </div>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>L/G Count</span>
                  <input
                    type="number"
                    min={0}
                    value={bLgNumber}
                    onChange={(e) => setBLgNumber(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. 6"
                  />
                </div>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>L/G Direction</span>
                  <input
                    type="text"
                    value={bLgDirection}
                    onChange={(e) => setBLgDirection(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. Right"
                  />
                </div>
                {lgCount > 0 && Array.from({ length: lgCount }, (_, i) => (
                  <Fragment key={i}>
                    <div className={styles.classDetailsField}>
                      <span className={styles.classDetailsLabel}>L{i + 1} Width</span>
                      <input
                        type="text"
                        value={bLWidths[i] || ''}
                        onChange={(e) => handleLWidth(i, e.target.value)}
                        className={styles.classDetailsInput}
                        disabled={isReadOnly}
                        placeholder="e.g. 1.2"
                      />
                    </div>
                    <div className={styles.classDetailsField}>
                      <span className={styles.classDetailsLabel}>G{i + 1} Width</span>
                      <input
                        type="text"
                        value={bGWidths[i] || ''}
                        onChange={(e) => handleGWidth(i, e.target.value)}
                        className={styles.classDetailsInput}
                        disabled={isReadOnly}
                        placeholder="e.g. 0.9"
                      />
                    </div>
                  </Fragment>
                ))}
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Jacket Metal</span>
                  <input
                    type="text"
                    value={bJacketMetal}
                    onChange={(e) => setBJacketMetal(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. Copper"
                  />
                </div>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Core Metal</span>
                  <input
                    type="text"
                    value={bCoreMetal}
                    onChange={(e) => setBCoreMetal(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. Lead"
                  />
                </div>
                <div className={`${styles.classDetailsField} ${styles.classDetailsFieldFull}`}>
                  <span className={styles.classDetailsLabel}>Bullet Type</span>
                  <input
                    type="text"
                    value={bBulletType}
                    onChange={(e) => setBBulletType(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. FMJ"
                  />
                </div>
              </div>
            </div>
          )}

          {showCartridge && (
            <div className={styles.classDetailsSection}>
              {showHeaders && <h6 className={styles.classDetailsSectionHeader}>Cartridge Case</h6>}
              <div className={styles.classDetailsFieldGrid}>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Caliber</span>
                  <input
                    type="text"
                    value={cCaliber}
                    onChange={(e) => setCCaliber(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. 9mm"
                  />
                </div>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Brand</span>
                  <input
                    type="text"
                    value={cBrand}
                    onChange={(e) => setCBrand(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. Federal"
                  />
                </div>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Metal</span>
                  <input
                    type="text"
                    value={cMetal}
                    onChange={(e) => setCMetal(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. Brass"
                  />
                </div>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Primer Type</span>
                  <input
                    type="text"
                    value={cPrimerType}
                    onChange={(e) => setCPrimerType(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. Boxer"
                  />
                </div>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>FPI Shape</span>
                  <input
                    type="text"
                    value={cFpiShape}
                    onChange={(e) => setCFpiShape(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. Circular"
                  />
                </div>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Aperture Shape</span>
                  <input
                    type="text"
                    value={cApertureShape}
                    onChange={(e) => setCApertureShape(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. Round"
                  />
                </div>
              </div>
              <div className={styles.classDetailsCheckboxGroup}>
                <label className={styles.classDetailsCheckboxLabel}>
                  <input type="checkbox" checked={cHasFpDrag} onChange={(e) => setCHasFpDrag(e.target.checked)} disabled={isReadOnly} />
                  <span>FP Drag</span>
                </label>
                <label className={styles.classDetailsCheckboxLabel}>
                  <input type="checkbox" checked={cHasExtractorMarks} onChange={(e) => setCHasExtractorMarks(e.target.checked)} disabled={isReadOnly} />
                  <span>Extractor Marks</span>
                </label>
                <label className={styles.classDetailsCheckboxLabel}>
                  <input type="checkbox" checked={cHasEjectorMarks} onChange={(e) => setCHasEjectorMarks(e.target.checked)} disabled={isReadOnly} />
                  <span>Ejector Marks</span>
                </label>
                <label className={styles.classDetailsCheckboxLabel}>
                  <input type="checkbox" checked={cHasChamberMarks} onChange={(e) => setCHasChamberMarks(e.target.checked)} disabled={isReadOnly} />
                  <span>Chamber Marks</span>
                </label>
                <label className={styles.classDetailsCheckboxLabel}>
                  <input type="checkbox" checked={cHasMagazineLipMarks} onChange={(e) => setCHasMagazineLipMarks(e.target.checked)} disabled={isReadOnly} />
                  <span>Magazine Lip Marks</span>
                </label>
                <label className={styles.classDetailsCheckboxLabel}>
                  <input type="checkbox" checked={cHasPrimerShear} onChange={(e) => setCHasPrimerShear(e.target.checked)} disabled={isReadOnly} />
                  <span>Primer Shear</span>
                </label>
                <label className={styles.classDetailsCheckboxLabel}>
                  <input type="checkbox" checked={cHasEjectionPortMarks} onChange={(e) => setCHasEjectionPortMarks(e.target.checked)} disabled={isReadOnly} />
                  <span>Ejection Port Marks</span>
                </label>
              </div>
            </div>
          )}

          {showShotshell && (
            <div className={styles.classDetailsSection}>
              {showHeaders && <h6 className={styles.classDetailsSectionHeader}>Shotshell</h6>}
              <div className={styles.classDetailsFieldGrid}>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Gauge</span>
                  <input
                    type="text"
                    value={sGauge}
                    onChange={(e) => setSGauge(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. 12"
                  />
                </div>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Shot Size</span>
                  <input
                    type="text"
                    value={sShotSize}
                    onChange={(e) => setSShotSize(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. #4"
                  />
                </div>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Metal</span>
                  <input
                    type="text"
                    value={sMetal}
                    onChange={(e) => setSMetal(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. Steel"
                  />
                </div>
                <div className={styles.classDetailsField}>
                  <span className={styles.classDetailsLabel}>Brand</span>
                  <input
                    type="text"
                    value={sBrand}
                    onChange={(e) => setSBrand(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. Winchester"
                  />
                </div>
                <div className={`${styles.classDetailsField} ${styles.classDetailsFieldFull}`}>
                  <span className={styles.classDetailsLabel}>FPI Shape</span>
                  <input
                    type="text"
                    value={sFpiShape}
                    onChange={(e) => setSFpiShape(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. Circular"
                  />
                </div>
              </div>
              <div className={styles.classDetailsCheckboxGroup}>
                <label className={styles.classDetailsCheckboxLabel}>
                  <input type="checkbox" checked={sHasExtractorMarks} onChange={(e) => setSHasExtractorMarks(e.target.checked)} disabled={isReadOnly} />
                  <span>Extractor Marks</span>
                </label>
                <label className={styles.classDetailsCheckboxLabel}>
                  <input type="checkbox" checked={sHasEjectorMarks} onChange={(e) => setSHasEjectorMarks(e.target.checked)} disabled={isReadOnly} />
                  <span>Ejector Marks</span>
                </label>
                <label className={styles.classDetailsCheckboxLabel}>
                  <input type="checkbox" checked={sHasChamberMarks} onChange={(e) => setSHasChamberMarks(e.target.checked)} disabled={isReadOnly} />
                  <span>Chamber Marks</span>
                </label>
              </div>
            </div>
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
