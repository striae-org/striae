// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * JS re-implementations of the bash helpers in scripts/deploy-config/modules/env-utils.sh
 * that decide prompt/keep-current behavior. Keep in sync with that file — these functions
 * only need to match decisions (whether a var prompts, and how many stdin lines it
 * consumes), not full bash fidelity, since scripts/deploy-config.sh itself still performs
 * the actual value generation/writing.
 */

const PLACEHOLDER_PATTERNS = [/^your_[a-z0-9_]+_here$/, /^your-[a-z0-9-]+-here$/];
const PLACEHOLDER_LITERALS = new Set(['placeholder', 'changeme', 'replace_me', 'replace-me']);

export function stripCarriageReturns(value) {
	return String(value ?? '').replace(/\r/g, '');
}

/** Mirrors is_placeholder() in env-utils.sh/deploy-config.sh. */
export function isPlaceholder(value) {
	let normalized = stripCarriageReturns(value).toLowerCase().trim();
	normalized = normalized.replace(/^"/, '').replace(/"$/, '');

	if (!normalized) return false;

	return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized)) || PLACEHOLDER_LITERALS.has(normalized);
}

/** Mirrors normalize_domain_value() in env-utils.sh. */
export function normalizeDomainValue(value) {
	let domain = String(value ?? '').trim();
	domain = domain.replace(/^http:\/\//, '').replace(/^https:\/\//, '');
	domain = domain.replace(/\/$/, '');
	return domain;
}

/** Mirrors normalize_worker_label_value() in env-utils.sh. */
export function normalizeWorkerLabelValue(value) {
	let label = normalizeDomainValue(value);
	label = label.replace(/^\.+/, '').replace(/\.+$/, '');
	return label.toLowerCase();
}

/** Mirrors is_valid_worker_label() in env-utils.sh. */
export function isValidWorkerLabel(value) {
	return /^[a-z0-9-]+$/.test(value);
}

/** True when a var already holds a real, usable value (non-empty and not a placeholder). */
export function hasValidValue(value) {
	const stripped = stripCarriageReturns(value);
	return stripped !== '' && !isPlaceholder(stripped);
}
