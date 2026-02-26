import type { DbItem, LinkMeta } from './types.js';
import { isVercel, hasPostgres } from './runtime.js';

type InsertRow = {
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
};

type Driver = {
	getItem: (id: string) => Promise<DbItem | null>;
	insertItem: (row: InsertRow) => Promise<boolean | void>;
	deleteItem: (id: string) => Promise<void>;
	updateLinkMeta: (id: string, linkMetaJson: string) => Promise<void>;
	setBlobUrl?: (
		id: string,
		blobUrl: string,
		mimetype: string | null,
		size: number | null
	) => Promise<void>;
	listExpired: (now: number) => Promise<Pick<DbItem, 'id' | 'type' | 'blob_url'>[]>;
	deleteExpired: (now: number) => Promise<number>;
};

let driverPromise: Promise<Driver> | null = null;

async function getDriver(): Promise<Driver> {
	if (driverPromise) return driverPromise;
	driverPromise = (async () => {
		if (isVercel || hasPostgres) {
			const m = await import('./db-postgres.js');
			return {
				getItem: m.pgGetItem,
				insertItem: m.pgInsertItem,
				deleteItem: m.pgDeleteItem,
				updateLinkMeta: m.pgUpdateLinkMeta,
				setBlobUrl: m.pgSetBlobUrl,
				listExpired: m.pgListExpired,
				deleteExpired: m.pgDeleteExpired
			} satisfies Driver;
		}
		const m = await import('./db-sqlite.js');
		return {
			getItem: m.sqliteGetItem,
			insertItem: async (row: InsertRow) => {
				// sqlite schema does not store blob_url/content columns; ignore them.
				await m.sqliteInsertItem({
					id: row.id,
					type: row.type,
					filename: row.filename,
					mimetype: row.mimetype,
					size: row.size,
					language: row.language,
					url: row.url,
					link_meta: row.link_meta,
					password_hash: row.password_hash,
					expires_at: row.expires_at,
					created_at: row.created_at
				});
			},
			deleteItem: m.sqliteDeleteItem,
			updateLinkMeta: m.sqliteUpdateLinkMeta,
			listExpired: async (now: number) => {
				const rows = await m.sqliteListExpired(now);
				return rows.map((r) => ({ ...r, blob_url: null }));
			},
			deleteExpired: m.sqliteDeleteExpired
		} satisfies Driver;
	})();
	return driverPromise;
}

export async function dbGetItem(id: string): Promise<DbItem | null> {
	return (await getDriver()).getItem(id);
}

export async function dbInsertItem(row: InsertRow): Promise<boolean> {
	const res = await (await getDriver()).insertItem(row);
	return typeof res === 'boolean' ? res : true;
}

export async function dbDeleteItem(id: string): Promise<void> {
	return (await getDriver()).deleteItem(id);
}

export async function dbUpdateLinkMeta(id: string, linkMetaJson: string): Promise<void> {
	return (await getDriver()).updateLinkMeta(id, linkMetaJson);
}

export async function dbSetBlobUrl(
	id: string,
	blobUrl: string,
	mimetype: string | null,
	size: number | null
): Promise<void> {
	const d = await getDriver();
	if (!d.setBlobUrl) return;
	return d.setBlobUrl(id, blobUrl, mimetype, size);
}

export async function dbListExpired(
	now: number
): Promise<Pick<DbItem, 'id' | 'type' | 'blob_url'>[]> {
	return (await getDriver()).listExpired(now);
}

export async function dbDeleteExpired(now: number): Promise<number> {
	return (await getDriver()).deleteExpired(now);
}

// ── Helper: map raw DB row to a typed public response ────────────────────────

export function publicItem(row: DbItem) {
	let linkMeta: LinkMeta | null = null;
	if (row.link_meta) {
		try {
			linkMeta = JSON.parse(row.link_meta) as LinkMeta;
		} catch {
			// Corrupt JSON — ignore
		}
	}
	return {
		id: row.id,
		type: row.type,
		filename: row.filename,
		mimetype: row.mimetype,
		size: row.size,
		language: row.language,
		url: row.url,
		link_meta: linkMeta,
		protected: Boolean(row.password_hash),
		expires_at: row.expires_at,
		created_at: row.created_at
	};
}
