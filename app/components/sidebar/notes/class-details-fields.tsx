import type { ReactNode } from 'react';
import styles from './notes.module.css';
import { CUSTOM, handleSelectWithCustom } from './class-details-shared';

interface BaseFieldProps {
  label: string;
  disabled: boolean;
  fullWidth?: boolean;
}

interface TextFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  min?: number;
}

interface SelectFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children: ReactNode;
}

interface SelectWithCustomFieldProps extends SelectFieldProps {
  isCustom: boolean;
  onCustomChange: (value: boolean) => void;
  customPlaceholder: string;
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}

const fieldClassName = (fullWidth = false): string =>
  fullWidth ? `${styles.classDetailsField} ${styles.classDetailsFieldFull}` : styles.classDetailsField;

export const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  fullWidth = false,
  type = 'text',
  min,
}: TextFieldProps) => (
  <div className={fieldClassName(fullWidth)}>
    <span className={styles.classDetailsLabel}>{label}</span>
    <input
      type={type}
      min={min}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={styles.classDetailsInput}
      disabled={disabled}
      placeholder={placeholder}
    />
  </div>
);

export const SelectField = ({
  label,
  value,
  onChange,
  placeholder,
  children,
  disabled,
  fullWidth = false,
}: SelectFieldProps) => (
  <div className={fieldClassName(fullWidth)}>
    <span className={styles.classDetailsLabel}>{label}</span>
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={styles.classDetailsInput}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  </div>
);

export const SelectWithCustomField = ({
  label,
  value,
  isCustom,
  onChange,
  onCustomChange,
  placeholder,
  customPlaceholder,
  children,
  disabled,
  fullWidth = false,
}: SelectWithCustomFieldProps) => (
  <div className={fieldClassName(fullWidth)}>
    <span className={styles.classDetailsLabel}>{label}</span>
    <select
      aria-label={label}
      value={isCustom ? CUSTOM : value}
      onChange={(event) => handleSelectWithCustom(event.target.value, onChange, onCustomChange)}
      className={styles.classDetailsInput}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {children}
      <option value={CUSTOM}>Other / Custom...</option>
    </select>
    {isCustom && (
      <input
        type="text"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.classDetailsInput}
        disabled={disabled}
        placeholder={customPlaceholder}
      />
    )}
  </div>
);

export const CheckboxField = ({
  label,
  checked,
  onChange,
  disabled,
}: CheckboxFieldProps) => (
  <label className={styles.classDetailsCheckboxLabel}>
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      disabled={disabled}
    />
    <span>{label}</span>
  </label>
);