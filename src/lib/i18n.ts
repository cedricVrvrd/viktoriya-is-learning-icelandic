// Textes de l'interface, en français et en anglais.
export type Langue = 'fr' | 'en';

const textes = {
	commencer: { fr: 'Commencer', en: 'Start' },
	recommencer: { fr: 'Recommencer la leçon', en: 'Restart the lesson' },
	suivant: { fr: 'Suivant', en: 'Next' },
	continuer: { fr: 'Continuer', en: 'Continue' },
	verifier: { fr: 'Vérifier', en: 'Check' },
	compris: { fr: 'Compris !', en: 'Got it!' },
	passer_scene: { fr: 'Passer la scène', en: 'Skip the scene' },
	quitter: { fr: 'Quitter la leçon', en: 'Leave the lesson' },
	langue: { fr: 'Langue de l’interface', en: 'Interface language' },
	bravo: { fr: 'Bonne réponse !', en: 'Correct!' },
	presque: { fr: 'Presque ! Attention aux accents :', en: 'Almost! Watch the accents:' },
	rate: { fr: 'Pas tout à fait. La réponse :', en: 'Not quite. The answer:' },
	reviendra: { fr: 'Cette question reviendra en fin de leçon.', en: 'This question will come back at the end.' },
	retour_erreur: { fr: 'On reprend une question ratée', en: 'Back to a question you missed' },
	traduction: { fr: 'Afficher la traduction', en: 'Show translation' },
	ta_reponse: { fr: 'Ta réponse', en: 'Your answer' },
	effacer: { fr: 'Retirer', en: 'Remove' },
	clavier: { fr: 'Lettres islandaises (appui long : majuscule)', en: 'Icelandic letters (long press: capital)' },
	lecon_finie: { fr: 'Leçon terminée', en: 'Lesson complete' },
	xp: { fr: 'XP gagnés', en: 'XP earned' },
	reussite: { fr: 'Réussite du premier coup', en: 'Right first time' },
	niveau: { fr: 'Niveau', en: 'Level' },
	partie: { fr: 'Partie', en: 'Part' },
	lecon: { fr: 'Leçon', en: 'Lesson' },
	minutes: { fr: 'min', en: 'min' },
	bientot: { fr: 'Bientôt', en: 'Coming soon' },
	prototype: {
		fr: 'Prototype : une seule leçon, progression non sauvegardée.',
		en: 'Prototype: one lesson, progress is not saved yet.'
	},
	ecouter: { fr: 'Écouter', en: 'Listen' },
	reecouter: { fr: 'Réécouter le dialogue', en: 'Play the dialogue again' },
	texte_cache: { fr: 'Texte affiché après ta réponse', en: 'Text shown after you answer' },
	credits_voix: {
		fr: 'Voix : Talrómur, Université de Reykjavík (CC BY 4.0), avec Piper.',
		en: 'Voices: Talrómur, Reykjavík University (CC BY 4.0), using Piper.'
	},
	erreur_marquee: { fr: 'erreur', en: 'mistake' },
	accents_rouges: { fr: 'Les lettres en rouge sont à corriger.', en: 'Letters in red need fixing.' },
	prenom_invalide: {
		fr: 'Écris « Ég heiti » suivi de ton prénom.',
		en: 'Write “Ég heiti” followed by your first name.'
	}
} satisfies Record<string, Record<Langue, string>>;

export type CleTexte = keyof typeof textes;
export const t = (langue: Langue, cle: CleTexte): string => textes[cle][langue];

export const NOMS_PERSONNAGES: Record<string, string> = {
	superpuffin: 'Superpuffin',
	viktoriya: 'Viktoriya',
	bara: 'Bára',
	austri: 'Austri',
	kolla: 'Kolla',
	blesi: 'Blesi'
};
