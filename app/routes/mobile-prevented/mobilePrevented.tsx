import { Link } from '@remix-run/react';
import { baseMeta } from '~/utils/meta';
import Footer from '~/components/footer/footer';
import styles from './mobilePrevented.module.css';

export const meta = () => {
  return baseMeta({
    title: 'Desktop Required',
    description: 'Striae authentication is available on desktop devices only.',
  });
};

export const MobilePrevented = () => {
  return (
    <>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Desktop Required</h1>
          <p className={styles.description}>
            Striae authentication is restricted to desktop devices. Please open this page on a desktop or laptop computer to continue.
          </p>
          <Link viewTransition prefetch="intent" to="/" className={styles.link}>
            Return Home
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
};
