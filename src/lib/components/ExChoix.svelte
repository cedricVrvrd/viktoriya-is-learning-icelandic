<script lang="ts">
	// Reconnaître, Retrouver, Accorder, Écouter un dialogue : une seule bonne réponse parmi 2 à 4.
	import { onMount } from 'svelte';
	import Bulle from './Bulle.svelte';
	import BoutonAudio from './BoutonAudio.svelte';
	import { arreter, jouerSuite } from '#lib/audio.ts';
	import { melanger } from '#lib/correction.ts';
	import { t, type Langue } from '#lib/i18n.ts';
	import type { Exercice, Lecon } from '#lib/schema.ts';
	import type { Issue } from '#lib/types.ts';

	type ExAvecChoix = Extract<Exercice, { choix: unknown }>;
	let {
		ex,
		lecon,
		langue,
		fige,
		ontermine
	}: { ex: ExAvecChoix; lecon: Lecon; langue: Langue; fige: boolean; ontermine: (i: Issue) => void } =
		$props();

	const phrases = $derived(new Map(lecon.phrases.map((p) => [p.id, p])));
	const islandais = $derived(ex.type === 'retrouver' || ex.type === 'accorder');
	// Ordre mélangé une fois, à l'affichage de l'exercice.
	const options = melanger(ex.choix.map((c, i) => ({ ...c, i })));
	let choisi = $state<number | null>(null);

	const libelle = (c: (typeof options)[number]) => (islandais ? c.is! : c[langue]!);
	const trous = $derived(ex.type === 'accorder' ? ex.phrase_a_trous.split('___') : []);

	// Écouter un dialogue : les répliques s'enchaînent, le texte n'apparaît qu'après la réponse.
	const sonsDialogue = $derived(
		ex.type === 'ecouter_dialogue'
			? ex.repliques.map((r) => phrases.get(r.phrase)?.audio).filter((a): a is string => !!a)
			: []
	);
	const ecouterDialogue = () => jouerSuite(sonsDialogue);
	onMount(() => {
		if (sonsDialogue.length) ecouterDialogue();
		return () => arreter();
	});

	function verifier() {
		const c = options.find((o) => o.i === choisi);
		if (!c) return;
		const bon = options.find((o) => o.correct)!;
		ontermine({
			juste: !!c.correct,
			solution: c.correct ? undefined : libelle(bon),
			solutionIslandaise: islandais,
			explication: !c.correct && ex.type === 'accorder' && !!ex.explication
		});
	}
</script>

<div class="exercice">
	<h2 class="consigne">{ex.consigne[langue]}</h2>

	{#if ex.type === 'reconnaitre'}
		{@const p = phrases.get(ex.question)}
		{#if p}
			<div class="question avec-son">
				{#if p.audio}<BoutonAudio fichier={p.audio} {langue} auto grand />{/if}
				<p class="is" lang="is">{p.is}</p>
			</div>
		{/if}
	{:else if ex.type === 'accorder'}
		<p class="question is" lang="is">
			{trous[0]}<span class="trou" class:rempli={choisi !== null}
				>{choisi !== null ? libelle(options.find((o) => o.i === choisi)!) : '…'}</span
			>{trous[1]}
		</p>
	{:else if ex.type === 'ecouter_dialogue'}
		<div class="dialogue">
			{#each ex.repliques as r, i (i)}
				{@const p = phrases.get(r.phrase)}
				{#if p}<Bulle locuteur={r.locuteur} phrase={p} {langue} masquer={!fige} />{/if}
			{/each}
			{#if sonsDialogue.length}
				<button type="button" class="bouton secondaire" onclick={ecouterDialogue}>{t(langue, 'reecouter')}</button>
			{/if}
		</div>
	{/if}

	<div class="options" role="radiogroup" aria-label={ex.consigne[langue]}>
		{#each options as c (c.i)}
			<button
				type="button"
				role="radio"
				aria-checked={choisi === c.i}
				class={['option', { choisi: choisi === c.i, is: islandais }]}
				lang={islandais ? 'is' : langue}
				disabled={fige}
				onclick={() => (choisi = c.i)}>{libelle(c)}</button
			>
		{/each}
	</div>
</div>

<div class="action">
	{#if !fige}
		<button class="bouton" type="button" disabled={choisi === null} onclick={verifier}
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
	.question {
		font-size: 1.6rem;
		margin: 0;
		padding: 1rem;
		background: var(--fond-doux);
		border-radius: var(--rayon);
		text-align: center;
	}
	.avec-son {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.8rem;
	}
	.avec-son p {
		margin: 0;
	}
	.trou {
		display: inline-block;
		min-width: 4.5ch;
		border-bottom: 3px solid var(--ligne);
		margin: 0 0.25ch;
		color: var(--texte-doux);
	}
	.trou.rempli {
		color: var(--primaire);
		border-color: var(--primaire);
	}
	.dialogue {
		display: grid;
		gap: 0.8rem;
	}
	.options {
		display: grid;
		gap: 0.6rem;
	}
	.option {
		appearance: none;
		text-align: left;
		padding: 0.9rem 1rem;
		border-radius: var(--rayon);
		border: 2px solid var(--ligne);
		background: var(--surface);
		box-shadow: 0 2px 0 var(--ligne);
		cursor: pointer;
		font-size: 1.05rem;
	}
	.option.choisi {
		border-color: var(--primaire);
		box-shadow: 0 2px 0 var(--primaire);
		background: var(--fond-doux);
	}
	.option:disabled {
		cursor: default;
	}
	.action {
		margin-top: 1.5rem;
	}
</style>
