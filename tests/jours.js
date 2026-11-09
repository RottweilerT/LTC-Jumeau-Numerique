const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const data = JSON.parse(fs.readFileSync('/tmp/demo.json', 'utf8')); const errs = [];
  // visite sur 3 jours : 4 lots le 1er jour, 3 le 2e (+ 1 revu du jour 1), 2 le 3e
  const L = (lot, vu, revus) => ({ lot: String(lot), ajoute: '2026-11-03T08:00:00Z', vu, revus });
  data.visites = { m: { prenom: 'Didier', nom: 'Bitran', date: '2026-11-03', heure: '09:00', collab: 'Benjamin Botti', statut: 'en_cours', typeVente: 'collection', prefixe: '40', vente: 'vdec', historique: [], signatures: {}, creee: '2026-11-03T08:00:00Z',
    lots: [L(40066, '2026-11-03T09:05:00Z'), L(40067, '2026-11-03T09:10:00Z', ['2026-11-04T10:30:00Z']), L(40068, '2026-11-03T09:20:00Z'), L(40069, '2026-11-03T09:25:00Z'),
      L(40070, '2026-11-04T10:00:00Z'), L(40071, '2026-11-04T10:10:00Z'), L(40072, '2026-11-04T10:20:00Z'), L(40073, '2026-11-05T14:00:00Z'), L(40074, '2026-11-05T14:05:00Z'), L(40075, null)] } };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.includes('jspdf.umd')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-jspdf.js', 'utf8') });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900);
  await p.click('#tabVis'); await p.click('.vchip:has-text("Collections")'); await p.click('.vitem:has-text("Bitran")'); await p.waitForTimeout(300);
  console.log('boutons :', await p.locator('#visits > .vacts').last().locator('button').allTextContents());
  await p.click('button:has-text("Exporter le compte rendu")'); await p.waitForTimeout(300);
  console.log('jours :', (await p.locator('.export-j').allInnerTexts()).map(s => s.split('\n').slice(0, 2).join(' | ')));
  await p.screenshot({ path: '/tmp/export-menu.png' });
  await p.locator('.export-j').nth(1).locator('button:has-text("Exporter")').click(); await p.waitForTimeout(1800);
  const imgs = await p.evaluate(async () => { while (window.__pending > 0) await new Promise(r => setTimeout(r, 50)); return (window.__pages || []).map(c => c.toDataURL('image/png')); });
  fs.writeFileSync('/tmp/jour2.png', Buffer.from(imgs[0].split(',')[1], 'base64'));
  await p.click('button:has-text("Terminer la visite")'); await p.waitForTimeout(300);
  console.log('statut :', await p.textContent('.vhead .chip-s'), errs); await b.close();
})();
