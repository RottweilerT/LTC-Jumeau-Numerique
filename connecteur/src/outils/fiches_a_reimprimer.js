"use strict";
const D = require("../donnees");
module.exports = {
  name: "fiches_a_reimprimer",
  title: "Fiches à réimprimer",
  description: "Pour une vente, indique quelles fiches clients (comptes rendus) sont à réimprimer, lesquelles n'ont jamais été imprimées et lesquelles sont à jour, avec le même calcul que le centre d'impression de l'appli. Clients désignés par leur n°.",
  inputSchema: { type: "object", properties: { vente: { type: "string", description: "Nom de la vente ou partie du nom" } }, required: ["vente"], additionalProperties: false },
  async executer(d, { vente }) {
    const vt = D.trouverVente(d, vente);
    const vs = [...d.visites.values()].filter(v => v.vente === vt.id).sort(D.ordreRang);
    const g = { reimp: [], jamais: [], ajour: [] };
    for (const v of vs) { const c = D.imprConfirmees(v), der = c[c.length - 1]; g[D.etatImpr(d, v)].push(`${D.designation(d, v)}${der ? " (dernière impression le " + D.fDT(der.t) + ")" : ""}`); }
    return [`Vente « ${vt.nom} » — ${vs.length} fiche${vs.length > 1 ? "s" : ""}`,
      "", `À réimprimer (${g.reimp.length}) :`, ...(g.reimp.length ? g.reimp.map(x => "- " + x) : ["- aucune"]),
      "", `Jamais imprimées (${g.jamais.length}) :`, ...(g.jamais.length ? g.jamais.map(x => "- " + x) : ["- aucune"]),
      "", `Imprimées et à jour (${g.ajour.length}) :`, ...(g.ajour.length ? g.ajour.map(x => "- " + x) : ["- aucune"])].join("\n");
  }
};
