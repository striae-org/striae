# Striae Release Notes - v0.9.15-beta

**Release Date**: September 15, 2025  
**Period**: September 10-15, 2025  
**Total Commits**: 178+

## 🔐 Security & Authentication Enhancements

### Multi-Factor Authentication (MFA) Improvements

- **📱 Enhanced Phone Number Validation** - Implemented comprehensive phone number validation with regex patterns for US/international formats
- **🚫 Demo Number Prevention** - Added validation to prevent use of example phone numbers (555-1234567) in MFA enrollment
- **🎨 MFA Modal CSS Adjustments** - Improved styling and user experience for MFA enrollment and verification modals
- **🔐 Enhanced User Validation** - Strengthened user validation during login process with improved security checks
- **↪️ Signout Integration** - Added signout functionality to MFA components for better user flow management

## 🗑️ Account Management & User Experience

### Complete Account Deletion System

- **🏗️ Major Feature: Account Deletion** - Implemented comprehensive self-service account deletion system with multiple safety measures
- **📧 Deletion Email Notifications** - Added email confirmation system for account deletions with admin notifications
- **⚠️ Enhanced Deletion Warnings** - Implemented dynamic warning messages during deletion process with data volume considerations
- **🚫 Demo Account Protection** - Disabled account deletion for demo accounts to protect shared credentials
- **🔄 Auto-logout on Deletion** - Automatic user logout after successful account deletion with proper session cleanup

### User Interface & Experience Improvements

- **🎯 PDF Generation Enhancements** - Improved PDF generation formattinng with persistent toast notifications and better user feedback
- **⏱️ Toast Duration Control** - Implemented configurable toast duration with persistent notifications for long-running processes

## 👥 User Management & Permissions

### Demo Account System

- **🎭 Demo Account Implementation** - Created comprehensive demo account system with restricted permissions
- **🔒 Permission-Based Access Control** - Implemented granular permissions system for different account types (to be expanded in future releases)
- **📊 Account Limits Configuration** - Added configurable account limits with visual indicators and descriptions
- **🎨 UX Permission Checking** - Improved user experience with better permission validation and feedback

### User Profile & Company Management

- **🏢 Company Display Integration** - Added company information display to footer and user profiles
- **🔗 Profile Management Updates** - Improved profile management with better permission handling

## 🏗️ Infrastructure & Developer Experience

### Documentation & Configuration

- **📚 Comprehensive Guide Updates** - Updated and reorganized documentation with improved structure and clarity
- **📖 User Manual Cleanup** - Removed outdated user manual content and streamlined documentation
- **🔧 Worker Configuration Updates** - Enhanced worker configurations with improved portability and security
- **📋 Table of Contents Corrections** - Fixed and updated table of contents across documentation files
- **🔗 Worker URL Corrections** - Corrected worker URLs and configuration references throughout the application

### Financial & Community Integration

- **💰 Open Collective Integration** - Switched from Patreon to Open Collective for financial contributions
- **🏆 Financial Contributor Badges** - Added Open Collective badges and financial contributor widgets
- **🤝 Contribute Button** - Added contribute button for easier community participation
- **📜 Legal Entity Updates** - Added legal entity ownership information and compliance updates

### Version Management & Build System

- **🔢 Automatic Versioning System** - Implemented automatic versioning system across the application
- **📊 Version Display Improvements** - Enhanced version display components with better formatting and links
- **🔧 Package Cleanup** - Cleaned up package dependencies and removed unused packages
- **📦 Node.js Updates** - Updated Node.js dependencies and build configurations

## 🛠️ Technical Improvements & Bug Fixes

### Code Quality & Maintenance

- **🧹 Extensive Code Cleanup** - Performed comprehensive code cleanup across components and utilities
- **📁 File Organization** - Moved GitHub-related files to `.github` directory for better organization
- **🔧 TypeScript Conversions** - Converted auth-context and actions components to plain TypeScript (.ts) for better performance
- **📝 PR Templates** - Added pull request templates for better contribution workflow

### Worker & API Enhancements

- **⚙️ Worker Installation Scripts** - Added automated worker installation scripts to development workflow
- **🔧 PDF Worker Adjustments** - Made improvements to PDF worker functionality and reliability
- **🔐 User Worker Updates** - Enhanced user worker with improved authentication and data handling
- **📦 Wrangler Configuration** - Updated Wrangler configurations with compatibility flags and improvements

## 🎨 UI/UX Enhancements

### Navigation & Interface

- **🧭 Top Navigation Improvements** - Enhanced top navigation on front landing page for better user experience
- **🎨 Consistent Visual Language** - Improved visual consistency across components and interactions

### Footer & Support Features

- **📄 License Link Integration** - Added license links to footer modal version information
- **🌐 Blog Links** - Added blog link

## 🔄 Development Workflow & Automation

### Deployment & CI/CD

- **🚀 Deploy All Scripts** - Enhanced deployment scripts with better cross-platform support
- **🔧 Environment Configuration** - Improved environment setup and configuration management

### Contributing & Community

- **📖 Contributing Guidelines** - Added comprehensive contributing guidelines for developers
- **🤝 Community Standards** - Enhanced community standards and contribution workflows
- **📋 Issue Templates** - Improved GitHub issue templates for better bug reporting and feature requests

## 🔮 Upcoming Developments

- **Stable Beta Version Release** - Additional developments and refinements are now on tentative hold, pending user feedback, reporting, and testing in preparation for the full release in January 2026.

---

**Note**: This release represents significant enhancements to user account management, security infrastructure, and overall platform stability. The addition of comprehensive account deletion functionality and demo account system provides better user control and sets up a granular role-based access control system while maintaining platform security and integrity.

For complete technical details and developer information, please refer to the [Striae Documentation](https://developers.striae.org/striae-dev/get-started/document-index).
