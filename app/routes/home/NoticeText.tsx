import { Link } from '@remix-run/react';
import { useEffect } from 'react';
import styles from '~/components/notice/notice.module.css';

const NoticeText = () => {
  useEffect(() => {
    // No longer need to load external script since we're using direct links
  }, []);
  return (
    <div>
      <h2>Introducing Striae – A New Tool for Firearms Examiners</h2>
      <p>
        We are excited to announce Striae, an innovative web app designed to assist firearms examiners in creating detailed annotations for your comparison images. Striae aims to streamline the processes of labeling, note-taking, and printing, making the review process a little bit easier.
      </p>
      <p><strong>Features of Striae</strong></p>
      <ul>
        <li>
            <strong>Annotation Tools:</strong> Simplify the process of marking and labeling comparison images with ease. Add case and item number labels, labels for class characteristics, a potential subclass warning/indicator, an indexing color/number indicator, support indicator for ID, inconclusive, or exclusion, and more.
        </li>
        <li>
            <strong>Streamlined Note-Taking:</strong> Keep comprehensive and organized notes directly linked to your comparison images. Add or modify your notes at any time, and easily print them or save as a PDF for your casefile.
        </li>
        <li>
            <strong>Case Export/Import:</strong> Seamlessly transfer cases between systems or share with colleagues through secure ZIP export functionality. Export complete cases with images, annotations, and metadata for archival or collaboration, and import cases for review with full data integrity validation.
        </li>
        <li>
            <strong>Case Review and Authenticated Confirmations:</strong> Enable secure peer review and confirmation workflows with authenticated access to read-only case data. Technical reviewers can examine findings and provide confirmations while maintaining complete audit trails for quality assurance and laboratory standards.
        </li>        
        <li>
            <strong>Convert to PDF to Save or Print: </strong> Generate professional-quality PDF outputs for documentation and reporting. Include authenticated digital confirmation records or traditional confirmation remarks in your final reports for comprehensive case documentation.
        </li>
      </ul>
      <p><strong>Security Features of Striae</strong></p>
      <p>
        Coming from a forensics background ourselves, we understand the necessity for strong security measures in order to protect your data and files. From day one, Striae was designed with data security as a top priority.
        <p>
            We have implemented the following security features in Striae:
        </p>
      </p>
      <ul>
        <li>
            <strong>Authentication and Password Security:</strong> Striae relies on Firebase Authentication, a secure platform by Google, to manage user authentication. Features of Firebase include hashed passwords, secure token generation, and multi-factor authentication options.
        </li>
        <li>
            <strong>Data Storage:</strong> Your data is encrypted and protected against unauthorized access. Measures include data segregation, AES-256 encryption with GCM mode via Cloudflare R2 and KV storage¹, and no plaintext storage of sensitive information.
        </li>
        <li>
            <strong>Data Transit:</strong> All data transfers are encrypted via TLS, and access is controlled through the use of signed URLs.
        </li>
        <li>
          <strong>Comprehensive Audit Trail:</strong> Striae maintains a detailed audit trail of all user and case-related activities, providing transparency and accountability. This includes logging user actions, data modifications, and system events to ensure a secure and traceable environment. Audit trail records are retained indefinitely for security, forensic integrity, and compliance purposes.
        </li>
        <li>
            <strong>Controlled Access and Monitoring:</strong> Access requests are logged for auditing and security. Data access is limited to you or authorized troubleshooting only. CORS support restricts data requests to Striae&apos;s domain exclusively.
        </li>
        <li>
            <strong>Transparency and Accountability:</strong> We maintain an open security policy, which encourages reporting of vulnerabilities and issues. We are committed to addressing any security concerns promptly and transparently. Striae does not share sensitive data with third parties, nor is any data stored with Striae subject to scraping, analysis, or processing for any purpose other than the intended use of the app. 
        </li>
        <li>
          <strong>Control Over Your Data:</strong> Except for automated processing that is technically necessary for storage, transmission, resizing, compression, or display, Striae does not edit the substantive contents of your data. When you delete your data, it is removed from active systems and no longer accessible through the Service. Residual copies may remain for a limited period in logs, temporary caches, or provider-level replicated storage until overwritten or deleted in the ordinary course of business. Audit trail records are retained indefinitely and are not deleted as part of account or data deletion.
        </li>        
      </ul>
      <p>If you have any questions or concerns regarding our security protocols, please refer to the <Link 
        viewTransition
        prefetch="intent"
        to="/terms#storage">
        Data Storage Addendum
      </Link> in the Terms & Conditions, or contact us at <a href="mailto:info@striae.org" target="_blank" rel="noopener noreferrer">info@striae.org</a>.</p>
      
      <p className={styles.footnote}>
        <small>¹ For detailed encryption specifications, see: <a href="https://developers.cloudflare.com/r2/reference/data-security/" target="_blank" rel="noopener noreferrer">Cloudflare R2 Security</a> and <a href="https://developers.cloudflare.com/kv/reference/data-security/" target="_blank" rel="noopener noreferrer">Cloudflare KV Security</a></small>
      </p>
      
      <p>
        <strong>Community, Collaboration & Open Innovation</strong>
      </p>
      <p>
        Striae is built on the principles of open collaboration, community-driven development, and shared innovation. Our commitment to openness extends beyond just making our code available—we actively participate in initiatives that protect and promote the free exchange of ideas and technology for the benefit of the entire forensic science community.
      </p>
      <p>
        <strong>Open Source Foundation</strong>
      </p>
      <p>
        Striae is an open-source and free service dedicated to providing streamlined comparison annotation services for forensic firearms and tool mark examiners worldwide. The entire codebase is available on <a href="https://github.com/striae-org/striae" target="_blank" rel="noopener noreferrer">GitHub</a>, supporting transparency, collaboration, and continuous improvement from the firearms examiner community.
      </p>
      <p>
        <strong>Patent Protection & Innovation Freedom</strong>
      </p>
      <p>
        Striae is proud to be a member of the <a href="https://openinventionnetwork.com/" target="_blank" rel="noopener noreferrer">Open Invention Network (OIN)</a>, the world's largest patent non-aggression community. The OIN is a collaborative defense platform that enables freedom of action in Linux and other open source technologies by creating a patent-free zone for innovation.
      </p>
      <div className={styles.oinBadgeContainer}>
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
      <p>
        As an OIN community member, Striae contributes to a patent non-aggression environment that protects the entire open source ecosystem. This membership demonstrates our commitment to fostering innovation without the threat of patent litigation, ensuring that forensic tools remain accessible and freely available to the forensic science community. The OIN's defensive patent strategy helps protect not only Striae but thousands of other open source projects that advance technology for the public good.
      </p>
      <p>
        This protection is particularly important for forensic science applications, where transparency, reproducibility, and peer review are fundamental principles. By participating in the OIN, Striae helps maintain an environment where forensic technology can evolve through collaborative development, free from patent-related barriers that could impede scientific progress or limit access to critical examination tools.
      </p>      
      <p>
        We welcome contributions, suggestions, and feedback from users and developers interested in shaping the future of digital annotation tools for forensic firearms examination. Users can adapt and verify the tool for specialized casework or agency-specific needs. If you have ideas for new features or would like to get involved in development, please visit the repository or contact our team. You can submit issues, feature requests, or pull requests directly on the GitHub repository. For non-developers, links are available in the footer to submit bug reports or feature requests, or to contact support directly.
      </p>      
      <p>
        Thank you for your support, and we hope Striae is a valuable addition to your comparison toolkit!
        </p>
    </div>
  );
};

export default NoticeText;