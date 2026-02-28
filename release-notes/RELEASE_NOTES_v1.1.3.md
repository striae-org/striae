# Striae Release Notes - v1.1.3

**Release Date**: February 20, 2026
**Period**: February 16 - February 20, 2026
**Total Commits**: 17 (UX improvements, legal/notice updates, security metadata updates, CSS architecture cleanup)

## ⚡ UX & Workflow Improvements

### Account Deletion Progress Tracking
- Added real-time account deletion progress tracking in the delete account modal
- Implemented per-case progress updates using streaming events from the user worker
- Added a red progress bar that reports current case deletion state and completion percentage
- Fixed edge case where users with 0 cases now display `100%` on successful completion

### Home Route & Mobile/Tablet Behavior Refinements
- Adjusted screen threshold behavior for public-facing routes
- Refined logo visibility behavior on tablet portrait sizes
- Corrected home route CSS regressions and visibility inconsistencies

## 📄 Notice, Legal & Content Updates

### Notice and License Presentation
- Refined notice modal presentation and spacing
- Added and refined license/notice text content on the home route
- Moved author/reference linkage into notice-focused content areas for consistency
- Updated NOTICE references and in-app notice modal text links

### Terms & Privacy Updates
- Added short-form versions in Terms and Privacy routes
- Updated Terms & Conditions wording and formatting consistency

## 🔒 Security Metadata Updates

### security.txt Maintenance
- Updated advisory contact/reference link in security metadata
- Refreshed security metadata expiry
- Updated PGP key material in `security.txt`

## 🎨 CSS Architecture & Cleanup

### Styling Consolidation
- Consolidated Tailwind and reset layering for improved baseline consistency
- Updated root/reset styling integration to reduce style drift across routes and components

## 📋 Key Fix Summary

| Category | Change | Impact |
|----------|--------|--------|
| UX | Real-time delete-account progress bar + per-case tracking | Better long-running deletion feedback and trust |
| UX | Zero-case deletion progress fix | Correct completion feedback (`100%`) on successful no-case deletions |
| UI/CSS | Home route and responsive threshold adjustments | Improved visual consistency across desktop/tablet breakpoints |
| Legal/Docs | Notice, Terms, and Privacy content refinements | Clearer public/legal communication |
| Security | security.txt advisory/expiry/PGP updates | Improved security disclosure hygiene |

## 🔧 Technical Implementation Details

### Deletion Progress Streaming
- Added streamed deletion progress events from `user-worker` to frontend delete-account UI
- Frontend now parses progress events and maps them to percentage and active case status
- Progress section remains visible in success/error contexts for traceable feedback

### Responsive and Route Styling Updates
- Public route CSS updates applied to threshold-sensitive pages
- Home route visual corrections applied after logo visibility rollbacks/refinements

### Security File Maintenance
- Updated `public/.well-known/security.txt` metadata fields and key material

## 📊 Release Statistics
- **Files Modified**: 20+
- **Commits Included**: 17 (non-merge)
- **Primary Areas**: Delete-account UX, home/public-route CSS, notice/legal content, security metadata
- **Validation Status**: Build completed successfully (`npm run build`)

## Closing Note

v1.1.3 focuses on UX reliability and public-facing polish. The major highlight is transparent, case-by-case account deletion progress with corrected zero-case completion behavior, supported by responsive refinements, legal/notice updates, and routine security metadata maintenance.
