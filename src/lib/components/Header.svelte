<script lang="ts">
	import { resolve } from '$app/paths';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { RiGithubFill, RiMoonLine, RiSunLine, RiAddLine } from 'remixicon-svelte';
	import { onMount } from 'svelte';

	let {
		showFab = false
	}: {
		showFab?: boolean;
	} = $props();

	let isDark = $state(false);

	onMount(() => {
		const stored = localStorage.getItem('ensage-theme');
		if (stored) isDark = stored === 'dark';
		else isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	});

	function toggleTheme() {
		isDark = !isDark;
		const next = isDark ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', next);
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('ensage-theme', next);
	}
</script>

<Tooltip.Provider delayDuration={300}>
	<header class="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
		<div class="flex h-12 items-center gap-1 px-5 sm:px-6">
			<!-- Logo -->
			<a
				href={resolve('/')}
				class="mr-1 text-[0.9375rem] font-semibold tracking-tight text-foreground no-underline"
			>
				en<span class="text-primary">sage</span>
			</a>

			<!-- NavigationMenu -->
			<NavigationMenu.Root viewport={false}>
				<NavigationMenu.List>
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href={resolve('/new')}
							class="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
						>
							New
						</NavigationMenu.Link>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href="https://github.com/ehlvg/ensage"
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
						>
							<RiGithubFill width={14} height={14} />
							GitHub
						</NavigationMenu.Link>
					</NavigationMenu.Item>
				</NavigationMenu.List>
			</NavigationMenu.Root>

			<!-- Right: theme toggle -->
			<div class="ml-auto">
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								onclick={toggleTheme}
								aria-label="Toggle theme"
								class="h-8 w-8 text-muted-foreground hover:text-foreground"
							>
								{#if isDark}
									<RiSunLine width={15} height={15} />
								{:else}
									<RiMoonLine width={15} height={15} />
								{/if}
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>{isDark ? 'Light mode' : 'Dark mode'}</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		</div>
	</header>

	<!-- FAB: New share (shown only on view pages) -->
	{#if showFab}
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<a
						{...props}
						href={resolve('/new')}
						class="fixed bottom-6 right-6 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:opacity-90 hover:shadow-xl no-underline"
						aria-label="New share"
					>
						<RiAddLine width={22} height={22} />
					</a>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content side="left">
				<p>New share</p>
			</Tooltip.Content>
		</Tooltip.Root>
	{/if}
</Tooltip.Provider>
