# Viktoriya is learning Icelandic

Application gratuite et open source pour apprendre l'islandais (francophones et anglophones).
Prototype : Niveau 1, Partie 1 complète (7 leçons et point de passage).

## Commandes

```sh
npm install
npm run dev        # serveur de développement
npm run build      # vérification de sécurité + site statique dans build/ (pour GitHub Pages)
npm run check      # vérification des types
npm run verifier:bin  # formes islandaises contre BÍN (données dans .bin/, voir le workflow)
APERCU=1 npx vite build && python3 scripts/apercu-fragment.py apercu/index.html apercu/superpuffin.html
                   # aperçu en un seul fichier, publiable dans claude.ai
```

## Organisation

- `contenu/` : leçons en YAML. Validées par `src/lib/schema.ts` au build : texte brut seulement,
  Unicode NFC, champs inconnus refusés, renvois vérifiés. Une leçon invalide fait échouer le build.
- `src/lib/progression.svelte.ts`, `src/lib/stockage.ts` : progression sur l'appareil (IndexedDB),
  série quotidienne, révisions espacées FSRS (une carte par mot), export/import validé par
  `src/lib/progression-schema.ts`.
- `src/lib/correction.ts` : correction des réponses tapées (accent manquant = validé, lettre en rouge).
- `src/lib/components/` : lecteur de leçon, exercices, mini-clavier islandais.
- `scripts/audio-plan.ts`, `scripts/generer-audio.py` : audio de chaque phrase (Piper + voix Talrómur),
  généré en CI, un fichier par empreinte de (voix, vitesse, texte).
- `scripts/verifier-securite.mjs` : refuse `{@html}`, `innerHTML`, `eval` dans le code.

## Publication

Chaque push sur `main` lance `.github/workflows/deploiement.yml` : audit npm, règles de sécurité,
types, test BÍN, build, puis publication sur GitHub Pages. Les pull requests passent les mêmes
vérifications sans publier.

## Sécurité

CSP dans une balise meta (scripts et styles du site uniquement), aucune ressource tierce,
aucun traceur, aucun cookie. Routeur par `#` : l'appli fonctionne à n'importe quelle adresse.

## Licences

Code : GPL-3.0. Contenu : CC BY-SA 4.0. Voir CREDITS.md.
