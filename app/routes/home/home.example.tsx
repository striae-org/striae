import { Link } from '@remix-run/react';
import styles from './home.module.css';
import { useState } from 'react';
import { Notice } from '~/components/notice/notice';
import NoticeText from './NoticeText';
import { baseMeta } from '~/utils/meta';
import Footer from '~/components/footer/footer';

export const meta = () => {
  return baseMeta({
    title: "Welcome to Striae",
    description: "A Firearms Examiner's Comparison Companion",
  });
};

export default function Home() {
  const [isNoticeOpen, setNoticeOpen] = useState(false);  

  const handleNoticeClose = () => {
    setNoticeOpen(false);
  };    
  
  return (
    <>
      <div id="top" className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logo} />
          <div className={styles.title}>
            <p>Striae: A Firearms Examiner&apos;s Comparison Companion</p>
          </div>
          <div className={styles.subtitle}>
            DEMO INSTANCE OF STRIAE - PENDING FEATURES MAY NOT BE STABLE            
          </div>
          <div className={styles.buttonGroup}>            
            <Link
              to="/auth#top"
              viewTransition
              prefetch="intent"
              className={styles.signInButton}
            >
              DEMO Sign-in / Register
            </Link>
            <button onClick={() => setNoticeOpen(true)} className={styles.actionButton}>
              What is this?
            </button>                       
          </div>                    
          <div className={styles.aboutSection}>
            <h2 className={styles.aboutTitle}>STRIAE DEMO CONDITIONS</h2>            
            <div className={styles.aboutContent}>
              <ul className={styles.demoConditions}>
                <li>Mobile devices and tablets are not supported. Register and login using a desktop or laptop computer.</li>
                <li><strong><em>DO NOT</em> upload or enter casework images, casework data, research materials, or training materials using a demo account. Demo instance data and files may be purged without notice.</strong></li>
                <li>Features are still under active development and may be unstable.</li>
                <li>Feedback forms remain enabled for bug reports, feature requests, and troubleshooting support.</li>                
              </ul>
            </div>
          </div>                    
        </div>
      </div>
      <Notice isOpen={isNoticeOpen} onClose={handleNoticeClose} notice={{ title: 'About Striae', content: <NoticeText /> }} />      
      <Footer />
    </>
  );
}