<script lang="ts">
	// Grille de lettres : le sens est affiché, l'apprenant touche les lettres du mot islandais dans l'ordre.
	// Une lettre absente du mot passe en rouge et reste désactivée ; une lettre du mot touchée trop tôt
	// clignote en rouge. Les espaces et la ponctuation se placent seuls. Mot trouvé : Superpuffin le dit.
	import { melanger } from '#lib/correction.ts';
	import { t, type Langue } from '#lib/i18n.ts';
	import { ALPHABET, LETTRES_ETRANGERES } from '#lib/lettres.ts';
	import type { Exercice } from '#lib/schema.ts';
	import type { Issue } from '#lib/types.ts';

	let {
		ex,
		langue,
		fige,
		ontermine
	}: {
		ex: Extract<Exercice, { type: 'grille' }>;
		langue: Langue;
		fige: boolean;
		ontermine: (i: Issue) => void;
	} = $props();

	/** Au-delà de ce nombre d'erreurs, l'exercice reviendra en fin de leçon. */
	const ERREURS_TOLEREES = 2;

	const bas = (c: string) => c.toLocaleLowerCase('is');
	const estLettre = (c: string) => /\p{L}/u.test(c);
	const mot = ex.a_trouver.normalize('NFC');
	const caracteres = [...mot];
	const attendues = caracteres.filter(estLettre).map(bas);
	const dansLeMot = new Set(attendues);

	/** Lettres proches, pour des leurres qui obligent à regarder l'accent. */
	const VOISINES: Record<string, string[]> = {
		a: ['á', 'æ'], á: ['a', 'ó'], e: ['é', 'æ'], é: ['e'], i: ['í', 'y'], í: ['i', 'ý'],
		o: ['ó', 'ö'], ó: ['o', 'ö'], u: ['ú', 'ö'], ú: ['u'], y: ['ý', 'i'], ý: ['y', 'í'],
		þ: ['ð', 't'], ð: ['þ', 'd'], d: ['ð'], t: ['þ'], æ: ['a', 'e'], ö: ['o', 'u']
	};

	function construireGrille() {
		const total = Math.max(20, Math.ceil((attendues.length + 6) / 5) * 5);
		const leurres = new Set<string>();
		for (const l of melanger([...dansLeMot])) for (const v of VOISINES[l] ?? []) leurres.add(v);
		const reserve = melanger([...ALPHABET, ...LETTRES_ETRANGERES]);
		const choix = [...melanger([...leurres]), ...reserve].filter((l) => !dansLeMot.has(l));
		const uniques = [...new Set(choix)];
		const remplissage = Array.from({ length: total - attendues.length }, (_, i) => uniques[i % uniques.length]);
		return melanger([...attendues, ...remplissage]).map((lettre, id) => ({ id, lettre }));
	}

	const tuiles = construireGrille();
	let utilisees = $state<number[]>([]);
	let rouges = $state<number[]>([]);
	let clignote = $state<number | null>(null);
	let erreurs = $state(0);
	let trouve = $state(false);

	/** Lettres déjà trouvées, avec les espaces et la ponctuation qui les suivent. */
	const progression = $derived.by(() => {
		let n = utilisees.length;
		let sortie = '';
		for (const c of caracteres) {
			if (estLettre(c)) {
				if (n === 0) break;
				n--;
			}
			sortie += c;
		}
		return sortie;
	});

	function toucher(tuile: { id: number; lettre: string }) {
		if (fige || trouve || utilisees.includes(tuile.id) || rouges.includes(tuile.id)) return;
		const suivante = attendues[utilisees.length];
		if (tuile.lettre === suivante) {
			utilisees = [...utilisees, tuile.id];
			if (utilisees.length === attendues.length) {
				trouve = true;
				ontermine({ juste: erreurs <= ERREURS_TOLEREES, solution: mot, solutionIslandaise: true, son: ex.sons?.reponse });
			}
			return;
		}
		erreurs += 1;
		if (!dansLeMot.has(tuile.lettre)) {
			rouges = [...rouges, tuile.id];
		} else {
			clignote = tuile.id;
			setTimeout(() => {
				if (clignote === tuile.id) clignote = null;
			}, 600);
		}
	}
</script>

<div class="exercice">
	<p class="consigne">{ex.consigne[langue]}</p>
	<div class="carte">
		<p class="sens">{ex.sens[langue]}</p>
		<p class="progression is" lang="is" aria-live="polite">{progression || ' '}</p>
		<div class="grille" role="group" aria-label={t(langue, 'grille_lettres')}>
			{#each tuiles as tuile (tuile.id)}
				{@const utilisee = utilisees.includes(tuile.id)}
				<button
					type="button"
					class="tuile"
					lang="is"
					class:utilisee
					class:rouge={rouges.includes(tuile.id) || clignote === tuile.id}
					disabled={fige || trouve || utilisee || rouges.includes(tuile.id)}
					onclick={() => toucher(tuile)}>{tuile.lettre.toLocaleUpperCase('is')}</button
				>
			{/each}
		</div>
	</div>
	{#if erreurs > 0 && !trouve}
		<p class="erreurs">{t(langue, 'grille_erreurs').replace('{n}', String(erreurs))}</p>
	{/if}
</div>

<style>
	.exercice {
		display: grid;
		gap: 1rem;
	}
	.consigne {
		margin: 0;
		font-family: var(--police-titre);
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--texte-doux);
	}
	.carte {
		display: grid;
		gap: 0.6rem;
		justify-items: center;
		padding: 1.2rem 1rem 1.4rem;
		border-radius: var(--rayon);
		background: var(--fond-doux);
		border: 1px solid var(--ligne);
	}
	.sens {
		margin: 0;
		font-family: var(--police-titre);
		font-size: 1.9rem;
		font-weight: 700;
		text-align: center;
		line-height: 1.15;
	}
	.progression {
		margin: 0;
		min-height: 1.8rem;
		font-size: 1.4rem;
		font-weight: 600;
		color: var(--primaire);
		white-space: pre;
	}
	.grille {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 3.4rem));
		gap: 0.5rem;
		justify-content: center;
		width: 100%;
	}
	.tuile {
		appearance: none;
		aspect-ratio: 1;
		min-width: 0;
		border: 0;
		border-radius: 12px;
		background: var(--surface);
		box-shadow: 0 2px 0 var(--ligne), inset 0 0 0 1px var(--ligne);
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--texte);
		cursor: pointer;
		touch-action: manipulation;
		transition: background 0.15s, opacity 0.15s;
	}
	.tuile.utilisee {
		opacity: 0.3;
		box-shadow: none;
		cursor: default;
	}
	.tuile.rouge {
		background: var(--rouge);
		color: #fff;
		box-shadow: none;
		border-radius: 50%;
		cursor: default;
	}
	.erreurs {
		margin: 0;
		text-align: center;
		color: var(--texte-doux);
		font-size: 0.95rem;
	}
</style>
