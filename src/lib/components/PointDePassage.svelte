<script lang="ts">
	// Point de passage : quiz de fin de Partie. Une seule réponse par question, pas de retour
	// des erreurs ; on valide si la part de bonnes réponses atteint le seuil (80 %).
	// En cas d'échec, l'appelant remet en révision les mots des leçons ratées.
	import Avatar from './Avatar.svelte';
	import BoutonAudio from './BoutonAudio.svelte';
	import { jouer } from '#lib/audio.ts';
	import ExChoix from './ExChoix.svelte';
	import ExConstruire from './ExConstruire.svelte';
	import ExProduire from './ExProduire.svelte';
	import { t, type Langue } from '#lib/i18n.ts';
	import { leconVisee, type Lecon, type PointDePassage } from '#lib/schema.ts';
	import type { Issue } from '#lib/types.ts';

	let {
		pp,
		lecons,
		langue,
		onfini,
		onreviser,
		onquitter,
		test = false
	}: {
		pp: PointDePassage;
		lecons: Lecon[];
		langue: Langue;
		/** Renvoie true si la Partie est validée. */
		onfini: (b: { justes: number; total: number; xp: number }, leconsRatees: string[]) => Promise<boolean>;
		onreviser: () => void;
		onquitter: () => void;
		test?: boolean;
	} = $props();

	let phase = $state<'intro' | 'quiz' | 'fin'>('intro');
	let position = $state(0);
	let issue = $state<Issue | null>(null);
	let justes = $state(0);
	let xp = $state(0);
	let ratees = $state<string[]>([]);
	let valide = $state(false);
	let essai = $state(0);

	const total = pp.exercices.length;
	const ex = $derived(pp.exercices[position]);
	const contexte = { phrases: pp.phrases };
	const titreLecon = (id: string) => lecons.find((l) => l.id === id)?.titre[langue] ?? id;
	const score = $derived(total ? justes / total : 0);

	function terminer(i: Issue) {
		issue = i;
		// Superpuffin répète la bonne réponse.
		if (i.son) jouer(i.son);
		if (i.juste) {
			justes += 1;
			xp += 10;
		} else {
			const l = leconVisee(ex.id);
			if (l && !ratees.includes(l)) ratees = [...ratees, l];
		}
	}

	async function continuer() {
		issue = null;
		if (position + 1 >= total) {
			valide = await onfini({ justes, total, xp }, ratees);
			phase = 'fin';
		} else position += 1;
		window.scrollTo({ top: 0 });
	}

	function recommencer() {
		phase = 'quiz';
		position = 0;
		justes = 0;
		xp = 0;
		ratees = [];
		issue = null;
		essai += 1;
	}
</script>

<div class="passage">
	<header class="entete">
		<button class="fermer" type="button" aria-label={t(langue, 'quitter')} onclick={onquitter}>✕</button>
		<div class="crans" role="progressbar" aria-valuemin="0" aria-valuemax={total} aria-valuenow={phase === 'fin' ? total : position}>
			{#each pp.exercices as _, i (i)}
				<span class="cran" class:fait={phase === 'fin' || i < position}></span>
			{/each}
		</div>
		<span class="xp">{xp} XP</span>
	</header>

	<main class="contenu">
		{#if phase === 'intro'}
			<section class="annonce">
				<Avatar qui={pp.intro.locuteur} grand />
				<h2>{pp.titre[langue]}</h2>
				<p>{pp.intro.message[langue]}</p>
				<button class="bouton" type="button" onclick={() => (phase = 'quiz')}>{t(langue, 'pp_commencer')}</button>
			</section>
		{:else if phase === 'quiz' && ex}
			{#if test && !issue}
				<button class="passer-test" type="button" onclick={continuer}>{t(langue, 'passer_test')} →</button>
			{/if}
			{#key `${essai}-${position}`}
				{#if ex.type === 'construire'}
					<ExConstruire {ex} lecon={contexte} {langue} fige={!!issue} ontermine={terminer} />
				{:else if ex.type === 'produire'}
					<ExProduire {ex} {langue} fige={!!issue} ontermine={terminer} />
				{:else if ex.type !== 'associer'}
					<ExChoix {ex} lecon={contexte} {langue} fige={!!issue} ontermine={terminer} />
				{/if}
			{/key}
		{:else if phase === 'fin'}
			{@const message = valide ? pp.reussite : pp.echec}
			<section class="annonce">
				{#if valide}<div class="aurore" aria-hidden="true"></div>{/if}
				<Avatar qui={message.locuteur} grand />
				<h2>{valide ? t(langue, 'pp_valide') : t(langue, 'pp_rate')}</h2>
				<p class="score" class:reussi={valide}>{Math.round(score * 100)} %</p>
				<p>
					{t(langue, 'pp_score').replace('{n}', String(justes)).replace('{total}', String(total))}
					{#if !valide}{t(langue, 'pp_seuil').replace('{pct}', String(Math.round(pp.seuil * 100)))}{/if}
				</p>
				<p>{message.message[langue]}</p>
				{#if !valide && ratees.length}
					<div class="a-revoir">
						<strong>{t(langue, 'pp_a_revoir')}</strong>
						<ul>
							{#each ratees as id (id)}<li>{titreLecon(id)}</li>{/each}
						</ul>
					</div>
					<button class="bouton" type="button" onclick={onreviser}>{t(langue, 'pp_reviser')}</button>
					<button class="bouton secondaire" type="button" onclick={recommencer}>{t(langue, 'pp_retenter')}</button>
				{:else}
					<button class="bouton" type="button" onclick={onquitter}>{t(langue, 'continuer')}</button>
				{/if}
			</section>
		{/if}
	</main>

	{#if issue}
		<div class="retour-panneau" class:juste={issue.juste} class:faux={!issue.juste} role="status">
			<div>
				{#if issue.juste && issue.accents}
					<strong>{t(langue, 'presque')}</strong>
					<p class="is" lang="is">
						{#each issue.accents as s, i (i)}<span class:fautif={s.fautif}>{s.texte}</span>{/each}
					</p>
				{:else if issue.juste}
					<strong>{t(langue, 'bravo')}</strong>
				{:else}
					<strong>{t(langue, 'rate')}</strong>
					{#if issue.solution}
						<p class={{ is: issue.solutionIslandaise }} lang={issue.solutionIslandaise ? 'is' : langue}>{issue.solution}</p>
					{/if}
				{/if}
			</div>
			<div class="retour-actions">
				{#if issue.son}<BoutonAudio fichier={issue.son} {langue} />{/if}
				<button class="bouton" type="button" onclick={continuer}>{t(langue, 'continuer')}</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.passage {
		max-width: 34rem;
		margin: 0 auto;
		min-height: 100%;
	}
	.entete {
		position: sticky;
		top: env(safe-area-inset-top, 0px);
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding-block: 0.8rem;
		padding-left: max(16px, env(safe-area-inset-left, 0px));
		padding-right: max(16px, env(safe-area-inset-right, 0px));
		background: var(--fond);
	}
	.fermer {
		appearance: none;
		border: 0;
		background: none;
		font-size: 1.3rem;
		color: var(--texte-doux);
		cursor: pointer;
		padding: 0.2rem 0.4rem;
	}
	.crans {
		flex: 1;
		display: flex;
		gap: 3px;
	}
	.cran {
		flex: 1;
		height: 10px;
		border-radius: 5px;
		background: var(--ligne);
	}
	.cran.fait {
		background: var(--primaire);
	}
	.xp {
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--primaire);
		min-width: 3.5rem;
		text-align: right;
	}
	.contenu {
		padding-block: 0.6rem 9rem;
		padding-left: max(16px, env(safe-area-inset-left, 0px));
		padding-right: max(16px, env(safe-area-inset-right, 0px));
	}
	.annonce {
		position: relative;
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 0.8rem;
		padding-top: 1.5rem;
	}
	.annonce h2 {
		font-size: 1.8rem;
	}
	.annonce p {
		margin: 0;
	}
	.petit {
		font-size: 0.9rem;
		color: var(--texte-doux);
	}
	.score {
		font-size: 2.6rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: var(--erreur-texte);
	}
	.score.reussi {
		color: var(--succes-trait);
	}
	.a-revoir {
		width: 100%;
		text-align: left;
		padding: 0.9rem 1rem;
		border-radius: var(--rayon);
		background: var(--fond-doux);
		border: 1px solid var(--ligne);
	}
	.a-revoir ul {
		margin: 0.4rem 0 0;
		padding-left: 1.2rem;
	}
	.retour-panneau {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 10;
		display: grid;
		gap: 0.8rem;
		padding-top: 1rem;
		padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
		padding-left: max(16px, env(safe-area-inset-left, 0px));
		padding-right: max(16px, env(safe-area-inset-right, 0px));
		border-top: 3px solid;
	}
	.retour-panneau > * {
		width: 100%;
		max-width: 32rem;
		margin: 0 auto;
	}
	.passer-test {
		appearance: none;
		display: block;
		margin: 0 0 0.6rem auto;
		padding: 0.3rem 0.7rem;
		border: 2px dashed var(--primaire);
		border-radius: 999px;
		background: none;
		color: var(--primaire);
		font: inherit;
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
	}
	.retour-actions {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.retour-actions .bouton {
		flex: 1;
	}
	.retour-panneau p {
		margin: 0.25rem 0 0;
	}
	.juste {
		background: var(--succes-fond);
		border-color: var(--vert);
	}
	.faux {
		background: var(--erreur-fond);
		border-color: var(--rouge);
	}
	.fautif {
		color: var(--erreur-texte);
		text-decoration: underline 2px;
		text-underline-offset: 3px;
	}
	.aurore {
		position: absolute;
		inset: -1rem -16px auto;
		height: 12rem;
		z-index: -1;
		background:
			radial-gradient(60% 50% at 30% 40%, rgb(61 220 151 / 0.55), transparent 70%),
			radial-gradient(50% 45% at 70% 30%, rgb(90 166 239 / 0.45), transparent 70%);
		filter: blur(18px);
	}
</style>
