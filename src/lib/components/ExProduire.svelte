<script lang="ts">
	// Produire : taper la réponse. Saisie affichée en texte brut, normalisée NFC, longueur bornée.
	import Clavier from './Clavier.svelte';
	import { LONGUEUR_MAX, comparerDebutPrenom, comparerPlusieurs, nettoyer } from '#lib/correction.ts';
	import { t, type Langue } from '#lib/i18n.ts';
	import type { Exercice } from '#lib/schema.ts';
	import type { Issue } from '#lib/types.ts';

	let {
		ex,
		langue,
		fige,
		ontermine
	}: {
		ex: Extract<Exercice, { type: 'produire' }>;
		langue: Langue;
		fige: boolean;
		ontermine: (i: Issue) => void;
	} = $props();

	let saisie = $state('');
	let champ = $state<HTMLInputElement>();
	let focus = $state(false);
	const idChamp = `saisie-${ex.id}`;

	function verifier(e: SubmitEvent) {
		e.preventDefault();
		if (fige || !nettoyer(saisie)) return;
		const r =
			ex.debut_attendu && ex.suite_libre
				? comparerDebutPrenom(saisie, ex.debut_attendu, ex.tolerance)
				: comparerPlusieurs(saisie, ex.reponses_acceptees ?? [], ex.tolerance);
		if (r.statut === 'juste') ontermine({ juste: true });
		else if (r.statut === 'accents') ontermine({ juste: true, accents: r.correction });
		else ontermine({ juste: false, solution: r.attendu, solutionIslandaise: true });
	}
</script>

<form class="exercice" onsubmit={verifier}>
	<label class="consigne" for={idChamp}>{ex.consigne[langue]}</label>
	<input
		id={idChamp}
		bind:this={champ}
		bind:value={saisie}
		onfocus={() => (focus = true)}
		onblur={() => (focus = false)}
		class="champ is"
		lang="is"
		type="text"
		inputmode="text"
		autocomplete="off"
		autocapitalize="sentences"
		spellcheck="false"
		maxlength={LONGUEUR_MAX}
		readonly={fige}
		placeholder={ex.debut_attendu ? `${ex.debut_attendu} …` : '…'}
	/>
	<div class="action">
		{#if !fige}
			<button class="bouton" type="submit" disabled={!saisie.trim()}>{t(langue, 'verifier')}</button>
		{/if}
	</div>
</form>

{#if focus && !fige}
	<Clavier cible={champ} {langue} />
{/if}

<style>
	.exercice {
		display: grid;
		gap: 1.1rem;
	}
	.consigne {
		font-family: var(--police-titre);
		font-size: 1.3rem;
		font-weight: 700;
		line-height: 1.2;
	}
	.champ {
		width: 100%;
		font: inherit;
		font-size: 1.25rem;
		padding: 0.9rem 1rem;
		border-radius: var(--rayon);
		border: 2px solid var(--ligne);
		background: var(--surface);
		color: var(--texte);
	}
	.champ:focus {
		border-color: var(--primaire);
		outline: none;
	}
	.action {
		margin-top: 0.4rem;
		/* place pour la barre de lettres quand elle est ouverte */
		margin-bottom: 4rem;
	}
</style>
