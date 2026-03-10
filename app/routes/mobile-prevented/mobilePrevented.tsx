import { Link } from '@remix-run/react';
import styles from './mobilePrevented.module.css';

export const meta = () => {
  const titleText = 'Striae | Desktop Required';
  const description = 'Striae authentication is available on desktop devices only.';

  return [
    { title: titleText },
    { name: 'description', content: description },
  ];
};

export const MobilePrevented = () => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Desktop Required</h1>
        <p className={styles.description}>
          Striae authentication is restricted to desktop devices. Please open this page on a desktop or laptop computer to continue.
        </p>
        <Link viewTransition prefetch="intent" to="https://striae.org" className={styles.link}>
          Return Home
        </Link>
      </div>
    </div>
  );
};
