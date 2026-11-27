"use strict";
const D = require("../donnees");
module.exports = {
  name: "contenu_emplacement",
  title: "Contenu d'un emplacement",
  description: "Liste ce que contient un emplacement du plan (armoire, coffre, table, roulette, au sol…) désigné par son code (ex. C3, A25), étage par étage. Les caisses et boîtes sont résumées (n°, plage de lots, nombre de lots) ; utiliser contenu_caisse pour leur détail.",
  inputSchema: { type: "object", properties: { code: { type: "string", description: "Code de l'emplacement, ex. C3, A25, A24-A25" }, etage: { type: "integer", description: "Facultatif : un seul étage (1 = en bas)" } }, required: ["code"], additionalProperties: false },
  async executer(d, { code, etage }) {
    const c = String(code || "").trim().toUpperCase();
    const rs = [...d.racks.values()].filter(r => String(r.code || "").toUpperCase() === c);
    if (!rs.length) {
      const proches = [...d.racks.values()].map(r => String(r.code || "")).filter(x => x.toUpperCase().startsWith(c.slice(0, 1))).sort((a, b) => a.localeCompare(b, "fr", { numeric: true })).slice(0, 30);
      return `Aucun emplacement « ${c} » dans le plan.${proches.length ? " Codes proches : " + proches.join(", ") + "." : ""}`;
    }
    const out = [];
    for (const r of rs) {
      const n = Math.max(1, r.niveaux | 0), its = [...d.items.values()].filter(i => i.rackId === r.id);
      out.push(`${D.nomEmplacement(r)} — ${n} étage${n > 1 ? "s" : ""} (étage ${n} en haut) — ${its.length} fiche${its.length > 1 ? "s" : ""}`);
      for (let L = n; L >= 1; L--) {
        if (etage != null && L !== +etage) continue;
        const l = its.filter(i => i.niveau === L).sort((a, b) => (D.estCaisse(a) ? +a.lotDe : 0) - (D.estCaisse(b) ? +b.lotDe : 0) || String(a.nom).localeCompare(String(b.nom), "fr", { numeric: true }));
        out.push(`\nÉtage ${L} : ${l.length ? "" : "vide"}`);
        for (const i of l) {
          if (D.estCaisse(i)) out.push(`- ${i.nom || "Boîte"} : lots ${i.lotDe} à ${i.lotA}, ${D.lotsDeCaisse(i).length} lot${D.lotsDeCaisse(i).length > 1 ? "s" : ""}${i.note ? " (" + i.note + ")" : ""}`);
          else out.push(`- ${i.lot ?? i.nom}${i.ref || i.idlot ? " · réf. " + (i.idlot ?? i.ref) : ""}${i.unite ? " · " + D.fmtFormat({ unite: i.unite, qte: +i.qte }) : ""}${i.note ? " · " + i.note : ""}`);
        }
      }
      const autres = its.filter(i => i.niveau > n || i.niveau < 1);
      if (autres.length && etage == null) out.push(`\nÀ replacer (étage inexistant) : ${autres.map(i => i.nom).join(", ")}`);
      out.push("");
    }
    return out.join("\n").trim();
  }
};
