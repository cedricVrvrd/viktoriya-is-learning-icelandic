<script lang="ts">
	// Produire : taper la réponse. Saisie affichée en texte brut, normalisée NFC, longueur bornée.
	// Dictée : même saisie, mais la consigne est un mot épelé lettre par lettre, à réécouter à volonté.
	import { onMount } from 'svelte';
	import Clavier from './Clavier.svelte';
	import { arreter, jouerSuite } from '#lib/audio.ts';
	import { LONGUEUR_MAX, comparer, comparerDebutPrenom, comparerPlusieurs, nettoyer } from '#lib/correction.ts';
	import { t, type Langue } from '#lib/i18n.ts';
	import type { Exercice } from '#lib/schema.ts';
	import type { Issue } from '#lib/types.ts';

	let {
		ex,
		langue,
		fige,
		ontermine
	}: {
		ex: Extract<Exercice, { type: 'produire' | 'dictee' }>;
		langue: Langue;
		fige: boolean;
		ontermine: (i: Issue) => void;
	} = $props();

	let saisie = $state('');
	let champ = $state<HTMLInputElement>();
	let focus = $state(false);
	const idChamp = `saisie-${ex.id}`;

	// Dictée : les noms des lettres, joués à la suite ; null = pause entre deux mots.
	const lettres = ex.type === 'dictee' ? (ex.sons?.lettres ?? []) : [];
	const lettresDisponibles = lettres.some(Boolean);
	let enCours = $state(false);
	async function ecouterLettres(pause: number) {
		enCours = true;
		await jouerSuite(lettres, pause);
		enCours = false;
	}
	onMount(() => {
		if (lettresDisponibles) ecouterLettres(450);
		return () => arreter();
	});

	function verifier(e: SubmitEvent) {
		e.preventDefault();
		if (fige || !nettoyer(saisie)) return;
		if (ex.type === 'dictee') {
			const r = comparer(saisie, ex.a_epeler, ex.tolerance);
			const son = ex.sons?.reponse ?? undefined;
			if (r.statut === 'juste') ontermine({ juste: true, son });
			else if (r.statut === 'accents') ontermine({ juste: true, accents: r.correction, son });
			else ontermine({ juste: false, solution: ex.a_epeler, solutionIslandaise: true, son });
			return;
		}
		const r =
			ex.debut_attendu && ex.suite_libre
				? comparerDebutPrenom(saisie, ex.debut_attendu, ex.tolerance)
				: comparerPlusieurs(saisie, ex.reponses_acceptees ?? [], ex.tolerance);
		// Superpuffin répète la réponse acceptée la plus proche de la saisie (la première, à défaut).
		const acceptees = ex.reponses_acceptees ?? [];
		const visee = Math.max(0, acceptees.findIndex((a) => comparer(saisie, a, ex.tolerance).statut !== 'faux'));
		const son = ex.sons?.reponses?.[visee] ?? undefined;
		if (r.statut === 'juste') ontermine({ juste: true, son });
		else if (r.statut === 'accents') ontermine({ juste: true, accents: r.correction, son });
		else ontermine({ juste: false, solution: r.attendu, solutionIslandaise: true, son });
	}
</script>

<form class="exercice" onsubmit={verifier}>
	<label class="consigne" for={idChamp}>{ex.consigne[langue]}</label>
	{#if ex.type === 'dictee'}
		<div class="ecoute">
			<button type="button" class="bouton secondaire" class:enCours disabled={!lettresDisponibles} onclick={() => ecouterLettres(450)}>
				{t(langue, 'dictee_ecouter')}
			</button>
			<button type="button" class="bouton secondaire" disabled={!lettresDisponibles} onclick={() => ecouterLettres(1100)}>
				{t(langue, 'dictee_lent')}
			</button>
		</div>
	{/if}
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
		placeholder={ex.type === 'produire' && ex.debut_attendu ? `${ex.debut_attendu} …` : '…'}
	/>
	{#if fige && ex.type === 'dictee' && ex.sens}
		<p class="sens">{t(langue, 'dictee_sens')} <span lang="is" class="is">{ex.a_epeler}</span> = {ex.sens[langue]}</p>
	{/if}
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
	.ecoute {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.ecoute .enCours {
		outline: 3px solid var(--primaire);
		outline-offset: 2px;
	}
	.sens {
		margin: 0;
		color: var(--texte-doux, inherit);
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
