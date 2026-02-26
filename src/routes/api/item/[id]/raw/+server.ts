import fs from 'node:fs';
import { Readable } from 'node:stream';
import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { stmtGet } from '$lib/server/db.js';
import { validateToken, itemFilePath, contentDisposition } from '$lib/server/helpers.js';
import { SAFE_INLINE_TYPES } from '$lib/server/config.js';
import { checkRateLimit } from '$lib/server/rate-limit.js';

export async function GET(event: RequestEvent) {
	const { params, request, url, getClientAddress } = event;
	const ip = getClientAddress?.() ?? '';
	checkRateLimit('read', ip);
	const row = stmtGet.get(params.id!);
	if (!row) throw error(404, 'Not found.');
	if (row.expires_at && row.expires_at < Date.now()) throw error(410, 'This item has expired.');

	if (row.password_hash) {
		const token =
			request.headers.get('x-access-token') ?? url.searchParams.get('token') ?? '';
		if (!token) throw error(401, 'Password required.');
		if (!validateToken(token, row.id)) throw error(403, 'Invalid token.');
	}

	if (row.type === 'link') {
		throw redirect(302, row.url!);
	}

	const filePath = itemFilePath(row.id);
	if (!fs.existsSync(filePath)) throw error(404, 'File not found on disk.');

	const mime = row.mimetype ?? 'application/octet-stream';
	const isInline = SAFE_INLINE_TYPES.has(mime) && row.type === 'file';
	const dispName = row.filename ?? row.id;

	const contentType = row.type === 'text' ? 'text/plain; charset=utf-8' : mime;
	const disposition = contentDisposition(isInline ? 'inline' : 'attachment', dispName);

	// Use Readable.toWeb() — properly handles backpressure and avoids
	// the "Controller is already closed" race condition of manual enqueue.
	const nodeStream = fs.createReadStream(filePath);
	const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

	return new Response(webStream, {
		headers: {
			'Content-Type': contentType,
			'Content-Disposition': disposition,
			'X-Content-Type-Options': 'nosniff'
		}
	});
}
