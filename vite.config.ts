import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { defineConfig, type Plugin } from 'vite';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load as lireYaml, CORE_SCHEMA } from 'js-yaml';
import { lecon } from './src/lib/schema';
import { fichierAudio, reglagesDesPhrases } from './scripts/audio-plan.ts';

/** Lit et valide tout le contenu au build. Le bundle client ne reçoit que du JSON validé. */
function contenu(): Plugin {
	const ID = 'virtual:lecons';
	const lister = (d: string): string[] =>
		readdirSync(d, { withFileTypes: true }).flatMap((e): string[] =>
			e.isDirectory()
				? lister(join(d, e.name))
				: e.name.endsWith('.yaml') && e.name !== 'hors-bin.yaml'
					? [join(d, e.name)]
					: []
		);
	return {
		name: 'superpuffin-contenu',
		resolveId: (id) => (id === ID ? '\0' + ID : undefined),
		load(id) {
			if (id !== '\0' + ID) return;
			const lecons = lister('contenu').map((chemin) => {
				this.addWatchFile(chemin);
				const r = lecon.safeParse(lireYaml(readFileSync(chemin, 'utf8'), { schema: CORE_SCHEMA }));
				if (!r.success) {
					const details = r.error.issues.map((i) => `  - ${i.path.join('.') || '(racine)'} : ${i.message}`);
					throw new Error(`Contenu invalide dans ${chemin}\n${details.join('\n')}`);
				}
				// Relie chaque phrase à son fichier audio, s'il a été généré (static/audio, voir le workflow).
				const reglages = reglagesDesPhrases(r.data);
				const phrases = r.data.phrases.map((p) => {
					const fichier = fichierAudio(p.is, reglages.get(p.id)!);
					if (existsSync(join('static', fichier))) return { ...p, audio: fichier };
					// En CI (EXIGER_AUDIO=1), une phrase sans audio fait échouer le build.
					if (process.env.EXIGER_AUDIO === '1')
						throw new Error(`Audio manquant pour ${p.id} « ${p.is} » (${fichier}) dans ${chemin}`);
					return p;
				});
				return { ...r.data, phrases };
			});
			lecons.sort((a, b) => a.niveau - b.niveau || a.partie - b.partie || a.ordre - b.ordre);
			return `export default JSON.parse(${JSON.stringify(JSON.stringify(lecons))});`;
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
