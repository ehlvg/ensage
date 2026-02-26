<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import { formatBytes } from '$lib/utils.js';
	import { onMount } from 'svelte';
	import { upload as blobUpload } from '@vercel/blob/client';
	import { resolve } from '$app/paths';

	// ── State ──────────────────────────────────────────────────────────────
	type Tab = 'text' | 'file' | 'link';
	let activeTab = $state<Tab>('text');

	// Text tab
	let textContent = $state('');
	let textLanguage = $state('auto');
	let textTtl = $state('never');
	let textPassword = $state('');
	let textSubmitting = $state(false);

	// File tab
	let selectedFile = $state<File | null>(null);
	let fileTtl = $state('never');
	let filePassword = $state('');
	let fileSubmitting = $state(false);
	let uploadProgress = $state(0);
	let uploading = $state(false);
	let isDragOver = $state(false);

	// Link tab
	let linkUrl = $state('');
	let linkTtl = $state('never');
	let linkPassword = $state('');
	let linkSubmitting = $state(false);

	// Result
	let resultId = $state<string | null>(null);
	let notice = $state<{ msg: string; type: 'error' | 'success' } | null>(null);

	// Base URL for displaying the share link (set on client only)
	let origin = $state('');
	let uploadMode = $state<'local' | 'blob'>('local');
	let maxFileSize = $state(500 * 1024 * 1024);

	// Apply server accent colour and capture current origin on the client
	onMount(async () => {
		origin = window.location.origin;
		try {
			const res = await fetch('/api/config');
			if (res.ok) {
				const cfg = (await res.json()) as {
					accentColor?: string;
					uploadMode?: 'local' | 'blob';
					maxFileSize?: number;
				};
				if (cfg.accentColor) {
					document.documentElement.style.setProperty('--accent', cfg.accentColor);
					document.documentElement.style.setProperty('--accent-d', cfg.accentColor);
				}
				if (cfg.uploadMode === 'blob' || cfg.uploadMode === 'local') uploadMode = cfg.uploadMode;
				if (typeof cfg.maxFileSize === 'number' && Number.isFinite(cfg.maxFileSize)) {
					maxFileSize = cfg.maxFileSize;
				}
			}
		} catch {
			// non-critical
		}
	});

	// ── Helpers ────────────────────────────────────────────────────────────
	function setTab(tab: Tab) {
		activeTab = tab;
		notice = null;
	}

	function reset() {
		resultId = null;
		textContent = '';
		textPassword = '';
		filePassword = '';
		linkUrl = '';
		linkPassword = '';
		selectedFile = null;
		notice = null;
	}

	function setFile(f: File) {
		selectedFile = f;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		const f = e.dataTransfer?.files[0];
		if (f) setFile(f);
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const f = input.files?.[0];
		if (f) setFile(f);
	}

	// ── Submit handlers ────────────────────────────────────────────────────

	async function submitText() {
		const content = textContent.trim();
		if (!content) {
			notice = { msg: 'Please enter some text.', type: 'error' };
			return;
		}
		textSubmitting = true;
		notice = null;
		try {
			const res = await fetch('/api/upload/text', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content,
					language: textLanguage,
					ttl: textTtl,
					password: textPassword || undefined
				})
			});
			const data = (await res.json()) as { id?: string; message?: string };
			if (!res.ok) {
				notice = { msg: data.message ?? 'Upload failed.', type: 'error' };
				return;
			}
			resultId = data.id!;
		} catch {
			notice = { msg: 'Network error. Please try again.', type: 'error' };
		} finally {
			textSubmitting = false;
		}
	}

	async function submitFile() {
		if (!selectedFile) return;
		if (selectedFile.size > maxFileSize) {
			notice = { msg: `File too large (max ${formatBytes(maxFileSize)}).`, type: 'error' };
			return;
		}
		fileSubmitting = true;
		uploading = true;
		uploadProgress = 0;
		notice = null;

		if (uploadMode === 'blob') {
			try {
				const initRes = await fetch('/api/upload/file/init', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						filename: selectedFile.name,
						mimetype: selectedFile.type || 'application/octet-stream',
						size: selectedFile.size,
						ttl: fileTtl,
						password: filePassword || undefined
					})
				});
				const initData = (await initRes.json()) as {
					id?: string;
					pathname?: string;
					message?: string;
				};
				if (!initRes.ok || !initData.id || !initData.pathname) {
					notice = { msg: initData.message ?? 'Upload init failed.', type: 'error' };
					return;
				}

				await blobUpload(initData.pathname, selectedFile, {
					access: 'private',
					handleUploadUrl: '/api/blob/upload',
					clientPayload: JSON.stringify({ id: initData.id })
				});

				uploadProgress = 100;
				resultId = initData.id;
			} catch {
				notice = { msg: 'Network error. Please try again.', type: 'error' };
			} finally {
				uploading = false;
				fileSubmitting = false;
			}
			return;
		}

		const formData = new FormData();
		formData.append('file', selectedFile);
		formData.append('ttl', fileTtl);
		if (filePassword) formData.append('password', filePassword);

		await new Promise<void>((resolve) => {
			const xhr = new XMLHttpRequest();
			xhr.open('POST', '/api/upload/file');

			xhr.upload.addEventListener('progress', (e) => {
				if (e.lengthComputable) {
					uploadProgress = Math.round((e.loaded / e.total) * 100);
				}
			});

			xhr.addEventListener('load', () => {
				uploading = false;
				let data: { id?: string; message?: string } = {};
				try {
					data = JSON.parse(xhr.responseText) as typeof data;
				} catch {
					/* ignore */
				}
				if (xhr.status >= 200 && xhr.status < 300) {
					resultId = data.id!;
				} else {
					notice = { msg: data.message ?? 'Upload failed.', type: 'error' };
					fileSubmitting = false;
				}
				resolve();
			});

			xhr.addEventListener('error', () => {
				uploading = false;
				notice = { msg: 'Network error. Please try again.', type: 'error' };
				fileSubmitting = false;
				resolve();
			});

			xhr.send(formData);
		});
	}

	async function submitLink() {
		const url = linkUrl.trim();
		if (!url) {
			notice = { msg: 'Please enter a URL.', type: 'error' };
			return;
		}
		try {
			const parsed = new URL(url);
			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
				notice = { msg: 'Only http and https URLs are supported.', type: 'error' };
				return;
			}
		} catch {
			notice = { msg: 'Please enter a valid URL (including https://).', type: 'error' };
			return;
		}

		linkSubmitting = true;
		notice = null;
		try {
			const res = await fetch('/api/upload/link', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					url,
					ttl: linkTtl,
					password: linkPassword || undefined
				})
			});
			const data = (await res.json()) as { id?: string; message?: string };
			if (!res.ok) {
				notice = { msg: data.message ?? 'Share failed.', type: 'error' };
				return;
			}
			resultId = data.id!;
		} catch {
			notice = { msg: 'Network error. Please try again.', type: 'error' };
		} finally {
			linkSubmitting = false;
		}
	}

	let copyLabel = $state('Copy link');
	async function copyResult() {
		if (!resultId) return;
		const url = `${window.location.origin}/${resultId}`;
		await navigator.clipboard.writeText(url);
		copyLabel = 'Copied!';
		setTimeout(() => {
			copyLabel = 'Copy link';
		}, 1500);
	}

	const LANGUAGES = [
		['auto', 'Auto-detect'],
		['plaintext', 'Plain text'],
		['bash', 'Bash / Shell'],
		['c', 'C'],
		['cpp', 'C++'],
		['csharp', 'C#'],
		['css', 'CSS'],
		['diff', 'Diff'],
		['dockerfile', 'Dockerfile'],
		['go', 'Go'],
		['graphql', 'GraphQL'],
		['html', 'HTML'],
		['http', 'HTTP'],
		['ini', 'INI / TOML'],
		['java', 'Java'],
		['javascript', 'JavaScript'],
		['json', 'JSON'],
		['kotlin', 'Kotlin'],
		['lua', 'Lua'],
		['makefile', 'Makefile'],
		['markdown', 'Markdown'],
		['nginx', 'Nginx'],
		['php', 'PHP'],
		['python', 'Python'],
		['ruby', 'Ruby'],
		['rust', 'Rust'],
		['scala', 'Scala'],
		['sql', 'SQL'],
		['swift', 'Swift'],
		['typescript', 'TypeScript'],
		['xml', 'XML'],
		['yaml', 'YAML']
	] as const;

	const TTL_OPTIONS = [
		['1h', '1 hour'],
		['24h', '24 hours'],
		['7d', '7 days'],
		['never', 'Never']
	] as const;
</script>

<Header />

<main class="page-main">
	{#if resultId}
		<!-- ── Result box ──────────────────────────────────────────────── -->
		<div class="result-box">
			<div class="result-label">Your link</div>
			<div class="result-url">
				{origin ? `${origin}/${resultId}` : `/${resultId}`}
			</div>
			<div class="result-actions">
				<button onclick={copyResult} class="btn btn-primary">{copyLabel}</button>
				<a href={resolve('/[id]', { id: resultId })} class="btn">View</a>
				<button onclick={reset} class="btn">New upload</button>
			</div>
			{#if notice}
				<div class="notice {notice.type} mt-3">{notice.msg}</div>
			{/if}
		</div>
	{:else}
		<!-- ── Upload form ─────────────────────────────────────────────── -->

		{#if notice}
			<div class="notice {notice.type}">{notice.msg}</div>
		{/if}

		<!-- Tabs -->
		<div class="tabs">
			{#each ['text', 'file', 'link'] as Tab[] as tab (tab)}
				<button onclick={() => setTab(tab)} class="tab" class:active={activeTab === tab}>
					{tab}
				</button>
			{/each}
		</div>

		<!-- ── Text tab ──────────────────────────────────────────────── -->
		{#if activeTab === 'text'}
			<div class="field">
				<label class="field-label" for="text-content">Content</label>
				<textarea
					id="text-content"
					bind:value={textContent}
					class="field-textarea"
					placeholder="Paste your text here..."
				></textarea>
			</div>

			<div class="form-row mb-4">
				<div class="field">
					<label class="field-label" for="text-language">Language</label>
					<select id="text-language" bind:value={textLanguage} class="field-select">
						{#each LANGUAGES as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</select>
				</div>
				<div class="field">
					<label class="field-label" for="text-ttl">Expires</label>
					<select id="text-ttl" bind:value={textTtl} class="field-select">
						{#each TTL_OPTIONS as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="field">
				<label class="field-label" for="text-password">
					Password <span style="font-size: 0.7rem;">(optional)</span>
				</label>
				<input
					id="text-password"
					type="password"
					bind:value={textPassword}
					class="field-input"
					placeholder="Leave blank for no password"
				/>
			</div>

			<button onclick={submitText} disabled={textSubmitting} class="btn btn-primary">
				{textSubmitting ? 'Sharing...' : 'Share text'}
			</button>

			<!-- ── File tab ──────────────────────────────────────────────── -->
		{:else if activeTab === 'file'}
			<div
				role="button"
				tabindex="0"
				class="dropzone"
				class:drag-over={isDragOver}
				onclick={() => document.getElementById('file-input')?.click()}
				onkeydown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
				ondragover={(e) => {
					e.preventDefault();
					isDragOver = true;
				}}
				ondragleave={() => {
					isDragOver = false;
				}}
				ondrop={handleDrop}
			>
				<div class="dropzone-icon">&#8593;</div>
				<div>Click or drag a file here</div>
				<div class="dropzone-hint">Up to {formatBytes(maxFileSize)}</div>
				<input id="file-input" type="file" class="hidden" onchange={handleFileInput} />
			</div>

			{#if selectedFile}
				<div class="file-selected">
					<span class="file-name">{selectedFile.name}</span>
					<span class="file-size">{formatBytes(selectedFile.size)}</span>
				</div>
			{/if}

			{#if uploading}
				<div class="progress-wrap mt-4">
					<div class="progress-bar" style="width: {uploadProgress}%;"></div>
				</div>
			{/if}

			<div class="form-row mt-4 mb-4">
				<div class="field">
					<label class="field-label" for="file-ttl">Expires</label>
					<select id="file-ttl" bind:value={fileTtl} class="field-select">
						{#each TTL_OPTIONS as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</select>
				</div>
				<div class="field">
					<label class="field-label" for="file-password">
						Password <span style="font-size: 0.7rem;">(optional)</span>
					</label>
					<input
						id="file-password"
						type="password"
						bind:value={filePassword}
						class="field-input"
						placeholder="Leave blank for no password"
					/>
				</div>
			</div>

			<button
				onclick={submitFile}
				disabled={fileSubmitting || !selectedFile}
				class="btn btn-primary"
			>
				{fileSubmitting ? 'Uploading...' : 'Upload file'}
			</button>

			<!-- ── Link tab ──────────────────────────────────────────────── -->
		{:else if activeTab === 'link'}
			<div class="field">
				<label class="field-label" for="link-url">URL</label>
				<input
					id="link-url"
					type="url"
					bind:value={linkUrl}
					class="field-input"
					placeholder="https://example.com"
					onkeydown={(e) => e.key === 'Enter' && submitLink()}
				/>
			</div>

			<div class="form-row mb-4">
				<div class="field">
					<label class="field-label" for="link-ttl">Expires</label>
					<select id="link-ttl" bind:value={linkTtl} class="field-select">
						{#each TTL_OPTIONS as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</select>
				</div>
				<div class="field">
					<label class="field-label" for="link-password">
						Password <span style="font-size: 0.7rem;">(optional)</span>
					</label>
					<input
						id="link-password"
						type="password"
						bind:value={linkPassword}
						class="field-input"
						placeholder="Leave blank for no password"
					/>
				</div>
			</div>

			<button onclick={submitLink} disabled={linkSubmitting} class="btn btn-primary">
				{linkSubmitting ? 'Sharing...' : 'Share link'}
			</button>
		{/if}
	{/if}
</main>

<footer class="site-footer">ensage</footer>

<style>
	/* Local styles that extend global CSS */
	.result-box {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1.25rem;
		background: var(--bg-2);
	}

	.result-label {
		font-size: 0.75rem;
		color: var(--fg-3);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.result-url {
		font-size: 0.9375rem;
		color: var(--accent);
		word-break: break-all;
		margin-bottom: 1rem;
	}

	.result-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.tabs {
		display: flex;
		gap: 0;
		border-bottom: 1px solid var(--border);
		margin-bottom: 1.5rem;
	}

	.tab {
		font-family: var(--font);
		font-size: 0.8125rem;
		font-weight: 500;
		padding: 0.5rem 1rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--fg-3);
		cursor: pointer;
		margin-bottom: -1px;
	}

	.tab:hover {
		color: var(--fg);
	}

	.tab.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}

	.field {
		margin-bottom: 1rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	@media (max-width: 520px) {
		.form-row {
			grid-template-columns: 1fr;
		}
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

	.notice.success {
		border-color: var(--accent);
		color: var(--accent-d);
		background: transparent;
	}

	.mt-3 {
		margin-top: 0.75rem;
	}

	.dropzone {
		border: 1px dashed var(--border);
		border-radius: var(--radius);
		padding: 3rem 1.5rem;
		text-align: center;
		cursor: pointer;
		color: var(--fg-3);
		font-size: 0.875rem;
		background: var(--bg-2);
	}

	.dropzone:hover,
	.dropzone.drag-over {
		border-color: var(--accent);
		color: var(--fg);
		background: var(--bg-3);
	}

	.dropzone-icon {
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
		color: var(--fg-3);
	}

	.dropzone-hint {
		font-size: 0.75rem;
		color: var(--fg-3);
		margin-top: 0.35rem;
	}

	.file-selected {
		margin-top: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--bg-3);
		border-radius: var(--radius);
		font-size: 0.8125rem;
		color: var(--fg-2);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.file-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-size {
		color: var(--fg-3);
		flex-shrink: 0;
	}

	.progress-wrap {
		width: 100%;
		height: 2px;
		background: var(--bg-3);
		border-radius: 1px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: var(--accent);
		width: 0%;
		transition: width 0.1s;
	}

	.site-footer {
		border-top: 1px solid var(--border);
		padding: 1rem 0;
		text-align: center;
		font-size: 0.75rem;
		color: var(--fg-3);
		margin-top: 4rem;
	}

	.page-main {
		padding-top: 2rem;
	}
</style>
