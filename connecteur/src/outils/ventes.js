"use strict";
const D = require("../donnees");
module.exports = {
  name: "ventes",
  title: "Liste des ventes",
  description: "Liste les ventes du jumeau avec leur état (en cours, à venir, passée — même règle que l'appli : passée si la date est dépassée, à venir si elle a lieu dans plus de 2 mois), leur type, leur date, le nombre de visites clients et le fichier des lots éventuel.",
  inputSchema: { type: "object", properties: { etat: { type: "string", enum: ["en_cours", "a_venir", "passee", "toutes"], description: "Filtrer par état (défaut : toutes)" } }, additionalProperties: false },
  async executer(d, { etat } = {}) {
    let l = [...d.ventes.values()].sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999")));
    if (etat && etat !== "toutes") l = l.filter(x => D.etatVente(x) === etat);
    if (!l.length) return "Aucune vente dans cet état.";
    return l.map(x => {
      const vs = [...d.visites.values()].filter(v => v.vente === x.id), fin = vs.filter(v => v.statut === "terminee").length;
      return `- ${x.nom} — ${D.LIB_ETAT[D.etatVente(x)]} — ${D.libType(x)}${x.date ? " — le " + D.fD(x.date) : " — sans date"} — ${vs.length} visite${vs.length > 1 ? "s" : ""} (${vs.length - fin} en cours, ${fin} terminée${fin > 1 ? "s" : ""})${x.catalogue ? ` — fichier des lots : ${x.catalogue.n} lots` : ""}`;
    }).join("\n");
  }
};
