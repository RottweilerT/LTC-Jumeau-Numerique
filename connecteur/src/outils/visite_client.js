"use strict";
const D = require("../donnees");
module.exports = {
  name: "visite_client",
  title: "Visite d'un client",
  description: "Détaille la visite d'un client désigné par son n° dans une vente : lots vus (avec heures de passage), lots revus, lots demandés mais pas encore vus, annotations, boîtes vues, état d'impression. Le nom du client n'est jamais communiqué.",
  inputSchema: { type: "object", properties: { vente: { type: "string", description: "Nom de la vente ou partie du nom" }, numero: { type: "integer", description: "N° du client dans la vente" } }, required: ["vente", "numero"], additionalProperties: false },
  async executer(d, { vente, numero }) {
    const vt = D.trouverVente(d, vente);
    const vs = [...d.visites.values()].filter(v => v.vente === vt.id).sort(D.ordreRang), v = vs[(+numero) - 1];
    if (!v) return `Pas de client n° ${numero} dans la vente « ${vt.nom} » (${vs.length} client${vs.length > 1 ? "s" : ""}).`;
    const cat = D.catalogFor(d, v), lots = (v.lots || []).slice().sort(D.ordreLot);
    const desc = l => { const e = D.info(cat, l.lot); return `${l.lot}${e.idlot ? " · réf. " + e.idlot : ""} · ${D.fmtFormat(e)} · ${e.locs.join(" + ")}`; };
    const vus = lots.filter(l => l.vu), non = lots.filter(l => !l.vu), revus = vus.filter(l => (l.revus || []).length), notes = lots.filter(l => l.note);
    const bx = (v.boites || []).slice().sort((a, b) => a.lotDe - b.lotDe);
    const out = [`Vente « ${vt.nom} » — client n° ${numero} — visite du ${D.fD(v.date)} ${v.heure || ""} — ${v.statut === "terminee" ? "terminée" : "en cours"} — fiche ${D.LIB_IMPR[D.etatImpr(d, v)]}`,
      "", `Lots vus (${vus.length}) :`, ...vus.map(l => `- ${desc(l)} — vu le ${D.fDT(l.vu)}${(l.revus || []).length ? " — revu le " + l.revus.map(D.fDT).join(", ") : ""}`),
      "", `Lots demandés, pas encore vus (${non.length}) :`, ...non.map(l => `- ${desc(l)}`)];
    if (bx.length) out.push("", `Boîtes (${bx.filter(b => b.vu).length} vue${bx.filter(b => b.vu).length > 1 ? "s" : ""} sur ${bx.length}) :`, ...bx.map(b => `- ${D.nomCourt(b)} (${b.lotDe} à ${b.lotA}, ${b.n} lots${b.place ? ", " + b.place : ""}) — ${b.vu ? "vue le " + D.fDT(b.vu) : "pas encore vue"}`));
    if (revus.length) out.push("", `Lots revus plusieurs fois : ${revus.map(l => `${l.lot} (${1 + l.revus.length} passages)`).join(", ")}`);
    if (notes.length) out.push("", "Annotations :", ...notes.map(l => `- ${l.lot} : « ${l.note} »`));
    return out.join("\n");
  }
};
