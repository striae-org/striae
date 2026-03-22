import { useState } from 'react';
import styles from './notes.module.css';
import {
  BULLET_BARREL_TYPE_OPTIONS,
  BULLET_CORE_METAL_OPTIONS,
  BULLET_JACKET_METAL_OPTIONS,
  BULLET_TYPE_OPTIONS,
  CARTRIDGE_APERTURE_SHAPE_OPTIONS,
  CARTRIDGE_FPI_SHAPE_OPTIONS,
  CARTRIDGE_METAL_OPTIONS,
  CARTRIDGE_PRIMER_TYPE_OPTIONS,
  PISTOL_CALIBERS,
  RIFLE_CALIBERS,
  SHOTSHELL_GAUGES,
  formatCalculatedDiameter,
} from './class-details-shared';
import { CheckboxField, SelectField, SelectWithCustomField, TextField } from './class-details-fields';
import type { BulletDetailsState, CartridgeCaseDetailsState, ShotshellDetailsState } from './use-class-details-state';

interface BulletSectionProps {
  showHeader: boolean;
  isReadOnly: boolean;
  bullet: BulletDetailsState;
}

interface CartridgeSectionProps {
  showHeader: boolean;
  isReadOnly: boolean;
  cartridgeCase: CartridgeCaseDetailsState;
}

interface ShotshellSectionProps {
  showHeader: boolean;
  isReadOnly: boolean;
  shotshell: ShotshellDetailsState;
}

type SelectOption = {
  value: string;
  label?: string;
};

type SelectOptionGroup = {
  groupLabel: string;
  options: SelectOption[];
};

type FieldOption = SelectOption | SelectOptionGroup;

type ConfiguredField =
  | {
    key: string;
    kind: 'text';
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    fullWidth?: boolean;
    type?: 'text' | 'number';
    min?: number;
  }
  | {
    key: string;
    kind: 'select';
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    options: FieldOption[];
    fullWidth?: boolean;
  }
  | {
    key: string;
    kind: 'select-custom';
    label: string;
    value: string;
    isCustom: boolean;
    onChange: (value: string) => void;
    onCustomChange: (value: boolean) => void;
    placeholder: string;
    customPlaceholder: string;
    options: FieldOption[];
    fullWidth?: boolean;
  };

type CheckboxConfig = {
  key: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

const CALIBER_GROUPED_OPTIONS: FieldOption[] = [
  {
    groupLabel: 'Pistol',
    options: PISTOL_CALIBERS.map((caliber) => ({ value: caliber })),
  },
  {
    groupLabel: 'Rifle',
    options: RIFLE_CALIBERS.map((caliber) => ({ value: caliber })),
  },
];

const isOptionGroup = (option: FieldOption): option is SelectOptionGroup => 'groupLabel' in option;

const renderOptions = (options: FieldOption[]) => options.map((option) => {
  if (isOptionGroup(option)) {
    return (
      <optgroup key={option.groupLabel} label={option.groupLabel}>
        {option.options.map((groupOption) => (
          <option key={groupOption.value} value={groupOption.value}>
            {groupOption.label || groupOption.value}
          </option>
        ))}
      </optgroup>
    );
  }

  return (
    <option key={option.value} value={option.value}>
      {option.label || option.value}
    </option>
  );
});

const renderConfiguredField = (field: ConfiguredField, isReadOnly: boolean) => {
  if (field.kind === 'text') {
    return (
      <TextField
        key={field.key}
        label={field.label}
        value={field.value}
        onChange={field.onChange}
        disabled={isReadOnly}
        placeholder={field.placeholder}
        fullWidth={field.fullWidth}
        type={field.type}
        min={field.min}
      />
    );
  }

  if (field.kind === 'select') {
    return (
      <SelectField
        key={field.key}
        label={field.label}
        value={field.value}
        onChange={field.onChange}
        placeholder={field.placeholder}
        disabled={isReadOnly}
        fullWidth={field.fullWidth}
      >
        {renderOptions(field.options)}
      </SelectField>
    );
  }

  return (
    <SelectWithCustomField
      key={field.key}
      label={field.label}
      value={field.value}
      isCustom={field.isCustom}
      onChange={field.onChange}
      onCustomChange={field.onCustomChange}
      placeholder={field.placeholder}
      customPlaceholder={field.customPlaceholder}
      disabled={isReadOnly}
      fullWidth={field.fullWidth}
    >
      {renderOptions(field.options)}
    </SelectWithCustomField>
  );
};

const renderCheckboxes = (items: CheckboxConfig[], isReadOnly: boolean) => items.map((item) => (
  <CheckboxField
    key={item.key}
    label={item.label}
    checked={item.checked}
    onChange={item.onChange}
    disabled={isReadOnly}
  />
));

export const BulletSection = ({
  showHeader,
  isReadOnly,
  bullet,
}: BulletSectionProps) => {
  const [showCalcExplanation, setShowCalcExplanation] = useState(false);
  const bulletFields: ConfiguredField[] = [
        {
          key: 'caliber',
          kind: 'select-custom',
          label: 'Caliber',
          value: bullet.caliber,
          isCustom: bullet.caliberIsCustom,
          onChange: bullet.setCaliber,
          onCustomChange: bullet.setCaliberIsCustom,
          placeholder: 'Select caliber...',
          customPlaceholder: 'Enter caliber...',
          options: CALIBER_GROUPED_OPTIONS,
        },
        {
          key: 'mass',
          kind: 'text',
          label: 'Mass',
          value: bullet.mass,
          onChange: bullet.setMass,
          placeholder: 'e.g. 158 gr',
        },
        {
          key: 'diameter',
          kind: 'text',
          label: 'Diameter',
          value: bullet.diameter,
          onChange: bullet.setDiameter,
          placeholder: 'e.g. 0.357 in',
        },
        {
          key: 'lgNumber',
          kind: 'text',
          label: 'L/G Count',
          value: bullet.lgNumber,
          onChange: bullet.setLgNumber,
          placeholder: 'e.g. 6',
          type: 'number',
          min: 0,
        },
        {
          key: 'lgDirection',
          kind: 'select',
          label: 'L/G Direction',
          value: bullet.lgDirection,
          onChange: bullet.setLgDirection,
          placeholder: 'Select direction...',
          options: [{ value: 'Left' }, { value: 'Right' }],
        },
        {
          key: 'jacketMetal',
          kind: 'select-custom',
          label: 'Jacket Metal',
          value: bullet.jacketMetal,
          isCustom: bullet.jacketMetalIsCustom,
          onChange: bullet.setJacketMetal,
          onCustomChange: bullet.setJacketMetalIsCustom,
          placeholder: 'Select jacket metal...',
          customPlaceholder: 'Enter jacket metal...',
          options: BULLET_JACKET_METAL_OPTIONS.map((option) => ({ value: option })),
        },
        {
          key: 'coreMetal',
          kind: 'select-custom',
          label: 'Core Metal',
          value: bullet.coreMetal,
          isCustom: bullet.coreMetalIsCustom,
          onChange: bullet.setCoreMetal,
          onCustomChange: bullet.setCoreMetalIsCustom,
          placeholder: 'Select core metal...',
          customPlaceholder: 'Enter core metal...',
          options: BULLET_CORE_METAL_OPTIONS.map((option) => ({ value: option })),
        },
        {
          key: 'bulletType',
          kind: 'select-custom',
          label: 'Bullet Type',
          value: bullet.bulletType,
          isCustom: bullet.bulletTypeIsCustom,
          onChange: bullet.setBulletType,
          onCustomChange: bullet.setBulletTypeIsCustom,
          placeholder: 'Select bullet type...',
          customPlaceholder: 'Enter bullet type...',
          options: BULLET_TYPE_OPTIONS.map((option) => ({ value: option })),
          fullWidth: true,
        },
        {
          key: 'barrelType',
          kind: 'select-custom',
          label: 'Barrel Type',
          value: bullet.barrelType,
          isCustom: bullet.barrelTypeIsCustom,
          onChange: bullet.setBarrelType,
          onCustomChange: bullet.setBarrelTypeIsCustom,
          placeholder: 'Select barrel type...',
          customPlaceholder: 'Enter barrel type...',
          options: BULLET_BARREL_TYPE_OPTIONS.map((option) => ({ value: option })),
          fullWidth: true,
        },
      ];

  return (
    <div className={styles.classDetailsSection}>
      {showHeader && <h6 className={styles.classDetailsSectionHeader}>Bullet</h6>}
      <div className={styles.classDetailsFieldGrid}>
        {bulletFields.map((field) => renderConfiguredField(field, isReadOnly))}
      </div>
      {bullet.lgCount > 0 && (
        <div className={styles.lgWidthsSection}>
          <h6 className={styles.classDetailsSectionHeader}>L / G Widths</h6>
          <div className={styles.lgWidthsLayout}>
            <div className={styles.lgWidthsColumn}>
              {Array.from({ length: bullet.lgCount }, (_, index) => (
                <TextField
                  key={`l-${index}`}
                  label={`L${index + 1}`}
                  value={bullet.lWidths[index] || ''}
                  onChange={(value) => bullet.updateLWidth(index, value)}
                  disabled={isReadOnly}
                  placeholder="e.g. 0.075"
                />
              ))}
            </div>
            <div className={styles.lgWidthsColumn}>
              {Array.from({ length: bullet.lgCount }, (_, index) => (
                <TextField
                  key={`g-${index}`}
                  label={`G${index + 1}`}
                  value={bullet.gWidths[index] || ''}
                  onChange={(value) => bullet.updateGWidth(index, value)}
                  disabled={isReadOnly}
                  placeholder="e.g. 0.111"
                />
              ))}
            </div>
          </div>
          {bullet.calculatedDiameter !== null && (
            <div className={styles.calculatedDiameterWrapper}>
              <div className={styles.calculatedDiameterDisplay}>
                <span className={styles.classDetailsLabel}>Calculated Diameter</span>
                <span className={styles.calculatedDiameterValue}>{formatCalculatedDiameter(bullet.calculatedDiameter)}</span>
              </div>
              <button
                type="button"
                className={styles.calcExplanationToggle}
                onClick={() => setShowCalcExplanation((prev) => !prev)}
                aria-expanded={showCalcExplanation}
              >
                {showCalcExplanation ? 'Hide explanation' : 'How is this calculated?'}
              </button>
              {showCalcExplanation && (
                <div className={styles.calcExplanationPanel}>
                  <p className={styles.calcExplanationFormula}>
                    diameter&nbsp;=&nbsp;(L&#772;&nbsp;+&nbsp;G&#772;)&nbsp;&times;&nbsp;n&nbsp;&divide;&nbsp;&pi;
                  </p>
                  <ul className={styles.calcExplanationList}>
                    <li><strong>L&#772;</strong> — average land width</li>
                    <li><strong>G&#772;</strong> — average groove width</li>
                    <li><strong>n</strong> — L/G count</li>
                    <li><strong>&pi;</strong> — 3.14159&hellip;</li>
                  </ul>
                  <p className={styles.calcExplanationNote}>
                    The bullet&rsquo;s circumference approximates the sum of all land and groove
                    widths. Dividing by &pi; converts circumference to diameter.
                  </p>
                  <p className={styles.calcExplanationExample}>
                    <strong>Example:</strong> 6 L/G with L&#772;&nbsp;=&nbsp;0.076&Prime; and
                    G&#772;&nbsp;=&nbsp;0.111&Prime;&nbsp;&rarr;&nbsp;(0.076&nbsp;+&nbsp;0.111)&nbsp;&times;&nbsp;6&nbsp;&divide;&nbsp;&pi;&nbsp;&asymp;&nbsp;0.357&Prime;
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CartridgeCaseSection = ({
  showHeader,
  isReadOnly,
  cartridgeCase,
}: CartridgeSectionProps) => {
  const cartridgeFields: ConfiguredField[] = [
        {
          key: 'caliber',
          kind: 'select-custom',
          label: 'Caliber',
          value: cartridgeCase.caliber,
          isCustom: cartridgeCase.caliberIsCustom,
          onChange: cartridgeCase.setCaliber,
          onCustomChange: cartridgeCase.setCaliberIsCustom,
          placeholder: 'Select caliber...',
          customPlaceholder: 'Enter caliber...',
          options: CALIBER_GROUPED_OPTIONS,
        },
        {
          key: 'brand',
          kind: 'text',
          label: 'Brand',
          value: cartridgeCase.brand,
          onChange: cartridgeCase.setBrand,
          placeholder: 'e.g. Federal',
        },
        {
          key: 'metal',
          kind: 'select-custom',
          label: 'Metal',
          value: cartridgeCase.metal,
          isCustom: cartridgeCase.metalIsCustom,
          onChange: cartridgeCase.setMetal,
          onCustomChange: cartridgeCase.setMetalIsCustom,
          placeholder: 'Select metal...',
          customPlaceholder: 'Enter metal...',
          options: CARTRIDGE_METAL_OPTIONS.map((option) => ({ value: option })),
        },
        {
          key: 'primerType',
          kind: 'select-custom',
          label: 'Primer Type',
          value: cartridgeCase.primerType,
          isCustom: cartridgeCase.primerTypeIsCustom,
          onChange: cartridgeCase.setPrimerType,
          onCustomChange: cartridgeCase.setPrimerTypeIsCustom,
          placeholder: 'Select primer type...',
          customPlaceholder: 'Enter primer type...',
          options: CARTRIDGE_PRIMER_TYPE_OPTIONS.map((option) => ({ value: option })),
        },
        {
          key: 'fpiShape',
          kind: 'select-custom',
          label: 'FPI Shape',
          value: cartridgeCase.fpiShape,
          isCustom: cartridgeCase.fpiShapeIsCustom,
          onChange: cartridgeCase.setFpiShape,
          onCustomChange: cartridgeCase.setFpiShapeIsCustom,
          placeholder: 'Select FPI shape...',
          customPlaceholder: 'Enter FPI shape...',
          options: CARTRIDGE_FPI_SHAPE_OPTIONS.map((option) => ({ value: option })),
        },
        {
          key: 'apertureShape',
          kind: 'select-custom',
          label: 'Aperture Shape',
          value: cartridgeCase.apertureShape,
          isCustom: cartridgeCase.apertureShapeIsCustom,
          onChange: cartridgeCase.setApertureShape,
          onCustomChange: cartridgeCase.setApertureShapeIsCustom,
          placeholder: 'Select aperture shape...',
          customPlaceholder: 'Enter aperture shape...',
          options: CARTRIDGE_APERTURE_SHAPE_OPTIONS.map((option) => ({ value: option })),
        },
      ];

  return (
    <div className={styles.classDetailsSection}>
      {showHeader && <h6 className={styles.classDetailsSectionHeader}>Cartridge Case</h6>}
      <div className={styles.classDetailsFieldGrid}>
        {cartridgeFields.map((field) => renderConfiguredField(field, isReadOnly))}
      </div>
      <div className={styles.classDetailsCheckboxGroup}>
        {renderCheckboxes([
          { key: 'fpDrag', label: 'FP Drag', checked: cartridgeCase.hasFpDrag, onChange: cartridgeCase.setHasFpDrag },
          { key: 'extractor', label: 'Extractor Marks', checked: cartridgeCase.hasExtractorMarks, onChange: cartridgeCase.setHasExtractorMarks },
          { key: 'ejector', label: 'Ejector Marks', checked: cartridgeCase.hasEjectorMarks, onChange: cartridgeCase.setHasEjectorMarks },
          { key: 'chamber', label: 'Chamber Marks', checked: cartridgeCase.hasChamberMarks, onChange: cartridgeCase.setHasChamberMarks },
          { key: 'magazineLip', label: 'Magazine Lip Marks', checked: cartridgeCase.hasMagazineLipMarks, onChange: cartridgeCase.setHasMagazineLipMarks },
          { key: 'primerShear', label: 'Primer Shear', checked: cartridgeCase.hasPrimerShear, onChange: cartridgeCase.setHasPrimerShear },
          { key: 'ejectionPort', label: 'Ejection Port Marks', checked: cartridgeCase.hasEjectionPortMarks, onChange: cartridgeCase.setHasEjectionPortMarks },
        ], isReadOnly)}
      </div>
    </div>
  );
};

export const ShotshellSection = ({
  showHeader,
  isReadOnly,
  shotshell,
}: ShotshellSectionProps) => {
  const shotshellFields: ConfiguredField[] = [
        {
          key: 'gauge',
          kind: 'select-custom',
          label: 'Gauge',
          value: shotshell.gauge,
          isCustom: shotshell.gaugeIsCustom,
          onChange: shotshell.setGauge,
          onCustomChange: shotshell.setGaugeIsCustom,
          placeholder: 'Select gauge...',
          customPlaceholder: 'Enter gauge...',
          options: SHOTSHELL_GAUGES.map((option) => ({ value: option })),
        },
        {
          key: 'shotSize',
          kind: 'text',
          label: 'Shot Size',
          value: shotshell.shotSize,
          onChange: shotshell.setShotSize,
          placeholder: 'e.g. #4',
        },
        {
          key: 'metal',
          kind: 'text',
          label: 'Metal',
          value: shotshell.metal,
          onChange: shotshell.setMetal,
          placeholder: 'e.g. Steel',
        },
        {
          key: 'brand',
          kind: 'text',
          label: 'Brand',
          value: shotshell.brand,
          onChange: shotshell.setBrand,
          placeholder: 'e.g. Winchester',
        },
        {
          key: 'fpiShape',
          kind: 'text',
          label: 'FPI Shape',
          value: shotshell.fpiShape,
          onChange: shotshell.setFpiShape,
          placeholder: 'e.g. Circular',
          fullWidth: true,
        },
      ];

  return (
    <div className={styles.classDetailsSection}>
      {showHeader && <h6 className={styles.classDetailsSectionHeader}>Shotshell</h6>}
      <div className={styles.classDetailsFieldGrid}>
        {shotshellFields.map((field) => renderConfiguredField(field, isReadOnly))}
      </div>
      <div className={styles.classDetailsCheckboxGroup}>
        {renderCheckboxes([
          { key: 'extractor', label: 'Extractor Marks', checked: shotshell.hasExtractorMarks, onChange: shotshell.setHasExtractorMarks },
          { key: 'ejector', label: 'Ejector Marks', checked: shotshell.hasEjectorMarks, onChange: shotshell.setHasEjectorMarks },
          { key: 'chamber', label: 'Chamber Marks', checked: shotshell.hasChamberMarks, onChange: shotshell.setHasChamberMarks },
        ], isReadOnly)}
      </div>
    </div>
  );
};