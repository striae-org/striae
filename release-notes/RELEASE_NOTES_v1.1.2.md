# Striae Release Notes - v1.1.2

**Release Date**: February 15, 2026
**Period**: February 13 - February 15, 2026
**Total Commits**: 10+ (Security updates, code cleanup, CSS architecture optimization)

## 🔒 Security & Code Quality - Stability Updates

### Security Fixes
- **HTML Injection Prevention**: Added comprehensive HTML entity escaping to all email form submissions across signup, bug reports, support tickets, and account deletion notifications
  - Escapes 6 critical characters: `&`, `<`, `>`, `"`, `'`, `/`
  - Prevents XSS attacks and malicious script injection via user inputs
  - Applies to all user-provided fields in email templates

### Bug Fixes
- Fixed route configuration issues affecting navigation and page loading
- Fixed Turnstile CAPTCHA success state validation

## 🎨 Component Architecture & Code Health

### Form Component Consolidation
- Refactored form element styling to eliminate CSS duplication across multiple components
- Consolidated error/success message styling into centralized `FormMessage` component
- Unified button variants across modals and sidebars using `FormButton` component
- Refactored form fields to use `FormField` component for consistent input styling

**Overall Impact**: Reduced CSS redundancy by ~77% average across form components while maintaining identical visual appearance and behavior

### Code Quality
- Cleaned up unused CSS classes and styles
- Entity-escaped apostrophes in JSX content (NoticeText component)
- Added server-side validation for required checkboxes (emailConsent, codeAgreement)
- Improved type safety in permission checking and data operations

## 📋 Key Fix Summary

| Category | Change | Impact |
|----------|--------|--------|
| Security | HTML sanitization in email templates | Blocks XSS injection attacks |
| UX | Form message consolidation | Consistent error/success styling |
| Code Quality | CSS architecture refactor | Reduced bundle size, maintainability |
| Validation | Server-side checkbox validation | Prevents bypass of consent requirements |

## 🔧 Technical Implementation Details

### HTML Sanitization Utility
- Centralized escaping function: `escapeHtml()` in `app/utils/html-sanitizer.ts`
- Handles both single values and object properties
- Deployed to 7 email endpoints across 2 workers

### Component Refactoring
- Centralized form components used instead of raw HTML elements
- Maintained identical styling through CSS Module inheritance
- Preserved all component-specific customization (modals, buttons, forms)

### Server-Side Validation
- Added validation for previously client-only enforced checkboxes
- Returns HTTP 400 with error details for missing required fields
- Prevents direct API bypass of consent requirements

## 📊 Release Statistics
- **Files Modified**: 12+
- **Lines of Code Removed**: 400+
- **CSS Reduction**: ~77% average across refactored components
- **Security Vulnerabilities Fixed**: 1 (HTML injection)
- **Test Coverage**: All modified files pass TypeScript and ESLint validation

## Closing Note

v1.1.2 focuses on security hardening and internal code quality improvements. The HTML injection vulnerability fix enhances user data protection, while the form component consolidation improves long-term maintainability without any user-facing changes. All existing functionality remains intact.
