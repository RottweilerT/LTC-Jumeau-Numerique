const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const data = JSON.parse(fs.readFileSync('/tmp/real.json', 'utf8'));
  for (const [vp, f] of [[{ width: 1280, height: 800 }, '/tmp/fit-desk.png'], [{ width: 390, height: 844 }, '/tmp/fit-mob.png']]) {
    const ctx = await b.newContext({ viewport: vp });
    await ctx.route('**/*', r => { const u = r.request().url();
      if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
      if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
      if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
      if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/importer.html');
    await p.evaluate(d => { localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_x'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); }, data);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500);
    await p.screenshot({ path: f }); await ctx.close();
  }
  console.log('erreurs :', errs); await b.close();
})();
