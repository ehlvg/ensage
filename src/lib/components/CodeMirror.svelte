<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { EditorState, Compartment } from '@codemirror/state';
	import { keymap } from '@codemirror/view';
	import { indentWithTab } from '@codemirror/commands';
	import { LanguageDescription } from '@codemirror/language';
	import { languages } from '@codemirror/language-data';
	import { gruvboxDark } from '@uiw/codemirror-theme-gruvbox-dark';

	let {
		value = $bindable(''),
		language = 'auto',
		onSubmit,
		class: className = ''
	}: {
		value?: string;
		language?: string;
		onSubmit?: () => void;
		class?: string;
	} = $props();

	let container: HTMLDivElement;
	let view: EditorView;
	const langCompartment = new Compartment();

	// Track last value set from inside the editor to break reactive loops
	let internalValue = '';

	async function loadLanguage(lang: string) {
		if (lang === 'auto' || lang === 'plaintext') return [];
		const desc = LanguageDescription.matchLanguageName(languages, lang, true);
		if (!desc) return [];
		const support = await desc.load();
		return [support];
	}

	onMount(async () => {
		const langExt = await loadLanguage(language);

		const submitExt = onSubmit
			? [keymap.of([{ key: 'Mod-Enter', run: () => { onSubmit?.(); return true; } }])]
			: [];

		view = new EditorView({
			state: EditorState.create({
				doc: value,
				extensions: [
					basicSetup,
					gruvboxDark,
					keymap.of([indentWithTab]),
					...submitExt,
					langCompartment.of(langExt),
					EditorView.updateListener.of((update) => {
						if (update.docChanged) {
							internalValue = update.state.doc.toString();
							value = internalValue;
						}
					}),
					EditorView.theme({
						'&': { minHeight: '320px', fontSize: '13px' },
						'.cm-scroller': {
							fontFamily: "'Geist Mono Variable', 'JetBrains Mono', monospace",
							lineHeight: '1.75'
						},
						'.cm-focused': { outline: 'none' },
						'.cm-editor': { borderRadius: '0' }
					})
				]
			}),
			parent: container
		});
	});

	// Sync value when changed externally (e.g., reset)
	$effect(() => {
		if (!view) return;
		if (value === internalValue) return; // came from editor, skip
		const current = view.state.doc.toString();
		if (value !== current) {
			internalValue = value;
			view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
		}
	});

	// Update language when prop changes
	$effect(() => {
		const lang = language;
		if (!view) return;
		loadLanguage(lang).then((ext) => {
			view.dispatch({ effects: langCompartment.reconfigure(ext) });
		});
	});

	onDestroy(() => view?.destroy());
</script>

<div bind:this={container} class={className}></div>
