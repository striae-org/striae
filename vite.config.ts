import { reactRouter } from "@react-router/dev/vite";
import { cloudflareDevProxy } from "@react-router/dev/vite/cloudflare";
import { defineConfig } from "vite";
import { getLoadContext } from "./load-context";

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
    cloudflareDevProxy({ getLoadContext }),
    reactRouter(),
  ],
});
