const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const iso = m => { const d = new Date(); d.setDate(d.getDate() + m); return d.toLocaleDateString('sv-SE'); };
  const T0 = new Date(Date.now() - 3600e3).toISOString();
  const vis = (prenom, nom, statut, lots) => ({ prenom, nom, date: iso(0), heure: '09:00', statut, vente: 'vdec', signatures: {}, historique: [], lots });
  const data = { personnes: { p_a: { nom: 'Ernestine Valmorel' } }, config: { profils: { remise: 1, ajout: 1 }, batiment: { nom: 'Bâtiment', largeur: 9, profondeur: 14, zones: [], murs: [] }, ventes: { liste: { vdec: { nom: 'Vente Décembre', date: iso(20) } } } },
    racks: {}, items: {},
    visites: { a: vis('Zéphirin', 'Bouldoire', 'en_cours', [{ lot: '40068', vu: T0 }, { lot: '40069', vu: null }]), b: vis('Anselme', 'Tricotel', 'terminee', [{ lot: '40070', vu: T0 }]), c: vis('Ludovin', 'Varenque', 'en_cours', [{ lot: '40071', vu: T0 }]) } };
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
  let failPdf = false;
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.includes('jspdf.umd')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-jspdf.js', 'utf8') });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost') || u.startsWith('blob:')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.dismiss());
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Ernestine Valmorel'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900); await p.click('#tabVis'); await p.waitForTimeout(300);
  await p.locator('.vente-carte').first().click(); await p.waitForTimeout(400);
  const etats = async () => (await p.locator('.vitem:not(.vente-carte)').evaluateAll(cs => cs.map(c => c.querySelector('b').textContent.replace(/N° \d+/, '') + '=' + (c.querySelector('.impr-p')?.textContent || '?')))).join(' | ');
  const fsd = () => p.evaluate(() => JSON.parse(localStorage.getItem('__fakefs')));
  const ok = (cond, msg) => console.log((cond ? 'OK   ' : 'ÉCHEC ') + msg);
  await p.locator('.zone-finis summary').click();
  ok((await etats()).split('Non imprimée').length === 4, '0. au départ toutes jamais imprimées : ' + await etats());
  await p.click('.vitem:has-text("Zéphirin") >> nth=0'); await p.waitForTimeout(400);
  await p.click('button:has-text("Exporter le compte rendu")'); await p.waitForTimeout(300); await p.click('.modal button:has-text("Exporter (PDF)")'); await p.waitForTimeout(1500);
  const png = await p.evaluate(() => window.__pages[0].toDataURL('image/png')); require('fs').writeFileSync('/tmp/cr.png', Buffer.from(png.split(',')[1], 'base64'));
  const dd = await fsd(); console.log((dd.visites.a.historique || []).some(h => h.action === 'export') ? 'OK   export par jour toujours fonctionnel (' + await p.evaluate(() => (window.__pages || []).length) + ' page(s))' : 'ÉCHEC export par jour', errs);
  await b.close(); return;
  // 1. impression individuelle (Zéphirin) + confirmation
  await p.click('.vitem:has-text("Zéphirin") >> nth=0'); await p.waitForTimeout(400);
  await p.click('.impr-bloc button:has-text("Imprimer la fiche")'); await p.waitForTimeout(800);
  ok(await p.locator('.impr-apercu').count() === 1, '1a. aperçu affiché');
  let d = await fsd(); ok(Object.values(d.config.impressions.lots)[0].etat === 'genere' && !d.visites.a.impr, '1b. PDF généré ≠ imprimé');
  await p.click('.modal button:has-text("Ouvrir dans un onglet")').catch(() => {}); await p.waitForTimeout(300);
  for (const pg of ctx.pages().slice(1)) await pg.close();
  d = await fsd(); ok(Object.values(d.config.impressions.lots)[0].etat === 'demande' && !d.visites.a.impr, '1c. impression demandée, toujours pas confirmée');
  await p.click('.modal button:has-text("Oui, confirmer")'); await p.waitForTimeout(500);
  ok((await p.locator('.impr-bloc .impr-p').textContent()) === 'Imprimée à jour', '1d. après confirmation : à jour');
  // 4 + 14. statut changé sans changement de contenu
  await p.click('button:has-text("Terminer la visite")'); await p.waitForTimeout(300); await p.click('button:has-text("Rouvrir la visite")'); await p.waitForTimeout(300);
  ok((await p.locator('.impr-bloc .impr-p').textContent()) === 'Imprimée à jour', '4/14. terminer puis rouvrir : reste à jour');
  // 5/6. modification du contenu : cocher un lot
  await p.click('button:has-text("Tous les lots")'); await p.locator('tr:has-text("40069") .ck').click(); await p.locator('tr:has-text("40069") .ck').click(); await p.waitForTimeout(400);
  ok((await p.locator('.impr-bloc .impr-p').textContent()) === 'À réimprimer', '5/6. lot ajouté après impression : à réimprimer');
  // 7. réimpression
  await p.click('.impr-bloc button:has-text("Imprimer la fiche")'); await p.waitForTimeout(800); await p.click('.modal button:has-text("Oui, confirmer")'); await p.waitForTimeout(500);
  ok((await p.locator('.impr-bloc .impr-p').textContent()) === 'Imprimée à jour', '7. réimprimée : à jour');
  d = await fsd(); ok(Object.keys(d.visites.a.impr).length === 2, '13. deux impressions gardées dans l\'historique');
  await p.click('.impr-bloc summary'); console.log('     historique :', (await p.locator('.impr-hist').innerText()).replace(/\n/g, ' / ').replace(/\t/g, ' '));
  await p.screenshot({ path: '/tmp/impr-fiche.png' });
  // 9. annulation
  await p.click('.impr-bloc button:has-text("Imprimer la fiche")'); await p.waitForTimeout(800); await p.click('.modal button:has-text("Ne rien confirmer")'); await p.waitForTimeout(400);
  d = await fsd(); ok(Object.keys(d.visites.a.impr).length === 2 && Object.values(d.config.impressions.lots).some(x => x.etat === 'annule'), '9. annulation : rien de confirmé');
  // Centre d'impression
  await p.click('.vtab-go, button:has-text("Liste des visites")').catch(() => {}); await p.waitForTimeout(300);
  await p.locator('button:has-text("Centre d\'impression")').first().click(); await p.waitForTimeout(400);
  console.log('     compteurs :', (await p.locator('.impr-cpts').innerText()).replace(/\n/g, ' '));
  await p.click('.impr-sel button:has-text("+ Jamais imprimées")'); await p.waitForTimeout(200);
  await p.click('.impr-cpt:has-text("en cours")'); await p.waitForTimeout(200);
  console.log('     sélection :', await p.locator('.impr-sel .vmeta').textContent());
  ok(/2 fiches sélectionnées \(dont 1 masquée/.test(await p.locator('.impr-sel .vmeta').textContent()), '15b. sélection gardée quand le filtre masque une fiche');
  await p.click('.impr-cpt:has-text("en cours")'); await p.locator('.impr-l:has-text("Zéphirin") input').check(); await p.waitForTimeout(200);
  await p.screenshot({ path: '/tmp/centre.png' });
  await p.click('button:has-text("Imprimer la sélection")'); await p.waitForTimeout(300);
  console.log('     récap :', (await p.locator('.impr-recap').innerText()).replace(/\n/g, ' / '));
  await p.click('.modal button:has-text("Générer le PDF (3)")'); await p.waitForTimeout(1000);
  // 12. modification pendant le lot : Ludovin voit un lot de plus avant confirmation
  await p.evaluate(async () => { const db = window.firebase.firestore(); const v = (await db.doc('visites/c').get()).data(); await db.doc('visites/c').update({ lots: [...v.lots, { lot: '40099', vu: new Date().toISOString() }] }); }); await p.waitForTimeout(300);
  // 11. confirmation partielle : Anselme + Ludovin
  await p.locator('.modal:last-child button:has-text("Confirmer une partie")').click(); await p.waitForTimeout(200);
  await p.locator('.impr-part label:has-text("Tricotel") input').check(); await p.locator('.impr-part label:has-text("Varenque") input').check();
  await p.click('button:has-text("Confirmer la sélection")'); await p.waitForTimeout(600);
  d = await fsd(); const lotC = Object.values(d.config.impressions.lots).find(x => x.n === 3);
  ok(lotC.etat === 'partiel' && d.visites.b.impr && d.visites.c.impr && Object.keys(d.visites.a.impr).length === 2, '2/11. lot de 3 : confirmation partielle (2 sur 3)');
  console.log('     compteurs après :', (await p.locator('.impr-cpts').innerText()).replace(/\n/g, ' '));
  await p.reload(); await p.waitForTimeout(900); await p.click('#tabVis'); await p.waitForTimeout(300); await p.locator('.vente-carte').first().click().catch(() => {}); await p.waitForTimeout(400);
  await p.locator('.zone-finis summary').click().catch(() => {});
  console.log('     états :', await etats());
  ok(/Varenque=À réimprimer/.test(await etats()), '12. modifiée pendant le lot : l\'ancienne version est imprimée, la nouvelle est à réimprimer');
  ok(/Tricotel=Imprimée/.test(await etats()), '3. fiche terminée imprimée');
  // 10. échec de génération
  await p.evaluate(() => { window.jspdf.jsPDF = function () { throw new Error('panne'); }; });
  await p.locator('button:has-text("Centre d\'impression")').first().click(); await p.waitForTimeout(300);
  await p.locator('.impr-l:has-text("Zéphirin") input').check(); await p.click('button:has-text("Imprimer la sélection")'); await p.click('.modal button:has-text("Générer le PDF")'); await p.waitForTimeout(600);
  d = await fsd(); ok(Object.values(d.config.impressions.lots).some(x => x.etat === 'echec') && Object.keys(d.visites.a.impr).length === 2, '10. échec : aucune fiche marquée');
  console.log(errs); await b.close();
})();
