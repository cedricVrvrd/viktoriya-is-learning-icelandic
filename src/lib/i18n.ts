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
	grille_lettres: { fr: 'Lettres à toucher dans l’ordre', en: 'Letters to tap in order' },
	grille_erreurs: { fr: 'Erreurs : {n}', en: 'Mistakes: {n}' },
	dictee_ecouter: { fr: 'Réécouter', en: 'Listen again' },
	dictee_lent: { fr: 'Plus lentement', en: 'More slowly' },
	dictee_sens: { fr: 'Sens :', en: 'Meaning:' },
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
		fr: 'Prototype : Niveau 1 en construction.',
		en: 'Prototype: Level 1 under construction.'
	},
	serie: { fr: 'Série', en: 'Streak' },
	jours: { fr: 'j', en: 'd' },
	serie_a_faire: { fr: 'Fais une leçon ou une révision aujourd’hui pour garder ta série.', en: 'Do a lesson or a review today to keep your streak.' },
	serie_ok: { fr: 'Série du jour validée.', en: 'Today’s streak is done.' },
	xp_total: { fr: 'XP au total', en: 'Total XP' },
	revisions: { fr: 'Révisions', en: 'Review' },
	reviser: { fr: 'Réviser', en: 'Review' },
	a_revoir: { fr: '{n} mots à revoir', en: '{n} words to review' },
	a_revoir_un: { fr: '1 mot à revoir', en: '1 word to review' },
	rien_a_revoir: { fr: 'Rien à revoir pour l’instant.', en: 'Nothing to review right now.' },
	prochaine: { fr: 'Prochaine révision : {quand}.', en: 'Next review: {quand}.' },
	revision_vide: { fr: 'Termine une leçon : ses mots arriveront ici, au bon moment pour ne pas les oublier.', en: 'Finish a lesson: its words will come back here, just before you forget them.' },
	revision_sens: { fr: 'Que veut dire ce mot ?', en: 'What does this mean?' },
	revision_islandais: { fr: 'Comment dit-on en islandais ?', en: 'How do you say it in Icelandic?' },
	revision_choix: { fr: 'Choix de réponse', en: 'Answer choices' },
	revision_finie: { fr: 'Révision terminée', en: 'Review complete' },
	revision_bilan: { fr: '{n} mots revus. Ils reviendront quand il le faudra.', en: '{n} words reviewed. They will come back when needed.' },
	quitter_revision: { fr: 'Quitter la révision', en: 'Leave the review' },
	reviendra_bientot: { fr: 'Ce mot reviendra en fin de session, et plus souvent ces prochains jours.', en: 'This word comes back at the end, and more often in the next days.' },
	terminee: { fr: 'Terminée', en: 'Done' },
	refaire: { fr: 'Refaire', en: 'Redo' },
	verrouillee_partie: {
		fr: 'Réussis le point de passage de la Partie précédente pour l’ouvrir.',
		en: 'Pass the checkpoint of the previous Part to open it.'
	},
	a_suivre: { fr: 'À suivre', en: 'Coming next' },
	suite_bientot: {
		fr: 'La Partie suivante est en préparation. En attendant, tes révisions t’attendent chaque jour.',
		en: 'The next Part is being written. Meanwhile, your reviews are waiting for you every day.'
	},
	verrouillee: { fr: 'Termine la leçon précédente pour la débloquer.', en: 'Finish the previous lesson to unlock it.' },
	ma_progression: { fr: 'Ma progression', en: 'My progress' },
	progression_locale: {
		fr: 'Ta progression reste sur cet appareil : pas de compte, pas de serveur. Exporte-la de temps en temps, surtout sur iPhone, où Safari peut effacer les données d’un site peu utilisé.',
		en: 'Your progress stays on this device: no account, no server. Export it now and then, especially on iPhone, where Safari may erase data from rarely used sites.'
	},
	exporter: { fr: 'Exporter (fichier)', en: 'Export (file)' },
	importer: { fr: 'Importer un fichier', en: 'Import a file' },
	import_confirmer: { fr: 'Ce fichier remplacera ta progression actuelle sur cet appareil.', en: 'This file will replace your current progress on this device.' },
	remplacer: { fr: 'Remplacer', en: 'Replace' },
	annuler: { fr: 'Annuler', en: 'Cancel' },
	import_ok: { fr: 'Progression importée.', en: 'Progress imported.' },
	import_taille: { fr: 'Fichier trop gros : ce n’est pas un export de l’appli.', en: 'File too large: this is not an export from the app.' },
	import_json: { fr: 'Fichier illisible : ce n’est pas un export de l’appli.', en: 'Unreadable file: this is not an export from the app.' },
	import_format: { fr: 'Fichier refusé : son contenu ne correspond pas au format de l’appli.', en: 'File rejected: its content does not match the app’s format.' },
	maintenant: { fr: 'maintenant', en: 'now' },
	dans_min: { fr: 'dans {n} min', en: 'in {n} min' },
	dans_h: { fr: 'dans {n} h', en: 'in {n} h' },
	dans_j: { fr: 'dans {n} j', en: 'in {n} d' },
	pp_commencer: { fr: 'C’est parti', en: 'Let’s go' },
	pp_score: { fr: '{n} / {total} bonnes réponses du premier coup.', en: '{n} / {total} right first time.' },
	pp_seuil: { fr: 'Il en fallait {pct} %.', en: '{pct}% needed.' },
	pp_valide: { fr: 'Partie validée', en: 'Part passed' },
	pp_rate: { fr: 'Pas encore validée', en: 'Not passed yet' },
	pp_a_revoir: { fr: 'À revoir :', en: 'To review:' },
	pp_reviser: { fr: 'Réviser maintenant', en: 'Review now' },
	pp_retenter: { fr: 'Retenter', en: 'Try again' },
	pp_ouvert_apres: { fr: 'Termine toutes les leçons de la Partie pour l’ouvrir.', en: 'Finish every lesson in this Part to open it.' },
	pp_meilleur: { fr: 'Validée à {pct} %', en: 'Passed with {pct}%' },
	ecouter: { fr: 'Écouter', en: 'Listen' },
	reecouter: { fr: 'Réécouter le dialogue', en: 'Play the dialogue again' },
	texte_cache: { fr: 'Texte affiché après ta réponse', en: 'Text shown after you answer' },
	credits_voix: {
		fr: 'Voix : Steinn de Grammatek (Apache 2.0) ; Salka et Ugla, Talrómur, Université de Reykjavík (CC BY 4.0) ; moteur Piper.',
		en: 'Voices: Steinn by Grammatek (Apache 2.0); Salka and Ugla, Talrómur, Reykjavík University (CC BY 4.0); Piper engine.'
	},
	mode_test: {
		fr: 'Mode test : tout est ouvert, chaque exercice peut être passé, rien n’est enregistré.',
		en: 'Test mode: everything is open, any exercise can be skipped, nothing is saved.'
	},
	fin_test: {
		fr: 'Mode test : cette leçon n’est pas enregistrée. Retire « ?test » de l’adresse pour progresser pour de vrai.',
		en: 'Test mode: this lesson is not saved. Remove “?test” from the address to make real progress.'
	},
	passer_test: { fr: 'Passer (test)', en: 'Skip (test)' },
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
	viktoriya: 'Viktoriya'
};
