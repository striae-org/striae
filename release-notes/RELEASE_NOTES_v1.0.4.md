# Striae Release Notes - v1.0.4

**Release Date**: January 31, 2026  
**Period**: October 4, 2025 - January 31, 2026  
**Total Commits**: 8 (Bug Fixes, Infrastructure Updates & Timing Improvements)

## 🎉 Patch Release - Annotation Tracking Fixes & Community Updates

### v1.0.4 Bug Fixes & Maintenance

- **📅 Annotation Date Tracking Fix** - Fixed earliest annotation date tracking in case exports and sidebar display
- **⏱️ Enhanced Timing Normalization** - Improved SHA256 timing normalization for more accurate cryptographic operations
- **🌐 Community Presence Updates** - Removed Discord references and Open Collective assets per organizational changes
- **🏆 OIN Badge Update** - Updated Open Invention Network badge to version 2.0
- **🧹 Code Cleanup** - Removed unused code and improved codebase maintainability

## 🔍 Detailed Changes

### Bug Fixes

- **📅 Earliest Annotation Date Tracking** - Fixed a critical issue where the earliest annotation date was not being properly tracked and displayed in case exports and the notes sidebar
  - Corrected date calculation in box annotations component
  - Updated core export functionality to properly handle annotation timestamps
  - Fixed notes sidebar date display logic
  - Added improved timestamp type definitions

- **⏱️ Timing Normalization Improvements** - Enhanced SHA256 timing normalization utility for better consistency in cryptographic operations
  - Improved normalization algorithm for more accurate timing measurements
  - Better handling of timing edge cases

### Community & Infrastructure Updates

- **🌐 Discord Reference Removal** - Removed all Discord references from documentation and signup materials
  - Updated GitHub README
  - Removed Discord link from signup notifications
  - Cleaned up developer documentation
  - Updated user guides and code of responsible use

- **🏆 Open Collective Assets Removal** - Cleaned up Open Collective funding references
  - Removed Open Collective branding and links
  - Removed funding information

- **🏆 Open Invention Network Badge Update** - Updated Open Invention Network badge to version 2.0
  - Updated Open Invention Network badge to version 2.0 per latest OIN guidelines

### Code Quality

- **🧹 Unused Code Cleanup** - Removed unused imports and code for better maintainability
- **📦 Dependency Updates** - Security and compatibility updates for development dependencies

## 🎯 Key Fix Summary

| Component | Fix Description | Impact |
|-----------|-----------------|--------|
| **Annotation Tracking** | Fixed earliest date calculation and display | 📅 Accurate case export timestamps |
| **Timing Operations** | Enhanced SHA256 normalization | ⏱️ More reliable cryptographic timing |
| **Community Links** | Updated Discord/funding references | 🌐 Current organizational/legal entity information |
| **Code Quality** | Removed unused code | 🧹 Better maintainability |

## 🔧 Technical Implementation Details

### Annotation Date Tracking Fix

- **Root Cause**: Earliest annotation date was not properly initialized and tracked across annotation operations
- **Solution**: 
  - Updated `box-annotations.tsx` to properly maintain annotation date state
  - Fixed `core-export.ts` to correctly calculate and export earliest timestamps
  - Corrected `notes-sidebar.tsx` to display accurate date information
  - Enhanced type definitions in `annotations.ts` to support date tracking

### Timing Normalization Improvements

- **Enhancement**: Expanded SHA256 timing normalization utility with better edge case handling
- **Benefit**: More consistent and reliable cryptographic timing measurements across different operation scenarios

---

**Note**: This v1.0.4 patch release addresses critical annotation tracking bugs discovered during testing, improves timing accuracy for cryptographic operations, and updates community references to reflect organizational changes. **Striae v1.0.4 represents the official release version.**
