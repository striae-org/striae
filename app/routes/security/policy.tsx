/* eslint-disable react/no-unescaped-entities */
import { baseMeta } from '~/utils/meta';
import { Link } from '@remix-run/react';
import Footer from '~/components/footer/footer';
import styles from '~/styles/legal-pages.module.css';

export const meta = () => {
  return baseMeta({
    title: 'Security Policy - Striae',
    description: 'Security policy and vulnerability disclosure guidelines for Striae',
  });
};

export const Policy = () => {
  return (
    <>
      <div id="top" className={`route-legal-container ${styles.container}`}>
        <Link 
          viewTransition
          prefetch="intent"
          to="/" 
          className="route-brand-logo-link">
          <div className={`route-brand-logo ${styles.logo}`} />
        </Link>
        <Link
          viewTransition
          prefetch="intent"
          to="/"
          className={`route-brand-return-link ${styles.returnLink}`}
          aria-label="Return to Striae"
        />
        <div className={styles.content}>
        <h1>Security Policy</h1>
        
        <section className={styles.section}>
          <h2>Reporting Security Issues</h2>
          <p>We take the security of Striae seriously. If you believe you have found a security vulnerability, please report it to us responsibly.</p>
          <p>You may:
            <ol>
              <li>Email security findings to: <a href="mailto:info@striae.org">info@striae.org</a>. You are encouraged to use <a href="/.well-known/publickey.info@striae.org.asc" target="_blank" rel="noopener noreferrer">our PGP key</a>.</li>
              <li>Submit a security issue on <a href="https://github.com/striae-org/striae/security/advisories/new" target="_blank" rel="noopener noreferrer">GitHub</a>.</li>
              <li>Send Stephen an encrypted message on Keybase using <a href="https://keybase.io/stephenjlu/pgp_keys.asc" target="_blank" rel="noopener noreferrer">his PGP key</a>.</li>
            </ol>            
          </p>
        </section>

        <section className={styles.section}>
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

        <section className={styles.section}>
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

        <section className={styles.section}>
          <h2>Scope</h2>
          <p>This policy applies to all Striae properties including:</p>
          <ul>
            <li>https://striae.org</li>
            <li>All Striae subdomains</li>
            <li>Striae web application (current version only)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Out of Scope</h2>
          <ul>
            <li>DoS/DDoS attacks</li>
            <li>Spam or social engineering</li>
            <li>Physical security attacks</li>
          </ul>
        </section>
        <section className={styles.section}>
          <div className={styles.lastUpdated}>Last updated: February 26, 2026</div>
        </section>
        </div>
      </div>
      <Footer />
    </>
  );
}