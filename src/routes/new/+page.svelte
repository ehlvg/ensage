<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import CodeMirrorEditor from '$lib/components/CodeMirror.svelte';
	import { formatBytes } from '$lib/format.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as HoverCard from '$lib/components/ui/hover-card/index.js';
	import * as Item from '$lib/components/ui/item/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Kbd } from '$lib/components/ui/kbd/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		RiCodeSSlashLine,
		RiUploadCloud2Line,
		RiLinksLine,
		RiFileCopyLine,
		RiEyeLine,
		RiAddLine,
		RiTimeLine,
		RiLockPasswordLine,
		RiCloseLine,
		RiCheckLine,
		RiInformationLine,
		RiFileTextLine,
		RiArrowRightSLine,
		RiDeleteBin7Line
	} from 'remixicon-svelte';
	import { onMount } from 'svelte';
	import { upload as blobUpload } from '@vercel/blob/client';
	import { resolve } from '$app/paths';

	function timeAgo(ts: number): string {
		const s = Math.floor((Date.now() - ts) / 1000);
		if (s < 60) return `${s}s ago`;
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		return `${Math.floor(h / 24)}d ago`;
	}

	// ── Types ──────────────────────────────────────────────────────────────
	type Tab = 'text' | 'file' | 'link';
	type RecentShare = { id: string; type: Tab; ts: number };

	// ── State ──────────────────────────────────────────────────────────────
	let activeTab = $state<Tab>('text');

	let textContent = $state('');
	let textLanguage = $state('auto');
	let textTtl = $state('never');
	let textPassword = $state('');
	let textSubmitting = $state(false);
	let showTextPassword = $state(false);

	let selectedFile = $state<File | null>(null);
	let fileTtl = $state('never');
	let filePassword = $state('');
	let fileSubmitting = $state(false);
	let uploadProgress = $state(0);
	let uploading = $state(false);
	let isDragOver = $state(false);
	let showFilePassword = $state(false);

	let linkUrl = $state('');
	let linkTtl = $state('never');
	let linkPassword = $state('');
	let linkSubmitting = $state(false);
	let showLinkPassword = $state(false);

	let resultId = $state<string | null>(null);
	let resultType = $state<Tab>('text');
	let notice = $state<{ msg: string; type: 'error' | 'success' } | null>(null);

	let origin = $state('');
	let uploadMode = $state<'local' | 'blob'>('local');
	let maxFileSize = $state(500 * 1024 * 1024);
	let recentShares = $state<RecentShare[]>([]);

	let charCount = $derived(textContent.length);
	let byteCount = $derived(new TextEncoder().encode(textContent).length);

	function getRecent(): RecentShare[] {
		try { return JSON.parse(localStorage.getItem('ensage-recent') ?? '[]') as RecentShare[]; }
		catch { return []; }
	}

	function addRecent(id: string, type: Tab) {
		const current = getRecent();
		const updated = [{ id, type, ts: Date.now() }, ...current.filter((r) => r.id !== id)].slice(0, 10);
		localStorage.setItem('ensage-recent', JSON.stringify(updated));
	}

	function removeRecent(id: string) {
		const current = getRecent().filter((r) => r.id !== id);
		localStorage.setItem('ensage-recent', JSON.stringify(current));
		recentShares = current;
	}

	onMount(async () => {
		origin = window.location.origin;
		recentShares = getRecent();
		try {
			const res = await fetch('/api/config');
			if (res.ok) {
				const cfg = (await res.json()) as { uploadMode?: 'local' | 'blob'; maxFileSize?: number };
				if (cfg.uploadMode === 'blob' || cfg.uploadMode === 'local') uploadMode = cfg.uploadMode;
				if (typeof cfg.maxFileSize === 'number' && Number.isFinite(cfg.maxFileSize)) maxFileSize = cfg.maxFileSize;
			}
		} catch { /* non-critical */ }
	});

	function reset() {
		resultId = null; textContent = ''; textPassword = ''; filePassword = '';
		linkUrl = ''; linkPassword = ''; selectedFile = null; notice = null;
		showTextPassword = false; showFilePassword = false; showLinkPassword = false;
	}

	function setFile(f: File) { selectedFile = f; notice = null; }
	function handleDrop(e: DragEvent) { e.preventDefault(); isDragOver = false; const f = e.dataTransfer?.files[0]; if (f) setFile(f); }
	function handleFileInput(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (f) setFile(f); }
	function onSuccess(id: string, type: Tab) { resultId = id; resultType = type; addRecent(id, type); recentShares = getRecent(); }

	async function submitText() {
		const content = textContent.trim();
		if (!content) { notice = { msg: 'Please enter some text.', type: 'error' }; return; }
		textSubmitting = true; notice = null;
		try {
			const res = await fetch('/api/upload/text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, language: textLanguage, ttl: textTtl, password: textPassword || undefined }) });
			const data = (await res.json()) as { id?: string; message?: string };
			if (!res.ok) { notice = { msg: data.message ?? 'Upload failed.', type: 'error' }; return; }
			onSuccess(data.id!, 'text');
		} catch { notice = { msg: 'Network error. Please try again.', type: 'error' }; }
		finally { textSubmitting = false; }
	}

	async function submitFile() {
		if (!selectedFile) return;
		if (selectedFile.size > maxFileSize) { notice = { msg: `File too large (max ${formatBytes(maxFileSize)}).`, type: 'error' }; return; }
		fileSubmitting = true; uploading = true; uploadProgress = 0; notice = null;
		if (uploadMode === 'blob') {
			try {
				const initRes = await fetch('/api/upload/file/init', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: selectedFile.name, mimetype: selectedFile.type || 'application/octet-stream', size: selectedFile.size, ttl: fileTtl, password: filePassword || undefined }) });
				const initData = (await initRes.json()) as { id?: string; pathname?: string; message?: string };
				if (!initRes.ok || !initData.id || !initData.pathname) { notice = { msg: initData.message ?? 'Upload init failed.', type: 'error' }; return; }
				await blobUpload(initData.pathname, selectedFile, { access: 'private', handleUploadUrl: '/api/blob/upload', clientPayload: JSON.stringify({ id: initData.id }) });
				uploadProgress = 100; onSuccess(initData.id, 'file');
			} catch { notice = { msg: 'Network error. Please try again.', type: 'error' }; }
			finally { uploading = false; fileSubmitting = false; }
			return;
		}
		const formData = new FormData();
		formData.append('file', selectedFile); formData.append('ttl', fileTtl);
		if (filePassword) formData.append('password', filePassword);
		await new Promise<void>((resolve) => {
			const xhr = new XMLHttpRequest();
			xhr.open('POST', '/api/upload/file');
			xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable) uploadProgress = Math.round((e.loaded / e.total) * 100); });
			xhr.addEventListener('load', () => {
				uploading = false;
				let data: { id?: string; message?: string } = {};
				try { data = JSON.parse(xhr.responseText) as typeof data; } catch { /* ignore */ }
				if (xhr.status >= 200 && xhr.status < 300) { onSuccess(data.id!, 'file'); }
				else { notice = { msg: data.message ?? 'Upload failed.', type: 'error' }; fileSubmitting = false; }
				resolve();
			});
			xhr.addEventListener('error', () => { uploading = false; notice = { msg: 'Network error. Please try again.', type: 'error' }; fileSubmitting = false; resolve(); });
			xhr.send(formData);
		});
	}

	async function submitLink() {
		const url = linkUrl.trim();
		if (!url) { notice = { msg: 'Please enter a URL.', type: 'error' }; return; }
		try {
			const parsed = new URL(url);
			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') { notice = { msg: 'Only http and https URLs are supported.', type: 'error' }; return; }
		} catch { notice = { msg: 'Please enter a valid URL (including https://).', type: 'error' }; return; }
		linkSubmitting = true; notice = null;
		try {
			const res = await fetch('/api/upload/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, ttl: linkTtl, password: linkPassword || undefined }) });
			const data = (await res.json()) as { id?: string; message?: string };
			if (!res.ok) { notice = { msg: data.message ?? 'Share failed.', type: 'error' }; return; }
			onSuccess(data.id!, 'link');
		} catch { notice = { msg: 'Network error. Please try again.', type: 'error' }; }
		finally { linkSubmitting = false; }
	}

	let copyLabel = $state('Copy link');
	let copySuccess = $state(false);
	async function copyResult() {
		if (!resultId) return;
		await navigator.clipboard.writeText(`${window.location.origin}/${resultId}`);
		copyLabel = 'Copied!'; copySuccess = true;
		setTimeout(() => { copyLabel = 'Copy link'; copySuccess = false; }, 2000);
	}

	const LANGUAGES = [
		['auto', 'Auto-detect'], ['plaintext', 'Plain text'], ['bash', 'Bash / Shell'],
		['c', 'C'], ['cpp', 'C++'], ['csharp', 'C#'], ['css', 'CSS'], ['diff', 'Diff'],
		['dockerfile', 'Dockerfile'], ['go', 'Go'], ['graphql', 'GraphQL'], ['html', 'HTML'],
		['http', 'HTTP'], ['ini', 'INI / TOML'], ['java', 'Java'], ['javascript', 'JavaScript'],
		['json', 'JSON'], ['kotlin', 'Kotlin'], ['lua', 'Lua'], ['makefile', 'Makefile'],
		['markdown', 'Markdown'], ['nginx', 'Nginx'], ['php', 'PHP'], ['python', 'Python'],
		['ruby', 'Ruby'], ['rust', 'Rust'], ['scala', 'Scala'], ['sql', 'SQL'],
		['swift', 'Swift'], ['typescript', 'TypeScript'], ['xml', 'XML'], ['yaml', 'YAML']
	] as const;

	const TTL_OPTIONS = [['1h', '1 hour'], ['24h', '24 hours'], ['7d', '7 days'], ['never', 'Never']] as const;
	const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
	const modKey = isMac ? '⌘' : 'Ctrl';

	const typeBadgeClass: Record<Tab, string> = {
		text: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
		file: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
		link: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
	};
</script>

<svelte:head>
	<title>New — ensage</title>
</svelte:head>

<Tooltip.Provider delayDuration={300}>
<Header />

<main class="mx-auto w-full max-w-2xl px-5 py-8 sm:px-6">

	<!-- ── Page title + tips ───────────────────────────────────────────── -->
	<div class="mb-6 flex items-start justify-between gap-3">
		<div>
			<h1 class="mb-0.5 text-2xl font-bold tracking-tight text-foreground">Share something.</h1>
			<p class="text-sm text-muted-foreground">Paste text, upload a file, or share a link.</p>
		</div>

		<!-- Tips HoverCard -->
		<HoverCard.Root openDelay={200}>
			<HoverCard.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon"
						class="mt-0.5 h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground"
						aria-label="Tips"
					>
						<RiInformationLine width={16} height={16} />
					</Button>
				{/snippet}
			</HoverCard.Trigger>
			<HoverCard.Content class="w-72" align="end">
				<div class="space-y-2.5">
					<p class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tips & shortcuts</p>
					<div class="space-y-2 text-sm text-muted-foreground">
						<div class="flex items-center gap-2">
							<div class="flex items-center gap-1"><Kbd>{modKey}</Kbd><Kbd>↵</Kbd></div>
							<span>Submit form</span>
						</div>
						<div class="flex items-center gap-2"><Kbd>Tab</Kbd><span>Indent in editor</span></div>
					</div>
					<Separator />
					<div class="space-y-1.5 text-xs text-muted-foreground">
						<p>Set expiry to <strong class="text-foreground">1 hour</strong> for temporary snippets</p>
						<p>Add a password to <strong class="text-foreground">restrict access</strong></p>
						<p>Links get <strong class="text-foreground">rich previews</strong> with AI summary</p>
						<p>Raw URL: <code class="font-mono">/{'{id}'}/raw</code></p>
					</div>
				</div>
			</HoverCard.Content>
		</HoverCard.Root>
	</div>

	<!-- ── Success result card ──────────────────────────────────────────── -->
	{#if resultId}
		<div class="animate-in fade-in slide-in-from-bottom-2 mb-6 overflow-hidden rounded-xl border border-primary/25 bg-primary/5 duration-300">
			<div class="flex items-center gap-3.5 border-b border-primary/15 px-5 py-4">
				<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<RiCheckLine width={15} height={15} />
				</div>
				<div class="min-w-0 flex-1">
					<div class="font-semibold text-foreground">Ready to share</div>
					<div class="text-xs text-muted-foreground">
						{resultType} · expires {TTL_OPTIONS.find(([v]) => v === (resultType === 'text' ? textTtl : resultType === 'file' ? fileTtl : linkTtl))?.[1] ?? 'never'}
					</div>
				</div>
			</div>
			<div class="px-5 py-4">
				<div class="mb-3 flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-background px-4 py-3">
					<span class="flex-1 truncate font-mono text-sm text-foreground">{origin}/{resultId}</span>
				</div>
				<div class="flex flex-wrap gap-2">
					<Button onclick={copyResult} size="sm" class={copySuccess ? 'bg-primary/80' : ''}>
						{#if copySuccess}<RiCheckLine width={13} height={13} />{:else}<RiFileCopyLine width={13} height={13} />{/if}
						{copyLabel}
					</Button>
					<Button href={resolve('/[id]', { id: resultId })} variant="outline" size="sm">
						<RiEyeLine width={13} height={13} /> View
					</Button>
					<Button onclick={reset} variant="ghost" size="sm">
						<RiAddLine width={13} height={13} /> New
					</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- ── Notice bar ───────────────────────────────────────────────────── -->
	{#if notice}
		<div class="mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm {notice.type === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-primary/30 bg-primary/10 text-primary'}">
			<RiInformationLine width={14} height={14} class="flex-shrink-0" />
			{notice.msg}
		</div>
	{/if}

	<!-- ── Main tabs ────────────────────────────────────────────────────── -->
	{#if !resultId}
	<Tabs.Root value={activeTab} onValueChange={(v) => { activeTab = v as Tab; notice = null; }}>
		<Tabs.List class="mb-4 w-full sm:w-auto">
			<Tabs.Trigger value="text" class="flex-1 gap-1.5 sm:flex-none">
				<RiCodeSSlashLine width={13} height={13} /> Text
			</Tabs.Trigger>
			<Tabs.Trigger value="file" class="flex-1 gap-1.5 sm:flex-none">
				<RiUploadCloud2Line width={13} height={13} /> File
			</Tabs.Trigger>
			<Tabs.Trigger value="link" class="flex-1 gap-1.5 sm:flex-none">
				<RiLinksLine width={13} height={13} /> Link
			</Tabs.Trigger>
		</Tabs.List>

		<!-- ── Text tab ──────────────────────────────────────────────────── -->
		<Tabs.Content value="text" class="space-y-3">
			<!-- Language selector row -->
			<div class="flex items-center justify-between gap-3">
				<Select.Root type="single" bind:value={textLanguage}>
					<Select.Trigger class="w-44 text-xs">
						{LANGUAGES.find(([v]) => v === textLanguage)?.[1] ?? 'Auto-detect'}
					</Select.Trigger>
					<Select.Content class="max-h-64">
						{#each LANGUAGES as [value, label] (value)}
							<Select.Item {value} class="text-xs">{label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				{#if charCount > 0}
					<span class="text-xs text-muted-foreground">
						{charCount.toLocaleString()} chars · {byteCount < 1024 ? `${byteCount} B` : `${(byteCount / 1024).toFixed(1)} KB`}
					</span>
				{/if}
			</div>

			<!-- CodeMirror editor -->
			<div class="overflow-hidden rounded-xl border border-border">
				<CodeMirrorEditor
					bind:value={textContent}
					language={textLanguage}
					onSubmit={submitText}
				/>
			</div>

			<!-- Options + submit -->
			{@render optionsRow({
				ttlValue: textTtl,
				onTtlChange: (v) => { textTtl = v; },
				showPassword: showTextPassword,
				passwordValue: textPassword,
				onPasswordChange: (v) => { textPassword = v; },
				onAddPassword: () => { showTextPassword = true; },
				submitting: textSubmitting,
				disabled: !textContent.trim(),
				onSubmit: submitText,
				label: 'Share text',
			})}
		</Tabs.Content>

		<!-- ── File tab ──────────────────────────────────────────────────── -->
		<Tabs.Content value="file" class="space-y-3">
			<!-- Drop zone -->
			<div
				role="button"
				tabindex="0"
				class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/10 py-14 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 {isDragOver ? 'border-primary bg-primary/10' : ''}"
				onclick={() => document.getElementById('file-input')?.click()}
				onkeydown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
				ondragover={(e) => { e.preventDefault(); isDragOver = true; }}
				ondragleave={() => { isDragOver = false; }}
				ondrop={handleDrop}
			>
				<div class="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
					<RiUploadCloud2Line width={24} height={24} />
				</div>
				<div class="text-sm font-medium text-foreground">
					{#if isDragOver}Drop to upload{:else}<strong>Click to browse</strong> or drag here{/if}
				</div>
				<div class="text-xs text-muted-foreground">Up to {formatBytes(maxFileSize)} · Any file type</div>
				<input id="file-input" type="file" class="sr-only" onchange={handleFileInput} />
			</div>

			{#if selectedFile}
				<Item.Root variant="outline" class="rounded-xl">
					<RiFileTextLine width={15} height={15} class="text-muted-foreground" />
					<Item.Content>
						<Item.Title class="text-sm">{selectedFile.name}</Item.Title>
						<Item.Description>{formatBytes(selectedFile.size)} · {selectedFile.type || 'unknown type'}</Item.Description>
					</Item.Content>
					<Item.Actions>
						<Button variant="ghost" size="icon" class="h-6 w-6" onclick={() => { selectedFile = null; }}>
							<RiCloseLine width={12} height={12} />
						</Button>
					</Item.Actions>
				</Item.Root>
			{/if}

			{#if uploading}
				<div class="space-y-1.5">
					<Progress value={uploadProgress} class="h-1.5" />
					<p class="text-right text-xs text-muted-foreground">{uploadProgress}%</p>
				</div>
			{/if}

			{@render optionsRow({
				ttlValue: fileTtl,
				onTtlChange: (v) => { fileTtl = v; },
				showPassword: showFilePassword,
				passwordValue: filePassword,
				onPasswordChange: (v) => { filePassword = v; },
				onAddPassword: () => { showFilePassword = true; },
				submitting: fileSubmitting,
				disabled: !selectedFile,
				onSubmit: submitFile,
				label: 'Upload file',
			})}
		</Tabs.Content>

		<!-- ── Link tab ──────────────────────────────────────────────────── -->
		<Tabs.Content value="link" class="space-y-3">
			<div class="flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
				<RiLinksLine width={16} height={16} class="flex-shrink-0 text-muted-foreground" />
				<input
					type="url"
					bind:value={linkUrl}
					class="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
					placeholder="https://example.com"
					onkeydown={(e) => e.key === 'Enter' && submitLink()}
					spellcheck="false"
				/>
			</div>

			{#if linkUrl}
				<p class="truncate rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{linkUrl}</p>
			{/if}

			{@render optionsRow({
				ttlValue: linkTtl,
				onTtlChange: (v) => { linkTtl = v; },
				showPassword: showLinkPassword,
				passwordValue: linkPassword,
				onPasswordChange: (v) => { linkPassword = v; },
				onAddPassword: () => { showLinkPassword = true; },
				submitting: linkSubmitting,
				disabled: !linkUrl.trim(),
				onSubmit: submitLink,
				label: 'Share link',
			})}
		</Tabs.Content>
	</Tabs.Root>
	{/if}

	<!-- ── Recent shares ────────────────────────────────────────────────── -->
	{#if recentShares.length > 0}
		<div class="mt-8">
			<Separator class="mb-6" />
			<div class="mb-3 flex items-center justify-between">
				<p class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent shares</p>
				<span class="text-xs text-muted-foreground">{recentShares.length} item{recentShares.length !== 1 ? 's' : ''}</span>
			</div>
			<div class="overflow-hidden rounded-xl border border-border">
				{#each recentShares.slice(0, 8) as share, i (share.id)}
					<Item.Root variant="default" class="group {i > 0 ? 'border-t border-border' : ''}">
						<a href={resolve('/[id]', { id: share.id })} class="flex flex-1 items-center gap-3 no-underline">
							<Badge class="text-[10px] font-semibold {typeBadgeClass[share.type]}" variant="outline">
								{share.type}
							</Badge>
							<span class="font-mono text-xs text-foreground">{share.id}</span>
						</a>
						<Item.Actions class="gap-2">
							<span class="text-[11px] text-muted-foreground">{timeAgo(share.ts)}</span>
							<Button
								variant="ghost"
								size="icon"
								class="h-6 w-6 opacity-0 group-hover:opacity-100"
								onclick={() => removeRecent(share.id)}
								title="Remove"
							>
								<RiDeleteBin7Line width={11} height={11} />
							</Button>
						</Item.Actions>
					</Item.Root>
				{/each}
			</div>
		</div>
	{/if}

</main>
</Tooltip.Provider>

<!-- ── Options row snippet ───────────────────────────────────────────────── -->
{#snippet optionsRow({ ttlValue, onTtlChange, showPassword, passwordValue, onPasswordChange, onAddPassword, submitting, disabled, onSubmit, label }: {
	ttlValue: string;
	onTtlChange: (v: string) => void;
	showPassword: boolean;
	passwordValue: string;
	onPasswordChange: (v: string) => void;
	onAddPassword: () => void;
	submitting: boolean;
	disabled: boolean;
	onSubmit: () => void;
	label: string;
})}
	<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<!-- Expires -->
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<RiTimeLine width={12} height={12} />
				<Label class="text-xs text-muted-foreground">Expires</Label>
				<Select.Root type="single" value={ttlValue} onValueChange={onTtlChange}>
					<Select.Trigger size="sm" class="h-7 text-xs">
						{TTL_OPTIONS.find(([v]) => v === ttlValue)?.[1] ?? 'Never'}
					</Select.Trigger>
					<Select.Content>
						{#each TTL_OPTIONS as [value, lbl] (value)}
							<Select.Item {value} class="text-xs">{lbl}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Password -->
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<RiLockPasswordLine width={12} height={12} />
				<Label class="text-xs text-muted-foreground">Password</Label>
				{#if showPassword}
					<Input
						type="password"
						value={passwordValue}
						oninput={(e) => onPasswordChange((e.target as HTMLInputElement).value)}
						class="h-7 w-28 text-xs"
						placeholder="Optional..."
						autofocus
					/>
				{:else}
					<Button
						variant="outline"
						size="sm"
						class="h-7 text-xs"
						onclick={onAddPassword}
					>
						{passwordValue ? '••••••' : 'Add'}
					</Button>
				{/if}
			</div>
		</div>

		<!-- Submit -->
		<Button onclick={onSubmit} disabled={submitting || disabled} size="sm">
			{#if submitting}
				<span class="mr-1.5 h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"></span>
				{label.includes('Upload') ? 'Uploading...' : 'Sharing...'}
			{:else}
				{label} <RiArrowRightSLine width={14} height={14} />
			{/if}
		</Button>
	</div>
{/snippet}
