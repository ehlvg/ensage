import { json } from '@sveltejs/kit';
import { config } from '$lib/server/config.js';
import { startCleanupJob } from '$lib/server/cleanup.js';

// Start the hourly cleanup job once on first request
startCleanupJob();

export function GET() {
	return json({ accentColor: config.accentColor });
}
