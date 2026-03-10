# Striae Release Notes - v3.0.0

**Release Date**: March 9, 2026
**Period**: March 7 - March 9, 2026
**Total Commits**: 11 (non-merge; signed forensic manifest enforcement, import/hash verification hard-fail gates, audit export signing provenance, deployment key automation, compatibility metadata updates)

## Major Security Release - Signed Forensic Manifest Enforcement

## Summary

- Remediated a high-severity integrity bypass where hash-only confirmation validation could be circumvented by altering both content and hash values.
- Added server-issued asymmetric signing for forensic manifests with canonical payload verification support.
- Enforced fail-closed verification in import preview/execution and hash utility flows for missing or invalid signatures.
- Expanded signature provenance capture for audit/export pathways to strengthen chain-of-custody evidence.
- Hardened deployment/config setup for signing keys and refreshed compatibility metadata/examples.

## Detailed Changes

### Critical Vulnerability Remediation

- Implemented signed forensic manifest support to replace trust in hash-only validation.
- Added canonical payload/signature verification utilities in shared app utilities and worker-side signing helpers.
- Updated confirmation export/import pathways so manifest signature data is generated, transported, and verified consistently.
- Enforced hard-fail behavior when signature data is absent, malformed, or invalid.

### Import and Verification Gate Hardening

- Updated case import orchestration and ZIP processing to require signature validity before acceptance.
- Updated hash utility behavior to align with import enforcement so tampered payloads cannot pass by hash regeneration.
- Patched confirmation-import validation paths and related type contracts for signed manifest fields.

### Audit and Provenance Enhancements

- Added signature-aware audit export support and associated utility/service updates.
- Improved audit viewer and export surface integration for signature provenance visibility.
- Extended audit event logging coverage for signing/verification outcomes in critical confirmation workflows.

### Deployment and Configuration Safety

- Added signing key placeholders and key-id expectations in `.env.example`.
- Improved deployment config behavior for signing key management, including key auto-generation workflow alignment.
- Updated worker/page compatibility-date example files for synchronized deployment baselines.

### Documentation and Advisory Preparation

- Added and reorganized hash-fix documentation (`Hash-Fix.md`) to capture impact, patch scope, workarounds, and reference links.

## Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| Vulnerability Remediation | Server-issued asymmetric signatures for forensic manifests | Prevents hash-regeneration bypass of confirmation integrity checks |
| Import and Hash Verification | Hard-fail gating on missing/invalid signatures | Blocks tampered or unsigned confirmation packages |
| Audit Provenance | Signature-aware audit export/logging updates | Stronger chain-of-custody and forensic accountability evidence |
| Deployment Key Management | Signing key placeholders and deploy-config key handling updates | Safer setup and lower risk of insecure/misaligned signing configuration |
| Platform Maintenance | Compatibility-date example refresh | Improves environment parity and deployment consistency |

## Technical Implementation Details

### Application Layer

- Updated confirmation export/import, ZIP processing, hash utility, and data-operation flows to require signature validation.
- Added and integrated shared signature utility modules for canonicalized payload handling and verification.
- Expanded type and audit-service support for signature envelope metadata.

### Worker Layer

- Added worker-side signature utility and canonical signing payload helpers.
- Updated data-worker example surfaces to support signing and verification pathways.

### Tooling and Configuration Layer

- Updated deployment configuration and environment examples for manifest-signing key support.
- Included compatibility-date metadata sync for worker/page example configs.

## Release Statistics

- **Commit Range**: `v2.2.0..HEAD`
- **Commits Included**: 11 (non-merge)
- **Build Status**: Succeeded (`npm run build`)

## Closing Note

v3.0.0 is a security-priority major release that closes a confirmation-integrity bypass class by enforcing signed forensic manifests and fail-closed verification behavior across import and manual validation workflows.
