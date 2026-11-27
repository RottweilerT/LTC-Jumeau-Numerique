"use strict";
const D = require("../donnees");
module.exports = {
  name: "contenu_caisse",
  title: "Contenu d'une caisse ou d'une boîte",
  description: "Donne la liste des lots rangés dans une caisse ou une boîte (n° de lot, réf., format). Désigner la boîte par son n° ou son nom (ex. « 3 », « Caisse 3 », « SF 1 ») et, si besoin, par le code de son emplacement (ex. C3).",
  inputSchema: { type: "object", properties: { caisse: { type: "string", description: "N° ou nom de la caisse/boîte, ex. 3, Caisse 3, SF 2" }, emplacement: { type: "string", description: "Facultatif : code de l'emplacement, ex. C3" } }, required: ["caisse"], additionalProperties: false },
  async executer(d, { caisse, emplacement }) {
    const q = D.norm(caisse), emp = emplacement ? String(emplacement).trim().toUpperCase() : null;
    let l = [...d.items.values()].filter(D.estCaisse);
    if (emp) l = l.filter(i => { const r = d.racks.get(i.rackId); return r && String(r.code || "").toUpperCase() === emp; });
    const num = i => (String(D.nomCourt(i)).match(/(\d+)\s*$/) || [])[1];
    let t = /^\d{1,3}$/.test(q) ? l.filter(i => num(i) === String(+q)) : l.filter(i => D.norm(D.nomCourt(i)) === q);
    if (!t.length) t = l.filter(i => D.norm(i.nom).includes(q));
    if (!t.length) return `Aucune caisse ou boîte ne correspond à « ${caisse} »${emp ? " dans " + emp : ""}. Boîtes existantes : ${l.map(i => D.nomCourt(i) + " (" + D.lieu(d, i) + ")").join(", ") || "aucune"}.`;
    if (t.length > 1) return `Plusieurs boîtes correspondent : ${t.map(i => `${i.nom} — ${D.lieu(d, i)}`).join(" ; ")}. Précisez (nom complet ou emplacement).`;
    const i = t[0], lots = D.lotsDeCaisse(i).slice().sort((a, b) => D.ordreLot(String(a.l), String(b.l)));
    return [`${i.nom} — ${D.lieu(d, i)} — ${lots.length} lot${lots.length > 1 ? "s" : ""} (plage ${i.lotDe} à ${i.lotA})${i.note ? " — " + i.note : ""}`, "", "N° de lot · réf. · format",
      ...lots.map(x => `${x.l}${x.r ? " · " + x.r : ""}${x.f ? " · " + x.f : ""}`)].join("\n");
  }
};
