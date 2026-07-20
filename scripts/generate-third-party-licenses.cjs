const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'THIRD_PARTY_LICENSES.md');
const AUDIT_PACKAGE_NAME = 'striae-license-audit';

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? 'pipe' : 'inherit',
    cwd: options.cwd,
    env: process.env,
    encoding: options.capture ? 'utf8' : undefined,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = typeof result.stderr === 'string' ? result.stderr : '';
    throw new Error(
      `Command failed: ${command} ${args.join(' ')}${stderr ? `\n${stderr}` : ''}`
    );
  }

  return result;
}

function runNpm(args, cwd) {
  const npmArgs = ['--no-progress', ...args];
  const result =
    process.platform === 'win32'
      ? runCommand('cmd.exe', ['/d', '/s', '/c', `npm ${npmArgs.join(' ')}`], {
          cwd,
          capture: true,
        })
      : runCommand('npm', npmArgs, { cwd, capture: true });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function readRootPackageJson() {
  const packageJsonPath = path.join(ROOT_DIR, 'package.json');
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function parseDependencyId(depId) {
  const separatorIndex = depId.lastIndexOf('@');
  if (separatorIndex <= 0) {
    return { name: depId, version: '' };
  }

  return {
    name: depId.slice(0, separatorIndex),
    version: depId.slice(separatorIndex + 1),
  };
}

function findFallbackLicenseFile(packagePath) {
  if (!packagePath) {
    return '';
  }

  const candidates = [
    'LICENSE',
    'LICENSE.txt',
    'LICENSE.md',
    'LICENCE',
    'LICENCE.txt',
    'LICENCE.md',
    'COPYING',
    'COPYING.txt',
    'NOTICE',
    'NOTICE.txt',
  ];

  for (const filename of candidates) {
    const candidatePath = path.join(packagePath, filename);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath;
    }
  }

  return '';
}

function safeReadText(filePath) {
  if (!filePath) {
    return '';
  }

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function toTableCell(value) {
  return String(value || '').replace(/\|/g, '\\|');
}

function generateThirdPartyLicenses() {
  const rootPackage = readRootPackageJson();
  const dependencies = rootPackage.dependencies || {};

  if (Object.keys(dependencies).length === 0) {
    throw new Error('No production dependencies found in package.json');
  }

  const rootPackageJsonPath = path.join(ROOT_DIR, 'package.json');
  const rootPackageLockPath = path.join(ROOT_DIR, 'package-lock.json');

  if (!fs.existsSync(rootPackageLockPath)) {
    throw new Error(
      'package-lock.json not found. A committed lockfile is required to reproduce the locked production dependency tree.'
    );
  }

  const rootPackageId = rootPackage.version
    ? `${rootPackage.name}@${rootPackage.version}`
    : rootPackage.name;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'striae-license-audit-'));

  try {
    // Reproduce the exact locked production tree by installing from the
    // checked-in package.json + package-lock.json with `npm ci --omit=dev`.
    // This keeps the report deterministic and aligned with released versions,
    // instead of re-resolving version ranges at run time.
    const reproDir = path.join(tempDir, 'repro');
    const toolingDir = path.join(tempDir, 'tooling');
    const tempReportPath = path.join(tempDir, 'license-checker.json');

    fs.mkdirSync(reproDir, { recursive: true });
    fs.mkdirSync(toolingDir, { recursive: true });

    fs.copyFileSync(rootPackageJsonPath, path.join(reproDir, 'package.json'));
    fs.copyFileSync(rootPackageLockPath, path.join(reproDir, 'package-lock.json'));

    console.log(`Reproducing locked production tree in ${reproDir}`);
    runNpm(
      ['ci', '--omit=dev', '--legacy-peer-deps', '--no-audit', '--no-fund', '--ignore-scripts'],
      reproDir
    );

    // Install the scanner in a separate directory so it never becomes part of
    // the audited production tree.
    const toolingPackageJson = {
      name: AUDIT_PACKAGE_NAME,
      version: '1.0.0',
      private: true,
      devDependencies: {
        'license-checker': '^25.0.1',
      },
    };

    fs.writeFileSync(
      path.join(toolingDir, 'package.json'),
      `${JSON.stringify(toolingPackageJson, null, 2)}\n`
    );

    console.log(`Installing license scanner in ${toolingDir}`);
    runNpm(['install', '--no-audit', '--no-fund', '--ignore-scripts'], toolingDir);

    const licenseCheckerCli = path.join(
      toolingDir,
      'node_modules',
      'license-checker',
      'bin',
      'license-checker'
    );

    const scanResult = runCommand(
      process.execPath,
      [licenseCheckerCli, '--start', reproDir, '--production', '--json'],
      { cwd: reproDir, capture: true }
    );

    fs.writeFileSync(tempReportPath, scanResult.stdout || '');

    const report = JSON.parse(fs.readFileSync(tempReportPath, 'utf8'));
    const firebaseSharedReadme = path.join(
      reproDir,
      'node_modules',
      '@firebase',
      'app',
      'README.md'
    );

    const entries = Object.entries(report)
      .map(([depId, details]) => {
        const { name, version } = parseDependencyId(depId);
        return {
          depId,
          name,
          version,
          license: String(details.licenses || 'UNKNOWN'),
          repository: details.repository || '',
          publisher: details.publisher || '',
          packagePath: details.path || '',
          metadataLicenseFile: details.licenseFile || '',
        };
      })
      .filter((entry) => entry.depId !== rootPackageId && entry.name !== rootPackage.name)
      .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));

    const lines = [];
    lines.push('# THIRD_PARTY_LICENSES');
    lines.push('');
    lines.push('This file contains third-party license attributions for production dependencies used by Striae.');
    lines.push('');
    lines.push(`- Project: Striae`);
    lines.push(`- Generated: ${new Date().toISOString().slice(0, 10)}`);
    lines.push('- Scope: npm production dependencies only');
    lines.push('- Source: license-checker audit of the locked production tree (`npm ci --omit=dev` from package-lock.json)');
    lines.push('');
    lines.push('## Dependency Inventory');
    lines.push('');
    lines.push('| Package | Version | License | Repository |');
    lines.push('| --- | --- | --- | --- |');

    for (const entry of entries) {
      lines.push(
        `| ${toTableCell(entry.name)} | ${toTableCell(entry.version)} | ${toTableCell(
          entry.license
        )} | ${toTableCell(entry.repository)} |`
      );
    }

    lines.push('');
    lines.push('## License Texts');
    lines.push('');

    let unresolvedCount = 0;

    for (const entry of entries) {
      let licenseSource = entry.metadataLicenseFile || findFallbackLicenseFile(entry.packagePath);

      if (!licenseSource && entry.name.startsWith('@firebase/') && fs.existsSync(firebaseSharedReadme)) {
        licenseSource = firebaseSharedReadme;
      }

      const licenseText = safeReadText(licenseSource);

      lines.push(`### ${entry.name}@${entry.version}`);
      lines.push('');
      lines.push(`- License: ${entry.license}`);

      if (entry.publisher) {
        lines.push(`- Publisher: ${entry.publisher}`);
      }

      if (entry.repository) {
        lines.push(`- Repository: ${entry.repository}`);
      }

      lines.push('');

      if (licenseText.trim()) {
        // Preserve the upstream license text verbatim, only trimming the trailing
        // newline so the closing code fence renders correctly.
        lines.push('```text');
        lines.push(licenseText.replace(/\n$/, ''));
        lines.push('```');
      } else {
        unresolvedCount += 1;
        lines.push('_License text could not be resolved from the installed package metadata or package directory._');
      }

      lines.push('');
    }

    fs.writeFileSync(OUTPUT_FILE, `${lines.join('\n')}\n`);

    console.log(`Wrote ${OUTPUT_FILE}`);
    console.log(`Dependencies documented: ${entries.length}`);
    console.log(`Unresolved license text entries: ${unresolvedCount}`);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn(
        `Warning: failed to remove temporary directory ${tempDir}: ${
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        }`
      );
    }
  }
}

if (require.main === module) {
  try {
    generateThirdPartyLicenses();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = {
  generateThirdPartyLicenses,
};