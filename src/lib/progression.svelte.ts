// État de progression réactif : leçons terminées, XP, série quotidienne, cartes de révision.
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';
import { lire, ecrire, demanderPersistance } from './stockage.ts';
import {
	progression,
	progressionVide,
	TAILLE_MAX_IMPORT,
	type CarteEnregistree,
	type Progression
} from './progression-schema.ts';
import type { Lecon } from './schema.ts';

const planificateur = fsrs(generatorParameters({ enable_fuzz: true }));

export const etat = $state<{ pret: boolean; p: Progression; persistant: boolean | null }>({
	pret: false,
	p: progressionVide(),
	persistant: null
});

async function sauver() {
	await ecrire($state.snapshot(etat.p));
	if (etat.persistant === null) etat.persistant = await demanderPersistance();
}

export async function charger() {
	const brut = await lire();
	const r = progression.safeParse(brut);
	if (r.success) etat.p = r.data;
	etat.pret = true;
}

// --- Dates -------------------------------------------------------------------

/** Jour local au format AAAA-MM-JJ. */
export function jourLocal(d = new Date()): string {
	const z = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
const hier = (d = new Date()) => jourLocal(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));

function noterActivite(maintenant = new Date()) {
	const s = etat.p.serie;
	const aujourdhui = jourLocal(maintenant);
	if (s.dernier === aujourdhui) return;
	s.jours = s.dernier === hier(maintenant) ? s.jours + 1 : 1;
	s.dernier = aujourdhui;
}

/** Série affichée : elle tombe à 0 si aucun jour n'a été validé hier ni aujourd'hui. */
export function serieActuelle(maintenant = new Date()): number {
	const s = etat.p.serie;
	return s.dernier === jourLocal(maintenant) || s.dernier === hier(maintenant) ? s.jours : 0;
}

export const serieValideeAujourdhui = (maintenant = new Date()) => etat.p.serie.dernier === jourLocal(maintenant);

// --- Cartes FSRS ---------------------------------------------------------------

const versCarte = (c: CarteEnregistree): Card => ({
	...c,
	due: new Date(c.due),
	last_review: c.last_review ? new Date(c.last_review) : undefined
});
const depuisCarte = (c: Card): CarteEnregistree => ({
	due: c.due.toISOString(),
	stability: c.stability,
	difficulty: c.difficulty,
	elapsed_days: c.elapsed_days,
	scheduled_days: c.scheduled_days,
	learning_steps: c.learning_steps,
	reps: c.reps,
	lapses: c.lapses,
	state: c.state,
	...(c.last_review ? { last_review: c.last_review.toISOString() } : {})
});

function noter(id: string, note: Grade, maintenant: Date) {
	const existante = etat.p.cartes[id];
	const carte = existante ? versCarte(existante) : createEmptyCard(maintenant);
	etat.p.cartes[id] = depuisCarte(planificateur.next(carte, maintenant, note).card);
}

/** Mots à revoir maintenant, les plus en retard d'abord. */
export function cartesDues(maintenant = new Date()): string[] {
	return Object.entries(etat.p.cartes)
		.filter(([, c]) => new Date(c.due) <= maintenant)
		.sort(([, a], [, b]) => a.due.localeCompare(b.due))
		.map(([id]) => id);
}

/** Prochaine échéance, quand rien n'est à revoir. */
export function prochaineRevision(): Date | null {
	const dates = Object.values(etat.p.cartes).map((c) => new Date(c.due).getTime());
	return dates.length ? new Date(Math.min(...dates)) : null;
}

// --- Actions -------------------------------------------------------------------

export type Bilan = { premierCoup: number; total: number; xp: number };

/** Fin de leçon : enregistre la réussite, crée les cartes des mots nouveaux. */
export async function finirLecon(lecon: Lecon, bilan: Bilan, maintenant = new Date()) {
	const reussite = bilan.total ? bilan.premierCoup / bilan.total : 0;
	const avant = etat.p.lecons[lecon.id];
	etat.p.lecons[lecon.id] = {
		terminee: maintenant.toISOString(),
		reussite: Math.max(avant?.reussite ?? 0, reussite)
	};
	etat.p.xp += bilan.xp;
	noterActivite(maintenant);
	for (const mot of lecon.mots) {
		if (!etat.p.cartes[mot.id]) noter(mot.id, reussite >= 0.8 ? Rating.Good : Rating.Hard, maintenant);
	}
	await sauver();
}

/** Une réponse de révision : juste → Good, faux → Again (le mot revient vite). */
export function noterRevision(id: string, juste: boolean, maintenant = new Date()) {
	noter(id, juste ? Rating.Good : Rating.Again, maintenant);
}

export async function finirRevision(xp: number, maintenant = new Date()) {
	etat.p.xp += xp;
	noterActivite(maintenant);
	await sauver();
}

export const leconTerminee = (id: string) => id in etat.p.lecons;

// --- Export / import -----------------------------------------------------------

export const exporter = () => JSON.stringify($state.snapshot(etat.p), null, 1);

export type Lecture = { ok: true; p: Progression } | { ok: false; erreur: 'taille' | 'json' | 'format' };

/** Lit un fichier d'export sans rien remplacer : l'appelant confirme d'abord. */
export function lireImport(texte: string): Lecture {
	if (texte.length > TAILLE_MAX_IMPORT) return { ok: false, erreur: 'taille' };
	let brut: unknown;
	try {
		brut = JSON.parse(texte);
	} catch {
		return { ok: false, erreur: 'json' };
	}
	const r = progression.safeParse(brut);
	return r.success ? { ok: true, p: r.data } : { ok: false, erreur: 'format' };
}

export async function remplacer(p: Progression) {
	etat.p = p;
	await sauver();
}
