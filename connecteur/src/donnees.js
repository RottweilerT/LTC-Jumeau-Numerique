"use strict";
/* Logique métier du jumeau, reprise de l'application (src/app.html) pour donner exactement les mêmes réponses :
   emplacements, caisses, fichier des lots d'une vente, n° des clients, état des ventes, empreinte des fiches imprimées.
   Ce module ne fait que lire (via firestore.js) et calculer. */
const TZ = "Europe/Paris";
const CACHE_MS = 60000;
let cache = null;

async function charger(source) {
  if (cache && Date.now() - cache.t < CACHE_MS) return cache.d;
  const [config, racks, items, visites] = await Promise.all(["config", "racks", "items", "visites"].map(c => source.collection(c)));
  const ventes = new Map(Object.entries((config.ventes && config.ventes.liste) || {}).filter(([, x]) => x && x.nom).map(([id, x]) => [id, { id, ...x }]));
  const d = { config, racks: new Map(Object.entries(racks).map(([id, r]) => [id, { id, ...r }])), items: new Map(Object.entries(items).map(([id, i]) => [id, { id, ...i }])),
    visites: new Map(Object.entries(visites).map(([id, v]) => [id, { id, ...v }])), ventes };
  d.catalogue = catalogue(d); d.cats = new Map(); d.catsFor = new Map();
  cache = { t: Date.now(), d };
  return d;
}
const viderCache = () => { cache = null; };

/* ---- Outils de texte et de date ---- */
const norm = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const auj = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
const dansDeuxMois = () => { const d = new Date(); d.setMonth(d.getMonth() + 2); return d.toLocaleDateString("sv-SE", { timeZone: TZ }); };
const fDT = iso => iso ? new Date(iso).toLocaleString("fr-FR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const fD = j => j ? j.split("-").reverse().join("/") : "";
const ordreLot = (a, b) => String(a.lot ?? a).localeCompare(String(b.lot ?? b), "fr", { numeric: true, sensitivity: "base" });

/* ---- Emplacements et catalogue (comme catalog() de l'appli) ---- */
function nomEmplacement(r) { const N = { coffre: "Coffre ", bureau: "Bureau ", table: "Table ", roulette: "Roulette ", lapin: "Lapin ", chien: "Rottweiler ", sol: "Au sol " }; return (N[r.type] || "Armoire ") + r.code; }
const lieu = (d, it) => { const r = d.racks.get(it.rackId); return r ? nomEmplacement(r) + ((r.niveaux | 0) > 1 ? ` · étage ${it.niveau}` : "") : "Emplacement inconnu"; };
const estCaisse = it => it.lotDe != null && it.lotA != null;
const lotsDeCaisse = it => Array.isArray(it.contenu) ? it.contenu : (Array.isArray(it.lots) ? it.lots : Array.from({ length: +it.lotA - +it.lotDe + 1 }, (_, i) => +it.lotDe + i)).map(l => ({ l }));
function catalogue(d) {
  const m = new Map();
  for (const it of d.items.values()) {
    if (estCaisse(it) && +it.lotA >= +it.lotDe && +it.lotA - +it.lotDe <= 20000) {
      const loc = lieu(d, it) + (it.nom ? ` · ${it.nom}` : "");
      for (const x of lotsDeCaisse(it)) { const key = String(x.l), e = m.get(key) || { lot: key, idlot: x.r ? String(x.r) : "", unite: x.f || "", qte: x.f ? 1 : 0, locs: [] }; if (!e.locs.includes(loc)) e.locs.push(loc); m.set(key, e); }
      continue;
    }
    const key = String(it.lot ?? it.nom ?? "").trim(); if (!key) continue;
    const loc = lieu(d, it);
    const e = m.get(key) || { lot: key, idlot: it.idlot ?? it.ref ?? "", unite: it.unite || "", qte: 0, locs: [] };
    e.qte += +it.qte || 0; if (!e.locs.includes(loc)) e.locs.push(loc);
    m.set(key, e);
  }
  return m;
}
const info = (cat, lot) => cat.get(String(lot)) || (cat.base && cat.base.get(String(lot))) || { lot: String(lot), idlot: "", unite: "", qte: 0, locs: ["Non rangé dans le jumeau"], plan: false };
// Fichier des lots d'une vente : config/lots_<vente>_<k>
function catVente(d, id) {
  const c = d.ventes.get(id) && d.ventes.get(id).catalogue; if (!c) return null;
  if (d.cats.has(id)) return d.cats.get(id);
  const m = new Map();
  for (let k = 0; k < (c.parts || 1); k++) for (const x of ((d.config[`lots_${id}_${k}`] || {}).lots || [])) m.set(String(x.l), x);
  d.cats.set(id, m); return m;
}
function catalogFor(d, v) {
  const base = d.catalogue, sm = v && v.vente ? catVente(d, v.vente) : null;
  if (!sm) return base;
  if (d.catsFor.has(v.vente)) return d.catsFor.get(v.vente);
  const m = new Map();
  for (const x of sm.values()) { const b = base.get(x.l); m.set(x.l, { lot: x.l, idlot: x.r || (b && b.idlot) || "", unite: x.u || (b && b.unite) || "", qte: +x.q || (b && b.qte) || 0, desc: x.d || "", locs: b ? b.locs : ["Pas encore placé sur le plan"], plan: !!b }); }
  m.fichier = true; m.base = base; d.catsFor.set(v.vente, m); return m;
}
const fmtFormat = e => e.unite ? `${e.unite}${e.qte ? " × " + e.qte : ""}` : "—";

/* ---- Ventes et n° des clients (comme l'appli) ---- */
const etatVente = x => !x || !x.date ? "en_cours" : x.date < auj() ? "passee" : x.date > dansDeuxMois() ? "a_venir" : "en_cours";
const LIB_ETAT = { en_cours: "en cours", a_venir: "à venir", passee: "passée" };
const libType = x => x.type === "offre" ? "vente sur offre" : "vente collection";
const ordreVisite = (a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.heure || "").localeCompare(String(b.heure || "")) || String(a.creee || "").localeCompare(String(b.creee || ""));
const premierVu = v => (v.lots || []).reduce((m, l) => l.vu && (!m || l.vu < m) ? l.vu : m, null);
const cleRang = v => v.ordreCle || premierVu(v);
const ordreRang = (a, b) => { const pa = cleRang(a), pb = cleRang(b); if (pa && pb && pa !== pb) return pa < pb ? -1 : 1; if (!!pa !== !!pb) return pa ? -1 : 1; return ordreVisite(a, b); };
function rang(d, v) {
  if (!v.vente || !d.ventes.has(v.vente)) return null;
  const l = [...d.visites.values()].filter(x => x.vente === v.vente).sort(ordreRang);
  return l.findIndex(x => x.id === v.id) + 1 || null;
}
function trouverVente(d, q) {
  const n = norm(q); if (!n) throw new Error("Indiquez la vente (nom ou partie du nom, ex. « VO246 » ou « décembre »).");
  const vs = [...d.ventes.values()];
  const exact = vs.filter(x => x.id === q || norm(x.nom) === n);
  if (exact.length === 1) return exact[0];
  const mots = n.split(/\s+/), cand = vs.filter(x => { const nn = norm(x.nom).replace(/\s+/g, " "), compact = nn.replace(/\s+/g, ""); return mots.every(m => nn.includes(m) || compact.includes(m.replace(/\s+/g, ""))); });
  if (cand.length === 1) return cand[0];
  if (!cand.length) throw new Error(`Aucune vente ne correspond à « ${q} ». Ventes existantes : ${vs.map(x => x.nom).join(" ; ")}.`);
  throw new Error(`Plusieurs ventes correspondent à « ${q} » : ${cand.map(x => x.nom).join(" ; ")}. Précisez.`);
}
// Désignation d'un client sans son nom : n° dans la vente (ou date de visite s'il n'est rangé dans aucune vente)
const designation = (d, v) => { const r = rang(d, v); return r ? `client n° ${r}` : `visite sans vente du ${fD(v.date)} ${v.heure || ""}`.trim(); };

/* ---- Empreinte des fiches (identique à l'appli, modèle de compte rendu « 2 ») ---- */
const MODELE_FICHE = "2";
const hash53 = str => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
const nomCourt = x => String(x.nom || "Boîte").split(" · ")[0];
function donneesFiche(d, v) {
  const cat = catalogFor(d, v);
  const seen = (v.lots || []).filter(l => l.vu).sort(ordreLot);
  const hm = iso => new Date(iso).toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const jm = iso => new Date(iso).toLocaleDateString("fr-FR", { timeZone: TZ, day: "2-digit", month: "2-digit" });
  const boites = (v.boites || []).filter(x => x.vu).sort((a, b) => a.vu.localeCompare(b.vu));
  const rows = [...boites.map(x => [nomCourt(x), `${x.lotDe}-${x.lotA}`, `${x.n} lots`, "Boîte", jm(x.vu) + " " + hm(x.vu)]),
    ...seen.map(l => { const e = info(cat, l.lot); return [l.lot, e.idlot ? String(e.idlot) : "—", e.qte ? String(e.qte) : "—", e.unite || "—", jm(l.vu) + " " + hm(l.vu) + (l.revuDuJour ? " revu" : "")]; })];
  const sg = v.signatures || {}; let sig = null;
  const ks = Object.keys(sg).filter(k => k.startsWith("client")).sort((a, b) => String(sg[b].t).localeCompare(String(sg[a].t))); if (ks.length) sig = sg[ks[0]];
  return { rows, tousJour: false, sig };
}
function empreinte(d, v) {
  const { rows, tousJour, sig } = donneesFiche(d, v), vte = d.ventes.get(v.vente);
  return hash53(JSON.stringify([MODELE_FICHE, v.nom || "", v.prenom || "", vte ? vte.nom : (v.typeVente || "collection"), vte ? vte.date || "" : v.dateVente || "", rang(d, v) || v.numero || "", v.date || "", sig ? [sig.t, (sig.img || "").length] : null, v.observations || "", tousJour, rows]));
}
const imprConfirmees = v => Object.entries(v.impr || {}).map(([lot, x]) => ({ lot, ...x })).sort((a, b) => String(a.t).localeCompare(String(b.t)));
function etatImpr(d, v) {
  const c = imprConfirmees(v); if (!c.length) return "jamais";
  const e = empreinte(d, v);
  return c.some(x => x.h === e) ? "ajour" : "reimp";
}
const LIB_IMPR = { jamais: "jamais imprimée", ajour: "imprimée, à jour", reimp: "à réimprimer" };

module.exports = { charger, viderCache, norm, fDT, fD, ordreLot, nomEmplacement, lieu, estCaisse, lotsDeCaisse, info, catVente, catalogFor, fmtFormat,
  etatVente, LIB_ETAT, libType, rang, ordreRang, trouverVente, designation, empreinte, etatImpr, imprConfirmees, LIB_IMPR, nomCourt, TZ };
