<script lang="ts">
	import { onMount } from 'svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Lecteur from '#lib/components/Lecteur.svelte';
	import { t, type Langue } from '#lib/i18n.ts';
	import lecons from 'virtual:lecons';

	const data = { lecons };
	let langue = $state<Langue>('fr');
	let enCours = $state<string | null>(null);

	// Leçons prévues par la fiche de structure N1-P1, pas encore écrites.
	const AVENIR: Record<Langue, string[]> = {
		fr: ['Sæll ou sæl ?', 'D’où viens-tu ?', 'Ça va ?', 'Tu parles quoi ?', 'C’est quoi, ça ?', 'Qui est-ce ?', 'Point de passage'],
		en: ['Sæll or sæl?', 'Where are you from?', 'How are you?', 'What do you speak?', 'What’s that?', 'Who’s that?', 'Checkpoint']
	};

	onMount(() => {
		if (!navigator.language.toLowerCase().startsWith('fr')) langue = 'en';
	});
	$effect(() => {
		document.documentElement.lang = langue;
	});

	const lecon = $derived(data.lecons.find((l) => l.id === enCours));
</script>

<svelte:head>
	<title>Superpuffin</title>
	<meta name="description" content="Apprendre l'islandais, gratuitement, en leçons courtes." />
</svelte:head>

{#if lecon}
	<Lecteur {lecon} {langue} onquitter={() => (enCours = null)} />
{:else}
	<div class="accueil">
		<header class="haut">
			<span class="marque">Superpuffin</span>
			<div class="langues" role="group" aria-label={t(langue, 'langue')}>
				<button type="button" aria-pressed={langue === 'fr'} onclick={() => (langue = 'fr')}>FR</button>
				<button type="button" aria-pressed={langue === 'en'} onclick={() => (langue = 'en')}>EN</button>
			</div>
		</header>

		<section class="coach">
			<Avatar qui="superpuffin" grand />
			<p class="bulle-coach" lang="is">
				Halló! <span lang={langue}>{langue === 'fr' ? 'Prêt à décoller ?' : 'Ready for take-off?'}</span>
			</p>
		</section>

		<p class="repere">{t(langue, 'niveau')} 1 · {t(langue, 'partie')} 1</p>
		<ol class="chemin">
			{#each data.lecons as l (l.id)}
				<li class="etape active">
					<span class="numero">{l.ordre}</span>
					<div class="corps">
						<h2>{l.titre[langue]}</h2>
						<p>{l.objectif[langue]} · {l.duree_minutes} {t(langue, 'minutes')}</p>
						<button class="bouton" type="button" onclick={() => (enCours = l.id)}>{t(langue, 'commencer')}</button>
					</div>
				</li>
			{/each}
			{#each AVENIR[langue] as titre, i (titre)}
				<li class="etape verrou">
					<span class="numero">{i === AVENIR[langue].length - 1 ? '★' : i + 2}</span>
					<div class="corps">
						<h2>{titre}</h2>
						<p>{t(langue, 'bientot')}</p>
					</div>
				</li>
			{/each}
		</ol>
		<p class="avertissement">{t(langue, 'prototype')}</p>
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
		font-family: var(--police-titre);
		font-weight: 900;
		font-size: 1.5rem;
		color: var(--primaire);
		letter-spacing: -0.01em;
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
	.avertissement {
		margin-top: 1.5rem;
		font-size: 0.85rem;
		color: var(--texte-doux);
	}
</style>
