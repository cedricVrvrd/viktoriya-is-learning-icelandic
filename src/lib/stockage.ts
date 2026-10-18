// Stockage local : une seule entrée dans IndexedDB. Aucune donnée ne quitte l'appareil.
// Si IndexedDB est indisponible (navigation privée, données bloquées), on garde en mémoire.
const BASE = 'viktoriya';
const MAGASIN = 'etat';
const CLE = 'progression';

let memoire: unknown;

function ouvrir(): Promise<IDBDatabase> {
	return new Promise((ok, ko) => {
		const req = indexedDB.open(BASE, 1);
		req.onupgradeneeded = () => req.result.createObjectStore(MAGASIN);
		req.onsuccess = () => ok(req.result);
		req.onerror = () => ko(req.error);
	});
}

export async function lire(): Promise<unknown> {
	try {
		const db = await ouvrir();
		return await new Promise((ok, ko) => {
			const req = db.transaction(MAGASIN, 'readonly').objectStore(MAGASIN).get(CLE);
			req.onsuccess = () => ok(req.result);
			req.onerror = () => ko(req.error);
		});
	} catch {
		return memoire;
	}
}

export async function ecrire(valeur: unknown): Promise<void> {
	memoire = valeur;
	try {
		const db = await ouvrir();
		await new Promise<void>((ok, ko) => {
			const tx = db.transaction(MAGASIN, 'readwrite');
			tx.objectStore(MAGASIN).put(valeur, CLE);
			tx.oncomplete = () => ok();
			tx.onerror = () => ko(tx.error);
		});
	} catch {
		// reste en mémoire pour la session
	}
}

/** Demande au navigateur de ne pas effacer les données (Safari les efface après 7 jours sinon). */
export async function demanderPersistance(): Promise<boolean> {
	try {
		if (!navigator.storage?.persist) return false;
		return (await navigator.storage.persisted()) || (await navigator.storage.persist());
	} catch {
		return false;
	}
}
