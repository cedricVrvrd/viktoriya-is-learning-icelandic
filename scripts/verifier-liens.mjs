// Après le build : chaque ressource référencée par build/index.html doit exister,
// une fois le préfixe BASE_PATH retiré. Évite une page blanche en ligne (scripts en 404).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env.BASE_PATH ?? '';
const html = readFileSync('build/index.html', 'utf8');
const liens = [...html.matchAll(/(?:src|href)="([^"]+)"|import\("([^"]+)"\)/g)].map((m) => m[1] ?? m[2]);
const absents = liens
	.filter((l) => !/^(https?:|data:|#)/.test(l))
	.filter((l) => {
		if (l.startsWith('/') && !l.startsWith(`${base}/`)) return true; // hors du dossier du site
		const chemin = l.startsWith('/') ? l.slice(base.length + 1) : l.replace(/^\.\//, '');
		return !existsSync(join('build', chemin.split(/[?#]/)[0]));
	});
if (absents.length) {
	console.error(`Ressources introuvables une fois en ligne (BASE_PATH="${base}") :\n  ${absents.join('\n  ')}`);
	process.exit(1);
}
console.log(`Liens : ${liens.length} ressources trouvées dans build/.`);
