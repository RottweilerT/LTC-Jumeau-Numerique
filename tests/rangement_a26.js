const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const data = { personnes: { p_a: { nom: 'Ernestine Valmorel' } }, config: { profils: { remise: 1, ajout: 1 }, batiment: { nom: 'Bâtiment', largeur: 9, profondeur: 14, zones: [], murs: [] } },
    racks: { r25: { code: 'A26', niveaux: 5, x: 2, y: 2, w: 2, d: .6 }, c25: { code: 'A25', type: 'coffre', niveaux: 5, x: 6, y: 6, w: 1, d: 1 } }, items: {}, visites: {} };
  const ctx = await b.newContext({ viewport: { width: 900, height: 900 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'X'); }, data);
  await p.reload(); await p.waitForTimeout(300);
  await p.setInputFiles('#f', '/mnt/user-data/outputs/rangement_VO246_B9_B12_B4_armoire_A26.json'); await p.waitForTimeout(500);
  console.log((await p.locator('#res').innerText()).replace(/\n/g, ' / '));
  await p.click('#go'); await p.waitForTimeout(500);
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem('__fakefs')).items); const its = Object.values(d);
  console.log('fiches :', its.length, '| dans l\'armoire (pas le coffre) :', its.every(i => i.rackId === 'r25'), '| étages :', [...new Set(its.map(i => i.niveau))].join(','));
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900);
  await p.fill('#q', '52665'); await p.waitForTimeout(400); console.log('recherche :', (await p.locator('#results').innerText()).replace(/\n/g, ' / '));
  console.log(errs); await b.close();
})();
