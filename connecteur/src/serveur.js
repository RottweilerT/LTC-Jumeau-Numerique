#!/usr/bin/env node
"use strict";
/* Serveur MCP (protocole « stdio ») du connecteur LTC Jumeau — LECTURE SEULE.
   Claude pour ordinateur lance ce programme et dialogue avec lui en JSON-RPC, une ligne par message.
   Journal : uniquement sur la sortie d'erreur, sans aucune donnée (nom d'outil, durée, réussite ou échec). */
const readline = require("readline");
const { ouvrirSource } = require("./firestore");
const D = require("./donnees");
const OUTILS = require("./outils");
const VERSION = require("../manifest.json").version;
const VERSIONS_PROTOCOLE = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const journal = m => process.stderr.write(`[ltc-jumeau] ${m}\n`);
const envoyer = o => process.stdout.write(JSON.stringify(o) + "\n");
let source = null;

const INSTRUCTIONS = "Connecteur en lecture seule sur le jumeau numérique de Le Timbre Classique (plan du bâtiment, lots rangés, caisses, ventes, visites clients, impression des fiches). " +
  "Les clients sont désignés uniquement par leur n° dans la vente : leurs noms ne sont jamais transmis, ne les demande pas. Aucun outil ne peut modifier les données. Heures en heure de Paris.";

async function traiter(m) {
  const { id, method, params } = m;
  if (method === "initialize") {
    const demande = params && params.protocolVersion;
    return { protocolVersion: VERSIONS_PROTOCOLE.includes(demande) ? demande : VERSIONS_PROTOCOLE[1], capabilities: { tools: { listChanged: false } }, serverInfo: { name: "ltc-jumeau-lecture", title: "LTC Jumeau (lecture seule)", version: VERSION }, instructions: INSTRUCTIONS };
  }
  if (method === "ping") return {};
  if (method === "tools/list") return { tools: OUTILS.map(o => ({ name: o.name, title: o.title, description: o.description, inputSchema: o.inputSchema, annotations: { title: o.title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } })) };
  if (method === "tools/call") {
    const o = OUTILS.find(x => x.name === (params && params.name));
    if (!o) throw Object.assign(new Error("Outil inconnu"), { code: -32602 });
    const t0 = Date.now();
    try {
      source = source || ouvrirSource();
      const d = await D.charger(source);
      const texte = await o.executer(d, (params && params.arguments) || {});
      journal(`${o.name} : réussi (${Date.now() - t0} ms)`);
      return { content: [{ type: "text", text: texte }], isError: false };
    } catch (e) {
      journal(`${o.name} : échec (${Date.now() - t0} ms)`);
      return { content: [{ type: "text", text: "Erreur : " + (e && e.message || "inconnue") }], isError: true };
    }
  }
  if (id === undefined) return undefined; // notification (ex. notifications/initialized) : pas de réponse
  throw Object.assign(new Error("Méthode inconnue : " + method), { code: -32601 });
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", async ligne => {
  if (!ligne.trim()) return;
  let m; try { m = JSON.parse(ligne); } catch (_) { envoyer({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON illisible" } }); return; }
  try {
    const r = await traiter(m);
    if (m.id !== undefined && r !== undefined) envoyer({ jsonrpc: "2.0", id: m.id, result: r });
  } catch (e) {
    if (m.id !== undefined) envoyer({ jsonrpc: "2.0", id: m.id, error: { code: e.code || -32603, message: e.message } });
  }
});
journal(`démarré (version ${VERSION}, lecture seule)`);
