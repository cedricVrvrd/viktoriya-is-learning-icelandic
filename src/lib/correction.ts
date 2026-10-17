// Correction des réponses tapées. Fonctions pures, testées par scripts/tester-correction.ts.
// Règle du cahier des charges : un accent manquant ou erroné valide la réponse,
// mais la lettre fautive s'affiche en rouge dans la correction.

export const LONGUEUR_MAX = 80;

const VOYELLES_ACCENTUEES: Record<string, string> = {
	á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ý: 'y', ö: 'o'
};

/** Nettoie une saisie : NFC, longueur bornée, espaces normalisés. */
export function nettoyer(saisie: string): string {
	return saisie.normalize('NFC').slice(0, LONGUEUR_MAX).replace(/\s+/g, ' ').trim();
}

function preparer(s: string, opts: { ponctuation: boolean; majuscule: boolean }): string {
	let r = nettoyer(s);
	if (!opts.ponctuation) r = r.replace(/[\s?!.,]+$/u, '');
	if (!opts.majuscule) r = r.toLocaleLowerCase('is');
	return r;
}

const sansAccent = (s: string) => [...s].map((c) => VOYELLES_ACCENTUEES[c] ?? c).join('');

export type Segment = { texte: string; fautif: boolean };

export type Resultat =
	| { statut: 'juste' }
	| { statut: 'accents'; correction: Segment[] }
	| { statut: 'faux'; attendu: string };

export type Tolerance = {
	accents: 'signaler' | 'exiger';
	ponctuation_finale: 'ignorer' | 'exiger';
	majuscule_initiale: 'ignorer' | 'exiger';
};

/** Compare une saisie à une réponse attendue. */
export function comparer(saisie: string, attendu: string, tol: Tolerance): Resultat {
	const opts = {
		ponctuation: tol.ponctuation_finale === 'exiger',
		majuscule: tol.majuscule_initiale === 'exiger'
	};
	const s = preparer(saisie, opts);
	const a = preparer(attendu, opts);
	if (s === a) return { statut: 'juste' };

	const sc = [...s];
	const ac = [...a];
	if (tol.accents === 'signaler' && sc.length === ac.length && sansAccent(s) === sansAccent(a)) {
		// Correction affichée sur la forme attendue d'origine (avec sa casse et sa ponctuation).
		const original = [...nettoyer(attendu)];
		const segments: Segment[] = original.map((c, i) => ({
			texte: c,
			fautif: i < sc.length && sc[i] !== ac[i]
		}));
		return { statut: 'accents', correction: fusionner(segments) };
	}
	return { statut: 'faux', attendu: nettoyer(attendu) };
}

/** Meilleur résultat parmi plusieurs réponses acceptées. */
export function comparerPlusieurs(saisie: string, attendus: string[], tol: Tolerance): Resultat {
	let meilleur: Resultat | null = null;
	for (const a of attendus) {
		const r = comparer(saisie, a, tol);
		if (r.statut === 'juste') return r;
		if (r.statut === 'accents' && meilleur?.statut !== 'accents') meilleur = r;
	}
	return meilleur ?? { statut: 'faux', attendu: nettoyer(attendus[0]) };
}

/** « Ég heiti » + prénom libre (lettres, espace, trait d'union, apostrophe ; 40 caractères max). */
export function comparerDebutPrenom(saisie: string, debut: string, tol: Tolerance): Resultat {
	const propre = nettoyer(saisie);
	const mots = debut.split(' ').length;
	const decoupe = propre.split(' ');
	const tete = decoupe.slice(0, mots).join(' ');
	const prenom = decoupe.slice(mots).join(' ').replace(/[?!.,]+$/u, '');
	const prenomValide = /^[\p{L}][\p{L}' -]{0,39}$/u.test(prenom);
	if (!prenomValide) return { statut: 'faux', attendu: `${debut} …` };
	const r = comparer(tete, debut, tol);
	if (r.statut === 'accents') {
		return { statut: 'accents', correction: [...r.correction, { texte: ` ${prenom}`, fautif: false }] };
	}
	return r.statut === 'juste' ? r : { statut: 'faux', attendu: `${debut} ${prenom}` };
}

function fusionner(segments: Segment[]): Segment[] {
	const out: Segment[] = [];
	for (const s of segments) {
		const dernier = out.at(-1);
		if (dernier && dernier.fautif === s.fautif) dernier.texte += s.texte;
		else out.push({ ...s });
	}
	return out;
}

export function melanger<T>(liste: T[]): T[] {
	const copie = [...liste];
	for (let i = copie.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copie[i], copie[j]] = [copie[j], copie[i]];
	}
	return copie;
}

/** Recolle des blocs : pas d'espace avant la ponctuation finale. */
export function assembler(blocs: string[]): string {
	return blocs.join(' ').replace(/ ([?!.,])/g, '$1');
}
