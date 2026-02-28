# Striae Release Notes - v0.9.06-beta

**Release Date**: September 6, 2025  
**Period**: September 1-6, 2025  
**Total Commits**: 90+

## 🛠️ Developer Experience & Infrastructure

### Installation & Setup Improvements

- **📦 Comprehensive Installation Guide** - Complete step-by-step installation documentation with all required Cloudflare services
- **⚙️ Enhanced Configuration Management** - Updated environment variable examples and configuration templates
- **📁 Node Package Distribution** - Added pre-configured dependency package for easier deployment
- **🔗 Documentation Links** - Added direct links to installation guides in README

### Worker Infrastructure Enhancements

- **🔒 Security Hardening** - Moved `HMAC_KEY` to environment variables for image worker
- **📝 Configuration Portability** - Improved worker configuration examples and templates  
- **🚀 Deployment Scripts** - Updated environment variable deployment scripts for cross-platform compatibility
- **📊 Secrets Management** - Improved secrets management and environment configuration

## 🎨 User Interface & Experience

### Homepage & Navigation

- **📖 About Section** - Added comprehensive 'About' section to homepage explaining Striae's position as a cloud-native application
- **📱 Mobile Responsiveness** - Adjusted mobile width and glass background for better mobile experience
- **🎯 Visual Polish** - Improved glass background effects and overall visual presentation

### Authentication & Profile Management

- **👁️ Password Visibility Toggle** - Added password visibility controls in manage profile
- **🔐 Icon Improvements** - Replaced password visibility icons with consistent SVG icon components
- **📋 Form Enhancements** - Better form interactions and user feedback

### UI Components & Styling

- **🎨 Design Tokens** - Added radius tokens for consistent rounded corner styling throughout app
- **📱 Component Organization** - Moved PDF generation into a dedicated action component
- **🎯 Visual Consistency** - Improved component styling and interaction patterns
- **✅ 'Confirmation Included' indicator** - Added canvas indicator for when ID confirmation is included in annotations

## 🔐 Security & Data Management

### Email & Domain Management

- **📧 Free Email Domain Filtering** - Added `free-email-domains` package for more comprehensive email validation

### Authentication Security

- **🔒 Authentication Overhaul** - Simplified authentication system, fixed authentication issues, and other security enhancements
- **🛡️ Data Transit Security** - Clarified and improved data transit security documentation

## 📊 Project Management & Community

### Funding & Support

- **💝 Patreon Integration** - Added Patreon widget and funding information for project sustainability
- **🤝 Community Support** - Improved funding configuration and community support options
- **📚 User's Guide** - Created comprehensive user's guide documentation for better user onboarding
- **📋 Issue Templates** - Added comprehensive GitHub issue templates for better bug reporting
- **📜 Code of Conduct** - Added Contributor Covenant Code of Conduct and Code of Responsible Use

### Repository Management

- **🔗 Repository Migration** - Migrated repo away from development account, updated repository links and branding (striae-org organization)
- **📝 Documentation** - Enhanced documentation structure and clarity

## 🐛 Bug Fixes & Optimizations

### Configuration & Setup

- **🗂️ CORS Configuration** - Clarified CORS setup in installation guide
- **📝 Environment Configuration** - Fixed `.env.example` commenting and setup instructions

### UI/UX Fixes

- **🍞 Toast Notifications** - Added a third state: 'warning'
- **🎨 Visual Consistency** - Numerous minor visual corrections and improvements

### Dependencies & Performance

- **📦 Dependency Updates** - Automated dependency updates across worker directories
- **🧹 Code Cleanup** - Removed unnecessary comments and cleaned up codebase

## 📈 Development Statistics

- **Total Commits**: 90+ commits
- **Files Modified**: 80+ files
- **Major Areas Enhanced**: 6 core areas
- **New Components**: 3 new components
- **Documentation Files**: 5+ major documentation updates
- **Worker Modules**: 6 worker configurations updated

## 🎯 Key Highlights

| Feature Area | Enhancement | Impact |
|-------------|-------------|---------|
| **Installation** | 📦 Complete setup guide | 🚀 Easier deployment |
| **Security** | 🔒 Email domain filtering | 🛡️ Better user validation |
| **UI/UX** | 📱 Homepage mobile improvements | 📈 Better user experience |
| **Infrastructure** | ⚙️ Worker optimization | 🔧 Improved performance |
| **Community** | 💝 Funding integration | 🤝 Project sustainability |
| **Documentation** | 📚 Comprehensive guides | 📖 Better user & developer onboarding |

---

## What's Coming Next?

The v0.9.06-beta release focuses heavily on **user & developer experience**, **security fixes & improvements**, and **community building**. Key areas of ongoing development include:

- Continued authentication system enhancements
- Refining annotation features
- Performance optimizations
- Extended user & developer documentation

For support, installation guidance, or community discussion, visit:

- **[Documentation](https://developers.striae.org/striae-dev/get-started/document-index)**
- **[Discord Community](https://discord.gg/ESUPhTPwHx)**
- **[Support Portal](https://www.striae.org/support)**

---

**Contributors**: Stephen J. Lu and the Striae community

*This release represents significant infrastructure improvements and community-building efforts, making Striae more accessible and secure for firearms examiners worldwide.*
