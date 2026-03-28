import fs from 'node:fs';
import path from 'node:path';
import { isVercel } from '$lib/server/runtime.js';
import { config } from '$lib/server/config.js';
import { startCleanupJob } from '$lib/server/cleanup.js';

if (!isVercel) {
	// Ensure data directories exist before any request handler runs.
	// The upload API writes files before the SQLite module is imported
	// (which would otherwise create these directories lazily on first DB access).
	fs.mkdirSync(config.uploadDir, { recursive: true });
	fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

	// Start the hourly in-process cleanup job.
	// On Vercel this is handled by the /api/cron/cleanup endpoint.
	startCleanupJob();
}

export const handle = async ({ event, resolve }) => resolve(event);
