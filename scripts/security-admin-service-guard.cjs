// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'app');
const PUBLIC_DIR = path.join(ROOT, 'public');
const BUILD_CLIENT_DIR = path.join(ROOT, 'build', 'client');
const ADMIN_SERVICE_PATH = path.join('app', 'config', 'admin-service.json');

const REQUIRE_BUILD = process.argv.includes('--require-build');

const IMPORT_PATTERN = /(?:import\s+[^'"\n]+from\s+|import\s*\(|require\s*\()\s*['"][^'"\n]*admin-service(?:\.json)?['"]/i;
const FETCH_PATTERN = /fetch\s*\(\s*['"][^'"\n]*(?:app\/config\/admin-service\.json|config\/admin-service\.json|admin-service\.json)['"]/i;
const LEAK_MARKERS = [
	'BEGIN PRIVATE KEY',
	'firebase-adminsdk-',
	'FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY',
	'private_key_id',
	'client_x509_cert_url',
	'admin-service.json',
];

function listFiles(dir) {
	if (!fs.existsSync(dir)) {
		return [];
	}

	const files = [];
	const stack = [dir];

	while (stack.length > 0) {
		const current = stack.pop();
		const entries = fs.readdirSync(current, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(fullPath);
			} else if (entry.isFile()) {
				files.push(fullPath);
			}
		}
	}

	return files;
}

function relative(filePath) {
	return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function runGitCheck() {
	const result = spawnSync('git', ['ls-files', '--error-unmatch', ADMIN_SERVICE_PATH], {
		cwd: ROOT,
		encoding: 'utf8',
	});
	return result.status === 0;
}

function scanSourceImports() {
	const offenders = [];
	const files = listFiles(SOURCE_DIR).filter((filePath) => /\.(t|j)sx?$/.test(filePath));

	for (const filePath of files) {
		const text = fs.readFileSync(filePath, 'utf8');
		if (IMPORT_PATTERN.test(text) || FETCH_PATTERN.test(text)) {
			offenders.push(relative(filePath));
		}
	}

	return offenders;
}

function scanLeakMarkers(targetDir) {
	const findings = [];
	for (const filePath of listFiles(targetDir)) {
		let text;
		try {
			text = fs.readFileSync(filePath, 'utf8');
		} catch {
			continue;
		}

		for (const marker of LEAK_MARKERS) {
			if (text.includes(marker)) {
				findings.push({ file: relative(filePath), marker });
				break;
			}
		}
	}
	return findings;
}

function main() {
	const failures = [];

	if (runGitCheck()) {
		failures.push(`${ADMIN_SERVICE_PATH} is tracked by git. This file must remain untracked.`);
	}

	const sourceOffenders = scanSourceImports();
	if (sourceOffenders.length > 0) {
		failures.push(`Client source references admin-service credentials: ${sourceOffenders.join(', ')}`);
	}

	const publicFindings = scanLeakMarkers(PUBLIC_DIR);
	if (publicFindings.length > 0) {
		failures.push(`Leak markers found in public assets: ${publicFindings.map((entry) => `${entry.file} [${entry.marker}]`).join(', ')}`);
	}

	if (!fs.existsSync(BUILD_CLIENT_DIR)) {
		if (REQUIRE_BUILD) {
			failures.push('build/client is missing. Run the client build before strict guard checks.');
		} else {
			console.log('Note: build/client not found, skipping built artifact scan.');
		}
	} else {
		const clientFindings = scanLeakMarkers(BUILD_CLIENT_DIR);
		if (clientFindings.length > 0) {
			failures.push(
				`Leak markers found in build/client assets: ${clientFindings.map((entry) => `${entry.file} [${entry.marker}]`).join(', ')}`,
			);
		}
	}

	if (failures.length > 0) {
		console.error('Admin-service security guard failed:');
		for (const failure of failures) {
			console.error(`- ${failure}`);
		}
		process.exit(1);
	}

	console.log('Admin-service security guard passed.');
}

main();
