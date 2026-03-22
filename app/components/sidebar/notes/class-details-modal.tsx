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

const PISTOL_CALIBERS: string[] = [
  '.22 LR',
  '.25 ACP',
  '.32 ACP',
  '.380 ACP (9 mm Kurz, 9×17)',
  '9 mm Luger / 9×19 (9 mm Parabellum, 9 mm NATO)',
  '.38 Special',
  '.357 Magnum',
  '.40 S&W',
  '10 mm Auto',
  '.44 Special',
  '.44 Magnum',
  '.45 ACP',
  '.45 Colt (.45 Long Colt)',
  '.454 Casull',
  '.50 AE',
];

const RIFLE_CALIBERS: string[] = [
  '.22 LR',
  '.17 HMR',
  '.22 WMR (.22 Magnum)',
  '.223 Remington / 5.56×45 NATO',
  '.243 Winchester',
  '6 mm Creedmoor / .243 class',
  '6.5×55 Swedish',
  '6.5 Creedmoor',
  '.270 Winchester',
  '7 mm-08 Remington / 7 mm Remington Magnum',
  '.30-30 Winchester',
  '.308 Winchester / 7.62×51 NATO',
  '.30-06 Springfield',
  '7.62×39 (AK family)',
  '7.62×54R',
  '.300 Winchester Magnum',
  '.300 AAC Blackout',
  '.338 Winchester Magnum',
  '.45-70 Government',
  '.50 BMG (12.7×99)',
];

const SHOTSHELL_GAUGES: string[] = [
  '10 gauge',
  '12 gauge',
  '16 gauge',
  '20 gauge',
  '28 gauge',
  '.410 bore',
];

const ALL_CALIBERS: string[] = [...PISTOL_CALIBERS, ...RIFLE_CALIBERS];
const CUSTOM = '__custom__';

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
  const [bCaliberIsCustom, setBCaliberIsCustom] = useState(false);
  const [bMass, setBMass] = useState('');
  const [bDiameter, setBDiameter] = useState('');
  const [bLgNumber, setBLgNumber] = useState('');
  const [bLgDirection, setBLgDirection] = useState('');
  const [bLWidths, setBLWidths] = useState<string[]>([]);
  const [bGWidths, setBGWidths] = useState<string[]>([]);
  const [bJacketMetal, setBJacketMetal] = useState('');
  const [bCoreMetal, setBCoreMetal] = useState('');
  const [bBulletType, setBBulletType] = useState('');

  // Cartridge Case local state
  const [cCaliber, setCCaliber] = useState('');
  const [cCaliberIsCustom, setCCaliberIsCustom] = useState(false);
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
  const [sGaugeIsCustom, setSGaugeIsCustom] = useState(false);
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
      setBCaliberIsCustom(!!bulletData?.caliber && !ALL_CALIBERS.includes(bulletData.caliber));
      setBMass(bulletData?.mass || '');
      setBDiameter(bulletData?.diameter || '');
      setBLgNumber(bulletData?.lgNumber !== undefined ? String(bulletData.lgNumber) : '');
      setBLgDirection(bulletData?.lgDirection || '');
      setBLWidths(bulletData?.lWidths || []);
      setBGWidths(bulletData?.gWidths || []);
      setBJacketMetal(bulletData?.jacketMetal || '');
      setBCoreMetal(bulletData?.coreMetal || '');
      setBBulletType(bulletData?.bulletType || '');

      setCCaliber(cartridgeCaseData?.caliber || '');
      setCCaliberIsCustom(!!cartridgeCaseData?.caliber && !ALL_CALIBERS.includes(cartridgeCaseData.caliber));
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
      setSGaugeIsCustom(!!shotshellData?.gauge && !SHOTSHELL_GAUGES.includes(shotshellData.gauge));
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

  const handleCaliberSelect = (
    val: string,
    setVal: (v: string) => void,
    setCustom: (v: boolean) => void,
  ) => {
    if (val === CUSTOM) { setCustom(true); setVal(''); }
    else { setCustom(false); setVal(val); }
  };

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
        diameter: bDiameter || undefined,
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
                  <select
                    value={bCaliberIsCustom ? CUSTOM : bCaliber}
                    onChange={(e) => handleCaliberSelect(e.target.value, setBCaliber, setBCaliberIsCustom)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                  >
                    <option value="">Select caliber...</option>
                    <optgroup label="Pistol">
                      {PISTOL_CALIBERS.map((c) => <option key={`p-${c}`} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Rifle">
                      {RIFLE_CALIBERS.map((c) => <option key={`r-${c}`} value={c}>{c}</option>)}
                    </optgroup>
                    <option value={CUSTOM}>Other / Custom...</option>
                  </select>
                  {bCaliberIsCustom && (
                    <input
                      type="text"
                      value={bCaliber}
                      onChange={(e) => setBCaliber(e.target.value)}
                      className={styles.classDetailsInput}
                      disabled={isReadOnly}
                      placeholder="Enter caliber..."
                    />
                  )}
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
                  <span className={styles.classDetailsLabel}>Diameter</span>
                  <input
                    type="text"
                    value={bDiameter}
                    onChange={(e) => setBDiameter(e.target.value)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                    placeholder="e.g. 0.357 in"
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
                  <select
                    value={cCaliberIsCustom ? CUSTOM : cCaliber}
                    onChange={(e) => handleCaliberSelect(e.target.value, setCCaliber, setCCaliberIsCustom)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                  >
                    <option value="">Select caliber...</option>
                    <optgroup label="Pistol">
                      {PISTOL_CALIBERS.map((c) => <option key={`p-${c}`} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Rifle">
                      {RIFLE_CALIBERS.map((c) => <option key={`r-${c}`} value={c}>{c}</option>)}
                    </optgroup>
                    <option value={CUSTOM}>Other / Custom...</option>
                  </select>
                  {cCaliberIsCustom && (
                    <input
                      type="text"
                      value={cCaliber}
                      onChange={(e) => setCCaliber(e.target.value)}
                      className={styles.classDetailsInput}
                      disabled={isReadOnly}
                      placeholder="Enter caliber..."
                    />
                  )}
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
                  <select
                    value={sGaugeIsCustom ? CUSTOM : sGauge}
                    onChange={(e) => handleCaliberSelect(e.target.value, setSGauge, setSGaugeIsCustom)}
                    className={styles.classDetailsInput}
                    disabled={isReadOnly}
                  >
                    <option value="">Select gauge...</option>
                    {SHOTSHELL_GAUGES.map((g) => <option key={g} value={g}>{g}</option>)}
                    <option value={CUSTOM}>Other / Custom...</option>
                  </select>
                  {sGaugeIsCustom && (
                    <input
                      type="text"
                      value={sGauge}
                      onChange={(e) => setSGauge(e.target.value)}
                      className={styles.classDetailsInput}
                      disabled={isReadOnly}
                      placeholder="Enter gauge..."
                    />
                  )}
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
