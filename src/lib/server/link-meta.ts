import { config } from './config.js';
import { stmtUpdateMeta } from './db.js';
import type { LinkMeta } from './types.js';
import net from 'node:net';

const FETCH_TIMEOUT_MS = 8_000;

function isPrivateOrLocalAddress(target: URL): boolean {
	const host = target.hostname.toLowerCase();

	// Obvious local hostnames
	if (host === 'localhost' || host === '127.0.0.1') return true;

	const ipVersion = net.isIP(host);

	// IPv4 private / link-local ranges
	if (ipVersion === 4) {
		const [a, b] = host.split('.').map((x) => Number.parseInt(x, 10));
		if (Number.isNaN(a) || Number.isNaN(b)) return false;

		// 10.0.0.0/8
		if (a === 10) return true;
		// 172.16.0.0/12
		if (a === 172 && b >= 16 && b <= 31) return true;
		// 192.168.0.0/16
		if (a === 192 && b === 168) return true;
		// 127.0.0.0/8
		if (a === 127) return true;
		// 169.254.0.0/16 (link-local)
		if (a === 169 && b === 254) return true;
	}

	// IPv6 loopback and local / unique-local ranges
	if (ipVersion === 6) {
		const normalized = host.replace(/^\[|\]$/g, '').toLowerCase();
		if (normalized === '::1') return true;
		if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // fc00::/7
		if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
			return true; // fe80::/10 link-local
		}
	}

	return false;
}

/** Decode common HTML entities */
function decode(str: string): string {
	return str
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'");
}

function extractOg(html: string, property: string): string | null {
	const propRe = new RegExp(
		`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
		'i'
	);
	const contentRe = new RegExp(
		`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
		'i'
	);
	const m = html.match(propRe) ?? html.match(contentRe);
	return m ? decode(m[1]) : null;
}

function extractMeta(html: string, name: string): string | null {
	const nameRe = new RegExp(
		`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
		'i'
	);
	const contentRe = new RegExp(
		`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`,
		'i'
	);
	const m = html.match(nameRe) ?? html.match(contentRe);
	return m ? decode(m[1]) : null;
}

function extractTag(html: string, tag: string): string | null {
	const m = html.match(new RegExp(`<${tag}[^>]*>([^<]+)<\\/${tag}>`, 'i'));
	return m ? decode(m[1].trim()) : null;
}

function extractFavicon(html: string, pageUrl: string): string | null {
	const m =
		html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i) ??
		html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i);
	if (!m) return null;
	try {
		return new URL(m[1], pageUrl).href;
	} catch {
		return null;
	}
}

/** Fetch OG metadata and optional Exa AI summary, then persist to DB */
export async function fetchLinkMeta(itemId: string, url: string): Promise<void> {
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
	} catch {
		// Malformed URL – nothing to do
		return;
	}

	// Basic SSRF protection: skip private, loopback and link-local addresses
	if (isPrivateOrLocalAddress(parsedUrl)) {
		return;
	}

	const meta: LinkMeta = {
		url,
		title: null,
		description: null,
		image: null,
		summary: null,
		favicon: null
	};

	// 1. Fetch OG tags from the target page
	try {
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
		const pageRes = await fetch(parsedUrl.href, {
			signal: ctrl.signal,
			headers: { 'User-Agent': 'ensage-bot/1.0 (link preview)' }
		});
		clearTimeout(timer);

		if (pageRes.ok) {
			const html = await pageRes.text();
			meta.title = extractOg(html, 'og:title') ?? extractTag(html, 'title') ?? null;
			meta.description =
				extractOg(html, 'og:description') ?? extractMeta(html, 'description') ?? null;
			meta.image = extractOg(html, 'og:image') ?? null;
			meta.favicon = extractFavicon(html, url) ?? null;
		}
	} catch {
		// Network error or timeout — proceed with nulls
	}

	// 2. Optional Exa AI summary
	if (config.exaApiKey) {
		try {
			const exaRes = await fetch('https://api.exa.ai/contents', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': config.exaApiKey
				},
				body: JSON.stringify({
					ids: [url],
					text: { maxCharacters: 1200 },
					summary: { query: 'Summarize this page briefly in 2-3 sentences.' }
				})
			});
			if (exaRes.ok) {
				const exaData = (await exaRes.json()) as { results?: { summary?: string }[] };
				const summary = exaData?.results?.[0]?.summary;
				if (summary) meta.summary = summary;
			}
		} catch {
			// Exa unavailable — ignore
		}
	}

	stmtUpdateMeta.run(JSON.stringify(meta), itemId);
}
