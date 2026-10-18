<script lang="ts">
	import { onMount } from 'svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Lecteur from '#lib/components/Lecteur.svelte';
	import Revision from '#lib/components/Revision.svelte';
	import PointDePassage from '#lib/components/PointDePassage.svelte';
	import { t, type Langue } from '#lib/i18n.ts';
	import {
		cartesDues,
		charger,
		etat,
		exporter,
		finirLecon,
		finirPointDePassage,
		jourLocal,
		lireImport,
		prochaineRevision,
		remplacer,
		serieActuelle,
		serieValideeAujourdhui,
		type Lecture
	} from '#lib/progression.svelte.ts';
	import type { Progression } from '#lib/progression-schema.ts';
	import lecons, { pointsDePassage } from 'virtual:lecons';

	let langue = $state<Langue>('fr');
	let vue = $state<
		| { type: 'accueil' }
		| { type: 'lecon'; id: string }
		| { type: 'revision'; dus: string[] }
		| { type: 'passage'; id: string }
	>({
		type: 'accueil'
	});
	let maintenant = $state(new Date());

	// Leçons prévues par la fiche de structure N1-P1, pas encore écrites.
	const AVENIR: { ordre: number | null; fr: string; en: string }[] = [
		{ ordre: 2, fr: 'Sæll ou sæl ?', en: 'Sæll or sæl?' },
		{ ordre: 3, fr: 'D’où viens-tu ?', en: 'Where are you from?' },
		{ ordre: 4, fr: 'Ça va ?', en: 'How are you?' },
		{ ordre: 5, fr: 'Tu parles quoi ?', en: 'What do you speak?' },
		{ ordre: 6, fr: 'C’est quoi, ça ?', en: 'What’s that?' },
		{ ordre: 7, fr: 'Qui est-ce ?', en: 'Who’s that?' },
		{ ordre: null, fr: 'Point de passage', en: 'Checkpoint' }
	];
	const aVenir = AVENIR.filter((a) =>
		a.ordre === null ? pointsDePassage.length === 0 : !lecons.some((l) => l.ordre === a.ordre)
	);

	/** Tous les mots, par identifiant (uniques entre leçons, vérifié au build). */
	const mots = new Map(lecons.flatMap((l) => l.mots.map((m) => [m.id, m] as const)));

	onMount(() => {
		if (!navigator.language.toLowerCase().startsWith('fr')) langue = 'en';
		charger();
		// L'heure avance : les révisions arrivent à échéance sans recharger la page.
		const minuteur = setInterval(() => (maintenant = new Date()), 30_000);
		return () => clearInterval(minuteur);
	});
	$effect(() => {
		document.documentElement.lang = langue;
	});

	const lecon = $derived.by(() => {
		const v = vue;
		return v.type === 'lecon' ? lecons.find((l) => l.id === v.id) : undefined;
	});
	const dus = $derived(etat.pret ? cartesDues(maintenant).filter((id) => mots.has(id)) : []);
	const serie = $derived(etat.pret ? serieActuelle(maintenant) : 0);
	const serieDuJour = $derived(etat.pret && serieValideeAujourdhui(maintenant));
	const prochaine = $derived(etat.pret && dus.length === 0 ? prochaineRevision() : null);
	const nbCartes = $derived(Object.keys(etat.p.cartes).length);

	const passage = $derived.by(() => {
		const v = vue;
		return v.type === 'passage' ? pointsDePassage.find((p) => p.id === v.id) : undefined;
	});

	/** Le point de passage s'ouvre quand toutes les leçons de sa Partie sont terminées. */
	const passageOuvert = (pp: (typeof pointsDePassage)[number]) =>
		lecons.filter((l) => l.niveau === pp.niveau && l.partie === pp.partie).every((l) => l.id in etat.p.lecons);

	function finPassage(pp: (typeof pointsDePassage)[number], b: { justes: number; total: number; xp: number }, ratees: string[]) {
		const mots = lecons.filter((l) => ratees.includes(l.id)).flatMap((l) => l.mots.map((m) => m.id));
		return finirPointDePassage(pp, b, mots);
	}

	function reviserMaintenant() {
		maintenant = new Date();
		const ids = cartesDues(maintenant).filter((id) => mots.has(id));
		vue = ids.length ? { type: 'revision', dus: ids } : { type: 'accueil' };
	}

	/** Une leçon est ouverte si c'est la première de sa Partie ou si la précédente est terminée. */
	function ouverte(l: (typeof lecons)[number]) {
		if (l.ordre === 1) return true;
		const precedente = lecons.find((x) => x.niveau === l.niveau && x.partie === l.partie && x.ordre === l.ordre - 1);
		return !precedente || precedente.id in etat.p.lecons;
	}

	function delai(d: Date): string {
		const min = Math.round((d.getTime() - maintenant.getTime()) / 60_000);
		if (min <= 0) return t(langue, 'maintenant');
		if (min < 60) return t(langue, 'dans_min').replace('{n}', String(min));
		if (min < 48 * 60) return t(langue, 'dans_h').replace('{n}', String(Math.round(min / 60)));
		return t(langue, 'dans_j').replace('{n}', String(Math.round(min / 1440)));
	}

	// --- Export / import --------------------------------------------------------
	let aImporter = $state<Progression | null>(null);
	let messageImport = $state<{ ok: boolean; texte: string } | null>(null);

	function telecharger() {
		const blob = new Blob([exporter()], { type: 'application/json' });
		const lien = document.createElement('a');
		lien.href = URL.createObjectURL(blob);
		lien.download = `viktoriya-progression-${jourLocal()}.json`;
		lien.click();
		setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
	}

	const ERREURS = { taille: 'import_taille', json: 'import_json', format: 'import_format' } as const;

	async function choisirFichier(e: Event) {
		const champ = e.currentTarget as HTMLInputElement;
		const fichier = champ.files?.[0];
		champ.value = '';
		messageImport = null;
		aImporter = null;
		if (!fichier) return;
		const lecture: Lecture =
			fichier.size > 1_000_000 ? { ok: false, erreur: 'taille' } : lireImport(await fichier.text());
		if (lecture.ok) aImporter = lecture.p;
		else messageImport = { ok: false, texte: t(langue, ERREURS[lecture.erreur]) };
	}

	async function confirmerImport() {
		if (!aImporter) return;
		await remplacer(aImporter);
		aImporter = null;
		messageImport = { ok: true, texte: t(langue, 'import_ok') };
	}
</script>

<svelte:head>
	<title>Viktoriya is learning Icelandic</title>
	<meta name="description" content="Apprendre l'islandais, gratuitement, en leçons courtes." />
</svelte:head>

{#if lecon}
	<Lecteur
		{lecon}
		{langue}
		onquitter={() => (vue = { type: 'accueil' })}
		onfini={(b) => finirLecon(lecon, b)}
	/>
{:else if passage}
	<PointDePassage
		pp={passage}
		{lecons}
		{langue}
		onfini={(b, ratees) => finPassage(passage, b, ratees)}
		onreviser={reviserMaintenant}
		onquitter={() => ((maintenant = new Date()), (vue = { type: 'accueil' }))}
	/>
{:else if vue.type === 'revision'}
	<Revision {mots} dus={vue.dus} {langue} onquitter={() => ((maintenant = new Date()), (vue = { type: 'accueil' }))} />
{:else}
	<div class="accueil">
		<header class="haut">
			<span class="marque">Viktoriya <span class="suite">is learning Icelandic</span></span>
			<div class="langues" role="group" aria-label={t(langue, 'langue')}>
				<button type="button" aria-pressed={langue === 'fr'} onclick={() => (langue = 'fr')}>FR</button>
				<button type="button" aria-pressed={langue === 'en'} onclick={() => (langue = 'en')}>EN</button>
			</div>
		</header>

		<section class="stats" aria-label={t(langue, 'ma_progression')}>
			<div class="stat" class:eteinte={!serieDuJour}>
				<svg viewBox="0 0 24 24" aria-hidden="true" class="flamme">
					<path d="M12 2c1 3.5-1.5 5-1.5 7.5 0 1.4 1 2.5 2.3 2.5 1.6 0 2.4-1.3 2.2-3 2.2 1.6 3.5 4 3.5 6.6C18.5 19.3 15.6 22 12 22s-6.5-2.7-6.5-6.4C5.5 10.4 10.6 7.6 12 2z" />
				</svg>
				<div>
					<strong>{serie} {t(langue, 'jours')}</strong>
					<span>{t(langue, 'serie')}</span>
				</div>
			</div>
			<div class="stat">
				<span class="pastille-xp" aria-hidden="true">XP</span>
				<div>
					<strong>{etat.p.xp}</strong>
					<span>{t(langue, 'xp_total')}</span>
				</div>
			</div>
		</section>
		<p class="note-serie">{serieDuJour ? t(langue, 'serie_ok') : t(langue, 'serie_a_faire')}</p>

		<section class="coach">
			<Avatar qui="superpuffin" grand />
			<p class="bulle-coach" lang="is">
				Halló! <span lang={langue}>{langue === 'fr' ? 'Prêt à décoller ?' : 'Ready for take-off?'}</span>
			</p>
		</section>

		<section class="bloc-revision" class:urgent={dus.length > 0}>
			<div class="texte-revision">
				<h2>{t(langue, 'revisions')}</h2>
				{#if dus.length > 0}
					<p>{dus.length === 1 ? t(langue, 'a_revoir_un') : t(langue, 'a_revoir').replace('{n}', String(dus.length))}</p>
				{:else if nbCartes === 0}
					<p>{t(langue, 'revision_vide')}</p>
				{:else}
					<p>
						{t(langue, 'rien_a_revoir')}
						{#if prochaine}{t(langue, 'prochaine').replace('{quand}', delai(prochaine))}{/if}
					</p>
				{/if}
			</div>
			{#if dus.length > 0}
				<button class="bouton" type="button" onclick={() => (vue = { type: 'revision', dus: [...dus] })}
					>{t(langue, 'reviser')}</button
				>
			{/if}
		</section>

		<p class="repere">{t(langue, 'niveau')} 1 · {t(langue, 'partie')} 1</p>
		<ol class="chemin">
			{#each lecons as l (l.id)}
				{@const fait = l.id in etat.p.lecons}
				{@const libre = ouverte(l)}
				<li class="etape" class:active={libre && !fait} class:faite={fait} class:verrou={!libre}>
					<span class="numero">
						{#if fait}
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
							<span class="visuellement-cache">{t(langue, 'terminee')}</span>
						{:else}{l.ordre}{/if}
					</span>
					<div class="corps">
						<h2>{l.titre[langue]}</h2>
						<p>{l.objectif[langue]} · {l.duree_minutes} {t(langue, 'minutes')}</p>
						{#if !libre}
							<p class="cadenas">{t(langue, 'verrouillee')}</p>
						{:else if fait}
							<button class="bouton secondaire petit-bouton" type="button" onclick={() => (vue = { type: 'lecon', id: l.id })}
								>{t(langue, 'refaire')}</button
							>
						{:else}
							<button class="bouton" type="button" onclick={() => (vue = { type: 'lecon', id: l.id })}
								>{t(langue, 'commencer')}</button
							>
						{/if}
					</div>
				</li>
			{/each}
			{#each pointsDePassage as pp (pp.id)}
				{@const reussi = pp.id in etat.p.lecons}
				{@const libre = passageOuvert(pp)}
				<li class="etape passage" class:active={libre && !reussi} class:faite={reussi} class:verrou={!libre}>
					<span class="numero">
						{#if reussi}
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
							<span class="visuellement-cache">{t(langue, 'terminee')}</span>
						{:else}★{/if}
					</span>
					<div class="corps">
						<h2>{pp.titre[langue]}</h2>
						<p>{pp.objectif[langue]} · {pp.duree_minutes} {t(langue, 'minutes')}</p>
						{#if !libre}
							<p class="cadenas">{t(langue, 'pp_ouvert_apres')}</p>
						{:else if reussi}
							<p>{t(langue, 'pp_meilleur').replace('{pct}', String(Math.round(etat.p.lecons[pp.id].reussite * 100)))}</p>
							<button class="bouton secondaire petit-bouton" type="button" onclick={() => (vue = { type: 'passage', id: pp.id })}
								>{t(langue, 'refaire')}</button
							>
						{:else}
							<button class="bouton" type="button" onclick={() => (vue = { type: 'passage', id: pp.id })}
								>{t(langue, 'commencer')}</button
							>
						{/if}
					</div>
				</li>
			{/each}
			{#each aVenir as a (a.en)}
				<li class="etape verrou">
					<span class="numero">{a.ordre ?? '★'}</span>
					<div class="corps">
						<h2>{a[langue]}</h2>
						<p>{t(langue, 'bientot')}</p>
					</div>
				</li>
			{/each}
		</ol>

		<section class="sauvegarde">
			<h2>{t(langue, 'ma_progression')}</h2>
			<p>{t(langue, 'progression_locale')}</p>
			<div class="actions">
				<button class="bouton secondaire" type="button" onclick={telecharger}>{t(langue, 'exporter')}</button>
				<label class="bouton secondaire fichier">
					{t(langue, 'importer')}
					<input id="import-progression" type="file" accept="application/json,.json" onchange={choisirFichier} />
				</label>
			</div>
			{#if aImporter}
				<div class="confirmation" role="alertdialog" aria-label={t(langue, 'importer')}>
					<p>{t(langue, 'import_confirmer')}</p>
					<div class="actions">
						<button class="bouton" type="button" onclick={confirmerImport}>{t(langue, 'remplacer')}</button>
						<button class="bouton secondaire" type="button" onclick={() => (aImporter = null)}>{t(langue, 'annuler')}</button>
					</div>
				</div>
			{/if}
			{#if messageImport}
				<p class="message" class:erreur={!messageImport.ok} role="status">{messageImport.texte}</p>
			{/if}
		</section>

		<p class="avertissement">{t(langue, 'prototype')}</p>
		<p class="avertissement">{t(langue, 'credits_voix')}</p>
	</div>
{/if}

<style>
	.accueil {
		max-width: 34rem;
		margin: 0 auto;
		padding-block: 1rem 3rem;
		padding-left: max(16px, env(safe-area-inset-left, 0px));
		padding-right: max(16px, env(safe-area-inset-right, 0px));
	}
	.haut {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.marque {
		display: flex;
		flex-direction: column;
		font-family: var(--police-titre);
		font-weight: 900;
		font-size: 1.5rem;
		line-height: 1.05;
		color: var(--primaire);
		letter-spacing: -0.01em;
	}
	.suite {
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0;
		color: var(--texte-doux);
	}
	.langues {
		display: flex;
		border: 2px solid var(--ligne);
		border-radius: 999px;
		overflow: hidden;
	}
	.langues button {
		appearance: none;
		border: 0;
		background: none;
		padding: 0.35rem 0.8rem;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		color: var(--texte-doux);
	}
	.langues button[aria-pressed='true'] {
		background: var(--primaire);
		color: var(--sur-primaire);
	}
	.coach {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		margin: 1.6rem 0 1.4rem;
	}
	.bulle-coach {
		margin: 0;
		padding: 0.7rem 1rem;
		border-radius: 18px 18px 18px 4px;
		background: var(--fond-doux);
		border: 1px solid var(--ligne);
		font-weight: 600;
	}
	.bulle-coach span {
		font-weight: 400;
	}
	.repere {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--texte-doux);
		margin: 0 0 0.8rem;
	}
	.chemin {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0;
	}
	.etape {
		display: grid;
		grid-template-columns: 2.6rem 1fr;
		gap: 0.9rem;
		position: relative;
		padding-bottom: 1rem;
	}
	/* fil qui relie les leçons, comme un sentier de randonnée */
	.etape:not(:last-child)::before {
		content: '';
		position: absolute;
		left: 1.25rem;
		top: 2.6rem;
		bottom: 0;
		border-left: 3px dotted var(--ligne);
	}
	.numero {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 50%;
		font-weight: 800;
		background: var(--fond-doux);
		color: var(--texte-doux);
		border: 2px solid var(--ligne);
	}
	.active .numero {
		background: var(--primaire);
		color: var(--sur-primaire);
		border-color: var(--primaire);
	}
	.corps {
		min-width: 0;
		display: grid;
		gap: 0.3rem;
		padding-top: 0.35rem;
	}
	.corps h2 {
		font-size: 1.15rem;
	}
	.corps p {
		margin: 0;
		color: var(--texte-doux);
		font-size: 0.92rem;
	}
	.active .corps {
		padding: 0.9rem;
		border-radius: var(--rayon);
		border: 2px solid var(--ligne);
		background: var(--surface);
		box-shadow: var(--ombre);
		gap: 0.6rem;
	}
	.active .corps h2 {
		font-size: 1.4rem;
	}
	.verrou .corps h2 {
		color: var(--texte-doux);
		font-weight: 600;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.7rem;
		margin-top: 1.2rem;
	}
	.stat {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.7rem 0.9rem;
		border-radius: var(--rayon);
		border: 2px solid var(--ligne);
	}
	.stat div {
		display: grid;
		line-height: 1.2;
	}
	.stat strong {
		font-size: 1.25rem;
		font-variant-numeric: tabular-nums;
	}
	.stat span {
		font-size: 0.8rem;
		color: var(--texte-doux);
	}
	.flamme {
		width: 2rem;
		height: 2rem;
		flex: none;
	}
	.flamme path {
		fill: var(--rouge);
	}
	.eteinte .flamme path {
		fill: var(--ligne);
	}
	.pastille-xp {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		flex: none;
		border-radius: 50%;
		background: var(--primaire);
		color: var(--sur-primaire) !important;
		font-size: 0.75rem !important;
		font-weight: 900;
	}
	.note-serie {
		margin: 0.5rem 0 0;
		font-size: 0.85rem;
		color: var(--texte-doux);
	}
	.bloc-revision {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		margin-bottom: 1.6rem;
		padding: 1rem;
		border-radius: var(--rayon);
		background: var(--fond-doux);
		border: 1px solid var(--ligne);
	}
	.bloc-revision.urgent {
		border: 2px solid var(--primaire);
	}
	.texte-revision {
		flex: 1 1 14rem;
		min-width: 0;
	}
	.texte-revision h2 {
		font-size: 1.15rem;
	}
	.texte-revision p {
		margin: 0.25rem 0 0;
		color: var(--texte-doux);
		font-size: 0.95rem;
	}
	.bloc-revision .bouton {
		width: auto;
		padding-inline: 1.6rem;
	}
	.faite .numero {
		background: var(--vert);
		border-color: var(--vert);
	}
	.faite .numero svg {
		width: 1.4rem;
		height: 1.4rem;
	}
	.faite .numero path {
		fill: none;
		stroke: var(--sur-accent);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.faite .corps {
		gap: 0.5rem;
	}
	.petit-bouton {
		width: auto;
		justify-self: start;
		padding: 0.5rem 1.2rem;
		font-size: 0.95rem;
	}
	.cadenas {
		font-style: italic;
	}
	.sauvegarde {
		margin-top: 1.4rem;
		padding-top: 1.2rem;
		border-top: 1px solid var(--ligne);
		display: grid;
		gap: 0.6rem;
	}
	.sauvegarde h2 {
		font-size: 1.15rem;
	}
	.sauvegarde p {
		margin: 0;
		font-size: 0.92rem;
		color: var(--texte-doux);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.actions .bouton {
		width: auto;
		flex: 1 1 10rem;
		font-size: 0.95rem;
		padding: 0.7rem 1rem;
	}
	.fichier {
		position: relative;
		text-align: center;
	}
	.fichier input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
	.fichier:focus-within {
		outline: 3px solid var(--primaire);
		outline-offset: 2px;
	}
	.confirmation {
		display: grid;
		gap: 0.6rem;
		padding: 0.9rem;
		border-radius: var(--rayon);
		border: 2px solid var(--primaire);
	}
	.confirmation p {
		color: var(--texte);
	}
	.message {
		font-weight: 600;
		color: var(--succes-trait) !important;
	}
	.message.erreur {
		color: var(--erreur-texte) !important;
	}
	.avertissement {
		margin-top: 1.5rem;
		font-size: 0.85rem;
		color: var(--texte-doux);
	}
</style>
