import { error } from '@sveltejs/kit';
import { config } from './config.js';

type Kind = 'upload' | 'read' | 'auth';

interface Bucket {
	count: number;
	resetAt: number;
}

// Simple in-memory fixed-window counters per IP and kind.
// Good enough for self-hosted, low-traffic usage.
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000; // 1 minute

function getLimit(kind: Kind): number {
	switch (kind) {
		case 'upload':
			return config.rateUpload;
		case 'auth':
			return config.rateAuth;
		case 'read':
		default:
			return config.rateRead;
	}
}

export function checkRateLimit(kind: Kind, key: string): void {
	const limit = getLimit(kind);
	if (!limit || limit <= 0) return; // disabled

	const now = Date.now();
	const bucketKey = `${kind}:${key || 'unknown'}`;
	const current = buckets.get(bucketKey);

	if (!current || current.resetAt <= now) {
		buckets.set(bucketKey, { count: 1, resetAt: now + WINDOW_MS });
		return;
	}

	if (current.count >= limit) {
		throw error(429, 'Too many requests. Please slow down.');
	}

	current.count += 1;
}

