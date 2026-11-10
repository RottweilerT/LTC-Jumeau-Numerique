# LTC – Jumeau numérique du bâtiment

Plan 2D/3D du bâtiment avec les armoires, coffres, tables, roulettes et les lots rangés à chaque niveau, plus l'onglet **Visites clients** (lots à présenter, cochage en direct, compte rendu PDF signé).

- Site : https://rottweilert.github.io/LTC-Jumeau-Numerique/ (GitHub Pages, mis à jour à chaque modification de la branche `main`).
- Données partagées : Firebase Firestore (projet `ltc-jumeau-numerique`). La configuration est dans `firebase-config.js`.
- `firestore.rules` : règles d'accès à coller dans Firebase → Firestore Database → Règles. Accès ouvert : toute personne ayant le lien peut lire et modifier.
- `importer.html` : importe un fichier d'export (bouton « Exporter toutes les données » du jumeau) dans la base.

## Base Firebase

| Collection | Contenu |
| --- | --- |
| `config` | Document `batiment` : nom, dimensions, murs, portes, fenêtres, zones · document `ventes` : liste des ventes (nom, date, classement `etat` : en cours, à venir ou passée) où sont rangées les visites · document `profils` |
| `racks` | Un document par emplacement (armoire, coffre, table, bureau, roulette, sol…) |
| `items` | Un document par lot rangé (ou par niveau quand un lot occupe plusieurs niveaux) |
| `visites` | Une visite client par document : vente où elle est rangée, lots à présenter, heures de présentation, historique, signature |
| `personnes` | Profils des utilisateurs (choisis ou créés sur la page de connexion, gardés sur chaque appareil) |

## Modifier le code

L'application est dans `src/app.html`, le pont vers Firebase dans `src/shim.js`. Après modification : `node build.js` reconstruit `index.html`.

## Sauvegardes (onglet Actions)

- **Sauvegarde de la base** : chaque nuit, copie chiffrée de toute la base dans `sauvegarde/base.json.enc` (secret du dépôt `SAUVEGARDE_CLE` requis).
- **Restaurer la base** : remet une sauvegarde dans Firebase (taper RESTAURER pour confirmer).
