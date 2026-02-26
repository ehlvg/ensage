export interface DbItem {
	id: string;
	type: 'text' | 'file' | 'link';
	filename: string | null;
	mimetype: string | null;
	size: number | null;
	language: string | null;
	url: string | null;
	/** For Vercel Blob-backed content (files; optionally text) */
	blob_url?: string | null;
	/** For DB-backed text content (used on serverless platforms) */
	content?: string | null;
	link_meta: string | null;
	password_hash: string | null;
	expires_at: number | null;
	created_at: number;
}

export interface LinkMeta {
	url: string;
	title: string | null;
	description: string | null;
	image: string | null;
	summary: string | null;
	favicon: string | null;
}

export interface PublicItem {
	id: string;
	type: 'text' | 'file' | 'link';
	filename: string | null;
	mimetype: string | null;
	size: number | null;
	language: string | null;
	url: string | null;
	link_meta: LinkMeta | null;
	protected: boolean;
	expires_at: number | null;
	created_at: number;
}

export type TtlValue = '1h' | '24h' | '7d' | 'never' | string;
