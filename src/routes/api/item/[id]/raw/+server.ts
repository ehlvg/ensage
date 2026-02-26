import fs from 'node:fs';
import { Readable } from 'node:stream';
import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { dbGetItem } from '$lib/server/db.js';
import { validateToken, itemFilePath, contentDisposition } from '$lib/server/helpers.js';
import { SAFE_INLINE_TYPES } from '$lib/server/config.js';
import { checkRateLimit } from '$lib/server/rate-limit.js';
import { get as blobGet } from '@vercel/blob';

export async function GET(event: RequestEvent) {
	const { params, request, url, getClientAddress } = event;
	const ip = getClientAddress?.() ?? '';
	checkRateLimit('read', ip);
	const row = await dbGetItem(params.id!);
	if (!row) throw error(404, 'Not found.');
	if (row.expires_at && row.expires_at < Date.now()) throw error(410, 'This item has expired.');

	if (row.password_hash) {
		const token = request.headers.get('x-access-token') ?? url.searchParams.get('token') ?? '';
		if (!token) throw error(401, 'Password required.');
		if (!validateToken(token, row.id)) throw error(403, 'Invalid token.');
	}

	if (row.type === 'link') {
		throw redirect(302, row.url!);
	}

	if (row.type === 'text' && row.content != null) {
		const contentType = 'text/plain; charset=utf-8';
		const disposition = contentDisposition('inline', row.filename ?? `${row.id}.txt`);
		return new Response(row.content, {
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': disposition,
				'X-Content-Type-Options': 'nosniff'
			}
		});
	}

	const mime = row.mimetype ?? 'application/octet-stream';
	const isInline = SAFE_INLINE_TYPES.has(mime) && row.type === 'file';
	const dispName = row.filename ?? row.id;

	const contentType = row.type === 'text' ? 'text/plain; charset=utf-8' : mime;
	const disposition = contentDisposition(isInline ? 'inline' : 'attachment', dispName);

	let webStream: ReadableStream<Uint8Array>;
	if (row.blob_url) {
		const blob = await blobGet(row.blob_url, { access: 'private' });
		if (!blob?.stream) throw error(404, 'File not found in blob storage.');
		webStream = blob.stream as ReadableStream<Uint8Array>;
	} else {
		const filePath = itemFilePath(row.id);
		if (!fs.existsSync(filePath)) throw error(404, 'File not found on disk.');
		// Use Readable.toWeb() — properly handles backpressure and avoids
		// the "Controller is already closed" race condition of manual enqueue.
		const nodeStream = fs.createReadStream(filePath);
		webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
	}

	return new Response(webStream, {
		headers: {
			'Content-Type': contentType,
			'Content-Disposition': disposition,
			'X-Content-Type-Options': 'nosniff'
		}
	});
}
