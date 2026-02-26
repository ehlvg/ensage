import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import type { DbItem, LinkMeta } from './types.js';

// Ensure directories exist before opening the database
fs.mkdirSync(config.uploadDir, { recursive: true });
fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);

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

// ── Prepared statements ──────────────────────────────────────────────────────

export const stmtInsert = db.prepare(`
  INSERT INTO items (id, type, filename, mimetype, size, language, url, link_meta, password_hash, expires_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

export const stmtGet = db.prepare('SELECT * FROM items WHERE id = ?') as {
	get: (id: string) => DbItem | undefined;
};

export const stmtDelete = db.prepare('DELETE FROM items WHERE id = ?');

export const stmtExpired = db.prepare(
	'SELECT id, type FROM items WHERE expires_at IS NOT NULL AND expires_at < ?'
) as unknown as { all: (now: number) => Pick<DbItem, 'id' | 'type'>[] };

export const stmtDeleteExpired = db.prepare(
	'DELETE FROM items WHERE expires_at IS NOT NULL AND expires_at < ?'
) as unknown as { run: (now: number) => { changes: number } };

export const stmtUpdateMeta = db.prepare('UPDATE items SET link_meta = ? WHERE id = ?');

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
