# Striae Release Notes - September 2025

## 🎉 Major Features & Enhancements

### Beta Launch Preparation

- **Added countdown timer** for the September 1, 2025 beta launch at 11:00 AM MST
- **Added promotional video embed** on the homepage to showcase Striae capabilities
- **Beta launch messaging** and homepage updates to prepare for public release
- **Fundraising campaign** with CustomInk widget for ALS San Diego in honor of John Farrell

### User Interface & Experience Improvements

- **Enhanced link styling** with dotted underlines on hover and improved text decoration
- **Improved footer modal** with escapable functionality and reorganized links
- **Better contrast** for links against dark backgrounds
- **CSS cleanup** and code optimization across multiple components
- **Accessibility improvements** including proper focus handling and modal interactions

## 🔐 Security & Authentication Enhancements

### Authentication System Overhaul

- **Multi-factor authentication (MFA)** implementation with enrollment and verification
- **Password management** improvements including visibility toggles and reset functionality
- **Session management** improvements with cookie-based authentication
- **Security policy updates** and clearer documentation

### Security Hardening

- **HSTS headers** implementation for enhanced security
- **Updated security policies** and documentation
- **CORS domain** configuration updates
- **Inactivity signout** implementation with warnings

## 🛠️ Technical Improvements

### Code Quality & Maintenance

- **Extensive comment cleanup** across 23+ files removing over 170 lines of redundant code

### Development Experience

- **Environment configuration** improvements
- **Preview environment** setup for detached development
- **Gitignore updates** to better manage sensitive files and secrets
- **Worker configurations** cleanup and optimization

## 📱 Application Features

### Canvas & Annotation System

- **Annotation display** improvements with better state management
- **Canvas cleanup** on unmount and case changes
- **ID confirmation** automatic handling
- **Class character annotations** development
- **Subclass indicators** and display enhancements

### Case Management

- **File management** improvements including single image deletion
- **Case actions** interface updates with better color coding
- **Notes system** enhancements
- **PDF generation** improvements with better file naming conventions
- **Image processing** optimizations

### User Management

- **Profile management** interface improvements
- **Company display** enhancements
- **User role** and support level development

## 📄 Documentation & Legal

### Documentation Updates

- **README.md** comprehensive updates with latest release details
- **User guides** reorganization (guides moved from repository)
- **Security documentation** updates
- **Terms & Conditions** and **Privacy Policy** revisions
- **NOTICE file** creation for licensing compliance

### Legal & Compliance

- **License** updates and wording clarifications
- **Copyright** alignment and footer updates
- **Data control terms** adjustments
- **Credit line** addition to footer

## 🐛 Bug Fixes & Stability

### Firefox Compatibility

- **Text color fixes** for better Firefox support
- **Cross-browser compatibility** improvements

### UI/UX Fixes

- **Toolbar spacing** when hidden
- **Company display** positioning fixes
- **Footer button** hover states and interactions
- **Modal escape** functionality
- **Background overlay** positioning corrections

## 🔧 Infrastructure & Deployment

### Build & Deployment

- **Firebase configuration** updates
- **Cloudflare Workers** optimization
- **PDF worker** improvements
- **Image worker** enhancements
- **Build process** optimizations

### Configuration Management

- **Environment variable** management improvements
- **Config file** organization
- **Key management** and descriptions

---

## What's Next?

With the beta launch on **September 1, 2025**, users can expect:

- Full access to the firearms examination annotation tools
- Complete authentication and user management system
- Dynamic annotation capabilities
- Secure case management and file upload features
- Professional PDF report generation

For support, bug reports, or feature requests, please visit our [GitHub repository](https://github.com/striae-org/striae) or contact our support team.

---

## Summary Statistics

- **Total commits**: 300+
- **Files modified**: 150+
- **Lines of code cleaned up**: 1,500+
- **Dependencies updated**: 15+
- **Security improvements**: 8 major fixes
- **New features**: 12 major additions

*This release represents a comprehensive overhaul of the Striae application, making it ready for public beta testing by firearms examiners worldwide.*

## Contributors

Special thanks to all contributors who made this release possible:

- **Stephen J. Lu** - Lead Developer
- **Community & Alpha Testers (Kyle, Alex, Ron, Luis, Flory, Kirsten, Brian)** - Bug reports and feedback
- **Security Researchers** - Vulnerability reporting

---

**Release Date**: September 1, 2025  
**Beta Period**: September 1, 2025 @ 11:00 AM MST - January 1, 2026 @ 11:00 AM MST
**Version**: v0.9.0-beta
