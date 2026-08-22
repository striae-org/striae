import styles from './form.module.css';

interface FormToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label: string | React.ReactNode;
	error?: string;
}

export const FormToggle = ({ label, error, className, ...props }: FormToggleProps) => {
	return (
		<div className={styles.toggleWrapper}>
			<label className={`${styles.toggle} ${className || ''}`}>
				<input type="checkbox" {...props} />
				<span>{label}</span>
			</label>
			{error && <p className={styles.error}>{error}</p>}
		</div>
	);
};
