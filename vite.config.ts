import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { defineConfig, type Plugin } from 'vite';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load as lireYaml, CORE_SCHEMA } from 'js-yaml';
import { lecon, pointDePassage } from './src/lib/schema.ts';
import { fichierAudio, reglagesDesPhrases, textesExercice, VOIX_NEUTRE, VOIX_REPONSE } from './scripts/audio-plan.ts';

/** Lit et valide tout le contenu au build. Le bundle client ne reçoit que du JSON validé. */
function contenu(): Plugin {
	const ID = 'virtual:lecons';
	const lister = (d: string): string[] =>
		readdirSync(d, { withFileTypes: true }).flatMap((e): string[] =>
			e.isDirectory()
				? lister(join(d, e.name))
				: e.name.endsWith('.yaml') && !['hors-bin.yaml', 'prononciation.yaml'].includes(e.name)
					? [join(d, e.name)]
					: []
		);
	return {
		name: 'superpuffin-contenu',
		resolveId: (id) => (id === ID ? '\0' + ID : undefined),
		load(id) {
			if (id !== '\0' + ID) return;
			const lus = lister('contenu').map((chemin) => {
				this.addWatchFile(chemin);
				const brut = lireYaml(readFileSync(chemin, 'utf8'), { schema: CORE_SCHEMA }) as { schema?: string };
				const pp = brut?.schema === 'superpuffin/point-de-passage@1';
				const r = (pp ? pointDePassage : lecon).safeParse(brut);
				if (!r.success) {
					const details = r.error.issues.map((i) => `  - ${i.path.join('.') || '(racine)'} : ${i.message}`);
					throw new Error(`Contenu invalide dans ${chemin}\n${details.join('\n')}`);
				}
				// Relie chaque son à son fichier, s'il a été généré (static/audio, voir le workflow).
				// En CI (EXIGER_AUDIO=1), un son manquant fait échouer le build.
				const relier = (texte: string, reglage: Parameters<typeof fichierAudio>[1]) => {
					const fichier = fichierAudio(texte, reglage);
					if (existsSync(join('static', fichier))) return fichier;
					if (process.env.EXIGER_AUDIO === '1')
						throw new Error(`Audio manquant pour « ${texte} » (${fichier}) dans ${chemin}`);
					return undefined;
				};
				const reglages = reglagesDesPhrases(r.data);
				const phrases = r.data.phrases.map((p) => ({ ...p, audio: relier(p.is, reglages.get(p.id)!) }));
				const textes = new Map(r.data.phrases.map((p) => [p.id, p.is]));
				const exercices = r.data.exercices.map((ex) => {
					const t = textesExercice(ex, textes);
					const neutre = (x: string | null) => (x ? (relier(x, VOIX_NEUTRE) ?? null) : null);
					const sons = {
						...(t.choix ? { choix: t.choix.map(neutre) } : {}),
						...(t.blocs ? { blocs: t.blocs.map(neutre) } : {}),
						...(t.reponse ? { reponse: relier(t.reponse, VOIX_REPONSE) } : {}),
						...(t.reponses ? { reponses: t.reponses.map((x) => relier(x, VOIX_REPONSE) ?? null) } : {})
					};
					return Object.keys(sons).length ? { ...ex, sons } : ex;
				});
				const mots = 'mots' in r.data ? { mots: r.data.mots.map((m) => ({ ...m, audio: relier(m.lemme, VOIX_NEUTRE) })) } : {};
				return { ...r.data, ...mots, phrases, exercices };
			});
			const lecons = lus.filter((x) => x.schema === 'superpuffin/lecon@1') as Extract<(typeof lus)[number], { ordre: number }>[];
			const points = lus.filter((x) => x.schema === 'superpuffin/point-de-passage@1');
			// Identifiants uniques partout : ils servent de clés à la mémoire de révision.
			const verifier = (genre: string, ids: string[]) => {
				const doublons = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
				if (doublons.length) throw new Error(`Identifiants de ${genre} en double : ${doublons.join(', ')}`);
			};
			verifier('mots', lecons.flatMap((l) => l.mots.map((x) => x.id)));
			verifier('phrases', lus.flatMap((l) => l.phrases.map((x) => x.id)));
			verifier('exercices', lus.flatMap((l) => l.exercices.map((x) => x.id)));
			verifier('leçons', lus.map((l) => l.id));
			lecons.sort((a, b) => a.niveau - b.niveau || a.partie - b.partie || a.ordre - b.ordre);
			return (
				`export default JSON.parse(${JSON.stringify(JSON.stringify(lecons))});\n` +
				`export const pointsDePassage = JSON.parse(${JSON.stringify(JSON.stringify(points))});`
			);
		}
	};
}

// APERCU=1 : un seul fichier HTML autonome, pour l'aperçu partagé dans claude.ai
// (l'hébergeur de l'aperçu impose sa propre CSP et n'accepte pas de service worker).
const apercu = process.env.APERCU === '1';

export default defineConfig({
	plugins: [
		contenu(),
		sveltekit({
			adapter: adapter({ pages: apercu ? 'apercu' : 'build', assets: apercu ? 'apercu' : 'build', strict: true }),
			// GitHub Pages sert le site sous /<nom du dépôt>/ : BASE_PATH est fourni par le workflow.
			paths: { base: (process.env.BASE_PATH ?? '') as '' | `/${string}`, relative: true },
			output: apercu ? { bundleStrategy: 'inline' } : undefined,
			serviceWorker: apercu ? { register: false } : undefined,
			// Routeur par # : l'appli marche quelle que soit l'adresse qui la sert (GitHub Pages, aperçu).
			router: { type: 'hash' },
			csp: apercu ? undefined : {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					// Style en ligne de l'annonceur d'accessibilité de SvelteKit (à recalculer si SvelteKit change).
					'style-src': ['self', 'unsafe-hashes', 'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo='],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'manifest-src': ['self'],
					'worker-src': ['self'],
					'media-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['none']
				}
			}
		})
	]
});
