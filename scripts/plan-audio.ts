// Écrit la liste des fichiers audio à produire (JSON), lue ensuite par scripts/generer-audio.py.
// Usage : node scripts/plan-audio.ts > .audio-plan.json
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { planifier } from './audio-plan.ts';

const lister = (d: string): string[] =>
	readdirSync(d, { withFileTypes: true }).flatMap((e): string[] =>
		e.isDirectory()
			? lister(join(d, e.name))
			: e.name.endsWith('.yaml') && !['hors-bin.yaml', 'prononciation.yaml'].includes(e.name)
				? [join(d, e.name)]
				: []
	);

const lecons = lister('contenu').map((f) => load(readFileSync(f, 'utf8')) as Parameters<typeof planifier>[0][number]);
process.stdout.write(JSON.stringify(planifier(lecons), null, 1) + '\n');
