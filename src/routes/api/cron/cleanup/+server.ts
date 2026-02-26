import { json, error, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { runCleanupOnce } from '$lib/server/cleanup.js';

export async function GET(event: RequestEvent) {
	const secret = env.CRON_SECRET;
	if (secret) {
		const auth = event.request.headers.get('authorization') ?? '';
		if (auth !== `Bearer ${secret}`) throw error(401, 'Unauthorized.');
	}

	const removed = await runCleanupOnce();
	return json({ ok: true, removed });
}
