import { Link } from '@remix-run/react';
import styles from './home.module.css';
import { useState, useEffect } from 'react';
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
  
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
      const launchDate = new Date('2025-10-01T11:00:00-07:00');
      const updateTimer = () => {
      const now = new Date();
      const diff = launchDate.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('00:00:00:00');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft(
        `${days.toString().padStart(2, '0')}:` +
        `${hours.toString().padStart(2, '0')}:` +
        `${minutes.toString().padStart(2, '0')}:` +
        `${seconds.toString().padStart(2, '0')}`
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div id="top" className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logo} />
          <div className={styles.title}>
            <p>Striae: A Firearms Examiner&apos;s Comparison Companion</p>
          </div>
          <div className={styles.buttonGroup}>            
            <Link 
              viewTransition
              prefetch="intent"
              to="/auth" 
              className={styles.signInButton}>
              Sign In
            </Link>            
            <button onClick={() => setNoticeOpen(true)} className={styles.actionButton}>
              What is this?
            </button>
            <Link 
              viewTransition
              prefetch="intent"
              to="/demo" 
              className={styles.actionButton}>
              Access Demo
            </Link>
          </div>
          <div className={styles.subtitle}>
            <p>Release Candidacy Begins October 1, 2025 @ 11:00 AM MST</p>
            <br />
            <p><a href="https://www.customink.com/fundraising/striae-beta-als-san-diego" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Striae Beta Fundraiser for ALS San Diego in Honor of John Farrell</a></p>
           <div className={styles.youtubeEmbed}>
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/9BceT9atfBA?si=tGb-WAJp2mdGx5dA"
                title="YouTube video player"                
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
            Time until candidate release:
             <pre style={{ fontFamily: 'monospace', fontSize: '2.5rem', margin: '0.5em 0', color: '#FFF', background: 'none', border: 'none' }}>{timeLeft}</pre>            
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
            </div>
          </div>          
        </div>
      </div>
      <Notice isOpen={isNoticeOpen} onClose={handleNoticeClose} notice={{ title: 'About Striae', content: <NoticeText /> }} />      
    </>
  );
}