import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 7777,
  },
  build: {
    chunkSizeWarningLimit: 500,
    minify: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    cloudflare(),
    reactRouter(),
  ],
});
