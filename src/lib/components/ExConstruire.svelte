<script lang="ts">
	// Construire : remettre des blocs dans l'ordre.
	import { assembler, melanger } from '#lib/correction.ts';
	import { t, type Langue } from '#lib/i18n.ts';
	import type { Exercice, Lecon } from '#lib/schema.ts';
	import type { Issue } from '#lib/types.ts';

	let {
		ex,
		lecon,
		langue,
		fige,
		ontermine
	}: {
		ex: Extract<Exercice, { type: 'construire' }>;
		lecon: Pick<Lecon, 'phrases'>;
		langue: Langue;
		fige: boolean;
		ontermine: (i: Issue) => void;
	} = $props();

	const blocs = melanger(ex.blocs.map((texte, i) => ({ texte, i })));
	let places = $state<number[]>([]);
	const attendu = $derived(lecon.phrases.find((p) => p.id === ex.reponse)!.is);

	function verifier() {
		const phrase = assembler(places.map((i) => ex.blocs[i]));
		const juste = phrase === attendu;
		ontermine({ juste, solution: juste ? undefined : attendu, solutionIslandaise: true });
	}
</script>

<div class="exercice">
	<h2 class="consigne">{ex.consigne[langue]}</h2>
	<div class="ligne" aria-label={t(langue, 'ta_reponse')}>
		{#each places as i (i)}
			<button
				type="button"
				class="bloc is"
				lang="is"
				disabled={fige}
				aria-label="{t(langue, 'effacer')} {ex.blocs[i]}"
				onclick={() => (places = places.filter((p) => p !== i))}>{ex.blocs[i]}</button
			>
		{/each}
	</div>
	<div class="banque">
		{#each blocs as b (b.i)}
			<button
				type="button"
				class="bloc is"
				lang="is"
				class:utilise={places.includes(b.i)}
				disabled={fige || places.includes(b.i)}
				onclick={() => (places = [...places, b.i])}>{b.texte}</button
			>
		{/each}
	</div>
	{#if ex.note}<p class="note">{ex.note[langue]}</p>{/if}
</div>

<div class="action">
	{#if !fige}
		<button class="bouton" type="button" disabled={places.length !== ex.blocs.length} onclick={verifier}
			>{t(langue, 'verifier')}</button
		>
	{/if}
</div>

<style>
	.exercice {
		display: grid;
		gap: 1.1rem;
	}
	.consigne {
		font-size: 1.3rem;
	}
	.ligne {
		min-height: 3.6rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 2px solid var(--ligne);
	}
	.banque {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
		padding-top: 0.5rem;
	}
	.bloc {
		appearance: none;
		padding: 0.55rem 0.9rem;
		border-radius: 12px;
		border: 2px solid var(--ligne);
		background: var(--surface);
		box-shadow: 0 2px 0 var(--ligne);
		cursor: pointer;
		font-size: 1.1rem;
	}
	.utilise {
		color: transparent;
		background: var(--fond-doux);
		box-shadow: none;
		cursor: default;
	}
	.note {
		margin: 0;
		color: var(--texte-doux);
		font-size: 0.95rem;
	}
	.action {
		margin-top: 1.5rem;
	}
</style>
