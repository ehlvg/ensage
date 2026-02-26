import { json, error, type RequestEvent } from '@sveltejs/kit';
import { config } from '$lib/server/config.js';
import { dbInsertItem } from '$lib/server/db.js';
import { generateId, sanitizeFilename, ttlToExpires } from '$lib/server/helpers.js';
import { checkRateLimit } from '$lib/server/rate-limit.js';
import { uploadMode } from '$lib/server/runtime.js';
import bcrypt from 'bcryptjs';

export async function POST(event: RequestEvent) {
	const { request, getClientAddress } = event;
	checkRateLimit('upload', getClientAddress());

	if (uploadMode !== 'blob') {
		throw error(400, 'Client upload init is only available in blob mode.');
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		throw error(400, 'Invalid JSON.');
	}

	const filenameRaw = body.filename;
	const mimetypeRaw = body.mimetype;
	const sizeRaw = body.size;
	const ttlRaw = body.ttl;
	const passwordRaw = body.password;

	const size = typeof sizeRaw === 'number' ? sizeRaw : Number(sizeRaw);
	if (!Number.isFinite(size) || size <= 0) throw error(400, 'Invalid file size.');
	if (size > config.maxFileSize) {
		throw error(413, `File too large (max ${Math.round(config.maxFileSize / 1_048_576)} MB).`);
	}

	const originalName = sanitizeFilename(
		typeof filenameRaw === 'string' && filenameRaw.trim() ? filenameRaw : 'file'
	);
	const mimetype =
		typeof mimetypeRaw === 'string' && mimetypeRaw ? mimetypeRaw : 'application/octet-stream';
	const ttl = typeof ttlRaw === 'string' ? ttlRaw : 'never';
	const password = typeof passwordRaw === 'string' ? passwordRaw : '';

	const expiresAt = ttlToExpires(ttl);
	const now = Date.now();

	// Very low collision probability; retry on the off chance an id already exists.
	for (let i = 0; i < 5; i++) {
		const id = generateId();
		const inserted = await dbInsertItem({
			id,
			type: 'file',
			filename: originalName,
			mimetype,
			size,
			language: null,
			url: null,
			blob_url: null,
			content: null,
			link_meta: null,
			password_hash: password ? bcrypt.hashSync(password, 10) : null,
			expires_at: expiresAt,
			created_at: now
		});
		if (inserted) return json({ id, pathname: `items/${id}` }, { status: 201 });
	}

	throw error(500, 'Could not allocate an id.');
}
