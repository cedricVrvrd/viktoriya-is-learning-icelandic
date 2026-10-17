// Plan audio : quelles phrases, avec quelle voix, dans quel fichier.
// Partagé par le build (vite.config.ts, qui relie chaque phrase à son fichier)
// et par le générateur (scripts/plan-audio.ts → scripts/generer-audio.py).
// Le nom du fichier est l'empreinte de (voix, vitesse, texte) : corriger une phrase
// produit un nouveau fichier, et seules les phrases modifiées sont régénérées.
import { createHash } from 'node:crypto';

/** Voix Piper Talrómur (Université de Reykjavík, CC BY 4.0). */
export type Voix = 'is_IS-bui-medium' | 'is_IS-salka-medium' | 'is_IS-steinn-medium' | 'is_IS-ugla-medium';

type Reglage = { voix: Voix; vitesse: number };

/**
 * Une voix par personnage. vitesse = length_scale de Piper : plus grand = plus lent.
 * Quatre voix pour six personnages : les paires se distinguent par la vitesse.
 */
export const VOIX_PERSONNAGES: Record<string, Reglage> = {
	superpuffin: { voix: 'is_IS-bui-medium', vitesse: 0.95 }, // énergique
	viktoriya: { voix: 'is_IS-ugla-medium', vitesse: 1.05 }, // apprenante, un peu prudente
	bara: { voix: 'is_IS-salka-medium', vitesse: 1.3 }, // âgée, parle lentement
	austri: { voix: 'is_IS-steinn-medium', vitesse: 1.0 },
	kolla: { voix: 'is_IS-salka-medium', vitesse: 0.95 }, // bavarde
	blesi: { voix: 'is_IS-bui-medium', vitesse: 0.85 } // toujours pressé
};

/** Voix des phrases dites hors dialogue (questions d'exercice). */
export const VOIX_NEUTRE: Reglage = { voix: 'is_IS-steinn-medium', vitesse: 1.05 };

export type Tache = { fichier: string; texte: string; voix: Voix; vitesse: number };

export function empreinte(texte: string, r: Reglage): string {
	const source = `${r.voix}|${r.vitesse.toFixed(2)}|${texte.normalize('NFC')}`;
	return createHash('sha256').update(source).digest('hex').slice(0, 16);
}

export const fichierAudio = (texte: string, r: Reglage) => `audio/${empreinte(texte, r)}.mp3`;

type Replique = { locuteur: string; phrase: string };
type LeconBrute = {
	phrases: { id: string; is: string }[];
	scene: { repliques: Replique[] };
	exercices: { type: string; repliques?: Replique[] }[];
};

/**
 * Réglage de chaque phrase : celui du premier personnage qui la dit dans la leçon,
 * sinon la voix neutre. Une phrase a donc un seul enregistrement, réutilisé partout.
 */
export function reglagesDesPhrases(lecon: LeconBrute): Map<string, Reglage> {
	const reglages = new Map<string, Reglage>();
	const repliques = [
		...lecon.scene.repliques,
		...lecon.exercices.flatMap((e) => e.repliques ?? [])
	];
	for (const r of repliques) {
		if (!reglages.has(r.phrase)) reglages.set(r.phrase, VOIX_PERSONNAGES[r.locuteur] ?? VOIX_NEUTRE);
	}
	for (const p of lecon.phrases) if (!reglages.has(p.id)) reglages.set(p.id, VOIX_NEUTRE);
	return reglages;
}

export function planifier(lecons: LeconBrute[]): Tache[] {
	const taches = new Map<string, Tache>();
	for (const lecon of lecons) {
		const reglages = reglagesDesPhrases(lecon);
		for (const p of lecon.phrases) {
			const r = reglages.get(p.id)!;
			const fichier = fichierAudio(p.is, r);
			taches.set(fichier, { fichier, texte: p.is.normalize('NFC'), ...r });
		}
	}
	return [...taches.values()];
}
