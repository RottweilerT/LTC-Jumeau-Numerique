// Équivalence appli ↔ connecteur pour l'état des fiches (à jour / à réimprimer / jamais imprimée).
// L'appli (copie de démonstration, faux Firebase) imprime et confirme des fiches, puis une visite est modifiée ;
// le connecteur, lancé sur la même base, doit donner exactement les mêmes états.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const RACINE = path.join(__dirname, '../..');
(async () => {
  const base = require('./fausse-base')().collections;
  base.personnes = { p_a: { nom: 'Ernestine Valmorel' } }; base.config.profils = { remise: 1, ajout: 1 };
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(RACINE, 'tests/fake-firebase.js'), 'utf8') });
    if (u.includes('jspdf.umd')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(RACINE, 'tests/fake-jspdf.js'), 'utf8') });
    if (u.includes('compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost') || u.startsWith('blob:')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'E'); }, base);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900); await p.click('#tabVis'); await p.waitForTimeout(300);
  await p.click('.vente-carte:has-text("999")'); await p.waitForTimeout(600);
  await p.locator('button:has-text("Centre d\'impression")').first().click(); await p.waitForTimeout(400);
  await p.click('.impr-sel button:has-text("Tout sélectionner")'); await p.click('button:has-text("Imprimer la sélection")'); await p.click('.modal button:has-text("Générer le PDF")'); await p.waitForTimeout(1200);
  await p.locator('.modal:last-child button:has-text("Tout confirmer")').click(); await p.waitForTimeout(600);
  // modification après impression : le client n° 2 voit un lot de plus
  await p.evaluate(async () => { const db = window.firebase.firestore(); const v = (await db.doc('visites/v1').get()).data(); await db.doc('visites/v1').update({ lots: v.lots.map(l => l.lot === '53532' ? { ...l, vu: '2026-11-20T11:30:00Z' } : l) }); }); await p.waitForTimeout(600);
  const app = await p.locator('.impr-l').evaluateAll(ls => ls.map(l => l.querySelector('.rang').textContent.trim() + '=' + l.querySelector('.impr-p').textContent.trim()));
  const fs2 = await p.evaluate(() => localStorage.getItem('__fakefs')); await b.close();
  const fichier = path.join(os.tmpdir(), 'equivalence.json'); fs.writeFileSync(fichier, fs2);
  const ent = [JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }), JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'fiches_a_reimprimer', arguments: { vente: '999' } } })].join('\n') + '\n';
  const sortie = execFileSync(process.execPath, [path.join(__dirname, '../src/serveur.js')], { input: ent, env: { ...process.env, JUMEAU_FAUSSE_BASE: fichier }, stdio: ['pipe', 'pipe', 'ignore'] }).toString();
  const texte = JSON.parse(sortie.trim().split('\n')[1]).result.content[0].text; fs.unlinkSync(fichier);
  const conn = {}; let g = null; for (const l of texte.split('\n')) { if (l.startsWith('À réimprimer')) g = 'À réimprimer'; else if (l.startsWith('Jamais')) g = 'Non imprimée'; else if (l.startsWith('Imprimées et à jour')) g = 'Imprimée'; else { const m = l.match(/client n° (\d+)/); if (m && g) conn['N° ' + m[1]] = g; } }
  const appM = Object.fromEntries(app.map(x => x.split('=')));
  console.log('appli      :', JSON.stringify(appM)); console.log('connecteur :', JSON.stringify(conn));
  const ok = Object.keys(appM).length === 2 && JSON.stringify(Object.entries(appM).sort()) === JSON.stringify(Object.entries(conn).sort()) && Object.values(appM).includes('À réimprimer') && Object.values(appM).includes('Imprimée');
  console.log(ok ? 'OK    mêmes états dans l\'appli et dans le connecteur (une fiche à jour, une à réimprimer)' : 'ÉCHEC différence entre appli et connecteur', errs); process.exit(ok ? 0 : 1);
})();
