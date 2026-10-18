// Lecture audio : un seul son à la fois, chemins relatifs au site (sous-dossier GitHub Pages compris).
import { asset } from '$app/paths';

type CheminAsset = Parameters<typeof asset>[0];

let actuel: HTMLAudioElement | null = null;
/** Change à chaque nouvelle demande : une suite en cours s'arrête si on lance autre chose. */
let generation = 0;

function lancer(fichier: string): Promise<void> {
	actuel?.pause();
	const son = new Audio(asset(`/${fichier}` as CheminAsset));
	actuel = son;
	return new Promise((fin) => {
		son.addEventListener('ended', () => fin(), { once: true });
		son.addEventListener('pause', () => fin(), { once: true });
		son.addEventListener('error', () => fin(), { once: true });
		// Refus du navigateur (lecture sans geste de l'utilisateur) : on ignore, le bouton reste là.
		son.play().catch(() => fin());
	});
}

/** Joue un fichier ; la promesse se résout à la fin de la lecture ou à son interruption. */
export function jouer(fichier: string): Promise<void> {
	generation++;
	return lancer(fichier);
}

/**
 * Joue plusieurs fichiers à la suite, avec une pause entre chaque (en ms).
 * Un null marque un silence de deux pauses (espace entre deux mots épelés).
 */
export async function jouerSuite(fichiers: (string | null)[], pause = 350) {
	const moi = ++generation;
	for (const f of fichiers) {
		if (generation !== moi) return;
		if (f) await lancer(f);
		await new Promise((r) => setTimeout(r, f ? pause : pause * 2));
	}
}

export function arreter() {
	generation++;
	actuel?.pause();
	actuel = null;
}
