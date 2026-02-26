<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { formatBytes, formatRelative } from '$lib/utils.js';
	import type { ItemMeta } from '$lib/types.js';


	// ── State ──────────────────────────────────────────────────────────────
	type PageState = 'loading' | 'password' | 'error' | 'content';
	let pageState = $state<PageState>('loading');

	let errorMsg = $state('Item not found.');
	let meta = $state<ItemMeta | null>(null);
	let rawText = $state<string | null>(null);
	let token = $state('');
	let passwordInput = $state('');
	let passwordError = $state('');
	let passwordSubmitting = $state(false);

	let itemId = $state('');
	let sessionKey = '';

	// Code block element ref
	let codeEl = $state<HTMLElement | null>(null);

	// ── Highlight.js theme sync ────────────────────────────────────────────
	function applyHljsTheme() {
		const lightLink = document.getElementById('hljs-theme-light') as HTMLLinkElement | null;
		const darkLink = document.getElementById('hljs-theme-dark') as HTMLLinkElement | null;
		if (!lightLink || !darkLink) return;
		const stored = document.documentElement.getAttribute('data-theme');
		const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const isDark = stored === 'dark' || (!stored && sysDark);
		lightLink.disabled = isDark;
		darkLink.disabled = !isDark;
	}

	// ── Load item ──────────────────────────────────────────────────────────
	async function loadItem(accessToken: string) {
		pageState = 'loading';
		try {
			const metaRes = await fetch(`/api/item/${itemId}`);
			if (!metaRes.ok) {
				const d = (await metaRes.json().catch(() => ({}))) as { message?: string };
				errorMsg = d.message ?? 'Item not found.';
				pageState = 'error';
				return;
			}
			meta = (await metaRes.json()) as ItemMeta;

			document.title = `${meta.type === 'link' ? (meta.url ?? itemId) : (meta.filename ?? itemId)} — ensage`;

			if (meta.protected && !accessToken) {
				pageState = 'password';
				return;
			}

			token = accessToken;

			if (meta.type === 'text') {
				const rawUrl = `/api/item/${itemId}/raw${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''}`;
				const rawRes = await fetch(rawUrl);
				rawText = await rawRes.text();
			}

			pageState = 'content';
		} catch {
			errorMsg = 'Failed to load item.';
			pageState = 'error';
		}
	}

	// Apply highlight.js after code renders
	$effect(() => {
		if (pageState === 'content' && meta?.type === 'text' && codeEl && rawText !== null) {
			const el = codeEl;
			el.textContent = rawText;
			const lang = meta.language;
			import('highlight.js').then((mod) => {
				const lib = mod.default;
				if (lang && lang !== 'auto' && lang !== 'plaintext') {
					el.className = `language-${lang}`;
					lib.highlightElement(el);
				} else if (lang === 'auto') {
					lib.highlightElement(el);
				}
			});
		}
	});

	// ── Password submit ────────────────────────────────────────────────────
	async function submitPassword() {
		if (!passwordInput) return;
		passwordSubmitting = true;
		passwordError = '';
		try {
			const res = await fetch(`/api/item/${itemId}/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: passwordInput })
			});
			const data = (await res.json()) as { ok?: boolean; token?: string; message?: string };
			if (!res.ok) {
				passwordError = data.message ?? 'Wrong password.';
				return;
			}
			const newToken = data.token ?? '';
			sessionStorage.setItem(sessionKey, newToken);
			await loadItem(newToken);
		} catch {
			passwordError = 'Network error.';
		} finally {
			passwordSubmitting = false;
		}
	}

	// ── Delete ─────────────────────────────────────────────────────────────
	async function deleteItem() {
		if (!confirm('Delete this item permanently?')) return;
		const headers: Record<string, string> = {};
		if (token) headers['x-access-token'] = token;
		const r = await fetch(`/api/item/${itemId}`, { method: 'DELETE', headers });
		if (r.ok) {
			sessionStorage.removeItem(sessionKey);
			window.location.href = '/';
		} else {
			const d = (await r.json().catch(() => ({}))) as { message?: string };
			alert(d.message ?? 'Delete failed.');
		}
	}

	// ── Copy helpers ───────────────────────────────────────────────────────
	let copyTextLabel = $state('Copy');
	async function copyText() {
		if (!rawText) return;
		await navigator.clipboard.writeText(rawText);
		copyTextLabel = 'Copied!';
		setTimeout(() => { copyTextLabel = 'Copy'; }, 1500);
	}

	let copyLinkLabel = $state('Copy URL');
	async function copyLinkUrl() {
		if (!meta?.url) return;
		await navigator.clipboard.writeText(meta.url);
		copyLinkLabel = 'Copied!';
		setTimeout(() => { copyLinkLabel = 'Copy URL'; }, 1500);
	}

	// ── Link metadata polling ──────────────────────────────────────────────
	let linkMetaLoading = $state(false);

	$effect(() => {
		if (pageState === 'content' && meta?.type === 'link' && !meta.link_meta) {
			linkMetaLoading = true;
			setTimeout(async () => {
				try {
					const r = await fetch(`/api/item/${itemId}`);
					const updated = (await r.json()) as ItemMeta;
					if (updated.link_meta && meta) {
						meta = { ...meta, link_meta: updated.link_meta };
					}
				} catch {
					/* ignore */
				} finally {
					linkMetaLoading = false;
				}
			}, 3000);
		}
	});

	// ── Bootstrap ─────────────────────────────────────────────────────────
	onMount(() => {
		itemId = window.location.pathname.replace(/^\//, '');
		sessionKey = `ensage-token-${itemId}`;

		applyHljsTheme();
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyHljsTheme);

		const storedToken = sessionStorage.getItem(sessionKey) ?? '';
		loadItem(storedToken);
	});

	function rawUrl() {
		return `/api/item/${itemId}/raw${token ? `?token=${encodeURIComponent(token)}` : ''}`;
	}

	function getDomain(url: string) {
		try { return new URL(url).hostname; } catch { return ''; }
	}
</script>

<svelte:head>
	<link
		id="hljs-theme-light"
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css"
	/>
	<link
		id="hljs-theme-dark"
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
	/>
</svelte:head>

<Header />

<main class="view-main">
	{#if pageState === 'loading'}
		<p class="loading-text">Loading...</p>

	{:else if pageState === 'error'}
		<div class="notice error">{errorMsg}</div>

	{:else if pageState === 'password'}
		<div class="password-gate">
			<h2>Password required</h2>
			<p>This item is password-protected.</p>
			<div class="field">
				<label class="field-label" for="pw-input">Password</label>
				<input
					id="pw-input"
					type="password"
					bind:value={passwordInput}
					class="field-input"
					onkeydown={(e) => e.key === 'Enter' && submitPassword()}
				/>
			</div>
			{#if passwordError}
				<div class="notice error">{passwordError}</div>
			{/if}
			<button onclick={submitPassword} disabled={passwordSubmitting} class="btn btn-primary w-full">
				{passwordSubmitting ? 'Verifying...' : 'Unlock'}
			</button>
		</div>

	{:else if pageState === 'content' && meta}
		<!-- View header: meta + actions -->
		<div class="view-header">
			<div class="view-meta">
				{#if meta.type === 'file'}
					<span>{meta.filename ?? 'file'}</span>
					<span>{formatBytes(meta.size ?? 0)}</span>
					<span>{meta.mimetype ?? ''}</span>
				{:else if meta.type === 'link'}
					<span>link</span>
					<span class="view-meta-url">{meta.url ?? ''}</span>
				{:else}
					<span>text</span>
					{#if meta.language && meta.language !== 'auto'}
						<span>{meta.language}</span>
					{/if}
					<span>{formatBytes(meta.size ?? 0)}</span>
				{/if}
				{#if meta.expires_at}
					<span>expires {formatRelative(meta.expires_at)}</span>
				{/if}
			</div>

			<div class="view-actions">
				{#if meta.type === 'file'}
					<a href={rawUrl()} download={meta.filename ?? itemId} class="btn btn-primary">
						Download
					</a>
				{:else if meta.type === 'link'}
					<a
						href={meta.url ?? '#'}
						target="_blank"
						rel="noopener noreferrer"
						class="btn btn-primary"
					>
						Open link
					</a>
					<button onclick={copyLinkUrl} class="btn">{copyLinkLabel}</button>
				{:else}
					<a href={rawUrl()} target="_blank" class="btn">Raw</a>
					<button onclick={copyText} class="btn">{copyTextLabel}</button>
				{/if}
				<button onclick={deleteItem} class="btn btn-danger">Delete</button>
			</div>
		</div>

		<!-- ── Text content ────────────────────────────────────────────── -->
		{#if meta.type === 'text'}
			<div class="code-wrap">
				<pre><code bind:this={codeEl}></code></pre>
			</div>

		<!-- ── File preview ────────────────────────────────────────────── -->
		{:else if meta.type === 'file'}
			{@const mime = meta.mimetype ?? ''}
			<div class="file-preview">
				{#if mime.startsWith('image/')}
					<img src={rawUrl()} alt={meta.filename ?? ''} />
				{:else if mime.startsWith('video/')}
					<video controls>
						<source src={rawUrl()} type={mime} />
					</video>
				{:else if mime.startsWith('audio/')}
					<audio controls>
						<source src={rawUrl()} type={mime} />
					</audio>
				{:else if mime === 'application/pdf'}
					<iframe src={rawUrl()} title="PDF preview"></iframe>
				{:else}
					<div class="file-download-box">
						<div class="file-icon">&#128196;</div>
						<div class="file-dl-name">{meta.filename ?? itemId}</div>
						<div class="file-dl-size">{formatBytes(meta.size ?? 0)}</div>
						<a href={rawUrl()} download={meta.filename ?? itemId} class="btn btn-primary">
							Download
						</a>
					</div>
				{/if}
			</div>

		<!-- ── Link preview ────────────────────────────────────────────── -->
		{:else if meta.type === 'link'}
			<div class="link-preview">
				<div class="link-card">
					{#if meta.link_meta?.image}
						<div class="link-card-image-wrap">
							<img
								src={meta.link_meta.image}
								alt={meta.link_meta.title ?? ''}
								class="link-card-image"
								onerror={(e) => { (e.target as HTMLElement).parentElement!.style.display = 'none'; }}
							/>
						</div>
					{/if}

					<div class="link-card-body">
						{#if meta.link_meta?.favicon || getDomain(meta.link_meta?.url ?? meta.url ?? '')}
							<div class="link-card-favicon-row">
								{#if meta.link_meta?.favicon}
									<img
										src={meta.link_meta.favicon}
										alt=""
										class="link-card-favicon"
										onerror={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
									/>
								{/if}
								<span class="link-card-domain">
									{getDomain(meta.link_meta?.url ?? meta.url ?? '')}
								</span>
							</div>
						{/if}

						<div class="link-card-title">
							{meta.link_meta?.title ?? meta.url ?? ''}
						</div>

						{#if meta.link_meta?.description}
							<div class="link-card-desc">{meta.link_meta.description}</div>
						{/if}

						<div class="link-card-url">
							{meta.link_meta?.url ?? meta.url ?? ''}
						</div>
					</div>
				</div>

				{#if meta.link_meta?.summary}
					<div class="link-summary-wrap">
						<div class="link-summary-label">AI summary</div>
						<div class="link-summary-text">{meta.link_meta.summary}</div>
					</div>
				{:else if linkMetaLoading}
					<div class="link-summary-loading">
						<span style="color: var(--fg-3); font-size: 0.8125rem;">Loading metadata...</span>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</main>

<footer class="site-footer">ensage</footer>

<style>
	.view-main {
		max-width: var(--max-w);
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.loading-text {
		font-size: 0.875rem;
		color: var(--fg-3);
	}

	.notice {
		padding: 0.625rem 0.875rem;
		border-radius: var(--radius);
		font-size: 0.8125rem;
		margin-bottom: 1rem;
		border: 1px solid var(--border);
		color: var(--fg-2);
		background: var(--bg-2);
	}

	.notice.error {
		border-color: var(--danger);
		color: var(--danger);
		background: transparent;
	}

	.field {
		margin-bottom: 1rem;
	}

	/* Password gate */
	.password-gate {
		max-width: 360px;
		margin: 4rem auto 0;
		text-align: center;
	}

	.password-gate h2 {
		font-size: 1rem;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	.password-gate p {
		font-size: 0.8125rem;
		color: var(--fg-3);
		margin-bottom: 1.5rem;
	}

	.password-gate .field {
		text-align: left;
	}

	.w-full {
		width: 100%;
	}

	/* View header */
	.view-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
	}

	.view-meta {
		font-size: 0.8125rem;
		color: var(--fg-3);
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.view-meta span {
		white-space: nowrap;
	}

	.view-meta-url {
		max-width: 280px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: inline-block;
		vertical-align: middle;
	}

	.view-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		flex-shrink: 0;
	}

	/* Code wrap */
	.code-wrap {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.code-wrap pre {
		margin: 0;
		overflow-x: auto;
		padding: 1.25rem;
		font-size: 0.8125rem;
		line-height: 1.7;
		background: var(--bg-2) !important;
	}

	.code-wrap pre code {
		font-family: var(--font);
		background: none !important;
		padding: 0 !important;
	}

	/* File preview */
	.file-preview {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--bg-2);
	}

	.file-preview img,
	.file-preview video {
		display: block;
		max-width: 100%;
		max-height: 70vh;
	}

	.file-preview audio {
		display: block;
		padding: 1rem;
		width: 100%;
	}

	.file-preview iframe {
		width: 100%;
		height: 70vh;
		border: none;
		display: block;
	}

	.file-download-box {
		padding: 3rem 1.5rem;
		text-align: center;
		color: var(--fg-2);
	}

	.file-icon {
		font-size: 2.5rem;
		margin-bottom: 0.75rem;
	}

	.file-dl-name {
		margin-bottom: 0.25rem;
		word-break: break-all;
	}

	.file-dl-size {
		font-size: 0.8125rem;
		color: var(--fg-3);
		margin-bottom: 1.25rem;
	}

	/* Link preview */
	.link-preview {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.link-card {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--bg-2);
		display: flex;
		flex-direction: column;
	}

	.link-card-image-wrap {
		width: 100%;
		max-height: 320px;
		overflow: hidden;
		background: var(--bg-3);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.link-card-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		max-height: 320px;
	}

	.link-card-body {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.link-card-favicon-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.125rem;
	}

	.link-card-favicon {
		width: 16px;
		height: 16px;
		border-radius: 2px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.link-card-domain {
		font-size: 0.75rem;
		color: var(--fg-3);
		text-transform: lowercase;
		letter-spacing: 0.01em;
	}

	.link-card-title {
		font-size: 1rem;
		font-weight: 500;
		color: var(--fg);
		line-height: 1.4;
		word-break: break-word;
	}

	.link-card-desc {
		font-size: 0.8125rem;
		color: var(--fg-2);
		line-height: 1.6;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.link-card-url {
		font-size: 0.75rem;
		color: var(--accent);
		word-break: break-all;
		margin-top: 0.25rem;
	}

	.link-summary-wrap {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem 1.25rem;
		background: var(--bg-2);
	}

	.link-summary-label {
		font-size: 0.7rem;
		color: var(--fg-3);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-bottom: 0.6rem;
	}

	.link-summary-text {
		font-size: 0.875rem;
		color: var(--fg-2);
		line-height: 1.7;
	}

	.link-summary-loading {
		padding: 0.5rem 0;
	}

	.site-footer {
		border-top: 1px solid var(--border);
		padding: 1rem 1.5rem;
		text-align: center;
		font-size: 0.75rem;
		color: var(--fg-3);
		margin-top: 4rem;
	}
</style>
