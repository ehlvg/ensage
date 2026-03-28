<svelte:head>
	<title>ensage — Share code, files & links instantly</title>
	<meta
		name="description"
		content="A self-hosted pastebin and file-sharing platform for developers. Syntax highlighting, file uploads up to 500 MB, link previews, password protection. Open-source and free."
	/>
	<meta property="og:title" content="ensage — Share code, files & links instantly" />
	<meta
		property="og:description"
		content="Self-hosted pastebin for developers. Open-source, private, no account needed."
	/>
</svelte:head>

<!-- ── Navigation ───────────────────────────────────────────────────────── -->
<nav class="sticky top-0 z-50 flex h-12 items-center border-b border-border bg-background px-5 sm:px-8">
	<a href="/" class="text-[0.9375rem] font-semibold tracking-tight text-foreground no-underline">
		en<span class="text-primary">sage</span>
	</a>

	<div class="ml-5 hidden items-center gap-0.5 sm:flex">
		<a href="#features" class="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground no-underline">Features</a>
		<a href="#deploy" class="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground no-underline">Deploy</a>
		<a
			href="https://github.com/ehlvg/ensage"
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground no-underline"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
			</svg>
			GitHub
		</a>
	</div>

	<a href="/new" class="ml-auto inline-flex items-center rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 no-underline">
		Start Sharing →
	</a>
</nav>

<!-- ── Hero ─────────────────────────────────────────────────────────────── -->
<section class="border-b border-border bg-background">
	<div class="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28 lg:py-36">
		<div class="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
			<!-- Left -->
			<div class="flex-1">
				<div class="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
					<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
					Free during beta — all features included
				</div>

				<h1 class="mb-5 text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
					The fastest way<br />
					to share code,<br />
					<span class="text-primary">files & links.</span>
				</h1>

				<p class="mb-8 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
					A self-hosted pastebin for developers. Syntax highlighting, file uploads, link previews,
					password protection — open-source and yours to run.
				</p>

				<div class="flex flex-wrap items-center gap-3">
					<a href="/new" class="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 no-underline">
						Open App →
					</a>
					<a
						href="https://github.com/ehlvg/ensage"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted no-underline"
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
						</svg>
						Star on GitHub
					</a>
				</div>

				<div class="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
					<span>No account required</span>
					<span>·</span>
					<span>Self-hosted</span>
					<span>·</span>
					<span>MIT License</span>
				</div>
			</div>

			<!-- Right: mock terminal -->
			<div class="flex-shrink-0 lg:w-[420px]">
				<div class="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
					<div class="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
						<span class="h-3 w-3 rounded-full bg-destructive/70"></span>
						<span class="h-3 w-3 rounded-full bg-yellow-400/70"></span>
						<span class="h-3 w-3 rounded-full bg-primary/70"></span>
						<span class="ml-2 text-xs text-muted-foreground">~/project — ensage</span>
					</div>
					<div class="p-5 font-mono text-sm leading-7">
						<div class="text-muted-foreground">
							<span class="text-primary">$</span>
							<span class="text-foreground"> cat app.ts</span>
							<span class="text-primary"> | ensage</span>
						</div>
						<div class="text-muted-foreground">
							<span class="text-blue-500 dark:text-blue-400">export</span>
							<span class="text-blue-500 dark:text-blue-400"> const</span>
							<span class="text-foreground"> greet</span>
							= (name: string) =&gt; &#123;
						</div>
						<div class="text-muted-foreground">
							&nbsp;&nbsp;<span class="text-blue-500 dark:text-blue-400">return</span>
							<span class="text-green-600 dark:text-green-400"> `Hello, $&#123;name&#125;!`</span>;
						</div>
						<div class="text-muted-foreground">&#125;</div>
						<div class="text-muted-foreground/60">// Sharing 214 bytes...</div>
						<div>
							<span class="text-primary">✓</span>
							<span class="text-foreground"> ensage.app/<strong>x4k9m</strong></span>
						</div>
						<div class="text-muted-foreground/60">// expires: never · protected: no</div>
						<div class="text-muted-foreground">
							<span class="text-primary">$</span>
							<span class="animate-pulse">▋</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ── Features ──────────────────────────────────────────────────────────── -->
<section class="border-b border-border bg-muted/20 py-20 sm:py-28" id="features">
	<div class="mx-auto max-w-6xl px-5 sm:px-8">
		<div class="mb-3 text-xs font-medium uppercase tracking-widest text-primary">Features</div>
		<h2 class="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
			Everything you need to share
		</h2>
		<p class="mb-14 max-w-xl text-base text-muted-foreground">
			Built for developers who value simplicity and control. No bloat, no accounts, no tracking.
		</p>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each [
				{ icon: 'code', name: 'Syntax Highlighting', desc: '30+ languages with auto-detection. From TypeScript to Dockerfile, your code looks sharp.', tag: '30+ languages' },
				{ icon: 'upload', name: 'File Uploads', desc: 'Upload any file type up to 500 MB. Images, videos, PDFs — inline preview included.', tag: 'up to 500 MB' },
				{ icon: 'link', name: 'Link Sharing', desc: 'Share any URL with rich previews — title, description, OG image, and optional AI summary.', tag: 'rich previews' },
				{ icon: 'lock', name: 'Password Protection', desc: 'Secure any share with a password. HMAC-based tokens with timing-safe verification.', tag: 'HMAC tokens' },
				{ icon: 'clock', name: 'Expiry Control', desc: 'Set TTL per upload: 1 hour, 24 hours, 7 days, or never. Auto-cleanup runs hourly.', tag: '1h · 24h · 7d · ∞' },
				{ icon: 'server', name: 'Self-Hosted', desc: 'SQLite + local filesystem. Zero external dependencies. Run on any VPS with a single command.', tag: 'your infra', accent: true },
			] as feat}
				<div class="flex flex-col gap-4 rounded-xl border border-border bg-background p-6 transition-shadow hover:shadow-sm {feat.accent ? 'border-primary/30 bg-primary/5' : ''}">
					<div class="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
						{#if feat.icon === 'code'}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
						{:else if feat.icon === 'upload'}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
						{:else if feat.icon === 'link'}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
						{:else if feat.icon === 'lock'}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
						{:else if feat.icon === 'clock'}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
						{/if}
					</div>
					<div>
						<div class="mb-1.5 font-semibold text-foreground">{feat.name}</div>
						<div class="text-sm leading-relaxed text-muted-foreground">{feat.desc}</div>
					</div>
					<div class="mt-auto pt-1">
						<span class="inline-flex rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{feat.tag}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ── Deploy ────────────────────────────────────────────────────────────── -->
<section class="border-b border-border py-20 sm:py-28" id="deploy">
	<div class="mx-auto max-w-6xl px-5 sm:px-8">
		<div class="mb-3 text-xs font-medium uppercase tracking-widest text-primary">Deploy</div>
		<h2 class="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
			Your platform, your rules
		</h2>
		<p class="mb-14 max-w-xl text-base text-muted-foreground">
			One codebase. Run it on Vercel in one click, or self-host on any VPS with Docker Compose.
		</p>

		<div class="grid gap-6 sm:grid-cols-2">
			<!-- Vercel -->
			<div class="flex flex-col gap-5 rounded-xl border border-border bg-background p-7">
				<div class="flex items-center gap-4">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
						<svg width="18" height="18" viewBox="0 0 76 65" fill="currentColor" aria-hidden="true">
							<path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
						</svg>
					</div>
					<div>
						<div class="font-semibold text-foreground">Vercel</div>
						<div class="text-xs text-muted-foreground">Serverless · auto-scaling</div>
					</div>
				</div>
				<p class="text-sm leading-relaxed text-muted-foreground">
					One-click deploy. PostgreSQL database and Blob storage are automatically provisioned.
				</p>
				<ul class="flex flex-col gap-2 text-sm text-muted-foreground">
					<li class="flex items-center gap-2"><span class="text-primary">✓</span> PostgreSQL via Vercel Postgres</li>
					<li class="flex items-center gap-2"><span class="text-primary">✓</span> File storage via Vercel Blob</li>
					<li class="flex items-center gap-2"><span class="text-primary">✓</span> Edge network & global CDN</li>
					<li class="flex items-center gap-2"><span class="text-primary">✓</span> Automatic cron cleanup</li>
				</ul>
				<a
					href="https://vercel.com/new/clone?repository-url=https://github.com/ehlvg/ensage"
					target="_blank"
					rel="noopener noreferrer"
					class="mt-auto inline-flex items-center justify-center rounded-md border border-border bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent no-underline"
				>
					Deploy to Vercel →
				</a>
			</div>

			<!-- Self-hosted -->
			<div class="relative flex flex-col gap-5 rounded-xl border border-primary/40 bg-primary/5 p-7">
				<div class="absolute right-4 top-4 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
					Recommended
				</div>
				<div class="flex items-center gap-4">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
							<line x1="8" y1="21" x2="16" y2="21"></line>
							<line x1="12" y1="17" x2="12" y2="21"></line>
						</svg>
					</div>
					<div>
						<div class="font-semibold text-foreground">Self-Hosted</div>
						<div class="text-xs text-muted-foreground">VPS · Docker · full control</div>
					</div>
				</div>
				<p class="text-sm leading-relaxed text-muted-foreground">
					Run on any Linux server. SQLite and filesystem storage — no external services needed.
				</p>
				<ul class="flex flex-col gap-2 text-sm text-muted-foreground">
					<li class="flex items-center gap-2"><span class="text-primary">✓</span> SQLite database (zero-config)</li>
					<li class="flex items-center gap-2"><span class="text-primary">✓</span> Local filesystem storage</li>
					<li class="flex items-center gap-2"><span class="text-primary">✓</span> Docker Compose included</li>
					<li class="flex items-center gap-2"><span class="text-primary">✓</span> Node.js standalone build</li>
				</ul>
				<div class="rounded-md border border-border bg-background px-4 py-2.5 font-mono text-sm text-muted-foreground">
					docker-compose up -d
				</div>
				<a
					href="https://github.com/ehlvg/ensage"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 no-underline"
				>
					View on GitHub →
				</a>
			</div>
		</div>
	</div>
</section>

<!-- ── Beta strip ─────────────────────────────────────────────────────────── -->
<section class="border-b border-border bg-primary/5 py-5">
	<div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 sm:px-8">
		<div class="flex items-center gap-2.5 text-sm text-muted-foreground">
			<span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary"></span>
			<span><strong class="text-foreground">Free during the testing period</strong> — all features included, no account required, no usage limits.</span>
		</div>
		<a href="/new" class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 no-underline">
			Try it now →
		</a>
	</div>
</section>

<!-- ── Final CTA ─────────────────────────────────────────────────────────── -->
<section class="py-24 sm:py-32">
	<div class="mx-auto max-w-2xl px-5 text-center sm:px-8">
		<div class="mb-3 text-xs font-medium uppercase tracking-widest text-primary">Get started</div>
		<h2 class="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
			Ready to share?
		</h2>
		<p class="mb-8 text-base leading-relaxed text-muted-foreground">
			No signup. No tracking. Just paste, upload, or share a link — and get a URL instantly.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-3">
			<a href="/new" class="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 no-underline">
				Open App →
			</a>
			<a
				href="https://github.com/ehlvg/ensage"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-md border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted no-underline"
			>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
				</svg>
				Star on GitHub
			</a>
		</div>
	</div>
</section>

<!-- ── Footer ────────────────────────────────────────────────────────────── -->
<footer class="border-t border-border py-8">
	<div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 sm:px-8">
		<div class="flex items-center gap-5">
			<a href="/" class="text-sm font-semibold text-foreground no-underline">en<span class="text-primary">sage</span></a>
			<span class="text-xs text-muted-foreground">Self-hosted pastebin for developers</span>
		</div>
		<div class="flex items-center gap-5 text-sm text-muted-foreground">
			<a href="/new" class="transition-colors hover:text-foreground no-underline">New paste</a>
			<a href="#features" class="transition-colors hover:text-foreground no-underline">Features</a>
			<a href="https://github.com/ehlvg/ensage" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-foreground no-underline">GitHub</a>
			<span>MIT License</span>
		</div>
	</div>
</footer>
