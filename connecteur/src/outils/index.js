"use strict";
/* Liste des outils : un fichier = un outil = une question précise. Tous en lecture seule.
   Pour ajouter un outil : créer un fichier sur le même modèle et l'ajouter ici. */
module.exports = [
  require("./trouver_lot"),
  require("./contenu_emplacement"),
  require("./contenu_caisse"),
  require("./ventes"),
  require("./clients_vente"),
  require("./visite_client"),
  require("./fiches_a_reimprimer")
];
