import fs from 'node:fs';
import { del } from '@vercel/blob';
import { dbListExpired, dbDeleteExpired } from './db.js';
import { itemFilePath } from './helpers.js';

const CLEANUP_INTERVAL_MS = 3_600_000; // 1 hour

export async function runCleanupOnce(): Promise<number> {
	const now = Date.now();
	const expired = await dbListExpired(now);

	for (const row of expired) {
		if (row.type !== 'file' && row.type !== 'text') continue;
		if (row.blob_url) {
			try {
				await del(row.blob_url);
			} catch {
				// ignore
			}
			continue;
		}
		try {
			fs.unlinkSync(itemFilePath(row.id));
		} catch {
			// File may already be deleted — ignore
		}
	}

	const changes = await dbDeleteExpired(now);
	if (changes > 0) console.log(`[cleanup] removed ${changes} expired item(s)`);
	return changes;
}

let started = false;

export function startCleanupJob(): void {
	if (started) return;
	started = true;
	setInterval(() => {
		runCleanupOnce().catch(() => {
			// ignore
		});
	}, CLEANUP_INTERVAL_MS);
}
