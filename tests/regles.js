const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const data = JSON.parse(fs.readFileSync('/tmp/demo.json', 'utf8')); const errs = [];
  const iso = m => { const d = new Date(); d.setMonth(d.getMonth() + m); return d.toLocaleDateString('sv-SE'); };
  data.config.ventes = { liste: { p: { nom: 'Vente passée test', date: iso(-1) }, c: { nom: 'Vente dans 1 mois', date: iso(1) }, f: { nom: 'Vente dans 3 mois', date: iso(3), etat: 'en_cours' }, n: { nom: 'Vente sans date', date: '' }, x: { nom: 'Ancienne marquée en cours', date: iso(-2), etat: 'en_cours' } } };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900); await p.click('#tabVis'); await p.waitForTimeout(300);
  for (const s of ['en cours', 'à venir', 'passées']) { await p.click(`.sections-ventes button:has-text("${s}")`); await p.waitForTimeout(200); console.log(s, ':', await p.locator('.vente-carte .vente-nom').allTextContents()); }
  await p.click('.sections-ventes button:has-text("à venir")'); await p.click('.vente-carte:has-text("3 mois")'); await p.waitForTimeout(300);
  console.log('règle :', await p.textContent('.regle-etat'), errs); await b.close();
})();
