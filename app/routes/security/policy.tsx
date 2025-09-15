/* eslint-disable react/no-unescaped-entities */
import { baseMeta } from '~/utils/meta';
import { Link } from '@remix-run/react';
import styles from './policy.module.css';

export const meta = () => {
  return baseMeta({
    title: 'Security Policy - Striae',
    description: 'Security policy and vulnerability disclosure guidelines for Striae',
  });
};

export const Policy = () => {
  return (
    <div id="top" className={styles.container}>
      <Link 
        viewTransition
        prefetch="intent"
        to="/#top" 
        className={styles.logoLink}>
        <div className={styles.logo} />
      </Link>
      <div className={styles.content}>
        <h1>Security Policy</h1>
        
        <section>
          <h2>Reporting Security Issues</h2>
          <p>We take the security of Striae seriously. If you believe you have found a security vulnerability, please report it to us responsibly.</p>
          <p>You may:
            <ol>
              <li>Email security findings to: <a href="mailto:info@striae.org">info@striae.org</a></li>
              <li>Submit a security issue on <a href="https://github.com/striae-org/striae/security/advisories/new" target="_blank" rel="noopener noreferrer">GitHub</a></li>              
            </ol>
            For encryption, please use our <a href="https://keybase.io/stephenjlu/pgp_keys.asc" target="_blank" rel="noopener noreferrer">PGP key</a>
          </p>
        </section>

        <section>
          <h2>Disclosure Process</h2>
          <ul>
            <li>After we receive your report, we will:
              <ul>
                <li>Acknowledge receipt within 48 hours.</li>
                <li>Provide updates as we investigate and remediate the issue.</li>
                <li>Notify you when the vulnerability is resolved and, if desired, credit you for your responsible disclosure.</li>
              </ul>
            </li>
            <li>Where possible, we aim to resolve valid vulnerabilities within 30 days and will keep you informed of progress.</li>
          </ul>
        </section>

        <section>
          <h2>Researcher Responsibilities</h2>
          <ul>
            <li>Guidelines:
              <ul>
                <li>Do not access, modify, or delete user data without authorization.</li>
                <li>Avoid actions that could degrade, disrupt, or damage Striae services.</li>
                <li>Do not use automated scanning tools that generate a significant amount of traffic or requests.</li>
                <li>Comply with all applicable laws and regulations.</li>
              </ul>
            </li>
            <li>Safe Harbor:
              <ul>
                <li>Activities in good faith, consistent with this policy and intended to improve Striae security, will not be subject to legal action or account restriction. If legal action is initiated by a third party, Striae will make it clear that your actions were conducted under this policy.</li>
              </ul>
            </li>
          </ul>
        </section>

        <section>
          <h2>Scope</h2>
          <p>This policy applies to all Striae properties including:</p>
          <ul>
            <li>https://www.striae.org</li>
            <li>All Striae subdomains</li>
            <li>Striae web application (current version only)</li>
          </ul>
        </section>

        <section>
          <h2>Out of Scope</h2>
          <ul>
            <li>DoS/DDoS attacks</li>
            <li>Spam or social engineering</li>
            <li>Physical security attacks</li>
          </ul>
        </section>
        <section>
          <div className={styles.lastUpdated}>Last updated: September 1, 2025</div>
        </section>
      </div>
    </div>
  );
}