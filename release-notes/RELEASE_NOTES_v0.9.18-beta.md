# Striae Release Notes - v0.9.18-beta

**Release Date**: September 18, 2025  
**Period**: September 17-18, 2025  
**Total Commits**: 20+ (Deployment Infrastructure & UI Improvements)

## 🚀 Automated Deployment System

### Streamlined Deployment Scripts

- **🔧 Unified Deploy Script** - Enhanced `npm run deploy:all` with improved sequencing and error handling
- **📦 Worker Installation Automation** - New `install-workers` script for automated dependency management
- **⚙️ Configuration Management** - Renamed `deploy-env` to `deploy-config` for clarity and improved configuration setup
- **🔐 Dedicated Secrets Management** - Separate `deploy-worker-secrets` script for enhanced secret deployment

### Cross-Platform Script Support

- **🪟 Windows & PowerShell** - Enhanced `.bat` and `.ps1` scripts with better error handling
- **🐧 Linux/macOS** - Improved shell scripts with robust validation and progress tracking
- **📋 NPM Script Organization** - Reorganized package.json scripts for logical grouping and workflow

## 🎨 CSS Architecture & Design System

### Global Button Enhancement System

- **✨ Unified Hover Effects** - Global button hover animations with `translateY(-1px)` and enhanced shadows
- **🧹 CSS Cleanup** - Removed redundant component-level hover effects, leveraging global system
- **🎯 Opt-out Support** - `data-no-enhance` attribute for components requiring custom behavior

### Mobile Responsiveness Refinement

- **🖥️ Desktop-First Focus** - Removed mobile responsive classes from core application components
- **📱 Enhanced Mobile Warning** - Improved mobile detection with user agent + screen size validation
- **🧹 Code Cleanup** - Eliminated unused mobile CSS across authentication and annotation components

## 📚 Developer Documentation Updates

### Installation & Setup Guides

- **📖 Installation Guide Restructure** - Streamlined sections with logical flow and reduced redundancy
- **⚙️ Environment Setup Enhancement** - Comprehensive environment variables documentation and automation
- **🔧 Developer Instructions** - Updated Copilot instructions with mobile responsiveness policies and CSS patterns

### Documentation Quality Improvements

- **✂️ Content Optimization** - Reduced verbose documentation while maintaining technical accuracy
- **🔗 Cross-Reference Updates** - Improved linking between guides and consistent formatting
- **📋 Markdown Cleanup** - Fixed formatting issues and improved readability

## 🛠️ Technical Infrastructure

### Build System Improvements

- **📦 Dependency Management** - Enhanced worker dependency installation and management
- **🔄 Script Workflow** - Improved deployment sequencing with proper error handling and rollback
- **⚡ Performance Optimization** - Streamlined build processes and reduced deployment time

### Code Quality Enhancements

- **🧹 CSS Organization** - Consolidated global styles and removed component duplication
- **📋 Script Standardization** - Consistent naming conventions and parameter handling across deployment scripts
- **🛡️ Error Handling** - Enhanced error recovery and validation in deployment workflows

---

**Note**: This release focuses on infrastructure improvements and developer experience enhancements. The automated deployment system significantly simplifies the setup process for both internal and external developers, while CSS architecture improvements reduce code duplication and improve maintainability.

Key improvements include streamlined deployment scripts, enhanced mobile responsiveness policies, and comprehensive documentation updates. All changes maintain backward compatibility while significantly improving the development workflow.
