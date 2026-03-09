Plan: Signed Forensic Manifest Enforcement
Hash-only validation is self-referential, so an attacker can modify content and regenerate matching hashes. The fix is to add a server-issued asymmetric signature to the forensic manifest and require signature verification during import and manual hash checks, with hard-fail on missing/invalid signatures.

Steps

Define a signed manifest schema (manifestVersion, signature, keyId, algorithm, signedAt) in app types so export, preview, and import all use one contract. This blocks downstream steps.
Add canonical serialization and signature verification helpers in SHA256.ts so both import flow and hash utility verify exactly the same signed payload.
Add a manifest-signing endpoint in data-worker.ts (and matching data-worker.example.ts) that signs canonical manifest payload with a private key secret and returns signature envelope data.
Wire signing secrets and key metadata into deployment/config (.env.example, deploy-worker-secrets.sh) and provide public key(s) to the app for verification by keyId.
Integrate signing into export in download-handlers.ts: after generateForensicManifestSecure(...), request server signature and embed it in FORENSIC_MANIFEST.json; fail export if signing fails.
Enforce signature validation in import preview and import execution in zip-processing.ts and orchestrator.ts; block import if signature is missing/invalid (hard fail policy).
Align operator tooling in hash-utility.tsx so manual verification also requires valid signature, not hash-only pass.
Persist signed-manifest provenance on import in storage-operations.ts (not only forensicManifestCreatedAt) for future chain-of-custody checks.
Extend audit typing/logging in audit.ts and audit.service.ts to capture signature-present, signature-verified, key ID, and blocked-reason details for export/import events.
Relevant files

SHA256.ts - canonical signed payload + signature verify helpers.
download-handlers.ts - sign manifest during ZIP export.
zip-processing.ts - parse/verify signature in preview path.
orchestrator.ts - import gate must require signature validity.
hash-utility.tsx - make manual check consistent with import gate.
storage-operations.ts - persist signature provenance metadata.
import.ts - signed manifest and preview validation typing updates.
audit.ts - signature-related audit fields.
audit.service.ts - log signature verification outcomes.
data-worker.ts - signing endpoint and signing logic.
data-worker.example.ts - example parity.
.env.example - signing key/key-id placeholders.
deploy-worker-secrets.sh - deploy signing secrets to data-worker.
Verification

Run npm run typecheck and npm run lint in striae/.
Add unit tests for canonicalization + signature verification (valid, tampered payload, wrong key, missing signature).
Add worker tests for sign endpoint validation and response format.
Manual valid flow: export signed forensic ZIP, import unchanged ZIP, confirm success.
Manual bypass test: edit a field (for example confirm date), recompute hashes, replace manifest hash values, keep old signature, confirm import is blocked.
Manual missing-signature test: remove signature block from manifest, confirm import is blocked.
Manual hash utility parity test: same tampered package is flagged invalid in hash utility too.
Confirm audit records include signature verification status and block reasons.
Decisions Captured

Trust model: asymmetric signature.
Backward compatibility: hard fail immediately for unsigned manifests.
Failure policy: block import on missing/invalid signature.
Scope: full-stack fix (worker + app + types + audit), not utility-only.
Further Considerations

Add signing-endpoint caller hardening (authenticated user context + ownership checks) so signature minting cannot be abused.
Support key rotation by keyId in verifier key map so historical imports keep working after key changes.
Include signed-manifest metadata in compliance/report exports for stronger chain-of-custody evidence.