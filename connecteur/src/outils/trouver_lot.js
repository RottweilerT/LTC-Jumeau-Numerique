"use strict";
const D = require("../donnees");
module.exports = {
  name: "trouver_lot",
  title: "Où est rangé un lot",
  description: "Trouve où est rangé un lot dans le bâtiment (emplacement, étage, caisse ou boîte) à partir de son n° de lot (ex. 50740) ou de sa réf. à 6 chiffres. Indique aussi son format et les ventes dont le fichier des lots le contient.",
  inputSchema: { type: "object", properties: { numero: { type: "string", description: "N° de lot (ex. 50740, 40321A) ou réf. à 6 chiffres" } }, required: ["numero"], additionalProperties: false },
  async executer(d, { numero }) {
    const q = String(numero || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!q) throw new Error("Indiquez un n° de lot.");
    let cle = q;
    if (!d.catalogue.has(q) && /^\d{6}$/.test(q)) { const e = [...d.catalogue.values()].find(x => String(x.idlot) === q); if (e) cle = e.lot; }
    const e = d.catalogue.get(cle);
    const ventes = [...d.ventes.values()].filter(v => { const m = D.catVente(d, v.id); return m && (m.has(cle) || [...m.values()].some(x => String(x.r) === q)); })
      .map(v => { const m = D.catVente(d, v.id); const x = m.get(cle) || [...m.values()].find(y => String(y.r) === q); return { v, x }; });
    if (!e && !ventes.length) return `Le lot ${q} n'est rangé dans aucun emplacement du jumeau, et n'apparaît dans aucun fichier des lots de vente.`;
    const out = [`Lot ${e ? e.lot : q}${cle !== q ? ` (réf. ${q})` : ""}`];
    if (e) {
      out.push(`- Emplacement${e.locs.length > 1 ? "s" : ""} : ${e.locs.join(" + ")}`);
      if (e.idlot) out.push(`- Réf. : ${e.idlot}`);
      if (e.unite) out.push(`- Format (d'après le plan) : ${D.fmtFormat(e)}`);
    } else out.push("- Pas encore placé sur le plan du jumeau.");
    for (const { v, x } of ventes) out.push(`- Dans le fichier des lots de la vente « ${v.nom} » : réf. ${x.r || "—"}, format ${x.u ? x.u + (x.q ? " × " + x.q : "") : "—"}${x.d ? `, « ${x.d} »` : ""}`);
    return out.join("\n");
  }
};
