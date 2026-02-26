import { json, error, type RequestEvent } from '@sveltejs/kit';
import { stmtGet, stmtDelete, publicItem } from '$lib/server/db.js';
import { validateToken, makeToken, itemFilePath } from '$lib/server/helpers.js';
import { checkRateLimit } from '$lib/server/rate-limit.js';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';

/** GET /api/item/:id — public metadata */
export async function GET(event: RequestEvent) {
	const { params, getClientAddress } = event;
	const ip = getClientAddress?.() ?? '';
	checkRateLimit('read', ip);

	const row = stmtGet.get(params.id!);
	if (!row) throw error(404, 'Not found.');
	if (row.expires_at && row.expires_at < Date.now()) throw error(410, 'This item has expired.');
	return json(publicItem(row));
}

/** POST /api/item/:id/verify is handled in a sub-route */

/** DELETE /api/item/:id */
export async function DELETE(event: RequestEvent) {
	const { params, request, getClientAddress } = event;
	const ip = getClientAddress?.() ?? '';
	checkRateLimit('auth', ip);

	const row = stmtGet.get(params.id!);
	if (!row) throw error(404, 'Not found.');
	if (row.expires_at && row.expires_at < Date.now()) throw error(410, 'This item has expired.');

	if (row.password_hash) {
		const token =
			request.headers.get('x-access-token') ??
			new URL(request.url).searchParams.get('token') ??
			'';
		if (!token) throw error(401, 'Password required.');
		if (!validateToken(token, row.id)) throw error(403, 'Invalid token.');
	}

	if (row.type !== 'link') {
		try {
			fs.unlinkSync(itemFilePath(row.id));
		} catch {
			// Already deleted — no-op
		}
	}

	stmtDelete.run(row.id);
	return json({ ok: true });
}
