import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const wranglerConfigPath = path.resolve(__dirname, './wrangler.test.jsonc');

export default defineConfig({
  root: __dirname,
  plugins: [
    cloudflareTest({
      wrangler: { configPath: wranglerConfigPath },
    }),
  ],
  test: {
    name: 'workers:files',
    include: ['**/*.test.ts'],
  },
});
