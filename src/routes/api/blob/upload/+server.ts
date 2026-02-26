import { json, error, type RequestEvent } from '@sveltejs/kit';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { checkRateLimit } from '$lib/server/rate-limit.js';
import { dbSetBlobUrl } from '$lib/server/db.js';
import { uploadMode } from '$lib/server/runtime.js';

export async function POST(event: RequestEvent) {
	const { request, getClientAddress } = event;
	checkRateLimit('upload', getClientAddress());

	if (uploadMode !== 'blob') {
		throw error(400, 'Blob uploads are not enabled.');
	}

	const body = (await request.json()) as HandleUploadBody;

	try {
		const result = await handleUpload({
			body,
			request,
			onBeforeGenerateToken: async (pathname, clientPayload) => {
				// We expect the pathname created by the init route: items/<id>
				if (!pathname.startsWith('items/')) throw new Error('Invalid upload path.');
				const id = pathname.slice('items/'.length);
				if (!id) throw new Error('Missing item id.');

				if (typeof clientPayload === 'string' && clientPayload) {
					try {
						const parsed = JSON.parse(clientPayload) as { id?: string };
						if (parsed.id && String(parsed.id) !== id) throw new Error('Mismatched item id.');
					} catch {
						// ignore invalid payload
					}
				}

				return {
					addRandomSuffix: false,
					tokenPayload: JSON.stringify({ id })
				};
			},
			onUploadCompleted: async ({ blob, tokenPayload }) => {
				const parsed = JSON.parse(String(tokenPayload || '{}')) as { id?: string };
				const id = parsed.id;
				if (!id) throw new Error('Missing token payload id.');
				await dbSetBlobUrl(id, blob.url, blob.contentType ?? null, null);
			}
		});

		return json(result);
	} catch (err) {
		const message = (err as Error).message || 'Upload failed.';
		// The callback retries waiting for a 200; return 400 for token generation errors
		return json({ error: message }, { status: 400 });
	}
}
