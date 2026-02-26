<script lang="ts">
	import './layout.css';

	let { children } = $props();

	// Apply stored theme before first paint to avoid flash
	// This runs on the client only (browser check)
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem('ensage-theme');
		if (stored === 'dark' || stored === 'light') {
			document.documentElement.setAttribute('data-theme', stored);
		}
	}
</script>

<svelte:head>
	<title>ensage</title>
	<meta name="description" content="Self-hosted file drop and pastebin" />
</svelte:head>

<div class="app-shell">
	<div class="app-container">
		{@render children()}
	</div>
</div>

<style>
	.app-shell {
		min-height: 100vh;
		display: flex;
		justify-content: center;
	}

	.app-container {
		width: 100%;
		max-width: var(--max-w);
		padding: 2rem 1.5rem 3rem;
	}

	@media (max-width: 640px) {
		.app-container {
			padding: 1.5rem 1rem 2.5rem;
		}
	}
</style>
