import fs from 'node:fs';
import { stmtExpired, stmtDeleteExpired } from './db.js';
import { itemFilePath } from './helpers.js';

const CLEANUP_INTERVAL_MS = 3_600_000; // 1 hour

function runCleanup(): void {
	const now = Date.now();
	const expired = stmtExpired.all(now);

	for (const row of expired) {
		if (row.type === 'file' || row.type === 'text') {
			try {
				fs.unlinkSync(itemFilePath(row.id));
			} catch {
				// File may already be deleted — ignore
			}
		}
	}

	const result = stmtDeleteExpired.run(now);
	if (result.changes > 0) {
		console.log(`[cleanup] removed ${result.changes} expired item(s)`);
	}
}

let started = false;

export function startCleanupJob(): void {
	if (started) return;
	started = true;
	setInterval(runCleanup, CLEANUP_INTERVAL_MS);
}
