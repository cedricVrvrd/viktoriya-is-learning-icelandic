// Plan audio : quelles phrases, avec quelle voix, dans quel fichier.
// Partagé par le build (vite.config.ts, qui relie chaque phrase à son fichier)
// et par le générateur (scripts/plan-audio.ts → scripts/generer-audio.py).
// Le nom du fichier est l'empreinte de (voix, vitesse, texte) : corriger une phrase
// produit un nouveau fichier, et seules les phrases modifiées sont régénérées.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Voix Piper Talrómur (Université de Reykjavík, CC BY 4.0), lues par eSpeak,
 * et voix Steinn de Grammatek (Apache-2.0), qui reçoit les phonèmes du dictionnaire
 * de prononciation islandais (scripts/phonetiseur.py) : prononciation bien plus juste.
 */
export type Voix = 'is_IS-salka-medium' | 'is_IS-ugla-medium' | 'grammatek-steinn';

/** Une correction du lexique de prononciation doit régénérer les sons de la voix Grammatek. */
const LEXIQUE = 'contenu/prononciation.yaml';
const versionLexique = existsSync(LEXIQUE)
	? createHash('sha256').update(readFileSync(LEXIQUE)).digest('hex').slice(0, 8)
	: 'aucun';

type Reglage = { voix: Voix; vitesse: number };

/**
 * Une voix par personnage. vitesse = length_scale : plus grand = plus lent.
 * Choix à l'écoute (17/10/2026) : Grammatek, sans marques d'accent, sonne juste ; elle
 * remplace les voix masculines Piper (Búi, Steinn). Les voix féminines restent Piper
 * (Salka, Ugla), faute d'autre voix libre. Les personnages qui partagent une voix se
 * distinguent par la vitesse.
 */
export const VOIX_PERSONNAGES: Record<string, Reglage> = {
	superpuffin: { voix: 'grammatek-steinn', vitesse: 0.92 }, // énergique
	viktoriya: { voix: 'is_IS-ugla-medium', vitesse: 1.05 }, // apprenante, un peu prudente
	bara: { voix: 'is_IS-salka-medium', vitesse: 1.3 }, // âgée, parle lentement
	austri: { voix: 'grammatek-steinn', vitesse: 1.05 }, // posé
	kolla: { voix: 'is_IS-ugla-medium', vitesse: 0.92 }, // bavarde
	blesi: { voix: 'grammatek-steinn', vitesse: 0.85 } // toujours pressé
};

/** Voix des phrases dites hors dialogue (questions d'exercice). */
export const VOIX_NEUTRE: Reglage = { voix: 'grammatek-steinn', vitesse: 1.0 };

export type Tache = { fichier: string; texte: string; voix: Voix; vitesse: number };

export function empreinte(texte: string, r: Reglage): string {
	const lexique = r.voix === 'grammatek-steinn' ? `|lexique:${versionLexique}` : '';
	const source = `${r.voix}|${r.vitesse.toFixed(2)}|${texte.normalize('NFC')}${lexique}`;
	return createHash('sha256').update(source).digest('hex').slice(0, 16);
}

export const fichierAudio = (texte: string, r: Reglage) => `audio/${empreinte(texte, r)}.mp3`;

type Replique = { locuteur: string; phrase: string };
type LeconBrute = {
	phrases: { id: string; is: string }[];
	scene?: { repliques: Replique[] };
	exercices: { type: string; repliques?: Replique[] }[];
};

/**
 * Réglage de chaque phrase : celui du premier personnage qui la dit dans la leçon,
 * sinon la voix neutre. Une phrase a donc un seul enregistrement, réutilisé partout.
 */
export function reglagesDesPhrases(lecon: LeconBrute): Map<string, Reglage> {
	const reglages = new Map<string, Reglage>();
	const repliques = [
		...(lecon.scene?.repliques ?? []),
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
