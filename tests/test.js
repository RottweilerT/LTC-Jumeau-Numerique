// Test navigateur : node tests/test.js (nécessite playwright et un serveur sur :8765)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const exp = { format: 'jumeau-batiment', version: 1, exporte: new Date().toISOString(), collections: {
    config: { batiment: { nom: 'Bâtiment test', largeur: 12, profondeur: 8, zones: [], murs: [] } },
    racks: { R4: { code: 'A6', d: .5, h: 2, niveaux: 5, type: 'etagere', w: 1, x: 3, y: 1, zone: '' }, ROU46: { code: 'R57', d: .355, h: .8, niveaux: 1, type: 'roulette', w: .75, x: 6, y: 4, zone: '' } },
    items: { L40339: { idlot: 173048, lot: 40339, niveau: 5, nom: '40339', qte: 1, rackId: 'R4', unite: 'B5', maj: '2026-10-30T16:45:00Z' }, L40337: { idlot: 173044, lot: 40337, niveau: 1, nom: '40337', qte: 1, rackId: 'ROU46', unite: 'B8' } },
    visites: { v1: { nom: 'Eder', prenom: 'Frank', date: '2026-11-02', heure: '08:02', collab: 'Armand', statut: 'en_cours', typeVente: 'collection', prefixe: '40', lots: [{ lot: '40339', ajoute: '2026-11-02T07:00:00Z', vu: null }], historique: [], signatures: {} } } } };
  fs.writeFileSync('/tmp/export.json', JSON.stringify(exp));
  const b = await chromium.launch(); const ctx = await b.newContext(); const errs = [];
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue();
    return r.abort();
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.setInputFiles('#f', '/tmp/export.json');
  await p.waitForSelector('#go:not([disabled])'); await p.click('#go');
  await p.waitForSelector('.ok'); console.log('import :', await p.textContent('#msg'));
  await p.goto('http://localhost:8765/');
  await p.waitForSelector('form input[name=n]'); await p.fill('form input[name=n]', 'Armand'); await p.click('form button');
  await p.waitForTimeout(800);
  console.log('nom bâtiment :', await p.textContent('#bname'));
  console.log('emplacements dessinés :', await p.locator('#plan .rack').count());
  await p.click('#tabVis'); await p.waitForTimeout(500);
  console.log('visites :', (await p.textContent('#visits')).slice(0, 120).replace(/\s+/g, ' '));
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('__fakefs')).personnes);
  console.log('personnes :', JSON.stringify(st));
  console.log('erreurs :', errs);
  await b.close();
})();
