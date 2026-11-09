const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const data = JSON.parse(fs.readFileSync('/tmp/demo.json', 'utf8')); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900);
  await p.click('#tabVis'); await p.click('.vchip:has-text("Collections")'); await p.click('.vitem:has-text("Eder")'); await p.waitForTimeout(300);
  await p.click('button:has-text("Modifier les infos")'); await p.waitForTimeout(300);
  await p.fill('#mi-collab', 'Benjamin Botti'); await p.screenshot({ path: '/tmp/infos.png' });
  await p.click('.modal button:has-text("Enregistrer")'); await p.waitForTimeout(300);
  console.log(await p.locator('.vente-ligne .vmeta').first().textContent(), errs); await b.close();
})();
