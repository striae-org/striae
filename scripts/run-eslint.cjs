const { spawnSync } = require('node:child_process');
const path = require('node:path');

const eslintApiPath = require.resolve('eslint');
const eslintCliPath = path.resolve(path.dirname(eslintApiPath), '..', 'bin', 'eslint.js');

const defaultArgs = [
  '--ignore-path',
  '.gitignore',
  '--cache',
  '--cache-location',
  './node_modules/.cache/eslint',
  '.',
];

const passthroughArgs = process.argv.slice(2);
const eslintArgs = passthroughArgs.length > 0 ? passthroughArgs : defaultArgs;

const result = spawnSync(process.execPath, [eslintCliPath, ...eslintArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ESLINT_USE_FLAT_CONFIG: 'false',
  },
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error);
}

process.exit(1);
