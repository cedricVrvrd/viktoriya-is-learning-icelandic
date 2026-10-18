<script lang="ts">
	// Déroulé d'une leçon : scène → carte de grammaire → exercices → fin.
	// Les erreurs reviennent en fin de leçon, sans pénalité, jusqu'à être réussies.
	import Avatar from './Avatar.svelte';
	import BoutonAudio from './BoutonAudio.svelte';
	import { jouer } from '#lib/audio.ts';
	import Bulle from './Bulle.svelte';
	import ExChoix from './ExChoix.svelte';
	import ExAssocier from './ExAssocier.svelte';
	import ExConstruire from './ExConstruire.svelte';
	import ExProduire from './ExProduire.svelte';
	import { NOMS_PERSONNAGES, t, type Langue } from '#lib/i18n.ts';
	import type { Exercice, Lecon } from '#lib/schema.ts';
	import type { Issue } from '#lib/types.ts';
	import type { Bilan } from '#lib/progression.svelte.ts';

	let {
		lecon,
		langue,
		onquitter,
		onfini,
		test = false
	}: { lecon: Lecon; langue: Langue; onquitter: () => void; onfini?: (b: Bilan) => void; test?: boolean } = $props();

	type Etape = { ex: Exercice; retour: boolean };
	let phase = $state<'scene' | 'grammaire' | 'exercices' | 'fin'>('scene');
	let visibles = $state(1);
	let file = $state<Etape[]>(lecon.exercices.map((ex) => ({ ex, retour: false })));
	let position = $state(0);
	let issue = $state<Issue | null>(null);
	let reussis = $state<string[]>([]);
	let premierCoup = $state(0);
	let xp = $state(0);

	const phrases = $derived(new Map(lecon.phrases.map((p) => [p.id, p])));
	const total = lecon.exercices.length;
	const avancement = $derived(
		phase === 'fin' ? 1 : phase === 'exercices' ? reussis.length / total : 0
	);
	const etape = $derived(file[position]);

	function terminer(i: Issue) {
		issue = i;
		// Superpuffin répète la bonne réponse.
		if (i.son) jouer(i.son);
		if (i.juste) {
			reussis = [...reussis, etape.ex.id];
			if (!etape.retour) premierCoup += 1;
			xp += etape.retour ? 5 : 10;
		} else {
			file = [...file, { ex: etape.ex, retour: true }];
		}
	}

	function continuer() {
		issue = null;
		if (position + 1 >= file.length) {
			phase = 'fin';
			onfini?.({ premierCoup, total, xp });
		} else position += 1;
		window.scrollTo({ top: 0 });
	}

	function suiteScene() {
		if (visibles < lecon.scene.repliques.length) visibles += 1;
		else phase = 'grammaire';
	}
</script>

<div class="lecteur">
	<header class="entete">
		<button class="fermer" type="button" aria-label={t(langue, 'quitter')} onclick={onquitter}>✕</button>
		<div
			class="progression"
			role="progressbar"
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={Math.round(avancement * 100)}
		>
			<div class="remplissage" class:vide={avancement === 0}>
				{#each Array.from({ length: total }) as _, i (i)}
					<span class="cran" class:fait={i < Math.round(avancement * total)}></span>
				{/each}
			</div>
		</div>
		<span class="xp" aria-label={t(langue, 'xp')}>{xp} XP</span>
	</header>

	<main class="contenu">
		{#if phase === 'scene'}
			<p class="didascalie">{lecon.scene.didascalie[langue]}</p>
			<div class="dialogue" aria-live="polite">
				{#each lecon.scene.repliques.slice(0, visibles) as r, i (i)}
					{@const p = phrases.get(r.phrase)}
					<!-- la dernière réplique affichée se joue toute seule : on vient de toucher « Suivant » -->
					{#if p}<Bulle locuteur={r.locuteur} phrase={p} {langue} auto={i === visibles - 1} />{/if}
				{/each}
			</div>
			<div class="action">
				<button class="bouton" type="button" onclick={suiteScene}>{t(langue, 'suivant')}</button>
				{#if visibles < lecon.scene.repliques.length}
					<button class="bouton secondaire" type="button" onclick={() => (phase = 'grammaire')}
						>{t(langue, 'passer_scene')}</button
					>
				{/if}
			</div>
		{:else if phase === 'grammaire'}
			{@const g = lecon.explication}
			<section class="grammaire">
				<div class="question-gr">
					<Avatar qui={g.introduite_par} grand />
					<div>
						<span class="qui">{NOMS_PERSONNAGES[g.introduite_par]}</span>
						<h2>{g.question[langue]}</h2>
					</div>
				</div>
				<p>{g.reponse[langue]}</p>
				<table>
					<tbody>
						{#each g.tableau as ligne (ligne.is)}
							<tr><td class="is" lang="is">{ligne.is}</td><td>{ligne[langue]}</td></tr>
						{/each}
					</tbody>
				</table>
			</section>
			<div class="action">
				<button class="bouton" type="button" onclick={() => (phase = 'exercices')}>{t(langue, 'compris')}</button>
			</div>
		{:else if phase === 'exercices' && etape}
			{#if test && !issue}
				<button class="passer-test" type="button" onclick={continuer}>{t(langue, 'passer_test')} →</button>
			{/if}
			{#if etape.retour}<p class="retour">{t(langue, 'retour_erreur')}</p>{/if}
			{#key position}
				{@const ex = etape.ex}
				{#if ex.type === 'associer'}
					<ExAssocier {ex} {lecon} {langue} fige={!!issue} ontermine={terminer} />
				{:else if ex.type === 'construire'}
					<ExConstruire {ex} {lecon} {langue} fige={!!issue} ontermine={terminer} />
				{:else if ex.type === 'produire' || ex.type === 'dictee'}
					<ExProduire {ex} {langue} fige={!!issue} ontermine={terminer} />
				{:else}
					<ExChoix {ex} {lecon} {langue} fige={!!issue} ontermine={terminer} />
				{/if}
			{/key}
		{:else if phase === 'fin'}
			<section class="fin">
				<div class="aurore" aria-hidden="true"></div>
				<Avatar qui={lecon.fin.locuteur} grand />
				<h2>{t(langue, 'lecon_finie')}</h2>
				<p class="message">{lecon.fin.message[langue]}</p>
				<dl class="bilan">
					<div><dt>{t(langue, 'xp')}</dt><dd>{xp}</dd></div>
					<div><dt>{t(langue, 'reussite')}</dt><dd>{premierCoup} / {total}</dd></div>
				</dl>
				{#if test}<p class="avertissement-test">{t(langue, 'fin_test')}</p>{/if}
				<button class="bouton" type="button" onclick={onquitter}>{t(langue, 'continuer')}</button>
			</section>
		{/if}
	</main>

	{#if issue}
		<div class="retour-panneau" class:juste={issue.juste} class:faux={!issue.juste} role="status">
			<div class="retour-texte">
				{#if issue.juste && issue.accents}
					<strong>{t(langue, 'presque')}</strong>
					<p class="is" lang="is">
						{#each issue.accents as s, i (i)}<span class:fautif={s.fautif}>{s.texte}</span>{/each}
					</p>
					<p class="petit">{t(langue, 'accents_rouges')}</p>
				{:else if issue.juste}
					<strong>{t(langue, 'bravo')}</strong>
				{:else}
					<strong>{t(langue, 'rate')}</strong>
					{#if issue.solution}
						<p class={{ is: issue.solutionIslandaise }} lang={issue.solutionIslandaise ? 'is' : langue}>
							{issue.solution}
						</p>
					{/if}
					{#if issue.explication}<p class="petit">{lecon.explication.reponse[langue]}</p>{/if}
					<p class="petit">{t(langue, 'reviendra')}</p>
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
	.lecteur {
		max-width: 34rem;
		margin: 0 auto;
		min-height: 100%;
		display: flex;
		flex-direction: column;
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
	.progression {
		flex: 1;
	}
	.remplissage {
		display: flex;
		gap: 3px;
	}
	.cran {
		flex: 1;
		height: 10px;
		border-radius: 5px;
		background: var(--ligne);
		transition: background 250ms ease;
	}
	.cran.fait {
		background: var(--vert);
	}
	.xp {
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--primaire);
		min-width: 3.5rem;
		text-align: right;
	}
	.contenu {
		flex: 1;
		padding-block: 0.6rem 9rem;
		padding-left: max(16px, env(safe-area-inset-left, 0px));
		padding-right: max(16px, env(safe-area-inset-right, 0px));
	}
	.didascalie {
		font-style: italic;
		color: var(--texte-doux);
		margin: 0 0 1.2rem;
	}
	.dialogue {
		display: grid;
		gap: 0.9rem;
	}
	.action {
		margin-top: 1.6rem;
		display: grid;
		gap: 0.6rem;
	}
	.retour {
		margin: 0 0 0.8rem;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--texte-doux);
	}
	.grammaire {
		display: grid;
		gap: 1rem;
		padding: 1.2rem;
		border-radius: var(--rayon);
		background: var(--fond-doux);
		border: 1px solid var(--ligne);
	}
	.question-gr {
		display: flex;
		gap: 0.9rem;
		align-items: center;
	}
	.qui {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--texte-doux);
	}
	.grammaire h2 {
		font-size: 1.3rem;
	}
	.grammaire p {
		margin: 0;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		background: var(--surface);
		border-radius: 10px;
		overflow: hidden;
	}
	td {
		padding: 0.6rem 0.8rem;
		border-bottom: 1px solid var(--ligne);
	}
	tr:last-child td {
		border-bottom: 0;
	}
	td.is {
		font-size: 1.15rem;
		color: var(--primaire);
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
		animation: monte 180ms ease-out;
	}
	.retour-panneau > * {
		width: 100%;
		max-width: 32rem;
		margin: 0 auto;
	}
	.juste {
		background: var(--succes-fond);
		border-color: var(--vert);
	}
	.faux {
		background: var(--erreur-fond);
		border-color: var(--rouge);
	}
	.avertissement-test {
		margin: 0;
		padding: 0.6rem 0.9rem;
		border: 2px dashed var(--ligne);
		border-radius: var(--rayon);
		color: var(--texte-doux);
		font-size: 0.95rem;
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
	.retour-texte p {
		margin: 0.25rem 0 0;
	}
	.retour-texte .is {
		font-size: 1.2rem;
	}
	.fautif {
		color: var(--erreur-texte);
		text-decoration: underline 2px;
		text-underline-offset: 3px;
	}
	.petit {
		font-size: 0.9rem;
		color: var(--texte-doux);
	}
	@keyframes monte {
		from {
			transform: translateY(100%);
		}
	}
	.fin {
		position: relative;
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 1rem;
		padding-top: 2rem;
	}
	.fin h2 {
		font-size: 1.8rem;
	}
	.message {
		margin: 0;
		font-size: 1.1rem;
	}
	.bilan {
		display: flex;
		gap: 0.8rem;
		margin: 0.5rem 0 1rem;
		width: 100%;
	}
	.bilan div {
		flex: 1;
		padding: 0.8rem;
		border-radius: var(--rayon);
		border: 2px solid var(--ligne);
	}
	.bilan dt {
		font-size: 0.8rem;
		color: var(--texte-doux);
	}
	.bilan dd {
		margin: 0.2rem 0 0;
		font-size: 1.6rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--primaire);
	}
	/* Signature : une petite aurore à chaque leçon réussie. */
	.aurore {
		position: absolute;
		inset: -1rem -16px auto;
		height: 12rem;
		z-index: -1;
		background:
			radial-gradient(60% 50% at 30% 40%, rgb(61 220 151 / 0.55), transparent 70%),
			radial-gradient(50% 45% at 70% 30%, rgb(90 166 239 / 0.45), transparent 70%);
		filter: blur(18px);
		animation: aurore 4s ease-in-out infinite alternate;
	}
	@keyframes aurore {
		from {
			transform: translateX(-6%) skewX(-6deg);
			opacity: 0.7;
		}
		to {
			transform: translateX(6%) skewX(6deg);
			opacity: 1;
		}
	}
</style>
