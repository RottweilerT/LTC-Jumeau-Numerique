"use strict";
/* Connexion à Firestore — LECTURE SEULE.
   Ce module ne sait faire que deux choses : lire un document, lire une collection.
   Il n'existe aucune fonction d'écriture, de modification ou de suppression.
   Deuxième verrou : la clé (compte de service « Cloud Datastore Viewer ») n'a, côté Google, que le droit de lire.

   Pour plus tard : un outil d'écriture demanderait d'ajouter ici une fonction dédiée (et une clé avec plus de droits).
   Rien d'autre n'aurait à changer. */
const fs = require("fs");
const crypto = require("crypto");
const https = require("https");
const tls = require("tls");

/* Certificats : ceux de Node + ceux de Windows (utile si un antivirus ou un pare-feu inspecte les connexions HTTPS).
   getCACertificates n'existe que sur les Node récents : sinon on garde le comportement par défaut. */
let CERTIFICATS;
try {
  if (typeof tls.getCACertificates === "function") {
    const s = new Set([...tls.getCACertificates("default"), ...(tls.getCACertificates("system") || [])]);
    CERTIFICATS = [...s];
  }
} catch (_) { CERTIFICATS = undefined; }

const MESSAGES_RESEAU = {
  ENOTFOUND: "adresse Google introuvable : pas d'internet ou DNS bloqué",
  EAI_AGAIN: "adresse Google introuvable : pas d'internet ou DNS bloqué",
  ECONNREFUSED: "connexion refusée (pare-feu ?)",
  ECONNRESET: "connexion coupée (pare-feu ou antivirus ?)",
  ETIMEDOUT: "délai dépassé (pare-feu ou proxy ?)",
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: "certificat non reconnu (antivirus ou proxy qui inspecte HTTPS)",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "certificat non reconnu (antivirus ou proxy qui inspecte HTTPS)",
  SELF_SIGNED_CERT_IN_CHAIN: "certificat non reconnu (antivirus ou proxy qui inspecte HTTPS)",
  DEPTH_ZERO_SELF_SIGNED_CERT: "certificat non reconnu (antivirus ou proxy qui inspecte HTTPS)",
  CERT_HAS_EXPIRED: "certificat expiré (horloge du PC à l'heure ?)",
};

/* Requête HTTPS minimale (GET ou POST de formulaire) — renvoie { status, ok, json() } */
function requete(url, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resoudre, rejeter) => {
    const opts = { method, headers: { ...headers }, autoSelectFamily: true, timeout: 20000 };
    if (CERTIFICATS) opts.ca = CERTIFICATS;
    if (body != null) opts.headers["Content-Length"] = Buffer.byteLength(body);
    const req = https.request(url, opts, res => {
      const morceaux = [];
      res.on("data", c => morceaux.push(c));
      res.on("end", () => {
        const texte = Buffer.concat(morceaux).toString("utf8");
        resoudre({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, json: async () => JSON.parse(texte) });
      });
    });
    req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
    req.on("error", e => {
      const code = e.code || "inconnu";
      const hote = new URL(url).hostname;
      rejeter(new Error(`Connexion à ${hote} impossible — ${MESSAGES_RESEAU[code] || "erreur réseau"} [${code}].`));
    });
    if (body != null) req.write(body);
    req.end();
  });
}

const LECTURE = "https://firestore.googleapis.com/v1/";
const JETON = "https://oauth2.googleapis.com/token";
const PORTEE = "https://www.googleapis.com/auth/datastore";

/* Conversion du format Firestore (REST) vers des valeurs JavaScript, comme le fait l'appli */
function valeur(v) {
  if (v == null) return null;
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return champs(v.mapValue.fields || {});
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(valeur);
  if ("referenceValue" in v) return v.referenceValue;
  if ("geoPointValue" in v) return v.geoPointValue;
  if ("bytesValue" in v) return v.bytesValue;
  return null;
}
const champs = f => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, valeur(v)]));

/* Source « vraie base » : clé de compte de service (fichier JSON choisi par l'utilisateur, jamais dans le dépôt) */
function sourceFirestore(cheminCle) {
  let cle;
  try { cle = JSON.parse(fs.readFileSync(cheminCle, "utf8")); }
  catch (_) { throw new Error("Fichier de clé illisible. Vérifiez le chemin indiqué dans les réglages de l'extension."); }
  if (cle.type !== "service_account" || !cle.private_key || !cle.client_email) throw new Error("Ce fichier n'est pas une clé de compte de service Google (JSON).");
  const projet = process.env.JUMEAU_PROJET || cle.project_id;
  let jeton = null, expire = 0;
  async function obtenirJeton() {
    if (jeton && Date.now() < expire - 60000) return jeton;
    const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
    const t = Math.floor(Date.now() / 1000);
    const corps = b64({ alg: "RS256", typ: "JWT" }) + "." + b64({ iss: cle.client_email, scope: PORTEE, aud: JETON, iat: t, exp: t + 3600 });
    const signature = crypto.sign("RSA-SHA256", Buffer.from(corps), cle.private_key).toString("base64url");
    const r = await module.exports.transport(JETON, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: corps + "." + signature }).toString() });
    if (!r.ok) throw new Error(`Google refuse la clé (${r.status}). Vérifiez qu'elle n'a pas été supprimée.`);
    const d = await r.json(); jeton = d.access_token; expire = Date.now() + (d.expires_in || 3600) * 1000;
    return jeton;
  }
  // Seule requête vers la base : un GET sur l'adresse de lecture de Firestore
  async function lire(chemin) {
    const url = `${LECTURE}projects/${projet}/databases/(default)/documents/${chemin}`;
    if (!url.startsWith(LECTURE)) throw new Error("Adresse refusée.");
    const r = await module.exports.transport(url, { method: "GET", headers: { Authorization: "Bearer " + await obtenirJeton() } });
    if (r.status === 404) return null;
    if (r.status === 403) throw new Error("Accès refusé par Google : la clé n'a pas le rôle « Cloud Datastore Viewer » sur ce projet.");
    if (!r.ok) throw new Error(`Lecture impossible (${r.status}).`);
    return r.json();
  }
  return {
    nom: "firestore",
    async document(col, id) { const d = await lire(`${col}/${encodeURIComponent(id)}`); return d ? champs(d.fields) : null; },
    async collection(col) {
      const out = {}; let page = "";
      do {
        const d = await lire(`${col}?pageSize=300${page ? "&pageToken=" + encodeURIComponent(page) : ""}`) || {};
        for (const x of d.documents || []) out[x.name.split("/").pop()] = champs(x.fields);
        page = d.nextPageToken || "";
      } while (page);
      return out;
    }
  };
}

/* Source « fausse base » pour les tests : un fichier JSON { collections: { col: { id: données } } } */
function sourceFichier(chemin) {
  const lireTout = () => { const j = JSON.parse(fs.readFileSync(chemin, "utf8")); return j.collections || j; };
  return {
    nom: "fausse base",
    async document(col, id) { const c = lireTout()[col] || {}; return c[id] ? JSON.parse(JSON.stringify(c[id])) : null; },
    async collection(col) { return JSON.parse(JSON.stringify(lireTout()[col] || {})); }
  };
}

function ouvrirSource() {
  if (process.env.JUMEAU_FAUSSE_BASE) return sourceFichier(process.env.JUMEAU_FAUSSE_BASE);
  const cle = process.env.JUMEAU_CLE;
  if (!cle) throw new Error("Aucun fichier de clé indiqué. Dans Claude : Paramètres › Extensions › LTC Jumeau › choisir le fichier de clé.");
  return sourceFirestore(cle);
}

module.exports = { ouvrirSource, valeur, champs, transport: requete };  // transport remplaçable uniquement par les tests
