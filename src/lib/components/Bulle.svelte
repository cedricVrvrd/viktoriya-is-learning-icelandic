<script lang="ts">
	import Avatar from './Avatar.svelte';
	import BoutonAudio from './BoutonAudio.svelte';
	import { NOMS_PERSONNAGES, t, type Langue } from '#lib/i18n.ts';
	import type { Phrase } from '#lib/schema.ts';

	let {
		locuteur,
		phrase,
		langue,
		auto = false,
		masquer = false
	}: {
		locuteur: string;
		phrase: Phrase;
		langue: Langue;
		/** Jouer l'audio dès l'affichage. */
		auto?: boolean;
		/** Exercice d'écoute : le texte n'apparaît qu'après la réponse. */
		masquer?: boolean;
	} = $props();
	const cache = $derived(masquer && !!phrase.audio);
	let traduction = $state(false);
	// Viktoriya est le double de l'apprenant : ses répliques sont à droite.
	const droite = $derived(locuteur === 'viktoriya');
</script>

<div class="replique" class:droite>
	<Avatar qui={locuteur} />
	<div class="bulle" class:erreur={phrase.erreur_volontaire}>
		<span class="nom">{NOMS_PERSONNAGES[locuteur]}</span>
		<div class="ligne">
			{#if phrase.audio}<BoutonAudio fichier={phrase.audio} {langue} {auto} />{/if}
			{#if cache}
				<p class="cache" aria-label={t(langue, 'texte_cache')}>• • •</p>
			{:else}
				<p class="is" lang="is">
					{phrase.is}
					{#if phrase.erreur_volontaire}<span class="marque">{t(langue, 'erreur_marquee')}</span>{/if}
				</p>
			{/if}
		</div>
		{#if cache}
			<!-- traduction disponible après la réponse -->
		{:else if traduction}
			<p class="trad">{phrase[langue]}</p>
		{:else}
			<button class="voir" type="button" onclick={() => (traduction = true)}>{t(langue, 'traduction')}</button>
		{/if}
	</div>
</div>

<style>
	.replique {
		display: flex;
		gap: 0.6rem;
		align-items: flex-end;
	}
	.droite {
		flex-direction: row-reverse;
	}
	.bulle {
		min-width: 0;
		max-width: 80%;
		background: var(--fond-doux);
		border: 1px solid var(--ligne);
		border-radius: 18px 18px 18px 4px;
		padding: 0.55rem 0.85rem 0.6rem;
	}
	.droite .bulle {
		border-radius: 18px 18px 4px 18px;
		background: var(--surface);
	}
	.ligne {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.15rem;
	}
	.ligne p {
		margin: 0;
		min-width: 0;
	}
	.cache {
		letter-spacing: 0.2em;
		color: var(--texte-doux);
	}
	.nom {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--texte-doux);
	}
	p {
		margin: 0.1rem 0 0;
	}
	.erreur .is {
		text-decoration: underline wavy var(--rouge);
		text-underline-offset: 4px;
	}
	.marque {
		margin-left: 0.4rem;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--erreur-texte);
		text-decoration: none;
		display: inline-block;
	}
	.trad {
		color: var(--texte-doux);
		font-size: 0.92rem;
	}
	.voir {
		appearance: none;
		border: 0;
		background: none;
		padding: 0.2rem 0;
		color: var(--primaire);
		font-size: 0.85rem;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
