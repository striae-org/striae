# Striae Release Notes - v10.2.1

**Release Date**: August 23, 2026
**Period**: August 23, 2026 (same-day)
**Total Commits**: 1 (non-merge since the v10.2.0 release)

## Patch Release - Data Worker Export Decrypt OOM Fix

## Summary

v10.2.1 is a same-day patch that fixes case import failures on larger exports. Importing a case export with a sizeable data payload and associated files could crash the data worker's isolate with "Worker exceeded memory limit," which surfaced to the user as a generic "Failed to decrypt export: 500" error. The fix reduces per-request memory pressure on the worker's base64 re-encoding path and splits large batches of associated files across multiple decrypt requests from the client instead of decrypting an entire export in a single request.

## Detailed Changes

### Data Worker Export Decrypt OOM Fix (Bug Fix)

- **Root Cause** - Cloudflare Workers isolates have a fixed 128MB memory limit. The data worker's `decrypt-export` handler decrypted the entire export batch (data plus all associated files/images) in one request and base64-encoded everything into a single JSON response. Its `arrayBufferToBase64` helper also built one full-size intermediate binary string before calling `btoa`, effectively doubling the in-memory footprint relative to the logical payload size and pushing larger exports (~15MB+) past the isolate's memory ceiling.
- **Worker-Side Fix** - `workers/data-worker/src/handlers/decrypt-export.ts` now base64-encodes each 8190-byte chunk directly and joins the resulting chunk strings, avoiding the full-size intermediate binary string copy.
- **Client-Side Batching** - `app/utils/data/operations/signing-operations.ts` now splits associated files into batches (capped at ~4MB of estimated decoded bytes or 20 files per batch, whichever comes first) and issues one decrypt request per batch instead of a single request for the whole export, merging `decryptedImages` results across batches while taking `plaintext` from the first batch's response.
- **Diagnosis Note** - The failure only surfaced via `wrangler tail`, since a Worker-runtime OOM crash bypasses the handler's own error handling and returns a non-JSON body that the client's `response.json().catch(() => null)` silently converts into a generic, message-less 500 error.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.2.0.md
- **Commits Included**: 1 (non-merge commit from 2026-08-23)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.2.1 removes a real failure mode for larger case imports without changing any public API, storage shape, or worker configuration. Examiners importing sizeable exports should no longer hit the memory-limit crash.
