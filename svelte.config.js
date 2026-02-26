import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';

// Keep the maximum request body size in line with the configured MAX_FILE_SIZE.
// Fallback default matches src/lib/server/config.ts (500 MB).
const maxBodySize = Number.parseInt(process.env.MAX_FILE_SIZE ?? '524288000', 10) || 524_288_000;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: process.env.VERCEL
			? adapterVercel({ runtime: 'nodejs22.x' })
			: adapterNode({
					bodySizeLimit: maxBodySize
				}),
		// Our API routes are not form actions and use HMAC token auth,
		// not cookies — disable the form-submission CSRF check.
		csrf: {
			checkOrigin: false
		}
	}
};

export default config;
