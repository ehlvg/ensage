<script lang="ts">
	function toggleTheme() {
		const current = document.documentElement.getAttribute('data-theme');
		const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		let next: string;
		if (!current) {
			next = sysDark ? 'light' : 'dark';
		} else if (current === 'dark') {
			next = 'light';
		} else {
			next = 'dark';
		}
		document.documentElement.setAttribute('data-theme', next);
		localStorage.setItem('ensage-theme', next);
	}
</script>

<header
	class="sticky top-0 z-10 flex h-12 items-center justify-between border-b px-6"
	style="border-color: var(--border); background: var(--bg);"
>
	<a
		href="/"
		class="text-sm font-medium tracking-tight no-underline"
		style="color: var(--fg);"
	>
		en<span style="color: var(--accent);">sage</span>
	</a>

	<div class="flex items-center gap-2">
		<button
			onclick={toggleTheme}
			class="flex h-8 w-8 cursor-pointer items-center justify-center rounded border bg-transparent p-0"
			style="border-color: transparent; color: var(--fg-3);"
			aria-label="Toggle theme"
		>
			<!-- Sun icon (light mode) -->
			<svg class="theme-icon-light" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="5"/>
				<line x1="12" y1="1" x2="12" y2="3"/>
				<line x1="12" y1="21" x2="12" y2="23"/>
				<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
				<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
				<line x1="1" y1="12" x2="3" y2="12"/>
				<line x1="21" y1="12" x2="23" y2="12"/>
				<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
				<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
			</svg>
			<!-- Moon icon (dark mode) -->
			<svg class="theme-icon-dark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
			</svg>
		</button>
	</div>
</header>
