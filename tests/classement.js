// Arborescence : section (en cours / à venir / passées) → ventes (+ Nouvelle vente) → une vente (+ Nouvelle visite)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const vis = (id, vente) => ({ prenom: 'Client', nom: id, date: '2026-11-05', heure: '09:00', collab: 'Armand', statut: 'en_cours', typeVente: 'collection', prefixe: '40', lots: [], historique: [], signatures: {}, creee: '2026-11-05T08:00:00Z', vente });
  const data = { config: { profils: { remise: 9 }, ventes: { liste: {
      vdec: { nom: 'Vente Collection Décembre 2026', date: '2026-12-01' },
      vmar: { nom: 'Vente Collection Mars 2027', date: '2027-03-10' },
      vjun: { nom: 'Vente Collection Juin 2026', date: '2026-06-10' } } } },
    racks: {}, items: {}, personnes: { p_a: { nom: 'Armand Charrin' } }, visites: { a: vis('A', 'vdec'), b: vis('B', 'vjun'), c: vis('C', null) } };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); localStorage.setItem('vente-affichee', 'a_ranger'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(1000);
  await p.click('#tabVis'); await p.waitForTimeout(300);
  const sect = () => p.locator('.sections-ventes button').allTextContents();
  const ventes = () => p.locator('.vente-carte .vente-nom').allTextContents();
  console.log('sections :', await sect(), '| en cours :', await ventes(), '| bouton visite au niveau 2 :', await p.locator('button:has-text("+ Nouvelle visite")').count());
  await p.screenshot({ path: '/tmp/niv1.png' });
  await p.click('.sections-ventes button:has-text("à venir")'); await p.waitForTimeout(200);
  await p.click('button:has-text("+ Nouvelle vente")'); await p.fill('#vt-nom', 'Vente Single Lots Avril 2027'); await p.fill('#vt-date', '2027-04-15'); await p.click('.modal button:has-text("Créer la vente")'); await p.waitForTimeout(400);
  console.log('après création (à venir) → dans la vente :', await p.textContent('.vente-tete .vente-nom'), '| retour :', await p.textContent('.btn.retour'));
  await p.click('button:has-text("+ Nouvelle visite")'); await p.waitForTimeout(200);
  console.log('vente pré-remplie :', await p.$eval('#vf-vente', s => s.options[s.selectedIndex].text));
  await p.screenshot({ path: '/tmp/niv3.png' });
  await p.click('.btn.retour'); await p.waitForTimeout(200);
  console.log('à venir :', await ventes());
  await p.click('.sections-ventes button:has-text("en cours")'); await p.waitForTimeout(200);
  await p.click('.vente-carte:has-text("Mars")'); await p.waitForTimeout(200);
  await p.click('.vente-tete .etat-vente button:has-text("À venir")'); await p.waitForTimeout(400);
  await p.click('.btn.retour'); await p.waitForTimeout(200);
  console.log('Mars rangée → section :', await p.textContent('.sections-ventes [aria-pressed=true]'), '| ventes :', await ventes());
  await p.click('.sections-ventes button:has-text("passées")'); await p.waitForTimeout(200);
  console.log('passées :', await ventes(), '| sans vente :', await p.textContent('.sans-vente'));
  await p.click('.vente-carte:has-text("Juin")'); await p.waitForTimeout(200);
  console.log('visites de Juin :', await p.locator('.vitem b').allTextContents());
  console.log('erreurs :', errs); await b.close();
})();
