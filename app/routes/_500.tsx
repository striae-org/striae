import { Link } from '@remix-run/react';
import { baseMeta } from '~/utils/meta';
import styles from '~/styles/root.module.css';

export const meta = () => {
  return baseMeta({
    title: '500 - Server Error',
    description: 'An unexpected error occurred.',
  });
};

export default function ServerError() {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorTitle}>500</div>
      <p className={styles.errorMessage}>Something went wrong. Please try again later.</p>
      <Link 
        viewTransition
        prefetch="intent"
        to="/#top" 
        className={styles.errorLink}>
        Return Home
      </Link>
    </div>
  );
}