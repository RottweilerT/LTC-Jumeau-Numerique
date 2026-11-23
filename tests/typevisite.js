const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const iso = m => { const d = new Date(); d.setDate(d.getDate() + m); return d.toLocaleDateString('sv-SE'); };
  const data = { personnes: { p_a: { nom: 'Ernestine Valmorel' } }, config: { profils: { remise: 1, ajout: 1 }, batiment: { nom: 'Bâtiment', largeur: 9, profondeur: 14, zones: [], murs: [] }, ventes: { liste: { vc: { nom: 'Vente Collection Déc', date: iso(20), type: 'collection' }, vo: { nom: 'VO246', date: iso(25), type: 'offre' } } } }, racks: {}, items: {}, visites: {} };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('**/*', r => { const u = r.request().url();
    if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
    if (u.includes('compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
    if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/importer.html');
  await p.evaluate(d => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Ernestine Valmorel'); }, data);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900); await p.click('#tabVis'); await p.waitForTimeout(300);
  const coche = () => p.locator('input[name=vtype]:checked').getAttribute('value');
  for (const v of ['VO246', 'Vente Collection']) {
    await p.click(`.vente-carte:has-text("${v}")`); await p.waitForTimeout(300);
    await p.click('button:has-text("+ Nouvelle visite")'); await p.waitForTimeout(300);
    console.log(v, '→', await coche(), '| champ milliers :', await p.locator('#vf-prefixe').count());
    if (v === 'VO246') { await p.selectOption('#vf-vente', { label: 'Vente Collection Déc' }); await p.waitForTimeout(300); console.log('  vente changée dans le formulaire →', await coche()); }
    await p.click('button.retour'); await p.waitForTimeout(300);
  }
  console.log(errs); await b.close();
})();
