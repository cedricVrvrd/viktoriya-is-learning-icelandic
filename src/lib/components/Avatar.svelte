<script lang="ts">
	// Pastille provisoire en attendant les dessins des six personnages (question ouverte du cahier).
	import { NOMS_PERSONNAGES } from '#lib/i18n.ts';
	let { qui, grand = false }: { qui: string; grand?: boolean } = $props();
</script>

<span class="avatar {qui}" class:grand aria-hidden="true">{NOMS_PERSONNAGES[qui]?.[0] ?? '?'}</span>

<style>
	.avatar {
		flex: none;
		display: inline-grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 50%;
		font-family: var(--police-titre);
		font-weight: 800;
		font-size: 1.1rem;
		color: #fff;
		box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.25);
	}
	.grand {
		width: 4rem;
		height: 4rem;
		font-size: 1.8rem;
	}
	.superpuffin {
		background: var(--c-superpuffin);
		color: #0b1e3f;
	}
	.viktoriya {
		background: var(--c-viktoriya);
		color: #0b1e3f;
	}
	.bara {
		background: var(--c-bara);
	}
	.austri {
		background: var(--c-austri);
	}
	.kolla {
		background: var(--c-kolla);
		color: #0b1e3f;
	}
	.blesi {
		background: var(--c-blesi);
	}
</style>
