<script lang="ts">
	import './layout.css';

	let { children } = $props();

	// Apply stored theme before first paint to avoid flash
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem('ensage-theme');
		const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		if (stored === 'dark' || stored === 'light') {
			document.documentElement.setAttribute('data-theme', stored);
			document.documentElement.classList.toggle('dark', stored === 'dark');
		} else {
			document.documentElement.classList.toggle('dark', sysDark);
		}
	}
</script>

<svelte:head>
	<title>ensage — Share code, files & links</title>
	<meta name="description" content="Self-hosted pastebin and file sharing for developers. Syntax highlighting, file uploads, link previews, password protection. Open-source and free." />
</svelte:head>

{@render children()}
