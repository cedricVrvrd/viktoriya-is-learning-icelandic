<script lang="ts">
	// Mini-barre flottante de lettres islandaises, posée au-dessus du clavier du téléphone.
	// Règle du projet : tout champ où l'on tape de l'islandais affiche cette barre
	// (Produire, Dictée, et tout futur exercice de saisie).
	// Appui court : minuscule. Appui long (450 ms) : majuscule.
	// Position suivie avec l'API VisualViewport, qui donne la hauteur réelle du clavier.
	import { onMount } from 'svelte';
	import { t, type Langue } from '#lib/i18n.ts';

	let { cible, langue }: { cible: HTMLInputElement | undefined; langue: Langue } = $props();

	const LETTRES = ['þ', 'ð', 'æ', 'ö', 'á', 'é', 'í', 'ó', 'ú', 'ý'];
	let barre: HTMLDivElement;
	let minuteur: ReturnType<typeof setTimeout> | undefined;
	let longAppui = false;

	onMount(() => {
		const vv = window.visualViewport;
		const placer = () => {
			const decalage = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
			barre?.style.setProperty('--decalage-clavier', `${Math.round(decalage)}px`);
		};
		placer();
		vv?.addEventListener('resize', placer);
		vv?.addEventListener('scroll', placer);
		return () => {
			vv?.removeEventListener('resize', placer);
			vv?.removeEventListener('scroll', placer);
		};
	});

	function inserer(lettre: string) {
		if (!cible) return;
		const debut = cible.selectionStart ?? cible.value.length;
		const fin = cible.selectionEnd ?? debut;
		cible.setRangeText(lettre, debut, fin, 'end');
		cible.dispatchEvent(new Event('input', { bubbles: true }));
		cible.focus();
	}

	function appui(e: PointerEvent, lettre: string) {
		e.preventDefault(); // garde le focus dans le champ, donc le clavier du téléphone reste ouvert
		longAppui = false;
		minuteur = setTimeout(() => {
			longAppui = true;
			inserer(lettre.toLocaleUpperCase('is'));
		}, 450);
	}
	function relache(lettre: string) {
		clearTimeout(minuteur);
		if (!longAppui) inserer(lettre);
	}
</script>

<div class="barre" bind:this={barre} role="toolbar" aria-label={t(langue, 'clavier')}>
	{#each LETTRES as l (l)}
		<button
			type="button"
			class="touche"
			lang="is"
			onpointerdown={(e) => appui(e, l)}
			onpointerup={() => relache(l)}
			onpointerleave={() => clearTimeout(minuteur)}
			onpointercancel={() => clearTimeout(minuteur)}
			oncontextmenu={(e) => e.preventDefault()}
			onclick={(e) => {
				if (e.detail === 0) inserer(l); // activation au clavier physique
			}}>{l}</button
		>
	{/each}
</div>

<style>
	.barre {
		position: fixed;
		left: 0;
		right: 0;
		bottom: var(--decalage-clavier, 0px);
		z-index: 20;
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		gap: 4px;
		padding: 6px max(8px, env(safe-area-inset-right, 0px)) calc(6px + env(safe-area-inset-bottom, 0px))
			max(8px, env(safe-area-inset-left, 0px));
		background: var(--fond-doux);
		border-top: 1px solid var(--ligne);
	}
	.touche {
		appearance: none;
		min-width: 0;
		height: 2.6rem;
		border: 0;
		border-radius: 8px;
		background: var(--surface);
		box-shadow: 0 1px 0 var(--ligne), inset 0 0 0 1px var(--ligne);
		font-size: 1.2rem;
		font-weight: 600;
		cursor: pointer;
		touch-action: manipulation;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}
	.touche:active {
		background: var(--primaire);
		color: var(--sur-primaire);
	}
</style>
