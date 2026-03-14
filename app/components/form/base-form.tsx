import { Form as RemixForm } from 'react-router';
import styles from './form.module.css';

interface BaseFormProps {
  children: React.ReactNode;
  method?: 'get' | 'post' | 'put' | 'delete';
  className?: string;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

export const BaseForm = ({ children, method = 'post', className, onSubmit }: BaseFormProps) => {
  return (
    <RemixForm 
      method={method} 
      className={`${styles.form} ${className || ''}`}
      onSubmit={onSubmit}
    >
      {children}
    </RemixForm>
  );
};