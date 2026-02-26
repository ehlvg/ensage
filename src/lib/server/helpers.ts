import crypto from 'node:crypto';
import path from 'node:path';
import { config } from './config.js';
import type { TtlValue } from './types.js';

/** Generate a random 10-character hex ID */
export function generateId(): string {
	return crypto.randomBytes(5).toString('hex');
}

/** Strip unsafe characters while preserving Unicode letters/digits/emoji */
export function sanitizeFilename(name: string): string {
	return (
		String(name)
			// eslint-disable-next-line no-control-regex
			.replace(/[\x00-\x1f\x7f]/g, '') // control characters
			.replace(/[/\\:*?"<>|]/g, '_') // filesystem-forbidden chars
			.replace(/^\.+/, '_') // leading dots (hidden files on Unix)
			.trim()
			.slice(0, 255) || // max filename length
		'file'
	);
}

/**
 * Build a RFC 6266 / RFC 5987 Content-Disposition header that safely
 * transmits any Unicode filename — ASCII fallback + filename* parameter.
 */
export function contentDisposition(disposition: string, filename: string): string {
	const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
	const encoded = encodeURIComponent(filename).replace(
		/[!'()*]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
	);
	return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/** Absolute path for a stored item file */
export function itemFilePath(id: string): string {
	return path.join(config.uploadDir, id);
}

/** Convert a TTL string to an epoch timestamp (ms), or null for "never" */
export function ttlToExpires(ttl: TtlValue): number | null {
	const now = Date.now();
	switch (ttl) {
		case '1h':
			return now + 3_600_000;
		case '24h':
			return now + 86_400_000;
		case '7d':
			return now + 7 * 86_400_000;
		default:
			return null;
	}
}

/** Validate that a string is an http/https URL */
export function isValidUrl(str: string): boolean {
	try {
		const u = new URL(str);
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

/** Generate an HMAC token for a given item ID and hour bucket */
export function makeToken(itemId: string, hourBucket: number): string {
	const payload = `${itemId}:${hourBucket}`;
	return crypto.createHmac('sha256', config.tokenSecret).update(payload).digest('hex');
}

/** Validate a token against the current and previous hour bucket (clock-drift tolerance) */
export function validateToken(token: string, itemId: string): boolean {
	const currentBucket = Math.floor(Date.now() / 3_600_000);
	for (const offset of [0, -1]) {
		const expected = makeToken(itemId, currentBucket + offset);
		try {
			if (crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))) {
				return true;
			}
		} catch {
			// Invalid hex length — skip
		}
	}
	return false;
}
