const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const data = JSON.parse(fs.readFileSync('/tmp/real.json', 'utf8')); const errs = [];
  data.items = { L40339: { lot: 40339, nom: '40339', niveau: 4, rackId: 'R4', unite: 'B5', qte: 1 } };
  const lots = n => [...Array(n)].map((_, i) => ({ lot: String(40100 + i), ajoute: '2026-11-05T08:00:00Z', vu: null }));
  data.visites = {};
  [['Frank', 'Eder', 40], ['Anne', 'Dupont', 12], ['Hans', 'Weber', 25], ['Marie', 'Leroy', 8], ['Jean', 'Petit', 5]].forEach(([p, n, k], i) =>
    data.visites['v' + i] = { prenom: p, nom: n, date: '2026-11-05', heure: '0' + (8 + i) + ':00', collab: 'Armand', statut: 'en_cours', typeVente: 'collection', prefixe: '40', lots: lots(k), historique: [], signatures: {} });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_x'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1000);
  await p.click('#tabVis'); await p.waitForTimeout(400);
  const openByName = async n => { await p.click(`.vitem:has-text("${n}")`); await p.waitForTimeout(250); };
  await openByName('Frank Eder');
  await p.locator('.ck').first().click(); await p.waitForTimeout(250);
  await p.click('text=← Toutes les visites'); await openByName('Anne Dupont');
  await p.click('.vtab-go:has-text("Frank")'); await p.waitForTimeout(250);
  console.log('onglets :', await p.locator('.vtab-go').allTextContents(), '| affiché :', await p.textContent('.vhead h2'));
  await p.click('.vtab.all'); for (const n of ['Hans Weber', 'Marie Leroy']) { await openByName(n); await p.click('.vtab.all'); await p.waitForTimeout(200); }
  await openByName('Jean Petit'); await p.waitForTimeout(300);
  console.log('5e visite refusée, onglets :', await p.locator('.vtab-go').count());
  await p.click('.vtab-go:has-text("Marie")'); await p.waitForTimeout(250);
  await p.screenshot({ path: '/tmp/tabs.png' });
  await p.click('[aria-label="Fermer l\'onglet de Marie Leroy"]'); await p.waitForTimeout(250);
  console.log('après fermeture :', await p.locator('.vtab-go').allTextContents(), '| affiché :', await p.textContent('.vhead h2'));
  await p.reload(); await p.waitForTimeout(1200);
  console.log('après rechargement :', await p.locator('.vtab-go').allTextContents());
  console.log('erreurs :', errs); await b.close();
})();
