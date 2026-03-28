<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { formatBytes, formatRelative } from '$lib/format.js';
	import type { ItemMeta } from '$lib/types.js';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

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

			if (meta.protected && !accessToken) { pageState = 'password'; return; }
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
			if (!res.ok) { passwordError = data.message ?? 'Wrong password.'; return; }
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
	let deleteDialogOpen = $state(false);

	async function confirmDelete() {
		const headers: Record<string, string> = {};
		if (token) headers['x-access-token'] = token;
		const r = await fetch(`/api/item/${itemId}`, { method: 'DELETE', headers });
		if (r.ok) {
			sessionStorage.removeItem(sessionKey);
			window.location.href = '/new';
		} else {
			const d = (await r.json().catch(() => ({}))) as { message?: string };
			deleteDialogOpen = false;
			passwordError = d.message ?? 'Delete failed.';
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
					if (updated.link_meta && meta) meta = { ...meta, link_meta: updated.link_meta };
				} catch { /* ignore */ }
				finally { linkMetaLoading = false; }
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
		const base = resolve('/api/item/[id]/raw', { id: itemId });
		return `${base}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
	}

	function getDomain(url: string) {
		try { return new URL(url).hostname; } catch { return ''; }
	}
</script>

<svelte:head>
	<link id="hljs-theme-light" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" />
	<link id="hljs-theme-dark" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" />
</svelte:head>

<Tooltip.Provider delayDuration={300}>
<Header showFab />

<div class="flex min-h-svh flex-col">
	<main class="flex-1 w-full max-w-4xl mx-auto px-5 py-8 sm:px-6">

		<!-- ── Loading ─────────────────────────────────────────────────── -->
		{#if pageState === 'loading'}
			<div class="flex items-center gap-3 py-12">
				<Spinner class="text-primary" />
				<span class="text-sm text-muted-foreground">Loading...</span>
			</div>

		<!-- ── Error ───────────────────────────────────────────────────── -->
		{:else if pageState === 'error'}
			<div class="flex flex-col items-start gap-3 py-16">
				<div class="text-7xl font-bold tracking-tight text-muted-foreground/30">404</div>
				<p class="text-base text-muted-foreground">{errorMsg}</p>
				<Button href="/new" class="mt-2">New paste →</Button>
			</div>

		<!-- ── Password gate ───────────────────────────────────────────── -->
		{:else if pageState === 'password'}
			<div class="mx-auto mt-16 max-w-sm">
				<div class="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
						<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
					</svg>
				</div>
				<h2 class="mb-1 text-lg font-semibold text-foreground">Password required</h2>
				<p class="mb-5 text-sm text-muted-foreground">This item is password-protected.</p>

				<div class="mb-3 space-y-1.5">
					<Label for="pw-input" class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Password
					</Label>
					<Input
						id="pw-input"
						type="password"
						bind:value={passwordInput}
						placeholder="Enter password..."
						onkeydown={(e) => e.key === 'Enter' && submitPassword()}
						autofocus
					/>
				</div>

				{#if passwordError}
					<div class="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{passwordError}
					</div>
				{/if}

				<Button onclick={submitPassword} disabled={passwordSubmitting} class="w-full justify-center">
					{#if passwordSubmitting}<Spinner class="mr-2 h-3.5 w-3.5" />{/if}
					{passwordSubmitting ? 'Verifying...' : 'Unlock →'}
				</Button>
			</div>

		<!-- ── Content ─────────────────────────────────────────────────── -->
		{:else if pageState === 'content' && meta}
			<!-- View header bar -->
			<div class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
				<!-- Meta info -->
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="outline" class="text-[10px] font-semibold uppercase tracking-wider">
						{meta.type}
					</Badge>
					{#if meta.type === 'file'}
						<span class="text-sm font-medium text-foreground">{meta.filename ?? 'file'}</span>
						<span class="text-sm text-muted-foreground">{formatBytes(meta.size ?? 0)}</span>
						{#if meta.mimetype}
							<Badge variant="outline" class="text-[10px]">{meta.mimetype}</Badge>
						{/if}
					{:else if meta.type === 'link'}
						<span class="max-w-xs truncate text-sm text-muted-foreground">{meta.url ?? ''}</span>
					{:else}
						{#if meta.language && meta.language !== 'auto'}
							<Badge variant="outline" class="text-[10px]">{meta.language}</Badge>
						{/if}
						<span class="text-sm text-muted-foreground">{formatBytes(meta.size ?? 0)}</span>
					{/if}
					{#if meta.expires_at}
						<span class="flex items-center gap-1 text-xs text-muted-foreground">
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<circle cx="12" cy="12" r="10"></circle>
								<polyline points="12 6 12 12 16 14"></polyline>
							</svg>
							{formatRelative(meta.expires_at)}
						</span>
					{/if}
				</div>

				<!-- Actions -->
				<div class="flex flex-wrap items-center gap-2">
					{#if meta.type === 'file'}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<Button href={resolve('/api/item/[id]/raw', { id: itemId }) + (token ? `?token=${encodeURIComponent(token)}` : '')} download={meta.filename ?? itemId} size="sm">
							Download
						</Button>
					{:else if meta.type === 'link'}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<Button href={meta.url ?? resolve('/')} target="_blank" rel="noopener noreferrer" size="sm">
							Open link
						</Button>
						<Button onclick={copyLinkUrl} variant="outline" size="sm">{copyLinkLabel}</Button>
					{:else}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<Button href={resolve('/api/item/[id]/raw', { id: itemId }) + (token ? `?token=${encodeURIComponent(token)}` : '')} target="_blank" variant="outline" size="sm">
							Raw
						</Button>
						<Button onclick={copyText} variant="outline" size="sm">{copyTextLabel}</Button>
					{/if}

					<!-- Delete with AlertDialog -->
					<AlertDialog.Root bind:open={deleteDialogOpen}>
						<AlertDialog.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="outline" size="sm" class="text-destructive hover:border-destructive/50 hover:bg-destructive/10">
									Delete
								</Button>
							{/snippet}
						</AlertDialog.Trigger>
						<AlertDialog.Portal>
							<AlertDialog.Overlay />
							<AlertDialog.Content>
								<AlertDialog.Header>
									<AlertDialog.Title>Delete this item?</AlertDialog.Title>
									<AlertDialog.Description>
										This action cannot be undone. The item will be permanently deleted and the link will stop working.
									</AlertDialog.Description>
								</AlertDialog.Header>
								<AlertDialog.Footer>
									<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
									<AlertDialog.Action onclick={confirmDelete} class="bg-destructive text-white hover:bg-destructive/90">
										Delete
									</AlertDialog.Action>
								</AlertDialog.Footer>
							</AlertDialog.Content>
						</AlertDialog.Portal>
					</AlertDialog.Root>
				</div>
			</div>

			<!-- Text content -->
			{#if meta.type === 'text'}
				<div class="overflow-hidden rounded-xl border border-border">
					<pre class="overflow-x-auto bg-muted p-5 text-sm leading-7"><code bind:this={codeEl} class="font-mono bg-transparent p-0"></code></pre>
				</div>

			<!-- File preview -->
			{:else if meta.type === 'file'}
				{@const mime = meta.mimetype ?? ''}
				<div class="overflow-hidden rounded-xl border border-border bg-muted/20">
					{#if mime.startsWith('image/')}
						<img src={rawUrl()} alt={meta.filename ?? ''} class="block max-h-[70vh] max-w-full" />
					{:else if mime.startsWith('video/')}
						<video controls class="block max-h-[70vh] max-w-full">
							<source src={rawUrl()} type={mime} />
						</video>
					{:else if mime.startsWith('audio/')}
						<audio controls class="block w-full p-4">
							<source src={rawUrl()} type={mime} />
						</audio>
					{:else if mime === 'application/pdf'}
						<iframe src={rawUrl()} title="PDF preview" class="block h-[70vh] w-full border-none"></iframe>
					{:else}
						<div class="flex flex-col items-center gap-3 py-16 text-center">
							<div class="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
								<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">
									<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
									<polyline points="13 2 13 9 20 9"></polyline>
								</svg>
							</div>
							<p class="font-medium text-foreground">{meta.filename ?? itemId}</p>
							<p class="text-sm text-muted-foreground">{formatBytes(meta.size ?? 0)}</p>
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
							<Button href={resolve('/api/item/[id]/raw', { id: itemId }) + (token ? `?token=${encodeURIComponent(token)}` : '')} download={meta.filename ?? itemId} class="mt-2">
								Download
							</Button>
						</div>
					{/if}
				</div>

			<!-- Link preview -->
			{:else if meta.type === 'link'}
				<div class="flex flex-col gap-4">
					<div class="overflow-hidden rounded-xl border border-border bg-card">
						{#if meta.link_meta?.image}
							<div class="max-h-72 w-full overflow-hidden bg-muted">
								<img src={meta.link_meta.image} alt={meta.link_meta.title ?? ''} class="block max-h-72 w-full object-cover"
									onerror={(e) => { (e.target as HTMLElement).parentElement!.style.display = 'none'; }} />
							</div>
						{/if}
						<div class="flex flex-col gap-2 p-5">
							{#if meta.link_meta?.favicon || getDomain(meta.link_meta?.url ?? meta.url ?? '')}
								<div class="flex items-center gap-2">
									{#if meta.link_meta?.favicon}
										<img src={meta.link_meta.favicon} alt="" class="h-3.5 w-3.5 flex-shrink-0 rounded-sm object-contain"
											onerror={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
									{/if}
									<span class="text-xs text-muted-foreground">{getDomain(meta.link_meta?.url ?? meta.url ?? '')}</span>
								</div>
							{/if}
							<p class="text-base font-semibold leading-snug text-foreground">{meta.link_meta?.title ?? meta.url ?? ''}</p>
							{#if meta.link_meta?.description}
								<p class="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{meta.link_meta.description}</p>
							{/if}
							<p class="break-all text-xs text-primary">{meta.link_meta?.url ?? meta.url ?? ''}</p>
						</div>
					</div>

					{#if meta.link_meta?.summary}
						<div class="rounded-xl border border-border bg-muted/20 p-5">
							<p class="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">AI summary</p>
							<p class="text-sm leading-relaxed text-muted-foreground">{meta.link_meta.summary}</p>
						</div>
					{:else if linkMetaLoading}
						<div class="flex items-center gap-2.5 py-2 text-sm text-muted-foreground">
							<Spinner class="h-3.5 w-3.5" />
							Loading preview...
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</main>

	<footer class="border-t border-border px-5 py-4 sm:px-6">
		<div class="mx-auto flex max-w-4xl items-center gap-4 text-sm text-muted-foreground">
			<a href="/" class="font-semibold text-foreground no-underline hover:text-primary">ensage</a>
			<span>·</span>
			<a href="/new" class="transition-colors hover:text-foreground no-underline">New paste</a>
			<span>·</span>
			<a href="https://github.com/ehlvg/ensage" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-foreground no-underline">GitHub</a>
		</div>
	</footer>
</div>
</Tooltip.Provider>
