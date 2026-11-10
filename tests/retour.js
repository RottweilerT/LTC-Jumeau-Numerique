// Bouton « Précédent » : onglet → section → vente → visite, puis retour en arrière
const { chromium } = require('playwright'); const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/tmp/demo2.json', 'utf8'));
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1200);
  const ou = async () => p.evaluate(() => [document.querySelector('.seg.tabs [aria-pressed=true]')?.textContent, document.querySelector('.sections-ventes [aria-pressed=true]')?.textContent, document.querySelector('.vente-tete .vente-nom')?.textContent, document.querySelector('#visits h2')?.textContent].filter(Boolean).join(' | '));
  await p.click('#tabVis'); await p.waitForTimeout(200);
  await p.click('.sections-ventes button:has-text("passées")'); await p.waitForTimeout(200);
  await p.click('.sections-ventes button:has-text("en cours")'); await p.waitForTimeout(200);
  await p.click('.vente-carte:has-text("Décembre")'); await p.waitForTimeout(200);
  await p.click('.vitem:has-text("Habert")'); await p.waitForTimeout(300);
  console.log('A :', await ou());
  for (let i = 0; i < 5; i++) { await p.goBack(); await p.waitForTimeout(300); console.log('← :', await ou()); }
  await p.goForward(); await p.waitForTimeout(300); console.log('→ :', await ou());
  console.log('erreurs', errs); await b.close();
})();
