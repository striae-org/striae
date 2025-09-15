import { Link } from '@remix-run/react';
import { baseMeta } from '~/utils/meta';
import styles from '~/styles/root.module.css';

export const meta = () => {
  return baseMeta({
    title: '404 - Page Not Found',
    description: 'The page you are looking for does not exist.',
  });
};

export default function NotFound() {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorTitle}>404</div>
      <p className={styles.errorMessage}>Page not found</p>
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