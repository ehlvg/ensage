import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';
import type { DbItem } from './types.js';

// Ensure directories exist before opening the database
fs.mkdirSync(config.uploadDir, { recursive: true });
fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new DatabaseSync(config.dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id            TEXT PRIMARY KEY,
    type          TEXT NOT NULL,
    filename      TEXT,
    mimetype      TEXT,
    size          INTEGER,
    language      TEXT,
    url           TEXT,
    password_hash TEXT,
    expires_at    INTEGER,
    created_at    INTEGER NOT NULL
  );
`);

// Schema migrations — safe to run on every startup
for (const col of ['url TEXT', 'link_meta TEXT']) {
	try {
		db.exec(`ALTER TABLE items ADD COLUMN ${col};`);
	} catch {
		// Column already exists — expected after first run
	}
}

export async function sqliteGetItem(id: string): Promise<DbItem | null> {
	const stmtGet = db.prepare('SELECT * FROM items WHERE id = ?') as {
		get: (id: string) => DbItem | undefined;
	};
	return stmtGet.get(id) ?? null;
}

export async function sqliteInsertItem(row: {
	id: string;
	type: DbItem['type'];
	filename: string | null;
	mimetype: string | null;
	size: number | null;
	language: string | null;
	url: string | null;
	link_meta: string | null;
	password_hash: string | null;
	expires_at: number | null;
	created_at: number;
}): Promise<void> {
	const stmtInsert = db.prepare(`
    INSERT INTO items (id, type, filename, mimetype, size, language, url, link_meta, password_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
	stmtInsert.run(
		row.id,
		row.type,
		row.filename,
		row.mimetype,
		row.size,
		row.language,
		row.url,
		row.link_meta,
		row.password_hash,
		row.expires_at,
		row.created_at
	);
}

export async function sqliteDeleteItem(id: string): Promise<void> {
	const stmtDelete = db.prepare('DELETE FROM items WHERE id = ?');
	stmtDelete.run(id);
}

export async function sqliteUpdateLinkMeta(id: string, linkMetaJson: string): Promise<void> {
	const stmtUpdateMeta = db.prepare('UPDATE items SET link_meta = ? WHERE id = ?');
	stmtUpdateMeta.run(linkMetaJson, id);
}

export async function sqliteListExpired(now: number): Promise<Pick<DbItem, 'id' | 'type'>[]> {
	const stmtExpired = db.prepare(
		'SELECT id, type FROM items WHERE expires_at IS NOT NULL AND expires_at < ?'
	) as unknown as { all: (now: number) => Pick<DbItem, 'id' | 'type'>[] };
	return stmtExpired.all(now);
}

export async function sqliteDeleteExpired(now: number): Promise<number> {
	const stmtDeleteExpired = db.prepare(
		'DELETE FROM items WHERE expires_at IS NOT NULL AND expires_at < ?'
	) as unknown as { run: (now: number) => { changes: number } };
	return stmtDeleteExpired.run(now).changes;
}
