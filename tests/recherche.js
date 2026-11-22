const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const iso = m => { const d = new Date(); d.setDate(d.getDate() + m); return d.toLocaleDateString('sv-SE'); };
  const vis = (id, prenom, nom, statut, collab, t) => ({ prenom, nom, date: iso(0), heure: '09:00', statut, vente: 'vdec', collab, signatures: {}, historique: [], lots: [{ lot: '40068', vu: t }] });
  const data = { personnes: { p_a: { nom: 'Ernestine Valmorel' } }, config: { profils: { remise: 1, ajout: 1 }, batiment: { nom: 'Bâtiment', largeur: 9, profondeur: 14, zones: [], murs: [] }, ventes: { liste: { vdec: { nom: 'Vente Décembre', date: iso(20) } } } },
    racks: {}, items: {}, visites: { a: vis('a', 'Zéphirin', 'Bouldoire', 'en_cours', 'Ernestine Valmorel', '2026-11-10T09:00:00Z'), b: vis('b', 'Célestin', 'Fougerolle', 'en_cours', 'Isidore Peyrebrune', '2026-11-10T10:00:00Z'), c: vis('c', 'Anselme', 'Tricotel', 'terminee', 'Isidore Peyrebrune', '2026-11-10T11:00:00Z'), d: vis('d', 'Ludovin', 'Ombeline', 'terminee', 'Ernestine Valmorel', '2026-11-10T12:00:00Z') } };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Ernestine Valmorel'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900); await p.click('#tabVis'); await p.waitForTimeout(300);
  await p.locator('.vente-carte').first().click(); await p.waitForTimeout(300);
  const vis_ = async () => (await p.locator('.vitem:visible b').allTextContents()).join(' | ');
  console.log('tout :', await vis_());
  for (const q of ['bru', 'ombeline', 'peyrebrune', '3', 'zzz']) { await p.fill('#vc-q', ''); await p.type('#vc-q', q); await p.waitForTimeout(250); console.log(q, '→', await vis_(), (await p.locator('.hint').allTextContents()).filter(t => t.startsWith('Aucun')).join('')); }
  await p.fill('#vc-q', ''); await p.type('#vc-q', 'bit'); await p.waitForTimeout(250); await p.screenshot({ path: '/tmp/recherche.png' });
  console.log('focus gardé :', await p.evaluate(() => document.activeElement.id), errs); await b.close();
})();
