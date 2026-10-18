import type { Segment } from './correction';

/** Ce qu'un exercice renvoie au lecteur une fois la réponse vérifiée. */
export type Issue = {
	juste: boolean;
	/** Réponse validée malgré des accents fautifs : lettres à afficher en rouge. */
	accents?: Segment[];
	/** Bonne réponse à montrer en cas d'erreur. */
	solution?: string;
	solutionIslandaise?: boolean;
	/** Bonne réponse dite par Superpuffin, jouée dès la vérification. */
	son?: string;
	/** Afficher la carte de grammaire de la leçon dans le retour. */
	explication?: boolean;
};
