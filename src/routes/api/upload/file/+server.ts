import fs from 'node:fs';
import { json, error, type RequestEvent } from '@sveltejs/kit';
import { config } from '$lib/server/config.js';
import { stmtInsert } from '$lib/server/db.js';
import { generateId, sanitizeFilename, itemFilePath, ttlToExpires } from '$lib/server/helpers.js';
import { checkRateLimit } from '$lib/server/rate-limit.js';
import bcrypt from 'bcryptjs';

export async function POST(event: RequestEvent) {
	const { request, getClientAddress } = event;
	checkRateLimit('upload', getClientAddress());

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		throw error(400, 'Invalid form data.');
	}

	const file = formData.get('file');
	if (!(file instanceof File)) {
		throw error(400, 'File is required.');
	}

	if (file.size > config.maxFileSize) {
		throw error(413, `File too large (max ${Math.round(config.maxFileSize / 1_048_576)} MB).`);
	}

	const ttl = (formData.get('ttl') as string | null) ?? 'never';
	const password = (formData.get('password') as string | null) ?? '';

	const id = generateId();
	const originalName = sanitizeFilename(file.name || 'file');
	const mimetype = file.type || 'application/octet-stream';
	const finalPath = itemFilePath(id);

	const arrayBuffer = await file.arrayBuffer();
	fs.writeFileSync(finalPath, Buffer.from(arrayBuffer));

	const passwordHash = password ? bcrypt.hashSync(password, 10) : null;
	const expiresAt = ttlToExpires(ttl);
	const now = Date.now();

	stmtInsert.run(id, 'file', originalName, mimetype, file.size, null, null, null, passwordHash, expiresAt, now);

	return json({ id }, { status: 201 });
}
