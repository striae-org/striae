import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
});
