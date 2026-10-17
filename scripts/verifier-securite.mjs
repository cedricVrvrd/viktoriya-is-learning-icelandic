// Échoue si le code contient une échappatoire d'affichage HTML (règle du cahier des charges).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const INTERDITS = [/\{@html/, /\binnerHTML\b/, /\bouterHTML\b/, /insertAdjacentHTML/, /document\.write/, /\beval\s*\(/, /new Function\s*\(/];
const fichiers = [];
const parcourir = (d) => {
	for (const n of readdirSync(d)) {
		const p = join(d, n);
		if (statSync(p).isDirectory()) parcourir(p);
		else if (/\.(svelte|ts|js)$/.test(n)) fichiers.push(p);
	}
};
parcourir('src');
const fautes = fichiers.flatMap((f) =>
	readFileSync(f, 'utf8').split('\n').flatMap((ligne, i) =>
		INTERDITS.some((r) => r.test(ligne)) ? [`${f}:${i + 1}: ${ligne.trim()}`] : []
	)
);
if (fautes.length) {
	console.error('Code interdit (affichage HTML brut ou eval) :\n' + fautes.join('\n'));
	process.exit(1);
}
console.log(`Sécurité : ${fichiers.length} fichiers vérifiés, aucune échappatoire HTML.`);
