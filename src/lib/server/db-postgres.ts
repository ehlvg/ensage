import type { DbItem } from './types.js';
import { createPool } from '@vercel/postgres';
import { env } from '$env/dynamic/private';

const connectionString = env.POSTGRES_URL ?? env.DATABASE_URL;
if (!connectionString) {
	throw new Error(
		'Postgres is enabled but no connection string was found. Set POSTGRES_URL (recommended) or DATABASE_URL.'
	);
}

const pool = createPool({ connectionString });

let initPromise: Promise<void> | null = null;

async function init(): Promise<void> {
	if (initPromise) return initPromise;
	initPromise = (async () => {
		await pool.sql`
      CREATE TABLE IF NOT EXISTS items (
        id            TEXT PRIMARY KEY,
        type          TEXT NOT NULL,
        filename      TEXT,
        mimetype      TEXT,
        size          INTEGER,
        language      TEXT,
        url           TEXT,
        blob_url      TEXT,
        content       TEXT,
        link_meta     TEXT,
        password_hash TEXT,
        expires_at    BIGINT,
        created_at    BIGINT NOT NULL
      );
    `;
		await pool.sql`CREATE INDEX IF NOT EXISTS items_expires_at_idx ON items (expires_at);`;
	})();
	return initPromise;
}

function normalize(row: Record<string, unknown>): DbItem {
	const expiresRaw = row.expires_at as unknown;
	const createdRaw = row.created_at as unknown;
	const sizeRaw = row.size as unknown;
	return {
		id: String(row.id),
		type: row.type as DbItem['type'],
		filename: (row.filename as string | null) ?? null,
		mimetype: (row.mimetype as string | null) ?? null,
		size: sizeRaw === null || sizeRaw === undefined ? null : Number(sizeRaw),
		language: (row.language as string | null) ?? null,
		url: (row.url as string | null) ?? null,
		blob_url: (row.blob_url as string | null) ?? null,
		content: (row.content as string | null) ?? null,
		link_meta: (row.link_meta as string | null) ?? null,
		password_hash: (row.password_hash as string | null) ?? null,
		expires_at: expiresRaw === null || expiresRaw === undefined ? null : Number(expiresRaw),
		created_at: Number(createdRaw)
	};
}

export async function pgGetItem(id: string): Promise<DbItem | null> {
	await init();
	const { rows } = await pool.sql`SELECT * FROM items WHERE id = ${id} LIMIT 1;`;
	if (rows.length === 0) return null;
	return normalize(rows[0] as Record<string, unknown>);
}

export async function pgInsertItem(row: {
	id: string;
	type: DbItem['type'];
	filename: string | null;
	mimetype: string | null;
	size: number | null;
	language: string | null;
	url: string | null;
	blob_url: string | null;
	content: string | null;
	link_meta: string | null;
	password_hash: string | null;
	expires_at: number | null;
	created_at: number;
}): Promise<boolean> {
	await init();
	const { rowCount } = await pool.sql`
    INSERT INTO items (id, type, filename, mimetype, size, language, url, blob_url, content, link_meta, password_hash, expires_at, created_at)
    VALUES (${row.id}, ${row.type}, ${row.filename}, ${row.mimetype}, ${row.size}, ${row.language}, ${row.url}, ${row.blob_url}, ${row.content}, ${row.link_meta}, ${row.password_hash}, ${row.expires_at}, ${row.created_at})
    ON CONFLICT (id) DO NOTHING;
  `;
	return rowCount === 1;
}

export async function pgDeleteItem(id: string): Promise<void> {
	await init();
	await pool.sql`DELETE FROM items WHERE id = ${id};`;
}

export async function pgUpdateLinkMeta(id: string, linkMetaJson: string): Promise<void> {
	await init();
	await pool.sql`UPDATE items SET link_meta = ${linkMetaJson} WHERE id = ${id};`;
}

export async function pgSetBlobUrl(
	id: string,
	blobUrl: string,
	mimetype: string | null,
	size: number | null
): Promise<void> {
	await init();
	await pool.sql`
    UPDATE items
    SET blob_url = ${blobUrl},
        mimetype = COALESCE(${mimetype}, mimetype),
        size = COALESCE(${size}, size)
    WHERE id = ${id};
  `;
}

export async function pgListExpired(
	now: number
): Promise<Pick<DbItem, 'id' | 'type' | 'blob_url'>[]> {
	await init();
	const { rows } = await pool.sql<{
		id: string;
		type: DbItem['type'];
		blob_url: string | null;
	}>`SELECT id, type, blob_url FROM items WHERE expires_at IS NOT NULL AND expires_at < ${now};`;
	return rows.map((r) => ({ id: r.id, type: r.type, blob_url: r.blob_url }));
}

export async function pgDeleteExpired(now: number): Promise<number> {
	await init();
	const { rowCount } = await pool.sql`
    DELETE FROM items
    WHERE expires_at IS NOT NULL AND expires_at < ${now};
  `;
	return rowCount ?? 0;
}
