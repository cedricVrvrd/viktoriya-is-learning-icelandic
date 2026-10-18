// Format de la progression enregistrée sur l'appareil, et du fichier d'export.
// Un fichier importé vient peut-être d'un tiers : validation stricte, tout champ inconnu
// est refusé, toutes les valeurs sont bornées.
import { z } from 'zod';

export const FORMAT = 'viktoriya/progression@1';
export const TAILLE_MAX_IMPORT = 1_000_000; // octets

const instant = z.iso.datetime();
const jour = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Carte de révision FSRS (ts-fsrs), dates en ISO 8601. Une carte par mot appris. */
export const carte = z.strictObject({
	due: instant,
	stability: z.number().min(0).max(1e6),
	difficulty: z.number().min(0).max(100),
	elapsed_days: z.number().min(0).max(1e6),
	scheduled_days: z.number().min(0).max(1e6),
	learning_steps: z.number().int().min(0).max(100),
	reps: z.number().int().min(0).max(1e6),
	lapses: z.number().int().min(0).max(1e6),
	state: z.number().int().min(0).max(3),
	last_review: instant.optional()
});

export const progression = z.strictObject({
	format: z.literal(FORMAT),
	lecons: z.record(
		z.string().regex(/^n\d+-p\d+-(l\d+|pp)$/),
		z.strictObject({ terminee: instant, reussite: z.number().min(0).max(1) })
	),
	xp: z.number().int().min(0).max(10_000_000),
	serie: z.strictObject({ jours: z.number().int().min(0).max(100_000), dernier: jour.nullable() }),
	cartes: z.record(z.string().regex(/^w-[a-z0-9-]{1,60}$/), carte)
});

export type Progression = z.infer<typeof progression>;
export type CarteEnregistree = z.infer<typeof carte>;

export const progressionVide = (): Progression => ({
	format: FORMAT,
	lecons: {},
	xp: 0,
	serie: { jours: 0, dernier: null },
	cartes: {}
});
