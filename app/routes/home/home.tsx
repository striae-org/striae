import { Link } from '@remix-run/react';
import styles from './home.module.css';
import { useState } from 'react';
import { Notice } from '~/components/notice/notice';
import NoticeText from './NoticeText';
import { baseMeta } from '~/utils/meta';
import { Icon } from '~/components/icon/icon';
import { BlogFeed } from '~/components/blog-feed/blog-feed';

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
          <div className={styles.buttonGroup}>            
            <a 
              href="https://www.striae.org/auth"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.signInButton}>
              Sign In
            </a>
            <Link 
              to="/access#top"
              viewTransition
              className={styles.actionButton}>
              Agency Registration
            </Link>            
          </div>
          <div className={styles.noticeSection}>
            <p className={styles.noticeText}>Access to Striae is free for forensic professionals employed at a forensic laboratory or organization.
              <br />
              </p>            
            <button onClick={() => setNoticeOpen(true)} className={styles.actionButton}>
              What is this?
            </button>            
          </div>         
          
          <BlogFeed />
          
          <div className={styles.aboutSection}>
            <h2 className={styles.aboutTitle}>The Origins of Striae</h2>            
            <div className={styles.aboutContent}>              
              <p>
                Through his experience as a forensic firearms examiner, Stephen encountered a critical bottleneck in the comparison workflow: making detailed, concurrent annotations on comparison images was both cumbersome and inefficient. Existing methods forced examiners to print images separately from the comparison workflow and mark them up by hand, providing no streamlined way to link annotations directly to the digital evidence. This time-consuming process could take up to an hour per casefile, especially in complex investigations.
              </p>
              <p>
                Stephen envisioned a better way. Striae was created to streamline forensic comparison workflows by providing an intuitive, cloud-based platform for direct digital annotation and evidence linking. With Striae, examiners can quickly annotate comparison images, seamlessly associate notes with specific evidence, and create well-formatted reports, all in the same workflow environment. Striae transforms painstaking manual tasks into an efficient, integrated digital process, empowering examiners to focus on what matters most: analysis and reporting.
                </p>
              <p>
                Striae is one of the first, and potentially the very first, cloud-native forensic annotation applications built specifically for forensic firearms examination—a highly specialized area seldom addressed by existing forensic technology platforms. This innovative solution harnesses global cloud infrastructure (leveraging Cloudflare) to deliver unmatched capabilities in accessibility, security, and operational efficiency for firearms examiners worldwide.
              </p>             
            </div>
          </div>

          <div className={styles.aboutSection}>
            <h2 className={styles.aboutTitle}>About the Developer</h2>
            <div className={styles.aboutContent}>
              <div className={styles.developerProfile}>
                <img 
                  src="/steve2.png" 
                  alt="Stephen J. Lu" 
                  className={styles.profileImage}
                />
                <div className={styles.developerInfo}>
                  <div className={styles.developerTitle}>Lead Developer</div>
                  <div className={styles.developerName}>Stephen J. Lu, EMBA, SHRM-CP</div>
                  <div className={styles.socialLinks}>
                    <a 
                      href="https://www.linkedin.com/in/StephenJLu/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.socialLink}
                      aria-label="LinkedIn Profile"
                    >
                      <Icon icon="linkedin" size={24} />
                    </a>
                    <a 
                      href="https://github.com/StephenJLu" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.socialLink}
                      aria-label="GitHub Profile"
                    >
                      <Icon icon="github" size={24} />
                    </a>
                    <a 
                      href="https://bsky.app/profile/stephenjlu.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.socialLink}
                      aria-label="Bluesky Profile"
                    >
                      <Icon icon="bluesky" size={24} />
                    </a>
                    <a 
                      href="https://stephenjlu.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.socialLink}
                      aria-label="Website"
                    >
                      <Icon icon="globe" size={24} />
                    </a>
                  </div>
                </div>
              </div>
              <p>
                Stephen is a lifelong programmer who began his journey with BASIC and Turbo Pascal. During high school, he helped the Programming Club create the school&apos;s first website, and his first personal website—featuring detailed starship specifications and histories from Star Trek—was hosted by GeoCities in the 1990s.
              </p>
              <p>
                Alongside his extensive forensic career, Stephen modernized the California Association of Criminalists&apos; website by implementing current technologies and enhancing the organization&apos;s digital presence for more effective public engagement and professional communication.
              </p>              
              <p>
                He is an active member of the Association of Firearm and Tool Mark Examiners, the California Association of Criminalists, and the International Association for Identification, bringing decades of forensic expertise and technological innovation to the development of Striae.
              </p>
              <p>
                Stephen holds an Executive MBA with Honors from Quantic School of Business and Technology and a Bachelor of Science with Honors, <em>magna cum laude</em>, in Biochemistry and Molecular Biophysics and Molecular and Cellular Biology from the University of Arizona. Stephen is a Society for Human Resource Management Certified Professional (SHRM-CP). In addition, he is a member of Phi Beta Kappa, an honor society recognizing exceptional academic achievements in the humanities, social sciences, natural sciences, and mathematics.
              </p>
            </div>
          </div>          
        </div>
      </div>
      <Notice isOpen={isNoticeOpen} onClose={handleNoticeClose} notice={{ title: 'About Striae', content: <NoticeText /> }} />      
    </>
  );
}