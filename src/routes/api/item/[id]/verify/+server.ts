import { json, error, type RequestEvent } from '@sveltejs/kit';
import { stmtGet } from '$lib/server/db.js';
import { makeToken } from '$lib/server/helpers.js';
import { checkRateLimit } from '$lib/server/rate-limit.js';
import bcrypt from 'bcryptjs';

export async function POST(event: RequestEvent) {
	const { params, request, getClientAddress } = event;
	const ip = getClientAddress?.() ?? '';
	checkRateLimit('auth', ip);
	const row = stmtGet.get(params.id!);
	if (!row) throw error(404, 'Not found.');
	if (row.expires_at && row.expires_at < Date.now()) throw error(410, 'Expired.');

	if (!row.password_hash) {
		return json({ ok: true });
	}

	let body: Record<string, string>;
	try {
		body = (await request.json()) as Record<string, string>;
	} catch {
		throw error(400, 'Invalid JSON.');
	}

	const { password } = body;
	if (!password) throw error(401, 'Password required.');

	if (!bcrypt.compareSync(String(password), row.password_hash)) {
		throw error(403, 'Wrong password.');
	}

	const token = makeToken(row.id, Math.floor(Date.now() / 3_600_000));
	return json({ ok: true, token });
}
