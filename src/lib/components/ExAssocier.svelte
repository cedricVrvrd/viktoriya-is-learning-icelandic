<script lang="ts">
	// Associer : relier chaque mot islandais à sa traduction. Une erreur ne bloque pas.
	import { jouer } from '#lib/audio.ts';
	import { melanger } from '#lib/correction.ts';
	import { type Langue } from '#lib/i18n.ts';
	import type { Exercice, Lecon } from '#lib/schema.ts';
	import type { Issue } from '#lib/types.ts';

	let {
		ex,
		lecon,
		langue,
		fige,
		ontermine
	}: {
		ex: Extract<Exercice, { type: 'associer' }>;
		lecon: Lecon;
		langue: Langue;
		fige: boolean;
		ontermine: (i: Issue) => void;
	} = $props();

	const mots = ex.paires.map((p) => lecon.mots.find((m) => m.id === p.mot)!);
	const gauche = melanger(mots);
	const droite = melanger(mots);

	let selGauche = $state<string | null>(null);
	let selDroite = $state<string | null>(null);
	let trouves = $state<string[]>([]);
	let rate = $state<string[]>([]);

	function essayer() {
		if (!selGauche || !selDroite) return;
		if (selGauche === selDroite) {
			trouves = [...trouves, selGauche];
			if (trouves.length === mots.length) ontermine({ juste: true });
		} else {
			rate = [selGauche, selDroite];
			setTimeout(() => (rate = []), 600);
		}
		selGauche = selDroite = null;
	}
	const choisir = (cote: 'g' | 'd', id: string) => {
		if (cote === 'g') selGauche = selGauche === id ? null : id;
		else selDroite = selDroite === id ? null : id;
		essayer();
	};
</script>

<div class="exercice">
	<h2 class="consigne">{ex.consigne[langue]}</h2>
	<div class="colonnes">
		<div class="colonne">
			{#each gauche as m (m.id)}
				<button
					type="button"
					class="carte is"
					lang="is"
					class:sel={selGauche === m.id}
					class:ok={trouves.includes(m.id)}
					class:ko={rate[0] === m.id}
					disabled={fige || trouves.includes(m.id)}
					onclick={() => {
						if (m.audio) jouer(m.audio);
						choisir('g', m.id);
					}}>{m.lemme}</button
				>
			{/each}
		</div>
		<div class="colonne">
			{#each droite as m (m.id)}
				<button
					type="button"
					class="carte"
					class:sel={selDroite === m.id}
					class:ok={trouves.includes(m.id)}
					class:ko={rate[1] === m.id}
					disabled={fige || trouves.includes(m.id)}
					onclick={() => choisir('d', m.id)}>{m[langue]}</button
				>
			{/each}
		</div>
	</div>
</div>

<style>
	.exercice {
		display: grid;
		gap: 1.1rem;
	}
	.consigne {
		font-size: 1.3rem;
	}
	.colonnes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.7rem;
	}
	.colonne {
		display: grid;
		gap: 0.6rem;
		min-width: 0;
	}
	.carte {
		appearance: none;
		padding: 0.8rem 0.5rem;
		min-height: 3.2rem;
		border-radius: var(--rayon);
		border: 2px solid var(--ligne);
		background: var(--surface);
		box-shadow: 0 2px 0 var(--ligne);
		cursor: pointer;
		overflow-wrap: anywhere;
	}
	.sel {
		border-color: var(--primaire);
		box-shadow: 0 2px 0 var(--primaire);
	}
	.ok {
		border-color: var(--succes-trait);
		background: var(--succes-fond);
		box-shadow: none;
		opacity: 0.75;
		cursor: default;
	}
	.ko {
		border-color: var(--rouge);
		background: var(--erreur-fond);
		animation: secoue 0.3s;
	}
	@keyframes secoue {
		25% {
			transform: translateX(-4px);
		}
		75% {
			transform: translateX(4px);
		}
	}
</style>
