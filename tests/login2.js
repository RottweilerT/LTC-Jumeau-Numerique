const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(() => { localStorage.setItem('__fakefs', JSON.stringify({ personnes: { p_a: { nom: 'Armand Charrin' }, p_b: { nom: 'Léa Martin' } }, config: { batiment: { nom: 'B', largeur: 12, profondeur: 8, zones: [], murs: [] } } })); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1500);
  console.log('connexion :', await p.locator('#login').count(), '| profils :', await p.locator('.login-p').allTextContents());
  for (const n of ['Armand Charrin', 'Test Effacer']) { await p.fill('.login-new input', n); await p.click('.login-new button'); await p.waitForSelector('#profilBtn'); await p.click('#profilBtn'); await p.click('#profilBtn'); await p.waitForSelector('.login-p'); }
  console.log('profils créés :', await p.locator('.login-p').allTextContents());
  await p.click('[aria-label="Supprimer le profil Test Effacer"]'); await p.click('[aria-label="Supprimer le profil Test Effacer"]'); await p.waitForTimeout(400);
  console.log('après suppression :', await p.locator('.login-p').allTextContents());
  await p.reload(); await p.waitForTimeout(800);
  console.log('remise pas refaite :', await p.locator('.login-p').allTextContents());
  // supprimer son propre profil depuis un autre onglet → déconnexion
  await p.click('.login-p'); await p.waitForSelector('#profilBtn');
  await p.evaluate(() => firebase.firestore().collection('personnes').doc(localStorage.getItem('jumeau-profil')).delete());
  await p.waitForTimeout(1500);
  console.log('profil supprimé → retour connexion :', await p.locator('#login').count());
  await p.screenshot({ path: '/tmp/login2.png' });
  console.log('erreurs :', errs); await b.close();
})();
