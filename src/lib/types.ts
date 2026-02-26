export interface LinkMeta {
	url: string;
	title: string | null;
	description: string | null;
	image: string | null;
	summary: string | null;
	favicon: string | null;
}

export interface ItemMeta {
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
