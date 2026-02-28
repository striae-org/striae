# Striae Release Notes - v1.1.5

**Release Date**: February 27, 2026
**Period**: February 23 - February 27, 2026
**Total Commits**: 61 (non-merge; legal/compliance updates, public-route UI refinements, consent/tracking integration, docs/config hygiene, dependency maintenance)

## ⚖️ Legal, Policy, and Compliance Expansion

### Terms and Privacy Maturity

- Expanded Terms & Conditions with substantial clarifications across account types, fees/payment expectations, service maintenance, confidentiality, dispute resolution, and liability cap wording
- Added forensic-specific responsibility language for evidentiary, legal, and institutional compliance obligations
- Updated privacy/legal references and legal-contact pathways, including support/contact alignment updates

### Agency and Commercial Clarity

- Added and refined Agency-account expectations, restrictions, and operational responsibilities
- Clarified refund/cancellation posture and account-type entitlement boundaries

## 🔐 Security, Consent, and Data-Handling Messaging

### Consent and Tagging Integration Work

- Added and iterated consent/cookie declaration handling, including script integration and JSX-safe rendering corrections
- Performed analytics/tracking integration development with follow-up rollback/revert cleanup to stabilize final behavior

### Data-Handling Communication Improvements

- Updated user-facing security and notice content to align with current storage/audit posture and legal language
- Clarified control, retention, and compliance messaging in legal and home notice content

## 🧭 Public Route, Root, and UI Refinements

### Route and Root Behavior

- Iterated route/root behavior for public-facing flow and navigation consistency
- Applied viewport and route presentation refinements across legal/public pages

### Layout and Visual Cleanup

- Refactored footer/background handling and removed obsolete top-anchor navigation behavior
- Cleaned route-level CSS and home-page styling artifacts to reduce inconsistencies

## 💳 Billing/Portal and Product Messaging Updates

### Stripe and Account-Service Surface

- Added Stripe modal and customer portal link updates
- Updated notice/form wording and related user-facing copy for clearer billing/support pathways

## 🧹 Repository and Dependency Maintenance

### Config and Repository Hygiene

- Continued `.gitignore` and repository cleanup, including deployment/config related adjustments
- Applied deployment-application iteration commits with controlled revert/reapply passes

### Dependency Updates

- Updated `vite-tsconfig-paths` from `6.0.5` to `6.1.1`
- Applied npm/yarn dependency group maintenance updates

## 📋 Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| Legal/Compliance | Major Terms + policy language expansion | Stronger contractual clarity and reduced ambiguity for forensic/agency usage |
| Security/Consent | Cookie/consent + tracking integration refinements | Better compliance posture for consent-aware telemetry behavior |
| Routing/UI | Root/public route and layout cleanup | More consistent public-route rendering and navigation behavior |
| Billing Surface | Stripe modal + portal/contact updates | Clearer customer support and account-service experience |
| Maintenance | Dependency and repo hygiene updates | Improved maintainability and lower config drift |

## 🔧 Technical Implementation Details

### Legal and Content Layer

- Implemented extensive legal text updates in route-based policy pages and related public notice content
- Standardized responsibility and retention messaging across terms and user-facing explanatory content

### Application Surface and Integration

- Iterated on root/route behavior, public-page styling, and support/legal route consistency
- Added consent-related script changes with corrective follow-up commits to ensure stable behavior

## 📊 Release Statistics

- **Files Modified**: 100+
- **Commits Included**: 61 (non-merge, since 2026-02-23)
- **Primary Areas**: Terms/privacy expansion, consent/tracking integration, public-route/root refinements, billing/support messaging, dependency and repository maintenance
- **Validation Status**: Deploy completed successfully (`npm run deploy`)

## Closing Note

v1.1.5 focuses on legal/compliance hardening and public-surface consistency, with broad updates to Terms language, consent-related integration work, and route/UI cleanup to support clearer policy posture and a more stable user-facing experience.
