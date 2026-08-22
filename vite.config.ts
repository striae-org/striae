import { reactRouter } from '@react-router/dev/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
	const useCloudflarePlugin = command === 'build' || process.env.STRIAE_USE_CLOUDFLARE_DEV === '1';

	return {
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
		plugins: [...(useCloudflarePlugin ? [cloudflare()] : []), reactRouter()],
	};
});
