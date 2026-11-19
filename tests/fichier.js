const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const iso = m => { const d = new Date(); d.setDate(d.getDate() + m); return d.toLocaleDateString('sv-SE'); };
  const data = { personnes: { p_a: { nom: 'Ernestine Valmorel' } }, config: { profils: { remise: 1, ajout: 1 }, batiment: { nom: 'Bâtiment', largeur: 9, profondeur: 14, zones: [], murs: [] }, ventes: { liste: { vdec: { nom: 'Vente Décembre', date: iso(20) } } } },
    racks: { r1: { nom: 'A18', type: 'armoire', niveaux: 4, x: 1, y: 1, l: 1, p: 1 } }, items: { i1: { lot: '40068', idlot: '111354', unite: 'B8', qte: 1, rackId: 'r1', niveau: 2 } },
    visites: { a: { prenom: 'Zéphirin', nom: 'Bouldoire', date: iso(0), heure: '09:00', statut: 'en_cours', vente: 'vdec', signatures: {}, historique: [], lots: [{ lot: '40068', vu: null }, { lot: '40999', vu: null }] } } };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Ernestine Valmorel'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900); await p.click('#tabVis'); await p.waitForTimeout(300);
  await p.locator('.vente-carte').first().click(); await p.waitForTimeout(300);
  await p.click('button:has-text("Importer le fichier des lots")'); await p.waitForTimeout(200);
  await p.setInputFiles('.fv ~ input[type=file], .modal input[type=file]', '/tmp/recap.csv'); await p.waitForTimeout(400);
  console.log('colonnes :', await p.$$eval('.fv select', s => s.map(x => x.selectedOptions[0].textContent).join(' | ')));
  console.log(await p.locator('.fv .vmeta').last().textContent());
  await p.screenshot({ path: '/tmp/fichier.png', fullPage: false });
  await p.click('button:has-text("Enregistrer 4 lots")'); await p.waitForTimeout(500);
  console.log('bouton :', await p.locator('.vente-tete button.on').textContent());
  const fsd = await p.evaluate(() => JSON.parse(localStorage.getItem('__fakefs')).config); console.log('docs :', Object.keys(fsd).join(','), JSON.stringify(fsd.lots_vdec_0.lots[2]), JSON.stringify(fsd.ventes.liste.vdec.catalogue));
  await p.click('.vitem:has-text("Bouldoire")'); await p.waitForTimeout(600); await p.click('button:has-text("Tous les lots")'); await p.waitForTimeout(300);
  console.log('lignes :', (await p.locator('.vtable tbody tr').allInnerTexts()).map(t => t.replace(/\s+/g, ' ')).join(' || '));
  console.log('plan grisé :', await p.locator('.plan-btn.hors-plan').count());
  await p.locator('button:has-text("+ Ajouter des lots")').first().click(); await p.waitForTimeout(300);
  console.log('ajout :', (await p.locator('.addlist label').allInnerTexts()).map(t => t.replace(/\s+/g, ' ')).join(' || '));
  await p.fill('#va-q', 'colonies'); await p.waitForTimeout(300); console.log('recherche desc :', (await p.locator('.addlist strong').allTextContents()).join(','));
  await p.screenshot({ path: '/tmp/fichier2.png' });
  console.log(errs); await b.close();
})();
