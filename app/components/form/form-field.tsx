import styles from './form.module.css';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  label?: string;
  error?: string;
  component?: 'input' | 'textarea' | 'select';
  children?: React.ReactNode; // For select options
  ref?: React.Ref<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
}

export const FormField = ({ label, error, component = 'input', className, children, ref, ...props }: FormFieldProps) => {
  const baseClassName = component === 'textarea' ? styles.textarea : component === 'select' ? styles.select : styles.input;
  
  return (
    <div className={styles.fieldWrapper}>
      {label && (
        <label className={styles.label} htmlFor={props.id || props.name}>
          {label}
        </label>
      )}
      {component === 'input' && (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          className={`${baseClassName} ${className || ''}`}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {component === 'textarea' && (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className={`${baseClassName} ${className || ''}`}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      )}
      {component === 'select' && (
        <select
          ref={ref as React.Ref<HTMLSelectElement>}
          className={`${baseClassName} ${className || ''}`}
          {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {children}
        </select>
      )}
      {error && (
        <p className={styles.error}>{error}</p>
      )}
    </div>
  );
};