const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const markdownFiles = [
	'.github/SECURITY.md',
	// Add other markdown files that need version updates
];

const workerDirs = [
	'workers/audit-worker',
	'workers/data-worker',
	'workers/files-worker',
	'workers/image-worker',
	'workers/lists-worker',
	'workers/pdf-worker',
	'workers/user-worker',
];

function updateMarkdownVersions() {
	console.log(`📝 Updating markdown files with version ${packageJson.version}...`);

	markdownFiles.forEach((filePath) => {
		const fullPath = path.join(__dirname, '..', filePath);

		if (!fs.existsSync(fullPath)) {
			console.log(`⚠️  Skipping ${filePath} (file not found)`);
			return;
		}

		try {
			let content = fs.readFileSync(fullPath, 'utf8');

			// Replace version placeholders
			content = content.replace(/{{VERSION}}/g, packageJson.version);
			content = content.replace(/v\d+\.\d+\.\d+(-\w+)?/g, `v${packageJson.version}`);

			fs.writeFileSync(fullPath, content);
			console.log(`✅ Updated ${filePath}`);
		} catch (error) {
			console.error(`❌ Error updating ${filePath}:`, error.message);
		}
	});

	console.log(`📦 Updating worker package.json files with version ${packageJson.version}...`);

	workerDirs.forEach((workerDir) => {
		const pkgPath = path.join(__dirname, '..', workerDir, 'package.json');
		const lockPath = path.join(__dirname, '..', workerDir, 'package-lock.json');

		// --- Update package.json ---
		if (!fs.existsSync(pkgPath)) {
			console.log(`⚠️  Skipping ${workerDir}/package.json (file not found)`);
		} else {
			try {
				const workerPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
				workerPkg.version = packageJson.version;
				fs.writeFileSync(pkgPath, JSON.stringify(workerPkg, null, 2) + '\n');
				console.log(`✅ Updated ${workerDir}/package.json`);
			} catch (error) {
				console.error(`❌ Error updating ${workerDir}/package.json:`, error.message);
			}
		}

		// --- Update package-lock.json ---
		// Lockfile v2/v3 stores the version in two places:
		//   - Top-level `version` field
		//   - `packages[""].version` (the self-referencing root entry)
		// Both must match package.json to pass `npm ci` consistency checks.
		if (!fs.existsSync(lockPath)) {
			console.log(`⚠️  No package-lock.json found in ${workerDir} — run \`npm install\` there to generate one.`);
		} else {
			try {
				const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

				if ('version' in lockData) {
					lockData.version = packageJson.version;
				}

				if (lockData.packages && '' in lockData.packages) {
					lockData.packages[''].version = packageJson.version;
				}

				fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2) + '\n');
				console.log(`✅ Updated ${workerDir}/package-lock.json`);
			} catch (error) {
				console.error(`❌ Error updating ${workerDir}/package-lock.json:`, error.message);
			}
		}
	});

	console.log('🎉 Version update complete!');
}

// Run if called directly
if (require.main === module) {
	updateMarkdownVersions();
}

module.exports = { updateMarkdownVersions };
