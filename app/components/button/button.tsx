import { Icon } from '../icon/icon';
import styles from './button.module.css';
import { classes } from '~/utils/ui';

interface ButtonProps {
  iconId: string;
  isActive?: boolean;
  onClick?: () => void;
  ariaLabel: string;
  title?: string;
  disabled?: boolean;
  showSpinner?: boolean;
}

export const Button = ({ 
  iconId, 
  isActive = false, 
  onClick,
  ariaLabel,
  title,
  disabled = false,
  showSpinner = false
}: ButtonProps) => {
  return (
    <button
      className={classes(styles.button, isActive && styles.active, disabled && styles.disabled)}
      onClick={disabled ? undefined : onClick}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      title={title || ariaLabel}
      disabled={disabled}
    >
      {showSpinner ? (
        <div className={styles.spinner}></div>
      ) : (
        <Icon
          size={30}        
          icon={iconId} 
          className={styles.icon}
        />
      )}
    </button>
  );
};

Button.displayName = 'Button';