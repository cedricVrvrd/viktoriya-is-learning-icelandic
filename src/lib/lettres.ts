// Noms des lettres de l'alphabet islandais, tels qu'on les dit pour épeler.
// Partagé par le schéma (validation), le plan audio (un son par nom de lettre) et l'appli.
// Les noms absents du dictionnaire de prononciation sont dans contenu/prononciation.yaml.

/** Les 32 lettres islandaises, dans l'ordre de l'alphabet. */
export const ALPHABET = [
	'a', 'á', 'b', 'd', 'ð', 'e', 'é', 'f', 'g', 'h', 'i', 'í', 'j', 'k', 'l', 'm',
	'n', 'o', 'ó', 'p', 'r', 's', 't', 'u', 'ú', 'v', 'x', 'y', 'ý', 'þ', 'æ', 'ö'
] as const;

/** Lettres qui n'apparaissent que dans des mots ou des noms étrangers. */
export const LETTRES_ETRANGERES = ['c', 'q', 'w', 'z'] as const;

export const NOMS_LETTRES: Record<string, string> = {
	a: 'a', á: 'á', b: 'bé', d: 'dé', ð: 'eð', e: 'e', é: 'é', f: 'eff',
	g: 'ge', h: 'há', i: 'i', í: 'í', j: 'joð', k: 'ká', l: 'ell', m: 'emm',
	n: 'enn', o: 'o', ó: 'ó', p: 'pé', r: 'err', s: 'ess', t: 'té', u: 'u',
	ú: 'ú', v: 'vaff', x: 'ex', y: 'ypsilon', ý: 'ypsilon í', þ: 'þorn', æ: 'æ', ö: 'ö',
	c: 'sé', q: 'kú', w: 'tvöfalt vaff', z: 'seta'
};

/** Séparateurs permis dans un mot à épeler : ils donnent une pause, sans nom de lettre. */
const SEPARATEURS = new Set([' ', '-']);

/**
 * Ce qu'on dit pour épeler un mot : un nom de lettre par lettre, null pour une pause
 * (espace, trait d'union). Lève une erreur sur un caractère qu'on ne sait pas épeler.
 */
export function epeler(mot: string): (string | null)[] {
	return [...mot.normalize('NFC').toLocaleLowerCase('is')].map((c) => {
		if (SEPARATEURS.has(c)) return null;
		const nom = NOMS_LETTRES[c];
		if (!nom) throw new Error(`Lettre impossible à épeler : « ${c} »`);
		return nom;
	});
}
