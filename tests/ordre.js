const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const data = JSON.parse(fs.readFileSync('/tmp/demo.json', 'utf8')); const errs = [];
  const L = (lot, vu) => ({ lot, ajoute: '2026-11-03T08:00:00Z', vu });
  data.visites = { m: { prenom: 'Test', nom: 'Ordre', date: '2026-11-03', heure: '09:00', statut: 'en_cours', typeVente: 'collection', prefixe: '40', vente: 'vdec', historique: [], signatures: {}, creee: '2026-11-03T08:00:00Z',
    lots: [L('40321A', '2026-11-03T09:00:00Z'), L('40070', null), L('40321', '2026-11-03T09:30:00Z'), L('40068', null), L('40150', '2026-11-03T08:10:00Z'), L('40099', null)] } };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.includes('jspdf.umd')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-jspdf.js', 'utf8') });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); localStorage.setItem('visites-ouvertes', '["m"]'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900);
  await p.click('#tabVis'); await p.waitForTimeout(300); await p.click('.vtab-go:has-text("Ordre")'); await p.waitForTimeout(400);
  const nums = async () => (await p.locator('.vtable tbody .lotno').allTextContents()).join(' ');
  console.log('à présenter :', await nums());
  await p.click('.filters button:has-text("Tous")'); await p.waitForTimeout(200); console.log('tous :', await nums());
  await p.click('.filters button:has-text("déjà vus")'); await p.waitForTimeout(200); console.log('vus :', await nums());
  await p.evaluate(() => { const o = window.jspdf.jsPDF; window.jspdf.jsPDF = function () { const d = o(); const t = d.text; window.__txt = []; d.text = (s, x, y, op) => { window.__txt.push(String(s)); return t(s, x, y, op); }; return d; }; });
  await p.click('button:has-text("Exporter le compte rendu")'); await p.waitForTimeout(300); await p.locator('.export-j button:has-text("Exporter")').first().click(); await p.waitForTimeout(1500);
  console.log('PDF :', (await p.evaluate(() => window.__txt)).filter(s => /^40\d{3}A?$/.test(s)).join(' '), errs); await b.close();
})();
