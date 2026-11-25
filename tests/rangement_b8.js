const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const data = { personnes: { p_a: { nom: 'Ernestine Valmorel' } }, config: { profils: { remise: 1, ajout: 1 }, batiment: { nom: 'Bâtiment', largeur: 9, profondeur: 14, zones: [], murs: [] } },
    racks: { r24: { code: 'A24', niveaux: 4, x: 2, y: 2, w: 2, d: .6 }, r25: { code: 'A25', niveaux: 5, x: 5, y: 2, w: 2, d: .6 } }, items: {}, visites: {} };
  const ctx = await b.newContext({ viewport: { width: 900, height: 900 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'E'); }, data);
  for (let k = 0; k < 2; k++) {
    await p.reload(); await p.waitForTimeout(300);
    await p.setInputFiles('#f', '/mnt/user-data/outputs/rangement_VO246_B8_entre_A24_A25.json'); await p.waitForTimeout(500);
    console.log((await p.locator('#res').innerText()).replace(/\n/g, ' / ')); await p.click('#go'); await p.waitForTimeout(500);
  }
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem('__fakefs')));
  console.log('emplacements :', Object.values(d.racks).map(r => `${r.code}(${r.type || 'etagere'}) x=${r.x} y=${r.y}`).join(' | '), '| fiches :', Object.keys(d.items).length);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900);
  await p.fill('#q', '52883'); await p.waitForTimeout(400); console.log('recherche :', (await p.locator('#results').innerText()).replace(/\n/g, ' / '));
  await p.locator('#results button').first().click(); await p.waitForTimeout(500); await p.screenshot({ path: '/tmp/b8.png' });
  console.log(errs); await b.close();
})();
