const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const n = +(process.argv[2] || 124);
  const b = await chromium.launch(); const data = JSON.parse(fs.readFileSync('/tmp/real.json', 'utf8')); const errs = [];
  data.items = { L40339: { lot: 40339, nom: '40339', niveau: 4, rackId: 'R4', unite: 'B5', qte: 1 } };
  const lots = [...Array(n)].map((_, i) => ({ lot: String(40100 + i), ajoute: '2026-11-05T08:00:00Z', vu: new Date(Date.UTC(2026, 10, 5, 8, 0, i * 20)).toISOString() }));
  lots.push({ lot: '40339', ajoute: '2026-11-05T08:00:00Z', vu: '2026-11-05T09:30:00Z' });
  data.visites = { v0: { prenom: 'Frank', nom: 'Eder', numero: '1234', dateVente: '2026-12-01', date: '2026-11-05', heure: '09:00', collab: 'Armand', statut: 'en_cours', typeVente: 'piece', prefixe: '', lots, historique: [], signatures: {}, observations: n > 50 ? 'Client très intéressé par les lettres anciennes, souhaite revenir la semaine prochaine.' : '' } };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.includes('jspdf.umd')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-jspdf.js', 'utf8') });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_x'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1000);
  await p.click('#tabVis'); await p.waitForTimeout(300); await p.click('.vitem'); await p.waitForTimeout(300);
  console.log('champs :', await p.inputValue('#vd-num'), await p.inputValue('#vd-dv'));
  const btn = p.locator('#visits button', { hasText: /Terminer et exporter|Réexporter/ }).first();
  console.log('bouton :', await btn.textContent()); await btn.click(); await p.waitForTimeout(1500);
  const conf = p.locator('button', { hasText: /Confirmer|Oui/ }); if (await conf.count()) { await conf.first().click(); await p.waitForTimeout(1500); }
  const imgs = await p.evaluate(async () => { while (window.__pending > 0) await new Promise(r => setTimeout(r, 50)); return (window.__pages || []).map(c => c.toDataURL('image/png')); });
  imgs.forEach((d, i) => fs.writeFileSync(`/tmp/pdf-p${i + 1}.png`, Buffer.from(d.split(',')[1], 'base64')));
  console.log('pages :', imgs.length, '| erreurs :', errs); await b.close();
})();
