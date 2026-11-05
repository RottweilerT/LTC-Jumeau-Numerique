const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const data = JSON.parse(fs.readFileSync('/tmp/real.json', 'utf8'));
  data.items = { L40339: { lot: 40339, nom: '40339', niveau: 4, rackId: 'R4', unite: 'B5', qte: 1 } };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_x'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1200);
  await p.fill('#q', '40339'); await p.waitForTimeout(600);
  await p.screenshot({ path: '/tmp/hl.png' }); await b.close();
})();
