import { Link } from '@remix-run/react';
import { useEffect } from 'react';
import styles from './footer.module.css';
import { getAppVersion } from '../../utils/version';

export default function Footer() {
  const year = new Date().getFullYear();
  const appVersion = getAppVersion();
  
  return (    
    <footer className={styles.footer}>
      <div className={styles.container}>
        <nav className={styles.nav}>
          <a href="https://help.striae.org" target="_blank" rel="noopener noreferrer" className={styles.link}>
            User&apos;s Guide
          </a>
          <a href="https://blog.striae.org" target="_blank" rel="noopener noreferrer" className={styles.link}>
            Blog
          </a>
          <Link to="/privacy#top" className={styles.link}>
            Privacy Policy
          </Link>
          <Link to="/terms#top" className={styles.link}>
            Terms & Conditions
          </Link>          
          <Link to="/security#top" className={styles.link}>
            Security Policy
          </Link>
          <Link to="/support#top" className={styles.link}>
            Need Help?
          </Link>
          <Link to="/bugs#top" className={styles.link}>
            Submit a Bug Report
          </Link>
        </nav>
        <div className={styles.badgeContainer}>
          <div className={styles.openCollectiveWidget}>
            <a 
              href="https://opencollective.com/striae" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.openCollectiveLink}
            >
              <img 
                src="/open-collective.svg" 
                alt="Contribute to our Open Collective" 
                className={styles.openCollectiveImage}
              />
            </a>
          </div>
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
          <a href="https://github.com/striae-org/striae/blob/master/LICENSE" className={styles.link} target="_blank" rel="noopener noreferrer">Striae {appVersion}</a> © {year}. All rights reserved.
          <br />
            <a href="https://www.StephenJLu.com" className={styles.linkSmall} target="_blank" rel="noopener noreferrer">Designed and developed by Stephen J. Lu</a>        
        </p>
      </div>
    </footer>    
  );
}