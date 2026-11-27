# Connecteur Claude « LTC Jumeau (lecture seule) »

Ce connecteur permet de poser des questions sur le jumeau numérique **directement dans Claude pour ordinateur** (Windows) :

- « Où est rangé le lot 50740 ? »
- « Que contient le coffre C3 ? », « Que contient la caisse 3 du C3 ? »
- « Quelles ventes sont en cours ou à venir ? »
- « Quels lots le client n° 4 de la VO246 a-t-il vus ou pas encore vus ? »
- « Quelles fiches sont à réimprimer pour la vente de décembre ? »

## Ce qu'il fait, et ce qu'il ne fait pas

- **Il ne fait que lire.** Aucun de ses outils ne peut écrire, modifier ou supprimer quoi que ce soit. C'est verrouillé deux fois :
  1. dans le code, qui ne contient aucune fonction d'écriture ;
  2. dans la clé, qui n'a, chez Google, que le droit de **lire** (rôle « Cloud Datastore Viewer »).
- **Les noms des clients ne sont jamais transmis** : les clients sont désignés par leur n° dans la vente.
- **Il tourne sur votre PC.** Les données vont de Firebase à votre PC, puis à Claude, et nulle part ailleurs. Il n'ouvre aucune adresse sur Internet.
- **Il ne touche pas à l'appli** : le site, le code d'accès de l'équipe et les règles Firestore ne changent pas.
- **C'est gratuit** : vous restez en forfait Firebase Spark, sans carte bancaire. Si le quota gratuit de lectures du jour était dépassé, Firebase bloquerait simplement les lectures jusqu'au lendemain, sans rien facturer.
- **Il ne marche que dans Claude pour ordinateur**, quand l'application est ouverte. Il ne marche pas sur téléphone ni dans le navigateur.

---

## Étape 1 : créer la clé en lecture seule (une seule fois, environ 10 minutes)

C'est vous qui créez et gardez la clé. Ne l'envoyez à personne, ni à Claude, ni par message, ni par mail.

1. Allez sur **https://console.cloud.google.com** avec le compte Google qui a créé le projet Firebase.
2. En haut, choisissez le projet **ltc-jumeau-numerique**. C'est le même projet que Firebase.
3. Menu ☰, **IAM et administration**, puis **Comptes de service**.
4. Cliquez sur **+ Créer un compte de service** :
   - Nom : `claude-lecture-jumeau`
   - Description : `Lecture seule du jumeau pour Claude`
   - Cliquez sur **Créer et continuer**.
5. **Rôle** : cherchez et choisissez **« Cloud Datastore Viewer »** (en français parfois « Lecteur Cloud Datastore »). **Un seul rôle, aucun autre.** Cliquez sur **Continuer**, puis **OK**.
6. Dans la liste, cliquez sur `claude-lecture-jumeau@…`, puis sur l'onglet **Clés**, **Ajouter une clé**, **Créer une clé**, **JSON**, et enfin **Créer**. Un fichier `.json` se télécharge.
7. Déplacez ce fichier dans un dossier à vous, par exemple `Documents\LTC-cles\`. Vous pouvez le renommer, par exemple en `cle-lecture-jumeau.json`.
   - **Jamais** dans le dossier du dépôt GitHub, ni dans un dossier partagé ou synchronisé avec d'autres personnes.
8. Gardez une note dans LastPass : « Clé lecture jumeau : compte claude-lecture-jumeau, fichier rangé dans Documents\LTC-cles ».

⚠️ **N'utilisez pas** le compte « firebase-adminsdk-… » qui existe déjà dans la liste : il a tous les droits, y compris l'écriture.

## Étape 2 : installer le connecteur dans Claude pour ordinateur

1. Récupérez le fichier **`ltc-jumeau-lecture.mcpb`**, qui vous a été envoyé.
2. Ouvrez **Claude pour ordinateur**, puis **Paramètres** et **Extensions**. Selon la version : **Paramètres › Application de bureau › Extensions : Gérer**.
3. Cliquez sur **Paramètres avancés**, puis, dans la partie « Développeur d'extensions », sur **Installer une extension…**.
4. Choisissez le fichier `ltc-jumeau-lecture.mcpb` et confirmez l'installation.
5. Claude demande le **« Fichier de clé (lecture seule) »** : choisissez le fichier `.json` de l'étape 1.
6. Vérifiez que l'extension **LTC Jumeau (lecture seule)** est **activée**, avec l'interrupteur allumé.

## Étape 3 : l'utiliser

Dans une nouvelle conversation de Claude pour ordinateur, posez simplement vos questions, par exemple : « Où est rangé le lot 53532 ? ».
La première fois, Claude peut demander l'autorisation d'utiliser l'outil : acceptez.

Les outils disponibles :

| Outil | À quoi il sert |
|---|---|
| `trouver_lot` | Où est rangé un lot (par n° ou réf. à 6 chiffres) |
| `contenu_emplacement` | Ce que contient une armoire, un coffre… étage par étage |
| `contenu_caisse` | La liste des lots d'une caisse ou d'une boîte |
| `ventes` | Les ventes en cours, à venir ou passées |
| `clients_vente` | Les clients d'une vente, par n° |
| `visite_client` | Ce qu'un client (par n°) a vu ou pas encore vu |
| `fiches_a_reimprimer` | Les fiches à réimprimer pour une vente |

Les données sont relues au plus toutes les 60 secondes : une modification faite dans l'appli apparaît dans la minute.

## Couper, désinstaller, retirer l'accès

- **Couper pour un moment :** Paramètres › Extensions, puis éteignez l'interrupteur de « LTC Jumeau (lecture seule) ».
- **Désinstaller :** même endroit, puis **Désinstaller**.
- **Retirer définitivement l'accès,** par exemple si le PC est perdu ou si la clé a pu être copiée : dans console.cloud.google.com, ouvrez Comptes de service, puis `claude-lecture-jumeau`, onglet **Clés**, et **supprimez** la clé. Le connecteur ne peut alors plus rien lire. Pour le réutiliser, créez une nouvelle clé (étape 1, point 6) et choisissez-la dans les réglages de l'extension.

## Mettre à jour le connecteur

Installez simplement le nouveau fichier `.mcpb` par-dessus (étape 2). La clé déjà choisie peut être redemandée.

---

## Pour la maintenance (partie technique)

- **Code :** `src/firestore.js` (connexion, lecture seule), `src/donnees.js` (logique métier reprise de l'appli), `src/outils/` (un fichier par outil), `src/serveur.js` (protocole MCP par stdio, sans dépendance externe). Node.js est fourni par Claude pour ordinateur.
- **Ajouter un outil de lecture :** créez un fichier dans `src/outils/` sur le modèle des autres, puis ajoutez-le dans `src/outils/index.js` et dans `manifest.json`.
- **Ajouter un jour un outil d'écriture :** il faudrait une fonction dédiée dans `firestore.js` et une **autre** clé avec plus de droits. Ce n'est pas prévu pour l'instant.
- **Tests sur une fausse base,** avec des noms inventés uniquement : `node connecteur/tests/test.js`. L'équivalence avec l'appli, avec Playwright et le site servi sur le port 8765, se teste avec `node connecteur/tests/equivalence.js`.
- **Fabriquer le paquet :** `python3 connecteur/fabriquer_mcpb.py` produit `connecteur/dist/ltc-jumeau-lecture.mcpb`. Les fichiers `.mcpb` et toute clé sont exclus du dépôt par `.gitignore`.
- **Heures :** elles sont calculées en heure de Paris, comme sur les appareils de l'équipe. L'état « à réimprimer » est calculé exactement comme dans le centre d'impression de l'appli (modèle de compte rendu « 2 »). Si `MODELE_FICHE` change dans l'appli, il faut le changer aussi dans `src/donnees.js`.
- **Journal :** le connecteur n'écrit que le nom de l'outil appelé, sa durée et réussite/échec, sur la sortie d'erreur. Aucun nom, aucun n° de lot. Claude pour ordinateur peut tenir ses propres journaux techniques sur le PC, dans le dossier de logs de l'application.
