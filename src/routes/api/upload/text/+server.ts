import fs from 'node:fs';
import { json, error, type RequestEvent } from '@sveltejs/kit';
import { config } from '$lib/server/config.js';
import { dbInsertItem } from '$lib/server/db.js';
import { generateId, itemFilePath, ttlToExpires } from '$lib/server/helpers.js';
import { checkRateLimit } from '$lib/server/rate-limit.js';
import { uploadMode } from '$lib/server/runtime.js';
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

	const { content, language, ttl, password } = body;

	if (typeof content !== 'string' || content.length === 0) {
		throw error(400, 'Content is required.');
	}
	if (Buffer.byteLength(content, 'utf8') > config.maxTextSize) {
		throw error(413, 'Text too large (max 5 MB).');
	}

	const id = generateId();
	const passwordHash = password ? bcrypt.hashSync(String(password), 10) : null;
	const expiresAt = ttlToExpires(ttl);
	const now = Date.now();

	if (uploadMode === 'local') {
		fs.writeFileSync(itemFilePath(id), content, 'utf8');
	}

	await dbInsertItem({
		id,
		type: 'text',
		filename: null,
		mimetype: 'text/plain',
		size: Buffer.byteLength(content, 'utf8'),
		language: language ?? 'auto',
		url: null,
		blob_url: null,
		content: uploadMode === 'blob' ? content : null,
		link_meta: null,
		password_hash: passwordHash,
		expires_at: expiresAt,
		created_at: now
	});

	return json({ id }, { status: 201 });
}
