// Schéma du contenu des leçons. Le build échoue si une leçon ne le respecte pas.
// Règles de sécurité : texte brut uniquement (aucun < ni >), Unicode NFC, longueur bornée,
// tout champ inconnu est rejeté (objets stricts).
import { z } from 'zod';
import { assembler } from './correction.ts';

const texte = z
	.string()
	.min(1)
	.max(500)
	.refine((s) => !/[<>]/.test(s), { message: 'HTML interdit dans le contenu' })
	.refine((s) => s === s.normalize('NFC'), { message: 'Le texte doit être en Unicode NFC' });

const bilingue = z.strictObject({ fr: texte, en: texte });

export const PERSONNAGES = ['superpuffin', 'viktoriya', 'bara', 'austri', 'kolla', 'blesi'] as const;
const personnage = z.enum(PERSONNAGES);

const idMot = z.string().regex(/^w-[a-z0-9-]+$/);
const idPhrase = z.string().regex(/^ph-[a-z0-9-]+$/);
const idExercice = z.string().regex(/^ex-[a-z0-9-]+$/);

const mot = z.strictObject({
	id: idMot,
	lemme: texte,
	categorie: z.enum(['nom', 'verbe', 'pronom', 'interjection', 'interrogatif', 'conjonction', 'adverbe', 'adjectif', 'preposition', 'expression']),
	genre: z.enum(['m', 'f', 'n']).optional(),
	formes: z.array(texte).optional(),
	registre: z.enum(['familier', 'soutenu']).optional(),
	fr: texte,
	en: texte,
	note: bilingue.optional()
});

const phrase = z.strictObject({
	id: idPhrase,
	is: texte,
	fr: texte,
	en: texte,
	erreur_volontaire: z.boolean().optional()
});

const replique = z.strictObject({ locuteur: personnage, phrase: idPhrase });

const choix = z.strictObject({
	is: texte.optional(),
	fr: texte.optional(),
	en: texte.optional(),
	correct: z.literal(true).optional()
});

const tolerance = z.strictObject({
	accents: z.enum(['signaler', 'exiger']),
	ponctuation_finale: z.enum(['ignorer', 'exiger']),
	majuscule_initiale: z.enum(['ignorer', 'exiger'])
});

const base = { id: idExercice, consigne: bilingue };

const exercice = z.discriminatedUnion('type', [
	z.strictObject({
		...base,
		type: z.literal('reconnaitre'),
		support: z.enum(['audio', 'texte', 'audio_et_texte']),
		question: idPhrase,
		choix: z.array(choix).min(2).max(4)
	}),
	z.strictObject({ ...base, type: z.literal('retrouver'), choix: z.array(choix).min(2).max(4) }),
	z.strictObject({
		...base,
		type: z.literal('accorder'),
		phrase_a_trous: texte.refine((s) => s.includes('___'), { message: 'Trou ___ manquant' }),
		choix: z.array(choix).min(2).max(4),
		explication: z.string().optional()
	}),
	z.strictObject({
		...base,
		type: z.literal('associer'),
		paires: z.array(z.strictObject({ mot: idMot })).min(3).max(6)
	}),
	z.strictObject({
		...base,
		type: z.literal('construire'),
		blocs: z.array(texte).min(2).max(10),
		reponse: idPhrase,
		note: bilingue.optional()
	}),
	z.strictObject({
		...base,
		type: z.literal('ecouter_dialogue'),
		repliques: z.array(replique).min(1),
		choix: z.array(choix).min(2).max(4)
	}),
	z.strictObject({
		...base,
		type: z.literal('produire'),
		reponses_acceptees: z.array(texte).min(1).optional(),
		debut_attendu: texte.optional(),
		suite_libre: z.literal('prenom').optional(),
		tolerance
	})
]);

type ExerciceBrut = z.infer<typeof exercice>;
type PhraseBrute = z.infer<typeof phrase>;

/** Vérifie les renvois d'une liste d'exercices (phrases, mots, explication, bonne réponse unique). */
function verifierExercices(
	exercices: ExerciceBrut[],
	phrasesListe: PhraseBrute[],
	mots: Set<string>,
	explicationId: string | null,
	erreur: (m: string) => void
) {
	const phrases = new Map(phrasesListe.map((p) => [p.id, p]));
	const verifPhrase = (id: string, ou: string) => {
		if (!phrases.has(id)) erreur(`${ou} : phrase inconnue ${id}`);
	};
	for (const ex of exercices) {
		if ('choix' in ex) {
			const bons = ex.choix.filter((c) => c.correct).length;
			if (bons !== 1) erreur(`${ex.id} : il faut exactement une bonne réponse (${bons})`);
			const islandais = ex.type === 'retrouver' || ex.type === 'accorder';
			for (const c of ex.choix) {
				if (islandais ? !c.is : !(c.fr && c.en))
					erreur(`${ex.id} : choix incomplet (${islandais ? 'is' : 'fr + en'} requis)`);
			}
		}
		if (ex.type === 'reconnaitre') verifPhrase(ex.question, ex.id);
		if (ex.type === 'ecouter_dialogue') ex.repliques.forEach((r) => verifPhrase(r.phrase, ex.id));
		if (ex.type === 'associer')
			ex.paires.forEach((p) => mots.has(p.mot) || erreur(`${ex.id} : mot inconnu ${p.mot}`));
		if (ex.type === 'accorder' && ex.explication && ex.explication !== explicationId)
			erreur(`${ex.id} : explication inconnue ${ex.explication}`);
		if (ex.type === 'construire') {
			verifPhrase(ex.reponse, ex.id);
			const attendu = phrases.get(ex.reponse)?.is;
			if (attendu && assembler(ex.blocs) !== attendu)
				erreur(`${ex.id} : les blocs ne reconstituent pas « ${attendu} »`);
		}
		if (ex.type === 'produire' && !ex.reponses_acceptees && !(ex.debut_attendu && ex.suite_libre))
			erreur(`${ex.id} : réponses attendues manquantes`);
	}
}

function doublons(ids: string[], erreur: (m: string) => void) {
	const d = ids.filter((id, i) => ids.indexOf(id) !== i);
	if (d.length) erreur(`Identifiants en double : ${d.join(', ')}`);
}

export const lecon = z
	.strictObject({
		schema: z.literal('superpuffin/lecon@1'),
		id: z.string().regex(/^n\d+-p\d+-l\d+$/),
		niveau: z.number().int().min(1).max(4),
		partie: z.number().int().min(1),
		ordre: z.number().int().min(1),
		duree_minutes: z.number().int().min(1).max(10),
		titre: bilingue,
		objectif: bilingue,
		personnages: z.array(personnage).min(1),
		mots: z.array(mot),
		phrases: z.array(phrase),
		scene: z.strictObject({ lieu: z.string(), didascalie: bilingue, repliques: z.array(replique) }),
		explication: z.strictObject({
			id: z.string().regex(/^gr-[a-z0-9-]+$/),
			introduite_par: personnage,
			question: bilingue,
			reponse: bilingue,
			tableau: z.array(z.strictObject({ is: texte, fr: texte, en: texte }))
		}),
		exercices: z.array(exercice).min(1),
		fin: z.strictObject({ locuteur: personnage, message: bilingue })
	})
	.superRefine((l, ctx) => {
		const erreur = (message: string) => ctx.addIssue({ code: 'custom', message });
		doublons([...l.mots, ...l.phrases, ...l.exercices].map((x) => x.id), erreur);
		const ids = new Set(l.phrases.map((p) => p.id));
		l.scene.repliques.forEach((r) => ids.has(r.phrase) || erreur(`scène : phrase inconnue ${r.phrase}`));
		verifierExercices(l.exercices, l.phrases, new Set(l.mots.map((m) => m.id)), l.explication.id, erreur);
	});

const message = z.strictObject({ locuteur: personnage, message: bilingue });

/**
 * Point de passage : quiz de fin de Partie, sans scène ni mots nouveaux.
 * L'identifiant de chaque exercice dit quelle leçon il vérifie (ex-n1p1pp-l3-02 → leçon 3),
 * pour proposer une révision ciblée en cas d'échec.
 */
export const pointDePassage = z
	.strictObject({
		schema: z.literal('superpuffin/point-de-passage@1'),
		id: z.string().regex(/^n\d+-p\d+-pp$/),
		niveau: z.number().int().min(1).max(4),
		partie: z.number().int().min(1),
		duree_minutes: z.number().int().min(1).max(15),
		titre: bilingue,
		objectif: bilingue,
		seuil: z.number().min(0.5).max(1),
		personnages: z.array(personnage).min(1),
		phrases: z.array(phrase),
		intro: message,
		reussite: message,
		echec: message,
		exercices: z.array(exercice).min(5)
	})
	.superRefine((pp, ctx) => {
		const erreur = (m: string) => ctx.addIssue({ code: 'custom', message: m });
		doublons([...pp.phrases, ...pp.exercices].map((x) => x.id), erreur);
		for (const ex of pp.exercices) {
			if (!new RegExp(`^ex-n${pp.niveau}p${pp.partie}pp-l\\d+-\\d+$`).test(ex.id))
				erreur(`${ex.id} : identifiant attendu de la forme ex-n${pp.niveau}p${pp.partie}pp-l<leçon>-<n>`);
			if (ex.type === 'associer') erreur(`${ex.id} : pas d'exercice « associer » dans un point de passage`);
		}
		verifierExercices(pp.exercices, pp.phrases, new Set(), null, erreur);
	});

/** Leçon visée par un exercice de point de passage : ex-n1p1pp-l3-02 → n1-p1-l3. */
export function leconVisee(exId: string): string | null {
	const m = /^ex-n(\d+)p(\d+)pp-l(\d+)-\d+$/.exec(exId);
	return m ? `n${m[1]}-p${m[2]}-l${m[3]}` : null;
}

/** Leçon telle qu'écrite dans le YAML. */
export type LeconContenu = z.infer<typeof lecon>;
/** Phrase telle que l'appli la reçoit : reliée à son fichier audio quand il existe. */
export type Phrase = LeconContenu['phrases'][number] & { audio?: string };
export type Mot = LeconContenu['mots'][number] & { audio?: string };
/** Sons ajoutés au build (vite.config.ts) : choix et blocs touchés, bonne réponse répétée. */
export type SonsExercice = {
	choix?: (string | null)[];
	blocs?: (string | null)[];
	reponse?: string;
	reponses?: (string | null)[];
};
export type Exercice = LeconContenu['exercices'][number] & { sons?: SonsExercice };
/** Leçon telle que l'appli la reçoit : phrases, mots et exercices reliés à leurs sons. */
export type Lecon = Omit<LeconContenu, 'phrases' | 'mots' | 'exercices'> & {
	phrases: Phrase[];
	mots: Mot[];
	exercices: Exercice[];
};
export type PointDePassageContenu = z.infer<typeof pointDePassage>;
export type PointDePassage = Omit<PointDePassageContenu, 'phrases' | 'exercices'> & {
	phrases: Phrase[];
	exercices: (PointDePassageContenu['exercices'][number] & { sons?: SonsExercice })[];
};
export type Personnage = (typeof PERSONNAGES)[number];
