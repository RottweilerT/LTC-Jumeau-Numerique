const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const iso = m => { const d = new Date(); d.setDate(d.getDate() + m); return d.toLocaleDateString('sv-SE'); };
  const data = { personnes: { p_a: { nom: 'Ernestine Valmorel' } }, config: { profils: { remise: 1, ajout: 1 }, batiment: { nom: 'Bâtiment', largeur: 9, profondeur: 14, zones: [], murs: [] }, ventes: { liste: { vo: { nom: 'VO246', date: iso(20), type: 'offre' } } } },
    racks: { c3: { code: 'C3', type: 'coffre', niveaux: 5, x: 5, y: 5, w: 1, d: 1 } },
    items: { k1: { rackId: 'c3', niveau: 5, nom: 'Caisse 1 · 50000 → 50312', lotDe: 50000, lotA: 50312, lots: [50000, 50001, 50003], unite: 'lots', qte: 3 }, k3: { rackId: 'c3', niveau: 5, nom: 'Caisse 3 · 50637 → 50840', lotDe: 50637, lotA: 50840, lots: [50700, 50740], unite: 'lots', qte: 2 }, k5: { rackId: 'c3', niveau: 2, nom: 'Boîte SF 1 · 50120 → 52664', lotDe: 50120, lotA: 52664, lots: [50120], unite: 'lots', qte: 1 } },
    visites: { a: { prenom: 'Zéphirin', nom: 'Bouldoire', date: iso(0), heure: '09:00', statut: 'en_cours', vente: 'vo', typeVente: 'piece', signatures: {}, historique: [], lots: [{ lot: '53001', vu: null }] } } };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('jspdf.umd')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-jspdf.js', 'utf8') });
    if (u.includes('compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'E'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900); await p.click('#tabVis'); await p.waitForTimeout(300);
  await p.locator('.vente-carte').first().click(); await p.waitForTimeout(300); await p.click('.vitem:has-text("Bouldoire")'); await p.waitForTimeout(400);
  await p.click('button:has-text("+ Ajouter des boîtes")'); await p.waitForTimeout(300);
  console.log('boîtes proposées :', (await p.locator('.modal .addlist strong').allTextContents()).join(', '));
  await p.fill('.modal input[type=search]', '3'); await p.waitForTimeout(200); console.log('recherche « 3 » :', (await p.locator('.modal .addlist strong').allTextContents()).join(', '));
  await p.locator('.modal .addlist label:has-text("Caisse 3") input').check();
  await p.fill('.modal input[type=search]', '1'); await p.waitForTimeout(200); await p.locator('.modal .addlist label:has-text("Caisse 1") input').check();
  await p.click('.modal button:has-text("Ajouter (2)")'); await p.waitForTimeout(400);
  const ck = p.locator('.boite:has-text("Caisse 3") .ck');
  await ck.click(); await p.waitForTimeout(200); console.log('1 touche → vue ?', await p.locator('.boite.vue').count());
  await ck.click(); await p.waitForTimeout(400); console.log('2 touches → vue ?', await p.locator('.boite.vue').count(), '|', await p.locator('.boites .eyebrow').textContent());
  await p.locator('.boites').scrollIntoViewIfNeeded(); await p.screenshot({ path: '/tmp/boites.png' });
  await p.click('button:has-text("Exporter le compte rendu")'); await p.waitForTimeout(300); await p.click('.modal button:has-text("Exporter (PDF)")'); await p.waitForTimeout(1500);
  const png = await p.evaluate(() => window.__pages[0].toDataURL('image/png')); fs.writeFileSync('/tmp/cr_boites.png', Buffer.from(png.split(',')[1], 'base64'));
  console.log(errs); await b.close();
})();
