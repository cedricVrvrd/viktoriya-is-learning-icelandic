// Plan audio : quelles phrases, avec quelle voix, dans quel fichier.
// Partagé par le build (vite.config.ts, qui relie chaque phrase à son fichier)
// et par le générateur (scripts/plan-audio.ts → scripts/generer-audio.py).
// Le nom du fichier est l'empreinte de (voix, vitesse, texte) : corriger une phrase
// produit un nouveau fichier, et seules les phrases modifiées sont régénérées.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { epeler } from '../src/lib/lettres.ts';

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
	bara: { voix: 'is_IS-salka-medium', vitesse: 1.0 }, // vitesse naturelle de Salka : ralentie, elle déforme les mots
	austri: { voix: 'grammatek-steinn', vitesse: 1.05 }, // posé
	kolla: { voix: 'is_IS-ugla-medium', vitesse: 0.92 }, // bavarde
	blesi: { voix: 'grammatek-steinn', vitesse: 0.85 } // toujours pressé
};

/** Voix des phrases dites hors dialogue (questions d'exercice, choix, blocs, mots en révision). */
export const VOIX_NEUTRE: Reglage = { voix: 'grammatek-steinn', vitesse: 1.0 };

/** Après la vérification, Superpuffin répète la bonne réponse. */
export const VOIX_REPONSE: Reglage = VOIX_PERSONNAGES.superpuffin;

/**
 * Version du découpage en pauses (scripts/generer-audio.py) : la changer régénère tous les sons.
 * 1 : une pause après chaque ponctuation, au lieu d'enchaîner les morceaux de phrase.
 */
const RYTHME = 'pauses-1';

export type Tache = { fichier: string; texte: string; voix: Voix; vitesse: number };

export function empreinte(texte: string, r: Reglage): string {
	// attaque-1 : blanc ajouté avant chaque morceau (scripts/voix_grammatek.py), d'où de nouveaux sons Steinn.
	const lexique = r.voix === 'grammatek-steinn' ? `|lexique:${versionLexique}|attaque-1` : '';
	const source = `${r.voix}|${r.vitesse.toFixed(2)}|${texte.normalize('NFC')}${lexique}|${RYTHME}`;
	return createHash('sha256').update(source).digest('hex').slice(0, 16);
}

export const fichierAudio = (texte: string, r: Reglage) => `audio/${empreinte(texte, r)}.mp3`;

type Replique = { locuteur: string; phrase: string };
type ExerciceBrut = {
	type: string;
	repliques?: Replique[];
	choix?: { is?: string; correct?: boolean }[];
	blocs?: string[];
	reponse?: string;
	phrase_a_trous?: string;
	reponses_acceptees?: string[];
	a_epeler?: string;
};
type LeconBrute = {
	phrases: { id: string; is: string }[];
	mots?: { id: string; lemme: string }[];
	scene?: { repliques: Replique[] };
	exercices: ExerciceBrut[];
};

/** Un bloc fait de ponctuation seule (« . ») n'a pas de son. */
const sonore = (s: string) => /\p{L}/u.test(s);

/** Textes islandais à faire entendre dans un exercice, en plus de ses phrases. */
export type TextesExercice = {
	/** Un son par choix (retrouver, accorder), joué quand on le touche. */
	choix?: (string | null)[];
	/** Un son par bloc (construire), joué quand on le touche. */
	blocs?: (string | null)[];
	/** La bonne réponse complète, répétée par Superpuffin après la vérification. */
	reponse?: string;
	/** Produire : une version par réponse acceptée, pour répéter celle que l'apprenant visait. */
	reponses?: string[];
	/** Dictée : un nom de lettre par lettre du mot (null pour une pause), dit par la voix neutre. */
	lettres?: (string | null)[];
};

export function textesExercice(ex: ExerciceBrut, phrases: Map<string, string>): TextesExercice {
	const bon = ex.choix?.find((c) => c.correct)?.is;
	switch (ex.type) {
		case 'retrouver':
			return { choix: ex.choix!.map((c) => c.is ?? null), reponse: bon };
		case 'accorder':
			return {
				choix: ex.choix!.map((c) => c.is ?? null),
				reponse: bon ? ex.phrase_a_trous!.replace('___', bon) : undefined
			};
		case 'construire':
			return { blocs: ex.blocs!.map((b) => (sonore(b) ? b : null)), reponse: phrases.get(ex.reponse!) };
		case 'produire':
			return ex.reponses_acceptees ? { reponses: ex.reponses_acceptees } : {};
		case 'dictee':
			return { lettres: epeler(ex.a_epeler!), reponse: ex.a_epeler };
		default:
			return {};
	}
}

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
	const ajouter = (texte: string | null | undefined, r: Reglage) => {
		if (!texte) return;
		const fichier = fichierAudio(texte, r);
		taches.set(fichier, { fichier, texte: texte.normalize('NFC'), ...r });
	};
	for (const lecon of lecons) {
		const reglages = reglagesDesPhrases(lecon);
		for (const p of lecon.phrases) ajouter(p.is, reglages.get(p.id)!);
		for (const m of lecon.mots ?? []) ajouter(m.lemme, VOIX_NEUTRE);
		const phrases = new Map(lecon.phrases.map((p) => [p.id, p.is]));
		for (const ex of lecon.exercices) {
			const t = textesExercice(ex, phrases);
			for (const c of [...(t.choix ?? []), ...(t.blocs ?? []), ...(t.lettres ?? [])]) ajouter(c, VOIX_NEUTRE);
			for (const r of [t.reponse, ...(t.reponses ?? [])]) ajouter(r, VOIX_REPONSE);
		}
	}
	return [...taches.values()];
}
