const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const data = JSON.parse(fs.readFileSync('/tmp/real.json', 'utf8')); const errs = [];
  data.items = {}; for (let i = 0; i < 130; i++) data.items['L' + (40100 + i)] = { lot: 40100 + i, nom: String(40100 + i), idlot: 171000 + i, niveau: 1, rackId: 'R4', unite: ['B8', 'B9', 'A'][i % 3], qte: 1 + (i % 4) };
  const lots = (n, seen) => [...Array(n)].map((_, i) => ({ lot: String(40100 + i), ajoute: '2026-11-05T08:00:00Z', vu: seen ? new Date(Date.UTC(2026, 10, 5, 8, 0, i * 20)).toISOString() : null }));
  data.visites = {
    a: { prenom: 'Frank', nom: 'Eder', date: '2026-11-05', heure: '09:00', collab: 'Armand', statut: 'en_cours', typeVente: 'collection', prefixe: '40', lots: lots(126, true), historique: [], signatures: {}, creee: '2026-11-05T08:00:00Z' },
    b: { prenom: 'Yann', nom: 'Desfresnes', date: '2026-11-05', heure: '14:00', collab: 'Armand', statut: 'en_cours', typeVente: 'collection', prefixe: '40', lots: lots(10, false), historique: [], signatures: {}, creee: '2026-11-05T13:00:00Z' } };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.includes('jspdf.umd')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-jspdf.js', 'utf8') });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_x'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900);
  await p.click('#tabVis'); await p.waitForTimeout(300);
  console.log('puces :', await p.locator('.vchip').allTextContents());
  // appui long sur Yann → nouvelle vente
  const card = p.locator('.vitem:has-text("Desfresnes")'); const bb = await card.boundingBox();
  await p.mouse.move(bb.x + 40, bb.y + 20); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(300);
  console.log('menu ouvert :', await p.locator('.modal').count());
  await p.click('.modal button:has-text("+ Nouvelle vente")'); await p.fill('#vt-nom', 'Vente Collections Décembre 2026'); await p.fill('#vt-date', '2026-12-01'); await p.click('.modal button:has-text("Créer la vente")'); await p.waitForTimeout(400);
  console.log('ouverte après appui long ?', await p.locator('.vtab-go').count(), '| puces :', await p.locator('.vchip').allTextContents());
  // ranger Frank via bouton
  await p.click('.vitem:has-text("Eder") button:has-text("Ranger")'); await p.click('.modal .vente-choix button'); await p.waitForTimeout(400);
  console.log('à ranger :', await p.locator('.vitem').count());
  await p.click('.vchip:has-text("Décembre")'); await p.waitForTimeout(300);
  console.log('dans la vente :', (await p.locator('.vitem b').allTextContents()));
  await p.screenshot({ path: '/tmp/ventes.png' });
  await p.click('.vitem:has-text("Eder")'); await p.waitForTimeout(300);
  console.log('fiche :', await p.textContent('.vente-ligne'));
  await p.click('#visits button:has-text("Terminer et exporter")'); await p.waitForTimeout(1800);
  const imgs = await p.evaluate(async () => { while (window.__pending > 0) await new Promise(r => setTimeout(r, 50)); return (window.__pages || []).map(c => c.toDataURL('image/png')); });
  imgs.forEach((d, i) => fs.writeFileSync(`/tmp/cr-p${i + 1}.png`, Buffer.from(d.split(',')[1], 'base64')));
  console.log('pages PDF :', imgs.length, '| erreurs :', errs); await b.close();
})();
