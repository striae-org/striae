import { reactRouter } from "@react-router/dev/vite";
import { cloudflareDevProxy } from "@react-router/dev/vite/cloudflare";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 7777,
  },
  build: {
    chunkSizeWarningLimit: 500,
    minify: true,
  },
  plugins: [
    cloudflareDevProxy(),
    reactRouter(),
    tsconfigPaths(),
  ],
});
