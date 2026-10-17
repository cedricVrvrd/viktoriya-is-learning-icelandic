<script lang="ts">
	// Bouton « écouter ». auto : joue dès l'affichage (après un geste de l'utilisateur dans la leçon).
	import { onMount } from 'svelte';
	import { arreter, jouer } from '#lib/audio.ts';
	import { t, type Langue } from '#lib/i18n.ts';

	let {
		fichier,
		langue,
		auto = false,
		grand = false
	}: { fichier: string; langue: Langue; auto?: boolean; grand?: boolean } = $props();

	let enCours = $state(false);

	async function ecouter() {
		enCours = true;
		await jouer(fichier);
		enCours = false;
	}

	onMount(() => {
		if (auto) ecouter();
		return () => arreter();
	});
</script>

<button type="button" class="ecouter" class:grand class:enCours aria-label={t(langue, 'ecouter')} onclick={ecouter}>
	<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
		<path d="M4 9v6h4l5 4V5L8 9H4z" />
		<path class="onde" d="M16 8.5a4.5 4.5 0 0 1 0 7" />
		<path class="onde loin" d="M18.5 6a8 8 0 0 1 0 12" />
	</svg>
</button>

<style>
	.ecouter {
		appearance: none;
		flex: none;
		display: inline-grid;
		place-items: center;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 50%;
		border: 0;
		background: var(--primaire);
		cursor: pointer;
		vertical-align: middle;
	}
	.grand {
		width: 3.2rem;
		height: 3.2rem;
	}
	svg {
		width: 60%;
		height: 60%;
	}
	path {
		fill: var(--sur-primaire);
	}
	.onde {
		fill: none;
		stroke: var(--sur-primaire);
		stroke-width: 2;
		stroke-linecap: round;
	}
	.enCours .onde {
		animation: onde 0.9s ease-in-out infinite;
	}
	.enCours .loin {
		animation-delay: 0.15s;
	}
	@keyframes onde {
		50% {
			opacity: 0.25;
		}
	}
</style>
