// Vérifie chaque mot islandais du contenu contre BÍN (Beygingarlýsing íslensks nútímamáls).
// Usage : node scripts/verifier-bin.mjs <chemin vers KRISTINsnid.csv>
// Le build échoue si une forme est inconnue de BÍN et absente de contenu/hors-bin.yaml.
import { createReadStream, readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { load } from 'js-yaml';

const csv = process.argv[2];
if (!csv || !existsSync(csv)) {
	console.error(`Fichier BÍN introuvable : ${csv ?? '(aucun chemin)'}`);
	process.exit(2);
}

// Champs du contenu qui contiennent de l'islandais.
const CLES_ISLANDAISES = new Set(['is', 'lemme', 'formes', 'blocs', 'reponses_acceptees', 'debut_attendu', 'phrase_a_trous']);

function collecter(noeud, cle, sortie) {
	if (Array.isArray(noeud)) noeud.forEach((n) => collecter(n, cle, sortie));
	else if (noeud && typeof noeud === 'object') for (const [k, v] of Object.entries(noeud)) collecter(v, k, sortie);
	else if (typeof noeud === 'string' && CLES_ISLANDAISES.has(cle)) sortie.push(noeud);
}

const lister = (d) =>
	readdirSync(d, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? lister(join(d, e.name)) : e.name.endsWith('.yaml') && e.name !== 'hors-bin.yaml' ? [join(d, e.name)] : []
	);

// Mots absents de BÍN, acceptés avec une justification (noms de personnages, interjections…).
const horsBin = existsSync('contenu/hors-bin.yaml') ? load(readFileSync('contenu/hors-bin.yaml', 'utf8')) : [];
const autorises = new Map(horsBin.map((e) => [e.mot.normalize('NFC').toLocaleLowerCase('is'), e.raison]));

const aVerifier = new Map(); // mot -> fichiers
for (const fichier of lister('contenu')) {
	const textes = [];
	collecter(load(readFileSync(fichier, 'utf8')), '', textes);
	for (const t of textes) {
		for (const mot of t.normalize('NFC').match(/\p{L}+/gu) ?? []) {
			const m = mot.toLocaleLowerCase('is');
			if (!aVerifier.has(m)) aVerifier.set(m, new Set());
			aVerifier.get(m).add(fichier);
		}
	}
}

// Lecture en flux : le fichier BÍN fait plusieurs centaines de Mo.
// On garde chaque champ de chaque ligne, quel que soit le format (Kristínarsnið ou Sigrúnarsnið).
const trouves = new Set();
const lignes = createInterface({ input: createReadStream(csv, 'utf8'), crlfDelay: Infinity });
for await (const ligne of lignes) {
	for (const champ of ligne.split(';')) {
		const c = champ.normalize('NFC').toLocaleLowerCase('is');
		if (aVerifier.has(c)) trouves.add(c);
	}
}

const inconnus = [...aVerifier.keys()].filter((m) => !trouves.has(m) && !autorises.has(m));
const horsBinUtilises = [...aVerifier.keys()].filter((m) => !trouves.has(m) && autorises.has(m));

console.log(`BÍN : ${aVerifier.size} formes vérifiées, ${trouves.size} trouvées dans BÍN.`);
if (horsBinUtilises.length) console.log(`Hors BÍN, acceptées : ${horsBinUtilises.join(', ')}`);
if (inconnus.length) {
	console.error('Formes inconnues de BÍN (à corriger, ou à justifier dans contenu/hors-bin.yaml) :');
	for (const m of inconnus) console.error(`  - ${m}  (${[...aVerifier.get(m)].join(', ')})`);
	process.exit(1);
}
