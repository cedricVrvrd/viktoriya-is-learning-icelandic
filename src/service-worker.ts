/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Hors ligne : met en cache l'application et le contenu au premier passage.
import { assets, immutable, prerendered } from '$app/manifest';
import { version } from '$app/env';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `viktoriya-${version}`;
// La page d'essais de voix n'est pas mise en cache hors ligne.
const RESSOURCES = [...immutable, ...assets, ...prerendered]
	.filter((r) => !r.path.includes('essais-audio/'))
	.map((r) =>
	new URL(r.path.replace(/^\//, ''), sw.registration.scope).href
);

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(RESSOURCES)));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (cles) => {
			for (const cle of cles) if (cle !== CACHE) await caches.delete(cle);
		})
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin) return;
	event.respondWith(
		// La page d'accueil répond aussi à …/?test (mode test), même hors ligne.
		caches.match(event.request, { ignoreSearch: event.request.mode === 'navigate' }).then((enCache) => enCache ?? fetch(event.request))
	);
});
