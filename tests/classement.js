// Classement des ventes : en cours dans la barre, « À venir » et « Ventes passées » regroupées
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const vis = (id, vente) => ({ prenom: 'Client', nom: id, date: '2026-11-05', heure: '09:00', collab: 'Armand', statut: 'en_cours', typeVente: 'collection', prefixe: '40', lots: [], historique: [], signatures: {}, creee: '2026-11-05T08:00:00Z', vente });
  const data = { config: { profils: { remise: 9 }, ventes: { liste: {
      vdec: { nom: 'Vente Collection Décembre 2026', date: '2026-12-01' },
      vmar: { nom: 'Vente Collection Mars 2027', date: '2027-03-10', rangee: true },
      vjun: { nom: 'Vente Collection Juin 2026', date: '2026-06-10' } } } },
    racks: {}, items: {}, personnes: { p_a: { nom: 'Armand Charrin' } }, visites: { a: vis('A', 'vdec'), b: vis('B', 'vjun'), c: vis('C', null) } };
  const ctx = await b.newContext({ viewport: { width: 1100, height: 800 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); localStorage.setItem('vente-affichee', 'plus'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1000);
  await p.click('#tabVis'); await p.waitForTimeout(300);
  const barre = () => p.locator('.vventes:not(.sous) .vchip').allTextContents();
  console.log('barre :', await barre());
  await p.click('.vchip:has-text("Décembre")'); await p.waitForTimeout(300);
  console.log('ranger dans (sur la carte) :', await p.locator('.vente-tete .etat-vente button').allTextContents(), '| actif :', await p.textContent('.vente-tete .etat-vente [aria-pressed=true]'), '| « ⋯ » présent :', await p.locator('text=Ranger dans « ⋯ »').count());
  await p.screenshot({ path: '/tmp/classement1.png' });
  await p.click('.vente-tete .etat-vente button:has-text("À venir")'); await p.waitForTimeout(400);
  console.log('après À venir → barre :', await barre(), '| sous :', await p.locator('.vventes.sous .vchip').allTextContents(), '| eyebrow :', await p.textContent('.vente-tete .eyebrow'));
  await p.click('.vchip:has-text("Ventes passées")'); await p.waitForTimeout(300);
  console.log('passées :', await p.locator('.vventes.sous .vchip').allTextContents(), '| visites :', await p.locator('.vitem b').allTextContents());
  await p.click('.vventes.sous .vchip:has-text("Juin")'); await p.waitForTimeout(300);
  await p.click('.vente-tete .etat-vente button:has-text("En cours")'); await p.waitForTimeout(400);
  console.log('Juin remise en cours → barre :', await barre());
  // clic droit sur une puce → menu
  await p.click('.vventes:not(.sous) .vchip:has-text("Juin")', { button: 'right' }); await p.waitForTimeout(300);
  console.log('menu :', await p.locator('.modal .etat-vente button').allTextContents());
  await p.click('.modal .etat-vente button:has-text("Passée")'); await p.waitForTimeout(400);
  console.log('menu fermé :', (await p.locator('.modal').count()) === 0, '| barre :', await barre());
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('__fakefs')).config.ventes.liste);
  console.log('stocké :', Object.fromEntries(Object.entries(st).map(([k, v]) => [k, [v.etat, v.rangee]])));
  await p.setViewportSize({ width: 390, height: 844 }); await p.click('.vchip:has-text("À venir")'); await p.waitForTimeout(300);
  await p.click('.vventes.sous .vchip:has-text("Décembre")'); await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/classement2.png', fullPage: false });
  console.log('erreurs :', errs); await b.close();
})();
