const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const iso = m => { const d = new Date(); d.setDate(d.getDate() + m); return d.toLocaleDateString('sv-SE'); };
  const data = { personnes: { p_a: { nom: 'Ernestine Valmorel' } }, config: { profils: { remise: 1, ajout: 1 }, batiment: { nom: 'Bâtiment', largeur: 9, profondeur: 14, zones: [], murs: [] }, ventes: { liste: { vdec: { nom: 'Vente Décembre', date: iso(20) } } } },
    racks: {}, items: {}, visites: { a: { prenom: 'Zéphirin', nom: 'Bouldoire', date: iso(0), heure: '09:00', statut: 'en_cours', vente: 'vdec', signatures: {}, historique: [], lots: [{ lot: '40068', vu: null }, { lot: '40069', vu: null }, { lot: '40071', vu: null }] } } };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Ernestine Valmorel'); localStorage.setItem('visites-ouvertes', '["a"]'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900); await p.click('#tabVis'); await p.waitForTimeout(300); await p.click('.vtab-go:has-text("Bouldoire")'); await p.waitForTimeout(400);
  const n = async () => (await p.locator('.vtable tbody .lotno').allTextContents()).join(' ');
  await p.locator('.ck').first().click(); await p.waitForTimeout(300);
  console.log('1 touche :', await n(), '| armée :', await p.locator('.ck.arme').count());
  await p.screenshot({ path: '/tmp/double.png' });
  await p.locator('.ck').first().click(); await p.waitForTimeout(400);
  console.log('2 touches :', await n());
  await p.locator('.ck').first().click(); await p.waitForTimeout(3300); await p.locator('.ck').first().click(); await p.waitForTimeout(300);
  console.log('touches espacées de 3,3 s :', await n(), '| armée :', await p.locator('.ck.arme').count(), errs); await b.close();
})();
