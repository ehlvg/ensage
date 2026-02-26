import { json, error, type RequestEvent } from '@sveltejs/kit';
import { dbInsertItem } from '$lib/server/db.js';
import { generateId, ttlToExpires, isValidUrl } from '$lib/server/helpers.js';
import { fetchLinkMeta } from '$lib/server/link-meta.js';
import { checkRateLimit } from '$lib/server/rate-limit.js';
import bcrypt from 'bcryptjs';

export async function POST(event: RequestEvent) {
	const { request, getClientAddress } = event;
	checkRateLimit('upload', getClientAddress());
	let body: Record<string, string>;
	try {
		body = (await request.json()) as Record<string, string>;
	} catch {
		throw error(400, 'Invalid JSON.');
	}

	const { url, ttl, password } = body;

	if (typeof url !== 'string' || !isValidUrl(url)) {
		throw error(400, 'A valid http/https URL is required.');
	}

	const id = generateId();
	const passwordHash = password ? bcrypt.hashSync(String(password), 10) : null;
	const expiresAt = ttlToExpires(ttl);
	const now = Date.now();

	await dbInsertItem({
		id,
		type: 'link',
		filename: null,
		mimetype: null,
		size: null,
		language: null,
		url,
		blob_url: null,
		content: null,
		link_meta: null,
		password_hash: passwordHash,
		expires_at: expiresAt,
		created_at: now
	});

	// Fetch OG/Exa metadata asynchronously — do not block the response
	fetchLinkMeta(id, url).catch((err) => {
		console.error(`[link-meta] failed for ${id}:`, (err as Error).message);
	});

	return json({ id }, { status: 201 });
}
