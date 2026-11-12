const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const iso = m => { const d = new Date(); d.setDate(d.getDate() + m); return d.toLocaleDateString('sv-SE'); };
  const data = { personnes: { p_a: { nom: 'Armand Charrin' }, p_b: { nom: 'Benjamin Botti' } }, config: { profils: { remise: 1, ajout: 1 }, batiment: { nom: 'Bâtiment', largeur: 9, profondeur: 14, zones: [], murs: [] }, ventes: { liste: { vdec: { nom: 'Vente Collections Décembre 2026', date: iso(20) } } } },
    racks: { R1: { code: 'A1', type: 'etagere', x: 1, y: 1, w: 1, d: .5, niveaux: 4 } }, items: { L40322: { lot: 40322, nom: '40322', idlot: 172658, niveau: 2, rackId: 'R1', unite: 'A', qte: 1 } },
    visites: {
      a: { prenom: 'Frank', nom: 'Eder', date: '2026-11-02', heure: '08:02', statut: 'terminee', vente: 'vdec', signatures: {}, lots: [{ lot: '40322', vu: '2026-11-02T12:07:41Z', revus: ['2026-11-03T09:00:00Z'], note: 'Aminci au verso' }, { lot: '40323', vu: '2026-11-02T12:12:29Z' }], historique: [{ action: 'vu', lot: '40322', par: 'p_a', t: '2026-11-02T12:07:41Z' }, { action: 'vu', lot: '40323', par: 'p_a', t: '2026-11-02T12:12:29Z' }] },
      b: { prenom: 'Didier', nom: 'Bitran', date: '2026-11-09', heure: '09:30', statut: 'en_cours', vente: 'vdec', signatures: {}, lots: [{ lot: '40322', vu: '2026-11-09T08:32:22Z' }, { lot: '40150', vu: null }], historique: [{ action: 'vu', lot: '40322', par: 'p_b', t: '2026-11-09T08:32:22Z' }] },
      c: { prenom: 'Yann', nom: 'Desfresnes', date: '2026-11-04', heure: '10:00', statut: 'en_cours', vente: 'vdec', signatures: {}, lots: [{ lot: '40322', vu: null }], historique: [] } } };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900); await p.click('#tabVis'); await p.waitForTimeout(300);
  await p.click('.vente-carte:has-text("Décembre")'); await p.waitForTimeout(300);
  await p.click('button:has-text("Historique des lots")'); await p.waitForTimeout(500);
  await p.fill('.hl-q', '40322'); await p.waitForTimeout(300);
  console.log((await p.locator('.hl-lot').allInnerTexts()).join('\n---\n'));
  await p.screenshot({ path: '/tmp/histlots.png' });
  await p.click('.hl-opt input'); await p.waitForTimeout(200);
  console.log('avec non vus :', await p.locator('.hl-client').count(), errs); await b.close();
})();
