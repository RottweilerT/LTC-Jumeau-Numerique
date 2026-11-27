// Fausse base pour les tests : uniquement des noms inventés très improbables.
const iso = m => { const d = new Date(); d.setDate(d.getDate() + m); return d.toLocaleDateString("sv-SE"); };
module.exports = () => ({ collections: {
  config: {
    batiment: { nom: "Bâtiment test", largeur: 9, profondeur: 14, zones: [], murs: [] },
    ventes: { liste: {
      vo: { nom: "Vente sur Offre 999 Essai", date: iso(20), type: "offre", catalogue: { nom: "listing.xlsx", n: 4, parts: 1, t: "2026-11-19T10:00:00Z" } },
      vc: { nom: "Vente Collection Essai Juin", date: iso(120), type: "collection" },
      vp: { nom: "Vente Passée Essai", date: iso(-30), type: "collection" } } },
    lots_vo_0: { lots: [{ l: "50740", r: "171753", u: "E", q: 1 }, { l: "50741", r: "171754", u: "Single lot", q: 1 }, { l: "52665", r: "159027", u: "B9", q: 1, d: "Monde entier" }, { l: "53532", r: "169610", u: "A", q: 5 }] },
    impressions: { lots: {} }
  },
  racks: { c3: { code: "C3", type: "coffre", niveaux: 5, x: 5, y: 5, w: 1, d: 1 }, a26: { code: "A26", niveaux: 5, x: 1, y: 1, w: 2, d: .6 }, a25: { code: "A25", type: "etagere", niveaux: 5, x: 3, y: 1, w: 2, d: .6 } },
  items: {
    k3: { rackId: "c3", niveau: 5, nom: "Caisse 3 · 50637 → 50840", ref: "VO999", qte: 2, unite: "lots", note: "VO999 : 1 single lot et 1 enveloppe", lotDe: 50637, lotA: 50840, lots: [50740, 50741], contenu: [{ l: 50740, r: 171753, f: "Enveloppe" }, { l: 50741, r: 171754, f: "Single lot" }] },
    sf1: { rackId: "c3", niveau: 2, nom: "Boîte SF 1 · 50120 → 52664", ref: "VO999", qte: 1, unite: "lots", lotDe: 50120, lotA: 52664, lots: [50120], contenu: [{ l: 50120, r: 148532, f: "SF" }] },
    b9: { rackId: "a26", niveau: 2, nom: "52665", ref: "159027", qte: 1, unite: "B9" },
    alb: { rackId: "a25", niveau: 4, nom: "53532", ref: "169610", qte: 5, unite: "A" }
  },
  visites: {
    v1: { prenom: "Zéphirin", nom: "Bouldoire", date: iso(0), heure: "09:00", statut: "en_cours", vente: "vo", typeVente: "piece", signatures: {}, historique: [],
      lots: [{ lot: "52665", vu: "2026-11-20T09:10:00Z", revus: ["2026-11-20T10:00:00Z"], note: "Intéressé, coin plié" }, { lot: "53532", vu: null }], boites: [{ b: "k3", nom: "Caisse 3 · 50637 → 50840", lotDe: 50637, lotA: 50840, n: 2, place: "Coffre C3 · étage 5", vu: "2026-11-20T09:30:00Z" }] },
    v2: { prenom: "Célestin", nom: "Fougerolle", date: iso(0), heure: "10:00", statut: "terminee", vente: "vo", typeVente: "piece", signatures: {}, historique: [],
      lots: [{ lot: "50740", vu: "2026-11-20T08:00:00Z" }] },
    v3: { prenom: "Anselme", nom: "Tricotel", date: iso(0), heure: "11:00", statut: "en_cours", vente: "vc", signatures: {}, historique: [], lots: [{ lot: "99999", vu: null }] }
  }
} });
