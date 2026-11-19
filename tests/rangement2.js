const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const iso = m => { const d = new Date(); d.setDate(d.getDate() + m); return d.toLocaleDateString('sv-SE'); };
  const data = { personnes: { p_a: { nom: 'Armand Charrin' } }, config: { profils: { remise: 1, ajout: 1 }, batiment: { nom: 'Bâtiment', largeur: 9, profondeur: 14, zones: [], murs: [] }, ventes: { liste: { vo: { nom: 'VO246', date: iso(20), type: 'offre' } } } },
    racks: { r1: { code: 'A18', type: 'etagere', niveaux: 4, x: 1, y: 1, w: 2, d: 1 }, rc3: { code: 'C3', type: 'coffre', niveaux: 5, x: 5, y: 5, w: 1, d: 1 } }, items: Object.fromEntries([...Array(13)].map((_, k) => ['rg-rc3-vo246-' + (k + 1), { nom: 'ancienne caisse ' + (k + 1), rackId: 'rc3', niveau: 5, lotDe: 50000, lotA: 50312 }])),
    visites: { a: { prenom: 'Jean', nom: 'Test', date: iso(0), heure: '09:00', statut: 'en_cours', vente: 'vo', signatures: {}, historique: [], lots: [{ lot: '50104', vu: null }, { lot: '50120', vu: null }, { lot: '50740', vu: null }] } } };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); }, data);
  await p.reload(); await p.waitForTimeout(300);
  await p.setInputFiles('#f', '/mnt/user-data/outputs/rangement_VO246_coffre_C3.json'); await p.waitForTimeout(1500);
  console.log((await p.locator('#res').innerText()).replace(/\n/g, ' / '));
  await p.screenshot({ path: '/tmp/import.png' });
  const t0 = Date.now(); await p.click('#go'); await p.waitForFunction(() => /terminé|Échec/.test(document.querySelector('#msg').innerText), null, { timeout: 600000 }); console.log(await p.locator('#msg').innerText(), (Date.now() - t0) / 1000 + ' s');
  console.log('items :', await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('__fakefs')).items).length));
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900);
  await p.fill('#q', '50740'); await p.waitForTimeout(400); console.log('recherche :', (await p.locator('#results').innerText()).replace(/\n/g, ' / ')); await p.fill('#q', '171753'); await p.waitForTimeout(300); console.log('par idlot :', (await p.locator('#results').innerText()).replace(/\n/g, ' / ')); await p.fill('#q', '50740');
  await p.click('#tabVis'); await p.waitForTimeout(300); await p.locator('.vente-carte').first().click(); await p.waitForTimeout(300);
  await p.click('.vitem:has-text("Test")'); await p.waitForTimeout(500); await p.click('button:has-text("Tous les lots")'); await p.waitForTimeout(300);
  console.log('plan actif :', await p.locator('.plan-btn:not(.hors-plan)').count(), '/ grisé :', await p.locator('.plan-btn.hors-plan').count());
  await p.locator('.plan-btn').first().click(); await p.waitForTimeout(600); await p.screenshot({ path: '/tmp/c3.png' });
  await p.click('#retourVisite').catch(() => {}); await p.click('#tabPlan'); await p.fill('#q', ''); await p.waitForTimeout(300);
  let t1 = Date.now(); await p.fill('#q', ''); await p.waitForTimeout(200); t1 = Date.now(); await p.mouse.click(199, 389); await p.waitForTimeout(50); await p.waitForTimeout(100); console.log('ouverture C3 :', Date.now() - t1, 'ms, puces :', await p.locator('.chip').count());
  await p.locator('.chip').first().scrollIntoViewIfNeeded(); await p.screenshot({ path: '/tmp/c3panel.png' }); const h = await p.evaluate(() => document.documentElement.scrollHeight); console.log('hauteur page :', h);
  t1 = Date.now(); await p.fill('#q', 'caisse 7'); await p.waitForTimeout(100); console.log('recherche caisse 7 :', Date.now() - t1, 'ms', (await p.locator('#results').innerText()).split('\n').length);
  console.log(errs); await b.close();
})();
