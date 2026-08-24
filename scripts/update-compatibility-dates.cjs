// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

const fs = require('fs');
const path = require('path');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LATEST_COMPATIBLE_FLAGS = new Set(['--latest-compatible', '--latest']);

function getCurrentDate() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function replaceTomlCompatibilityDate(content, date) {
	return content.replace(/(compatibility_date\s*=\s*")\d{4}-\d{2}-\d{2}(")/, `$1${date}$2`);
}

function replaceJsoncCompatibilityDate(content, date) {
	return content.replace(/("compatibility_date"\s*:\s*")\d{4}-\d{2}-\d{2}(",?)/, `$1${date}$2`);
}

function getLatestLocallyCompatibleDate() {
	try {
		const { compatibilityDate } = require('workerd');
		if (typeof compatibilityDate === 'string' && DATE_PATTERN.test(compatibilityDate)) {
			return compatibilityDate;
		}
	} catch {
		// `workerd` may be unavailable in edge environments or custom installs.
	}

	return null;
}

function getEffectiveCompatibilityDate({ mode = 'current-date', explicitDate } = {}) {
	if (explicitDate) {
		if (!DATE_PATTERN.test(explicitDate)) {
			throw new Error(`Invalid date format: ${explicitDate}. Use YYYY-MM-DD.`);
		}

		return { date: explicitDate, source: 'explicit' };
	}

	if (mode === 'latest-compatible') {
		const today = getCurrentDate();
		const localMaxDate = getLatestLocallyCompatibleDate();

		if (!localMaxDate) {
			return { date: today, source: 'today-fallback' };
		}

		if (localMaxDate < today) {
			return { date: localMaxDate, source: 'workerd-max' };
		}

		return { date: today, source: 'today' };
	}

	return { date: getCurrentDate(), source: 'today' };
}

function parseCliArgs(argv) {
	const args = argv.slice(2);
	const hasLatestCompatibleFlag = args.some((arg) => LATEST_COMPATIBLE_FLAGS.has(arg));
	const dateArg = args.find((arg) => DATE_PATTERN.test(arg));
	const nonFlagArgs = args.filter((arg) => !LATEST_COMPATIBLE_FLAGS.has(arg));

	if (hasLatestCompatibleFlag && dateArg) {
		throw new Error('Choose either a YYYY-MM-DD date or --latest-compatible, not both.');
	}

	if (hasLatestCompatibleFlag && nonFlagArgs.length > 0) {
		throw new Error('Unexpected arguments with --latest-compatible. Use only --latest-compatible.');
	}

	if (!hasLatestCompatibleFlag && args.length > 1) {
		throw new Error('Too many arguments. Use a single YYYY-MM-DD date or --latest-compatible.');
	}

	if (args.length === 1 && !hasLatestCompatibleFlag && !dateArg) {
		throw new Error(`Invalid argument: ${args[0]}. Use YYYY-MM-DD or --latest-compatible.`);
	}

	if (hasLatestCompatibleFlag) {
		return { mode: 'latest-compatible' };
	}

	if (dateArg) {
		return { explicitDate: dateArg };
	}

	return { mode: 'current-date' };
}

function updateFile(filePath, date, replacer) {
	if (!fs.existsSync(filePath)) {
		return { filePath, status: 'missing' };
	}

	const original = fs.readFileSync(filePath, 'utf8');
	const updated = replacer(original, date);

	if (original === updated) {
		return { filePath, status: 'unchanged' };
	}

	fs.writeFileSync(filePath, updated, 'utf8');
	return { filePath, status: 'updated' };
}

function updateCompatibilityDates(options = {}) {
	let resolvedOptions = options;
	if (typeof options === 'string') {
		resolvedOptions = { explicitDate: options };
	}

	const { date, source } = getEffectiveCompatibilityDate(resolvedOptions);

	const rootDir = path.resolve(__dirname, '..');
	const workersDir = path.join(rootDir, 'workers');

	const results = [];

	results.push(updateFile(path.join(rootDir, 'wrangler.toml'), date, replaceTomlCompatibilityDate));

	results.push(updateFile(path.join(rootDir, 'wrangler.toml.example'), date, replaceTomlCompatibilityDate));

	if (fs.existsSync(workersDir)) {
		const workerDirs = fs
			.readdirSync(workersDir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);

		for (const workerDir of workerDirs) {
			const workerPath = path.join(workersDir, workerDir);
			results.push(updateFile(path.join(workerPath, 'wrangler.jsonc.example'), date, replaceJsoncCompatibilityDate));
			results.push(updateFile(path.join(workerPath, 'wrangler.jsonc'), date, replaceJsoncCompatibilityDate));
		}
	}

	const updatedCount = results.filter((result) => result.status === 'updated').length;
	const unchangedCount = results.filter((result) => result.status === 'unchanged').length;
	const missingCount = results.filter((result) => result.status === 'missing').length;

	console.log(`Updated compatibility dates to ${date}`);
	if (source === 'workerd-max') {
		console.log(`- Date source: local workerd compatibilityDate (max supported)`);
	} else if (source === 'today-fallback') {
		console.log(`- Date source: current date (workerd metadata unavailable)`);
	} else if (source === 'explicit') {
		console.log(`- Date source: explicit argument`);
	} else {
		console.log(`- Date source: current date`);
	}
	console.log(`- Updated: ${updatedCount}`);
	console.log(`- Unchanged: ${unchangedCount}`);
	console.log(`- Missing: ${missingCount}`);

	for (const result of results) {
		if (result.status !== 'updated') {
			console.log(`  ${result.status.toUpperCase()}: ${path.relative(rootDir, result.filePath)}`);
		}
	}

	return results;
}

if (require.main === module) {
	try {
		updateCompatibilityDates(parseCliArgs(process.argv));
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}

module.exports = {
	updateCompatibilityDates,
	getLatestLocallyCompatibleDate,
	getEffectiveCompatibilityDate,
	parseCliArgs,
};
