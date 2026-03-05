/* eslint-disable react/no-unescaped-entities */
import { baseMeta } from '~/utils/meta';
import { Link } from '@remix-run/react';
import Footer from '~/components/footer/footer';
import styles from '~/styles/legal-pages.module.css';

export const meta = () => {
  return baseMeta({
    title: 'Trust & Compliance',
    description: 'Trust and compliance resources relevant to Striae service providers.',
  });
};

export const TrustCompliance = () => {
  return (
    <>
      <div id="top" className={`route-legal-container ${styles.container}`}>
        <Link viewTransition prefetch="intent" to="/" className="route-brand-logo-link">
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
          <h1>Trust & Compliance</h1>
          <p className={styles.lastUpdated}>Last updated: March 4, 2026</p>

          <section className={styles.section}>
            <h2>Scope and Context</h2>
            <p>
              This page provides third-party compliance resources used to support transparency and
              customer due diligence for Striae. Unless explicitly stated otherwise, the documents
              listed below are provider materials and do not by themselves constitute a separate
              certification of Striae.
            </p>
            <p>
              For additional platform security controls and disclosure expectations, see Striae's{' '}
              <Link viewTransition prefetch="intent" to="/security">
                Security Policy
              </Link>
              .
            </p>
          </section>

          <section className={styles.section}>
            <h2>GitHub Compliance Resources</h2>
            <h3>Reports</h3>
            <ul>
              <li>
                <p>
                  <a
                    href="/compliance/GitHub.Enterprise.Cloud.SOC.1.Type.2.ITGC.Final.Report_11.-.20.-.2025.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    SOC 1, Type 2 Report
                  </a>
                </p>
                <p>Coverage period: 2025-04-01 to 2025-09-30</p>
              </li>
              <li>
                <p>
                  <a
                    href="/compliance/GitHub.Enterprise.Cloud.SOC.2.Type.2.Final.Report_11.-.20.-.2025.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    SOC 2, Type 2 Report
                  </a>
                </p>
                <p>Coverage period: 2025-04-01 to 2025-09-30</p>
              </li>
            </ul>

            <h3>Bridge Letters</h3>
            <ul>
              <li>
                <p>
                  <a
                    href="/compliance/GitHub.Enterprise.Cloud.SOC.1.Type.2.-.Bridge.Letter.01.Dec.2025.-.31.Dec.2025.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    SOC 1, Type 2 Bridge Letter
                  </a>
                </p>
                <p>Coverage period: 2025-12-01 to 2025-12-31</p>
              </li>
              <li>
                <p>
                  <a
                    href="/compliance/GitHub.Enterprise.Cloud.SOC.2.Type.2.-.Bridge.Letter.01.Dec.2025.-.31.Dec.2025.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    SOC 2, Type 2 Bridge Letter
                  </a>
                </p>
                <p>Coverage period: 2025-12-01 to 2025-12-31</p>
              </li>
            </ul>

            <h3>Certifications and Program Documents</h3>
            <ul>
              <li>
                <p>
                  <a
                    href="/compliance/GitHub.CSA.STAR.Certificate.Award.-.5.1.2025.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub.com CSA STAR Level 2 Certification
                  </a>
                </p>
                <p>Coverage period: 2025-05-01 to 2028-05-05</p>
              </li>
              <li>
                <p>
                  <a
                    href="/compliance/GitHub.ISO.27001.Certificate.Award.-.5.1.2025.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub.com ISO/IEC 27001:2022 Certification
                  </a>
                </p>
                <p>Coverage period: 2025-05-01 to 2028-05-05</p>
              </li>
              <li>
                <p>
                  <a
                    href="/compliance/GitHub.com_Services_Continuity_and_Incident_Management_Plan.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub.com Services Continuity and Incident Management Plan
                  </a>
                </p>
                <p>Last updated: 2024-12-02</p>
              </li>
              <li>
                <p>
                  <a
                    href="https://cloudsecurityalliance.org/star/registry/github-inc"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    CSA CAIQ
                  </a>
                </p>
                <p>
                  The Cloud Security Alliance Consensus Assessment Initiative Questionnaire
                  (CSA-CAIQ or CAIQ) is a self-assessment that evaluates a cloud provider
                  against CSA's Cloud Control Matrix.
                </p>
              </li>
              <li>
                <p>
                  <a
                    href="/compliance/GitHub.Bug.Bounty.DLOE.Jan-Mar.2025.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Bug Bounty Report, January - March 2025
                  </a>
                </p>
                <p>Coverage period: 2025-01-01 to 2025-03-31</p>
              </li>
              <li>
                <p>
                  <a
                    href="/compliance/GitHub_2026-PCI_DSS_AOC_-_Final.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub PCI DSS Attestation of Compliance
                  </a>
                </p>
                <p>Report date: 2026-01-06</p>
              </li>
            </ul>

            <p>
              Additional GitHub security and compliance information may be available at{' '}
              <a href="https://github.com/security" target="_blank" rel="noopener noreferrer">
                https://github.com/security
              </a>{' '}
              and{' '}
              <a href="https://bounty.github.com" target="_blank" rel="noopener noreferrer">
                https://bounty.github.com
              </a>
              .
            </p>
          </section>

          <section className={styles.section}>
            <h2>Cloudflare Trust and Compliance Resources</h2>
            <ul>
              <li>
                <p>
                  <a
                    href="https://www.cloudflare.com/trust-hub/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cloudflare Trust Hub
                  </a>
                </p>
                <p>Comprehensive security and compliance information for Cloudflare services.</p>
              </li>
              <li>
                <p>
                  <a
                    href="https://www.cloudflare.com/trust-hub/compliance-resources/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cloudflare Compliance Resources
                  </a>
                </p>
                <p>Cloudflare certifications, attestations, and related compliance documentation.</p>
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Related Pages</h2>
            <ul>
              <li>
                <Link viewTransition prefetch="intent" to="/terms">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link viewTransition prefetch="intent" to="/privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link viewTransition prefetch="intent" to="/security">
                  Security Policy
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
};
