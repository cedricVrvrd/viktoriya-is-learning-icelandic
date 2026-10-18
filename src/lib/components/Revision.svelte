<script lang="ts">
	// Session de révision espacée : jusqu'à 12 mots dus, en alternant
	// islandais → sens (reconnaître) et sens → islandais (retrouver).
	// Chaque première réponse note la carte FSRS ; une erreur revient en fin de session.
	import Avatar from './Avatar.svelte';
	import BoutonAudio from './BoutonAudio.svelte';
	import { jouer } from '#lib/audio.ts';
	import { melanger } from '#lib/correction.ts';
	import { t, type Langue } from '#lib/i18n.ts';
	import { finirRevision, noterRevision } from '#lib/progression.svelte.ts';
	import type { Lecon } from '#lib/schema.ts';

	type Mot = Lecon['mots'][number];
	let {
		mots,
		dus,
		langue,
		onquitter
	}: { mots: Map<string, Mot>; dus: string[]; langue: Langue; onquitter: () => void } = $props();

	type Question = { mot: Mot; sens: 'is-vers-sens' | 'sens-vers-is'; options: Mot[]; retour: boolean };

	const MAX = 12;
	const connus = [...mots.values()];

	/** Sens d'un mot découpé en éléments : « salut, bonjour » → {salut, bonjour}. */
	const elements = (m: Mot) =>
		new Set(
			m[langue]
				.toLowerCase()
				.replace(/\([^)]*\)/g, '')
				.split(/[,;/]/)
				.map((x) => x.trim())
				.filter(Boolean)
		);
	/** Un distracteur ne doit partager aucun sens avec la bonne réponse (« bonjour » vs « salut, bonjour »). */
	const ambigu = (a: Mot, b: Mot) => [...elements(a)].some((e) => elements(b).has(e)) || a.lemme === b.lemme;

	function poser(mot: Mot, i: number, retour = false): Question {
		const autres = melanger(connus.filter((m) => m.id !== mot.id && !ambigu(m, mot)));
		return {
			mot,
			sens: i % 2 === 0 ? 'is-vers-sens' : 'sens-vers-is',
			options: melanger([mot, ...autres.slice(0, 2)]),
			retour
		};
	}

	// Liste figée au démarrage : les cartes notées pendant la session ne la modifient pas.
	const depart = dus
		.slice(0, MAX)
		.map((id) => mots.get(id))
		.filter((m): m is Mot => !!m);
	let file = $state<Question[]>(depart.map((m, i) => poser(m, i)));
	let position = $state(0);
	let choisi = $state<string | null>(null);
	let verdict = $state<boolean | null>(null);
	let reussis = $state(0);
	let xp = $state(0);
	let fini = $state(false);

	const q = $derived(file[position]);
	const total = depart.length;

	function verifier() {
		if (!q || choisi === null) return;
		const juste = choisi === q.mot.id;
		verdict = juste;
		if (q.mot.audio) jouer(q.mot.audio);
		if (!q.retour) noterRevision(q.mot.id, juste);
		if (juste) {
			reussis += 1;
			xp += q.retour ? 2 : 5;
		} else {
			file = [...file, poser(q.mot, file.length, true)];
		}
	}

	async function continuer() {
		choisi = null;
		verdict = null;
		if (position + 1 >= file.length) {
			fini = true;
			await finirRevision(xp);
		} else position += 1;
		window.scrollTo({ top: 0 });
	}
</script>

<div class="revision">
	<header class="entete">
		<button class="fermer" type="button" aria-label={t(langue, 'quitter_revision')} onclick={onquitter}>✕</button>
		<div class="barre" role="progressbar" aria-valuemin="0" aria-valuemax={total} aria-valuenow={Math.min(reussis, total)}>
			<span class="plein" style:width="{(Math.min(reussis, total) / Math.max(total, 1)) * 100}%"></span>
		</div>
		<span class="xp">{xp} XP</span>
	</header>

	<main class="contenu">
		{#if fini || !q}
			<section class="fin">
				<Avatar qui="superpuffin" grand />
				<h2>{t(langue, 'revision_finie')}</h2>
				<p>{t(langue, 'revision_bilan').replace('{n}', String(total))}</p>
				<p class="gain">+{xp} XP</p>
				<button class="bouton" type="button" onclick={onquitter}>{t(langue, 'continuer')}</button>
			</section>
		{:else}
			{#if q.retour}<p class="retour">{t(langue, 'retour_erreur')}</p>{/if}
			<h2 class="consigne">
				{q.sens === 'is-vers-sens' ? t(langue, 'revision_sens') : t(langue, 'revision_islandais')}
			</h2>
			{#key position}
				<div class="cible-ligne">
					{#if q.sens === 'is-vers-sens' && q.mot.audio}<BoutonAudio fichier={q.mot.audio} {langue} auto grand />{/if}
					<p class="cible" lang={q.sens === 'is-vers-sens' ? 'is' : langue} class:is={q.sens === 'is-vers-sens'}>
						{q.sens === 'is-vers-sens' ? q.mot.lemme : q.mot[langue]}
					</p>
				</div>
			{/key}
			<div class="options" role="radiogroup" aria-label={t(langue, 'revision_choix')}>
				{#each q.options as o (o.id)}
					{@const islandais = q.sens === 'sens-vers-is'}
					<button
						type="button"
						role="radio"
						aria-checked={choisi === o.id}
						class={['option', { choisi: choisi === o.id, is: islandais }]}
						lang={islandais ? 'is' : langue}
						disabled={verdict !== null}
						onclick={() => {
							choisi = o.id;
							if (islandais && o.audio) jouer(o.audio);
						}}>{islandais ? o.lemme : o[langue]}</button
					>
				{/each}
			</div>
			{#if verdict === null}
				<button class="bouton verifier" type="button" disabled={choisi === null} onclick={verifier}
					>{t(langue, 'verifier')}</button
				>
			{/if}
		{/if}
	</main>

	{#if verdict !== null && q}
		<div class="retour-panneau" class:juste={verdict} class:faux={!verdict} role="status">
			<div>
				<strong>{verdict ? t(langue, 'bravo') : t(langue, 'rate')}</strong>
				{#if !verdict}
					<p><span class="is" lang="is">{q.mot.lemme}</span> = {q.mot[langue]}</p>
					<p class="petit">{t(langue, 'reviendra_bientot')}</p>
				{/if}
			</div>
			<div class="retour-actions">
				{#if q.mot.audio}<BoutonAudio fichier={q.mot.audio} {langue} />{/if}
				<button class="bouton" type="button" onclick={continuer}>{t(langue, 'continuer')}</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.revision {
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
	.barre {
		flex: 1;
		height: 10px;
		border-radius: 5px;
		background: var(--ligne);
		overflow: hidden;
	}
	.plein {
		display: block;
		height: 100%;
		background: var(--vert);
		transition: width 250ms ease;
	}
	.xp {
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--primaire);
		min-width: 3.5rem;
		text-align: right;
	}
	.cible-ligne {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.8rem;
	}
	.cible-ligne .cible {
		flex: 1;
	}
	.retour-actions {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.retour-actions .bouton {
		flex: 1;
	}
	.contenu {
		display: grid;
		gap: 1.1rem;
		padding-block: 0.6rem 9rem;
		padding-left: max(16px, env(safe-area-inset-left, 0px));
		padding-right: max(16px, env(safe-area-inset-right, 0px));
	}
	.retour {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--texte-doux);
	}
	.consigne {
		font-size: 1.3rem;
	}
	.cible {
		margin: 0;
		padding: 1.1rem;
		border-radius: var(--rayon);
		background: var(--fond-doux);
		text-align: center;
		font-size: 1.6rem;
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
	.verifier {
		margin-top: 0.6rem;
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
	.petit {
		font-size: 0.9rem;
		color: var(--texte-doux);
	}
	.fin {
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 0.8rem;
		padding-top: 2rem;
	}
	.fin h2 {
		font-size: 1.8rem;
	}
	.fin p {
		margin: 0;
	}
	.gain {
		font-size: 1.6rem;
		font-weight: 800;
		color: var(--primaire);
	}
</style>
