const { chromium } = require('playwright'); const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/tmp/demo.json', 'utf8'));
(async () => {
  const b = await chromium.launch(); const errs = [];
  const mk = async (vp, prof = true) => {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: vp.width < 500 });
    await ctx.route('**/*', r => { const u = r.request().url();
      if (u.includes('firebase-app-compat')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-firebase.js', 'utf8') });
      if (u.includes('firebase-firestore-compat')) return r.fulfill({ contentType: 'text/javascript', body: '' });
      if (u.includes('jspdf.umd')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync('tests/fake-jspdf.js', 'utf8') });
      if (u.endsWith('firebase-config.js')) return r.fulfill({ contentType: 'text/javascript', body: 'const FIREBASE_CONFIG = { apiKey: "x", projectId: "test" };' });
      if (u.startsWith('http://localhost')) return r.continue(); return r.abort(); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/importer.html');
    await p.evaluate(([d, prof]) => { localStorage.clear(); localStorage.setItem('__fakefs', JSON.stringify(d)); if (prof) { localStorage.setItem('jumeau-profil', 'p_a'); localStorage.setItem('jumeau-profil-nom', 'Armand Charrin'); } }, [data, prof]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(1200); return p;
  };
  const D = { width: 1440, height: 860 }, Mo = { width: 390, height: 844 };
  let p = await mk(D);
  await p.screenshot({ path: '/tmp/shots/plan.png' });
  await p.fill('#q', '4012'); await p.waitForTimeout(400); await p.screenshot({ path: '/tmp/shots/search-list.png' });
  await p.click('#results button:has-text("40123")'); await p.waitForTimeout(500); await p.screenshot({ path: '/tmp/shots/search.png' });
  await p.locator('#plan .rack.match').first().click(); await p.waitForTimeout(500); await p.screenshot({ path: '/tmp/shots/search-card.png' });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900);
  await p.click('#editBtn'); await p.waitForTimeout(500); await p.screenshot({ path: '/tmp/shots/edit.png' });
  await p.click('#editBtn'); await p.click('#tabVis'); await p.waitForTimeout(300);
  await p.click('.vchip:has-text("Collections")'); await p.waitForTimeout(300); await p.screenshot({ path: '/tmp/shots/ventes-desk.png' });
  await p.click('.vitem:has-text("Desfresnes")'); await p.waitForTimeout(400); await p.screenshot({ path: '/tmp/shots/visit-desk.png' });
  await p.click('.vtab.all'); await p.click('.vchip:has-text("À ranger")'); await p.click('button:has-text("+ Nouvelle visite")'); await p.waitForTimeout(300);
  await p.fill('#vf-nom', 'Martin'); await p.fill('#vf-prenom', 'Sophie'); await p.fill('#vf-paste', '077 078 112, 40150 40151 171190'); await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/shots/newvisit.png' });
  // PDF
  await p.click('#visits form button:has-text("Annuler")'); await p.click('.vchip:has-text("Collections")'); await p.click('.vitem:has-text("Eder")'); await p.waitForTimeout(300);
  await p.click('#visits button:has-text("Terminer et exporter")'); await p.waitForTimeout(1800);
  const imgs = await p.evaluate(async () => { while (window.__pending > 0) await new Promise(r => setTimeout(r, 50)); return (window.__pages || []).map(c => c.toDataURL('image/png')); });
  imgs.forEach((d, i) => fs.writeFileSync(`/tmp/shots/cr-p${i + 1}.png`, Buffer.from(d.split(',')[1], 'base64')));
  // Mobile
  p = await mk(Mo, false); await p.waitForSelector('.login-p'); await p.screenshot({ path: '/tmp/shots/login-m.png' });
  p = await mk(Mo);
  await p.screenshot({ path: '/tmp/shots/plan-m.png' });
  await p.click('#tabVis'); await p.click('.vchip:has-text("Collections")'); await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/shots/ventes-m.png' });
  for (const n of ['Eder', 'Thorell', 'Desfresnes']) { await p.click(`.vitem:has-text("${n}")`); await p.waitForTimeout(250); if (n !== 'Desfresnes') { await p.click('.vtab.all'); await p.waitForTimeout(200); } }
  await p.screenshot({ path: '/tmp/shots/tabs-m.png' });
  const card = p.locator('.vtab.all'); await card.click(); await p.waitForTimeout(200);
  const v = p.locator('.vitem:has-text("Weber")'); if (!(await v.count())) { await p.click('.vchip:has-text("À ranger")'); await p.waitForTimeout(200); }
  const bb = await p.locator('.vitem:has-text("Weber")').boundingBox();
  await p.mouse.move(bb.x + 40, bb.y + 20); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/shots/ranger-m.png' });
  console.log('erreurs :', errs); await b.close();
})();
