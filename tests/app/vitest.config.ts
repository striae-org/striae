import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appRoot = path.resolve(__dirname, '../../app');
const fixturesRoot = path.resolve(__dirname, '../fixtures');

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: [
      // Must come before the general ~/ alias to override config.json
      {
        find: '~/config/config.json',
        replacement: path.join(fixturesRoot, 'test-config.json'),
      },
      {
        find: /^~\//,
        replacement: appRoot + '/',
      },
    ],
  },
  test: {
    name: 'app',
    environment: 'node',
    include: ['**/*.test.ts'],
    globals: false,
  },
});
