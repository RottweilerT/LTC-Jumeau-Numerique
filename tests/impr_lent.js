const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const iso = m => { const d = new Date(); d.setDate(d.getDate() + m); return d.toLocaleDateString('sv-SE'); };
  const T0 = new Date(Date.now() - 3600e3).toISOString();
  const vis = (prenom, nom, statut, lots) => ({ prenom, nom, date: iso(0), heure: '09:00', statut, vente: 'vdec', signatures: {}, historique: [], lots });
  const data = { personnes: { p_a: { nom: 'Ernestine Valmorel' } }, config: { profils: { remise: 1, ajout: 1 }, batiment: { nom: 'Bâtiment', largeur: 9, profondeur: 14, zones: [], murs: [] }, ventes: { liste: { vdec: { nom: 'Vente Décembre', date: iso(20), catalogue: { nom: 'f.xlsx', n: 3, parts: 1, t: '2026-11-19T10:00:00Z' } } } }, lots_vdec_0: { lots: [{ l: '40068', r: '111111', u: 'B9', q: 2 }, { l: '40069', r: '222222', u: 'A', q: 1 }, { l: '40070', r: '333333', u: 'B2', q: 3 }] } },
    racks: {}, items: {},
    visites: { a: vis('Zéphirin', 'Bouldoire', 'en_cours', [{ lot: '40068', vu: T0 }, { lot: '40069', vu: null }]), b: vis('Anselme', 'Tricotel', 'terminee', [{ lot: '40070', vu: T0 }]), c: vis('Ludovin', 'Varenque', 'en_cours', [{ lot: '40071', vu: T0 }]) } };
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
  let failPdf = false;
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase-lent.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.includes('jspdf.umd')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-jspdf.js', 'utf8') });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost') || u.startsWith('blob:')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.dismiss());
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Ernestine Valmorel'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900); await p.click('#tabVis'); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__delaiLots = 3000; });
  await p.locator('.vente-carte').first().click(); await p.waitForTimeout(200);
  await p.locator('button:has-text("Centre d\'impression")').first().click(); await p.waitForTimeout(200);
  await p.click('.impr-sel button:has-text("Tout sélectionner")'); await p.click('button:has-text("Imprimer la sélection")'); await p.click('.modal button:has-text("Générer le PDF")'); await p.waitForTimeout(400);
  await p.locator('.modal:last-child button:has-text("Tout confirmer")').click(); await p.waitForTimeout(4000);
  console.log('compteurs 4 s après :', (await p.locator('.impr-cpts').innerText()).replace(/\n/g, ' '));
  console.log(errs); await b.close();
})();
