import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		// node:sqlite is a Node.js built-in experimental module — keep it external
		external: ['node:sqlite', 'node:crypto', 'node:fs', 'node:path', 'node:url']
	}
});
