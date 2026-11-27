"use strict";
const D = require("../donnees");
module.exports = {
  name: "clients_vente",
  title: "Clients d'une vente",
  description: "Liste les clients d'une vente par leur n° (les noms ne sont jamais communiqués) : date de visite, statut (en cours / terminée), lots demandés, vus, restants, boîtes vues, état d'impression de la fiche.",
  inputSchema: { type: "object", properties: { vente: { type: "string", description: "Nom de la vente ou partie du nom, ex. VO246, décembre" } }, required: ["vente"], additionalProperties: false },
  async executer(d, { vente }) {
    const vt = D.trouverVente(d, vente);
    const vs = [...d.visites.values()].filter(v => v.vente === vt.id).sort(D.ordreRang);
    if (!vs.length) return `Aucune visite dans la vente « ${vt.nom} ».`;
    return [`Vente « ${vt.nom} » — ${vs.length} client${vs.length > 1 ? "s" : ""} :`, ...vs.map(v => {
      const n = (v.lots || []).length, vu = (v.lots || []).filter(l => l.vu).length, bx = (v.boites || []).filter(b => b.vu).length;
      return `- ${D.designation(d, v)} — visite du ${D.fD(v.date)} ${v.heure || ""} — ${v.statut === "terminee" ? "terminée" : "en cours"} — ${vu} lot${vu > 1 ? "s" : ""} vu${vu > 1 ? "s" : ""} sur ${n}${bx ? ` + ${bx} boîte${bx > 1 ? "s" : ""} entière${bx > 1 ? "s" : ""}` : ""} — fiche ${D.LIB_IMPR[D.etatImpr(d, v)]}`;
    })].join("\n");
  }
};
