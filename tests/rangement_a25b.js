const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const data = { personnes: { p_a: { nom: 'Ernestine Valmorel' } }, config: { profils: { remise: 1, ajout: 1 }, batiment: { nom: 'Bâtiment', largeur: 9, profondeur: 14, zones: [], murs: [] } },
    racks: { r25: { code: 'A25', niveaux: 4, x: 2, y: 2, w: 2, d: .6 } }, items: {}, visites: {} };
  const ctx = await b.newContext({ viewport: { width: 900, height: 900 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); }, data);
  for (const f of ['rangement_VO246_albums_armoire_A25.json', 'rangement_VO246_B1_B2_B3_armoire_A25.json']) {
    await p.reload(); await p.waitForTimeout(300);
    await p.setInputFiles('#f', '/mnt/user-data/outputs/' + f); await p.waitForTimeout(500);
    console.log((await p.locator('#res').innerText()).replace(/\n/g, ' / '));
    await p.click('#go'); await p.waitForTimeout(500); console.log(await p.locator('#msg').innerText());
  }
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem('__fakefs')));
  const par = {}; for (const i of Object.values(d.items)) par[i.niveau] = (par[i.niveau] || 0) + 1;
  console.log('armoire :', d.racks.r25.niveaux, 'étages, code', d.racks.r25.code, '| fiches par étage :', JSON.stringify(par), errs); await b.close();
})();
