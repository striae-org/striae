// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * Reads and parses the project's .env file. Every value written by write_env_var() in
 * env-utils.sh lives on a single physical line (multiline PEM/JSON values are stored with
 * literal "\n" escape sequences inside a quoted string), so a simple line-oriented parser
 * is sufficient here.
 */
import { readFileSync, existsSync } from 'node:fs';
import { hasValidValue } from './bash-compat.mjs';

const ENV_LINE_PATTERN = /^([A-Z_][A-Z0-9_]*)=(.*)$/;

export function readEnvSnapshot(envPath) {
	const snapshot = new Map();

	if (!existsSync(envPath)) return snapshot;

	const content = readFileSync(envPath, 'utf8');
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;

		const match = ENV_LINE_PATTERN.exec(line);
		if (!match) continue;

		const [, key, rawValue] = match;
		let value = rawValue;
		if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
			value = value.slice(1, -1).replace(/\\"/g, '"');
		}
		snapshot.set(key, value);
	}

	return snapshot;
}

/**
 * Builds a client-safe status view: non-secret fields are returned as-is, secret fields are
 * reduced to a boolean so raw secret values never leave the server process.
 */
export function buildEnvStatus(snapshot, fields) {
	const status = {};
	for (const field of fields) {
		const value = snapshot.get(field.name) ?? '';
		if (field.secret) {
			status[field.name] = { isSet: hasValidValue(value) };
		} else {
			status[field.name] = { value: hasValidValue(value) ? value : '' };
		}
	}
	return status;
}

export function buildKeyPairStatus(snapshot, keyPairFields) {
	const status = {};
	for (const pair of keyPairFields) {
		const privateValid = hasValidValue(snapshot.get(pair.privateKeyVar) ?? '');
		const publicValid = hasValidValue(snapshot.get(pair.publicKeyVar) ?? '');
		status[pair.id] = { isSet: privateValid && publicValid };
	}
	return status;
}
