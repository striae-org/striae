/**
 * Bulk-inserts (and, with --check, verifies) SPDX license headers across tracked source files.
 * Run with: npm run add-license-headers
 * Verify only (no writes, exits 1 if any file is missing a header): npm run check-license-headers
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const HEADER_LINES = ['Copyright (c) 2025 Stephen J. Lu', 'SPDX-License-Identifier: Apache-2.0'];
const SPDX_MARKER = 'SPDX-License-Identifier';

const SLASH_COMMENT_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const CSS_EXTS = new Set(['.css']);
const SHELL_EXTS = new Set(['.sh']);

// Root-level config files eligible for headers; everything else at repo root is out of scope.
const ROOT_FILES = new Set(['vite.config.ts', 'react-router.config.ts', 'load-context.ts', 'eslint.config.js']);
const IN_SCOPE_DIR_PREFIXES = ['app/', 'workers/', 'functions/', 'shared/', 'scripts/'];
const EXCLUDED_PREFIXES = ['tests/'];

const isCheckMode = process.argv.includes('--check');

function isInScope(relPath) {
	if (relPath.endsWith('.d.ts')) return false;
	if (EXCLUDED_PREFIXES.some((prefix) => relPath.startsWith(prefix))) return false;
	if (ROOT_FILES.has(relPath)) return true;
	return IN_SCOPE_DIR_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function listCandidateFiles() {
	const tracked = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8' })
		.split('\n')
		.filter(Boolean);

	return tracked.filter((relPath) => {
		const ext = path.extname(relPath);
		if (!SLASH_COMMENT_EXTS.has(ext) && !CSS_EXTS.has(ext) && !SHELL_EXTS.has(ext)) return false;
		return isInScope(relPath);
	});
}

function alreadyHasHeader(content) {
	return content.split('\n', 10).some((line) => line.includes(SPDX_MARKER));
}

function buildHeaderBlock(ext) {
	if (CSS_EXTS.has(ext)) {
		return `/*\n * ${HEADER_LINES[0]}\n * ${HEADER_LINES[1]}\n */\n\n`;
	}
	if (SHELL_EXTS.has(ext)) {
		return `# ${HEADER_LINES[0]}\n# ${HEADER_LINES[1]}\n\n`;
	}
	return `// ${HEADER_LINES[0]}\n// ${HEADER_LINES[1]}\n\n`;
}

function insertHeader(content, ext) {
	// Windows checkouts of this repo normalize LF -> CRLF, so splice on the file's own line ending.
	const eol = content.includes('\r\n') ? '\r\n' : '\n';
	const header = eol === '\n' ? buildHeaderBlock(ext) : buildHeaderBlock(ext).replace(/\n/g, eol);

	if (SHELL_EXTS.has(ext)) {
		const newlineIndex = content.indexOf('\n');
		if (content.startsWith('#!') && newlineIndex !== -1) {
			const shebangLine = content.slice(0, newlineIndex).replace(/\r$/, '');
			const rest = content.slice(newlineIndex + 1).replace(/^(?:\r?\n)+/, '');
			return `${shebangLine}${eol}${eol}${header}${rest}`;
		}
		return header + content;
	}

	if (CSS_EXTS.has(ext) && /^@charset\s/.test(content)) {
		const newlineIndex = content.indexOf('\n');
		const firstLine = content.slice(0, newlineIndex).replace(/\r$/, '');
		const rest = content.slice(newlineIndex + 1).replace(/^(?:\r?\n)+/, '');
		return `${firstLine}${eol}${eol}${header}${rest}`;
	}

	// Preserve a leading shebang or directive prologue (e.g. 'use strict') ahead of the header.
	const firstLineMatch = content.match(/^([^\n]*)\n?/);
	const firstLineRaw = firstLineMatch ? firstLineMatch[1] : '';
	const firstLine = firstLineRaw.replace(/\r$/, '');
	if (firstLine.startsWith('#!') || /^['"]use [a-z]+['"];?$/.test(firstLine.trim())) {
		const rest = content.slice(firstLineRaw.length).replace(/^(?:\r?\n)+/, '');
		return `${firstLine}${eol}${eol}${header}${rest}`;
	}

	return header + content;
}

function main() {
	const files = listCandidateFiles();
	const missing = [];
	let updated = 0;
	let alreadyHeadered = 0;

	for (const relPath of files) {
		const absPath = path.join(repoRoot, relPath);
		const content = readFileSync(absPath, 'utf8');

		if (alreadyHasHeader(content)) {
			alreadyHeadered++;
			continue;
		}

		if (isCheckMode) {
			missing.push(relPath);
			continue;
		}

		const ext = path.extname(relPath);
		writeFileSync(absPath, insertHeader(content, ext), 'utf8');
		updated++;
	}

	if (isCheckMode) {
		if (missing.length > 0) {
			console.error(`Missing license header in ${missing.length} file(s):`);
			for (const relPath of missing) console.error(`  - ${relPath}`);
			process.exit(1);
		}
		console.log(`License header check passed (${files.length} files scanned).`);
		return;
	}

	console.log(`License headers: ${updated} file(s) updated, ${alreadyHeadered} already had a header, ${files.length} scanned.`);
}

main();
