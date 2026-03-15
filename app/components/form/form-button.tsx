import styles from './form.module.css';

interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'audit';
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const FormButton = ({ 
  variant = 'primary', 
  isLoading = false, 
  loadingText = 'Loading...', 
  children, 
  className,
  disabled,
  ...props 
}: FormButtonProps) => {
  return (
    <button
      className={`${styles.button} ${styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`]} ${className || ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? loadingText : children}
    </button>
  );
};