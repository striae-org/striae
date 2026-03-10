const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const eslintApiPath = require.resolve('eslint');
const eslintCliPath = path.resolve(path.dirname(eslintApiPath), '..', 'bin', 'eslint.js');

const gitignorePath = path.resolve(process.cwd(), '.gitignore');
const ignorePatterns = fs.existsSync(gitignorePath)
  ? fs
      .readFileSync(gitignorePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
  : [];

const ignoreArgs = ignorePatterns.flatMap((pattern) => ['--ignore-pattern', pattern]);

const defaultArgs = [
  ...ignoreArgs,
  '--cache',
  '--cache-location',
  './node_modules/.cache/eslint',
  '.',
];

const passthroughArgs = process.argv.slice(2);
const eslintArgs = passthroughArgs.length > 0 ? passthroughArgs : defaultArgs;

const result = spawnSync(process.execPath, [eslintCliPath, ...eslintArgs], {
  stdio: 'inherit',
  env: process.env,
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error);
}

process.exit(1);
