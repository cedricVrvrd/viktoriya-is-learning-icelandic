<script lang="ts">
	// Portrait d'un personnage (static/personnages/*.svg), décoratif : le nom est écrit à côté.
	import { asset } from '$app/paths';
	import { NOMS_PERSONNAGES } from '#lib/i18n.ts';

	let { qui, grand = false }: { qui: string; grand?: boolean } = $props();

	type CheminAsset = Parameters<typeof asset>[0];
	const connu = $derived(qui in NOMS_PERSONNAGES);
	const src = $derived(asset(`/personnages/${qui}.svg` as CheminAsset));
</script>

{#if connu}
	<img class="avatar" class:grand {src} alt="" aria-hidden="true" width="64" height="64" decoding="async" />
{:else}
	<span class="avatar inconnu" class:grand aria-hidden="true">?</span>
{/if}

<style>
	.avatar {
		flex: none;
		display: block;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 50%;
	}
	.grand {
		width: 4.2rem;
		height: 4.2rem;
	}
	.inconnu {
		display: grid;
		place-items: center;
		background: var(--ligne);
		font-weight: 800;
	}
</style>
