// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

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
		name: 'workers:image',
		include: ['**/*.test.ts'],
	},
});
