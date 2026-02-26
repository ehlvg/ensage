import { json } from '@sveltejs/kit';
import { config } from '$lib/server/config.js';
import { startCleanupJob } from '$lib/server/cleanup.js';
import { uploadMode } from '$lib/server/runtime.js';

// Start the hourly cleanup job once on first request (self-hosted/node only)
if (uploadMode === 'local') startCleanupJob();

export function GET() {
	return json({
		accentColor: config.accentColor,
		uploadMode,
		maxFileSize: config.maxFileSize
	});
}
