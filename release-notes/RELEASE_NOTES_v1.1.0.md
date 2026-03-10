# Striae Release Notes - v1.1.0

**Release Date**: February 8, 2026  
**Period**: February 5, 2026 - February 8, 2026  
**Total Commits**: 32 (Infrastructure Improvements, Documentation, Dependencies)

## 🎉 Minor Release - Configuration Management & Documentation Enhancements

### v1.1.0 Infrastructure & Documentation Improvements

- **⚙️ Configuration Architecture** - Separated meta-config and app-config concerns for better maintainability
- **📚 Enhanced Documentation** - Comprehensive updates to user guides, deployment guides, and environment setup
- **🎨 Branding Updates** - Added new logos and deploy assistance references
- **🛠️ Deploy Script Improvements** - Enhanced deploy-config scripts to handle separated configuration files
- **📦 Dependency Updates** - Updated Cloudflare Workers Types and React dependencies
- **🗺️ Sitemap Fixes** - Resolved sitemap routing issues for improved SEO

## 🔍 Detailed Changes

### Infrastructure Enhancements

- **⚙️ Configuration Separation** - Reorganized configuration architecture
  - Separated `meta-config.json` (application metadata) from `app-config.json` (runtime configuration)
  - Improved separation of concerns for maintainability and auth key security
  - Enhanced deploy-config scripts (.sh, .ps1, .bat) to handle both config files
  - Consistent placeholder replacement for `PAGES_CUSTOM_DOMAIN` in both configs
  - Updated configuration management workflow

- **🛠️ Deployment Script Updates** - Enhanced configuration deployment automation
  - Updated all three deploy-config scripts (Bash, PowerShell, Batch)
  - Added meta-config.json copying from config-example to config
  - Consistent placeholder replacement logic for separated configs  

### Documentation Improvements

- **📚 User Guide Updates** - Comprehensive documentation enhancements
  - Updated user guide overview for better clarity
  - Enhanced environment setup documentation for audit worker
  - Improved deployment assistance documentation
  - Added deployment request form references
  - Better structured getting-started guides

- **🔧 Configuration Documentation** - Enhanced setup guides
  - Updated .env.example with audit worker references
  - Improved configuration file documentation
  - Better guidance for first-time deployments
  - Clearer separation between development and production configs

### Branding & Assets

- **🎨 Visual Identity Updates** - Enhanced branding materials
  - Added new logo variants
  - Updated deployment assistance references
  - Improved visual consistency across documentation
  - Better brand presence in support materials

### Bug Fixes

- **🗺️ Sitemap Resolution** - Fixed sitemap generation and routing
  - Resolved sitemap route handling issues
  - Improved XML sitemap accessibility
  - Better SEO crawlability
  - Fixed asset serving for sitemap endpoints

### Infrastructure & Dependencies

- **📦 Dependency Updates** - Updated core dependencies
  - @cloudflare/workers-types 4.20260203.0 → 4.20260206.0
  - React 19.0.0-rc-3208e73e-20241121 → 19.0.0
  - @types/react 19.0.14 → 19.0.15
  - Improved type safety and compatibility
  - Security and performance improvements

- **🔄 Dependency Reverts** - Managed dependency conflicts
  - Reverted problematic multi-package dependency updates from Dependabot
  - Maintained stability during rapid upstream changes
  - Better control over version compatibility

## 🎯 Key Enhancement Summary

| Component | Enhancement | Impact |
|-----------|-------------|--------|
| **Configuration** | Separated meta-config from app-config | ⚙️ Better maintainability, security, and clarity |
| **Deploy Scripts** | Enhanced config handling | 🛠️ Smoother deployment workflow |
| **Documentation** | Comprehensive guide updates | 📚 Better user onboarding |
| **Branding** | New logos and support references | 🎨 Enhanced professional presence |
| **Dependencies** | React stable release | 📦 Production-ready framework |

## 🔧 Technical Implementation Details

### Configuration Architecture Changes

The configuration system was refactored to separate concerns:

```
app/config-example/
├── meta-config.json    # Application metadata (name, author, title, url)
└── config.json         # Runtime config (worker URLs, auth keys, limits)
```

This separation provides:
- **Improved Security**: Auth keys are isolated from metadata
- **Cleaner Separation**: Metadata vs. runtime configuration
- **Easier Maintenance**: Independent updates to each concern
- **Better Deployment**: Separate placeholder replacement logic
- **Improved Clarity**: Purpose-driven configuration files

### Deploy Script Enhancements

All three deploy-config scripts now:
1. Copy both config files from `config-example/` to `config/`
2. Replace `PAGES_CUSTOM_DOMAIN` in meta-config.json
3. Replace worker URLs and keys in config.json
4. Validate all required environment variables
5. Provide clear status feedback during deployment

## 📝 Upgrade Notes

No breaking changes in this release. Users can upgrade seamlessly from v1.0.5.

### Post-Upgrade Steps

1. **Configuration Files**: The new config structure is backwards compatible
2. **Deploy Scripts**: Run `npm run deploy:all` to apply updated deployment logic
3. **Documentation**: Review updated guides for improved deployment workflows

---

**Full Changelog**: [v1.0.5...v1.1.0](https://github.com/striae-org/striae/compare/v1.0.5...v1.1.0)
