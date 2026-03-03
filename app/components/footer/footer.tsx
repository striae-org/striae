import { Link } from '@remix-run/react';
import { useState } from 'react';
import styles from './footer.module.css';
import { Notice } from '~/components/notice/notice';
import LicenseText from '~/routes/home/LicenseText';
import { getAppVersion } from '../../utils/version';

export default function Footer() {
  const year = new Date().getFullYear();
  const appVersion = getAppVersion();
  const [isLicenseNoticeOpen, setIsLicenseNoticeOpen] = useState(false);
  
  return (
    <>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <nav className={styles.nav}>                                      
          <Link 
            viewTransition
            prefetch="intent"
            to="/privacy" 
            className={styles.link}>
            Privacy Policy
          </Link>
          <Link 
            viewTransition
            prefetch="intent"
            to="/terms" 
            className={styles.link}>
            Terms & Conditions
          </Link>          
          <Link 
            viewTransition
            prefetch="intent"
            to="/security" 
            className={styles.link}>
            Security Policy
          </Link>
          <Link             
            to="https://striae.org/support" 
            target="_blank"
            rel="noopener noreferrer" 
            className={styles.link}>
            Need Help?
          </Link>
          <Link             
            to="https://striae.org/bugs" 
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}>
            Submit a Bug Report
          </Link>
          <a
            href="/docs/striae-white-paper.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}>
            White Paper
          </a>
          </nav>
          <div className={styles.badgeContainer}>
            <div className={styles.oinBadge}>
              <a
                href="https://openinventionnetwork.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.oinBadgeLink}
              >
                <img 
                  src="/oin-badge.png" 
                  alt="Open Invention Network Community Member" 
                  className={styles.oinBadgeImage}
                />
              </a>
            </div>
          </div>
          <p className={styles.copyright}>
            <a href={`https://github.com/striae-org/striae/releases/tag/v${appVersion}`} className={styles.link} target="_blank" rel="noopener noreferrer">Striae v{appVersion}</a> © {year}.{' '}
            <button
              type="button"
              className={styles.licenseLinkButton}
              onClick={() => setIsLicenseNoticeOpen(true)}
            >
              Licensed under Apache 2.0.
            </button>
          </p>
        </div>
      </footer>
      <Notice
        isOpen={isLicenseNoticeOpen}
        onClose={() => setIsLicenseNoticeOpen(false)}
        notice={{ title: 'Apache License 2.0 Notice', content: <LicenseText />, buttonText: 'Close License Notice' }}
      />
    </>
  );
}