// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * Ordered schema mirroring scripts/deploy-config/modules/prompt.sh's prompt_for_secrets()
 * call order and scripts/deploy-config/modules/keys.sh's configure_* call order. If those
 * files change (new vars, reordered sections, new prompts), this file must be updated to
 * match or the deploy-gui stdin answer batch (see runner.mjs) will misalign.
 *
 * kind values:
 *   - "plain"       : one line if a valid current value exists (keep/override), otherwise a
 *                      required non-empty override.
 *   - "domain"       : like "plain", value gets normalized (strip protocol/trailing slash).
 *   - "worker-name"  : always exactly one line (prompt.sh auto-fills a random name first, so
 *                      the "keep current" branch is always taken regardless of prior state).
 *   - "auto-secret"  : one line ("" keep / "y" regenerate) only if a valid current value
 *                      exists; silently self-generated (0 lines) otherwise.
 *   - "silent"       : never prompts; informational status only (e.g. REGISTRY_ENCRYPTION_KEY).
 */
export const ENV_FIELDS = [
	{ name: 'ACCOUNT_ID', section: 'Cloudflare Core Configuration', description: 'Your Cloudflare Account ID', kind: 'plain', secret: false },

	{ name: 'API_KEY', section: 'Firebase Auth Configuration', description: 'Firebase API key', kind: 'plain', secret: false },
	{ name: 'AUTH_DOMAIN', section: 'Firebase Auth Configuration', description: 'Firebase auth domain (project-id.firebaseapp.com)', kind: 'plain', secret: false },
	{ name: 'STORAGE_BUCKET', section: 'Firebase Auth Configuration', description: 'Firebase storage bucket', kind: 'plain', secret: false },
	{ name: 'MESSAGING_SENDER_ID', section: 'Firebase Auth Configuration', description: 'Firebase messaging sender ID', kind: 'plain', secret: false },
	{ name: 'APP_ID', section: 'Firebase Auth Configuration', description: 'Firebase app ID', kind: 'plain', secret: false },
	{ name: 'MEASUREMENT_ID', section: 'Firebase Auth Configuration', description: 'Firebase measurement ID (optional)', kind: 'plain', secret: false },

	{ name: 'PAGES_PROJECT_NAME', section: 'Pages Configuration', description: 'Your Cloudflare Pages project name', kind: 'plain', secret: false },
	{ name: 'PAGES_CUSTOM_DOMAIN', section: 'Pages Configuration', description: 'Your custom domain (e.g., striae.org) - DO NOT include https://', kind: 'domain', secret: false },

	{ name: 'USER_WORKER_NAME', section: 'Worker Names', description: 'User worker name (auto-generated; change only if using an existing worker)', kind: 'worker-name', secret: false },
	{ name: 'DATA_WORKER_NAME', section: 'Worker Names', description: 'Data worker name (auto-generated; change only if using an existing worker)', kind: 'worker-name', secret: false },
	{ name: 'AUDIT_WORKER_NAME', section: 'Worker Names', description: 'Audit worker name (auto-generated; change only if using an existing worker)', kind: 'worker-name', secret: false },
	{ name: 'IMAGES_WORKER_NAME', section: 'Worker Names', description: 'Images worker name (auto-generated; change only if using an existing worker)', kind: 'worker-name', secret: false },
	{ name: 'FILES_WORKER_NAME', section: 'Worker Names', description: 'Files worker name (auto-generated; change only if using an existing worker)', kind: 'worker-name', secret: false },
	{ name: 'PDF_WORKER_NAME', section: 'Worker Names', description: 'PDF worker name (auto-generated; change only if using an existing worker)', kind: 'worker-name', secret: false },
	{ name: 'LISTS_WORKER_NAME', section: 'Worker Names', description: 'Lists worker name (auto-generated; change only if using an existing worker)', kind: 'worker-name', secret: false },

	{ name: 'DATA_BUCKET_NAME', section: 'Storage Configuration', description: 'Your R2 bucket name for case data storage', kind: 'plain', secret: false },
	{ name: 'AUDIT_BUCKET_NAME', section: 'Storage Configuration', description: 'Your R2 bucket name for audit logs (separate from data bucket)', kind: 'plain', secret: false },
	{ name: 'FILES_BUCKET_NAME', section: 'Storage Configuration', description: 'Your R2 bucket name for encrypted files storage', kind: 'plain', secret: false },
	{ name: 'CONFIG_BUCKET_NAME', section: 'Storage Configuration', description: 'Your R2 bucket name for config/key registries (shared across workers)', kind: 'plain', secret: false },
	{ name: 'KV_STORE_ID', section: 'Storage Configuration', description: 'Your KV namespace ID (UUID format)', kind: 'plain', secret: false },
	{ name: 'STRIAE_LISTS_KV_ID', section: 'Storage Configuration', description: 'KV namespace ID for the lists-worker (UUID format; backs registration and primershear allowlists)', kind: 'plain', secret: false },

	{ name: 'IMAGE_SIGNED_URL_SECRET', section: 'Service-Specific Secrets', description: "Image signed URL secret (generate with: openssl rand -base64 48 | tr '+/' '-_' | tr -d '=')", kind: 'auto-secret', secret: true },
	{ name: 'IMAGE_SIGNED_URL_BASE_URL', section: 'Service-Specific Secrets', description: 'Signed URL delivery base URL — routes signed image delivery through the Pages proxy (leave as-is unless using a non-standard domain)', kind: 'plain', secret: false },
	{ name: 'FILES_SIGNED_URL_SECRET', section: 'Service-Specific Secrets', description: "Files signed URL secret (generate with: openssl rand -base64 48 | tr '+/' '-_' | tr -d '=')", kind: 'auto-secret', secret: true },
	{ name: 'FILES_SIGNED_URL_BASE_URL', section: 'Service-Specific Secrets', description: 'Signed URL delivery base URL — routes signed file delivery through the Pages proxy (leave as-is unless using a non-standard domain)', kind: 'plain', secret: false },
	{ name: 'BROWSER_API_TOKEN', section: 'Service-Specific Secrets', description: 'Cloudflare Browser Rendering API token (for PDF Worker)', kind: 'plain', secret: true },
	{ name: 'LISTS_ADMIN_SECRET', section: 'Service-Specific Secrets', description: 'Lists worker admin secret — guards write endpoints (auto-generated; guards POST/DELETE on the lists-worker)', kind: 'auto-secret', secret: true },
];

/**
 * Key-pair sections, in the exact order configure_*_credentials() functions are called by
 * prompt_for_secrets(). Each consumes at most one confirm_key_pair_regeneration() stdin line
 * (see runner.mjs), gated on both env vars already holding valid values.
 */
export const KEY_PAIR_FIELDS = [
	{ id: 'manifest-signing', label: 'manifest signing', section: 'Manifest Signing Configuration', privateKeyVar: 'MANIFEST_SIGNING_PRIVATE_KEY', publicKeyVar: 'MANIFEST_SIGNING_PUBLIC_KEY' },
	{ id: 'export-encryption', label: 'export encryption', section: 'Export Encryption Configuration', privateKeyVar: 'EXPORT_ENCRYPTION_PRIVATE_KEY', publicKeyVar: 'EXPORT_ENCRYPTION_PUBLIC_KEY' },
	{ id: 'user-kv-encryption', label: 'user KV encryption', section: 'User KV Encryption Configuration', privateKeyVar: 'USER_KV_ENCRYPTION_PRIVATE_KEY', publicKeyVar: 'USER_KV_ENCRYPTION_PUBLIC_KEY' },
	{ id: 'data-at-rest-encryption', label: 'data-at-rest encryption', section: 'Data-At-Rest Encryption Configuration', privateKeyVar: 'DATA_AT_REST_ENCRYPTION_PRIVATE_KEY', publicKeyVar: 'DATA_AT_REST_ENCRYPTION_PUBLIC_KEY' },
];

/** Never prompts — configure_registry_encryption_key() always keeps or silently generates. */
export const SILENT_FIELDS = [{ name: 'REGISTRY_ENCRYPTION_KEY', section: 'Registry Encryption Key', description: 'Encrypts key registries at rest in R2 (auto-generated, never prompted)', kind: 'silent', secret: true }];

export const ALL_SECTIONS = [
	'Cloudflare Core Configuration',
	'Firebase Auth Configuration',
	'Pages Configuration',
	'Worker Names',
	'Storage Configuration',
	'Service-Specific Secrets',
	'Manifest Signing Configuration',
	'Export Encryption Configuration',
	'User KV Encryption Configuration',
	'Data-At-Rest Encryption Configuration',
	'Registry Encryption Key',
];
