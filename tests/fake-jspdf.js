// Faux jsPDF pour les tests : dessine chaque page sur un canvas (4 px par mm).
(function () {
  const K = 4;
  function Doc() {
    const pages = []; let cur = null, font = 'helvetica', style = 'normal', size = 16, fill = '#000', draw = '#000', textc = '#000', lw = .2;
    const add = () => { const c = document.createElement('canvas'); c.width = 210 * K; c.height = 297 * K; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); pages.push(x); cur = x; };
    add();
    const col = a => a.length === 1 ? `rgb(${a[0]},${a[0]},${a[0]})` : `rgb(${a.join(',')})`;
    const setF = () => { cur.font = `${style === 'bold' ? 'bold ' : ''}${size * 0.3528 * K}px ${font === 'times' ? 'serif' : 'Arial, Helvetica, sans-serif'}`; };
    const d = {
      setFont(f, s) { font = f; style = s || 'normal'; }, setFontSize(s) { size = s; },
      setFillColor(...a) { fill = col(a); }, setDrawColor(...a) { draw = col(a); }, setTextColor(...a) { textc = col(a); }, setLineWidth(w) { lw = w; },
      getTextWidth(t) { setF(); return cur.measureText(String(t)).width / K; },
      splitTextToSize(t, w) { const out = []; let line = ''; for (const word of String(t).split(/\s+/)) { const tryL = line ? line + ' ' + word : word; if (d.getTextWidth(tryL) > w && line) { out.push(line); line = word; } else line = tryL; } if (line) out.push(line); return out; },
      text(t, x, y, o) { setF(); cur.fillStyle = textc; const lines = Array.isArray(t) ? t : [t]; lines.forEach((s, i) => { let xx = x; const wd = d.getTextWidth(s); if (o && o.align === 'center') xx -= wd / 2; if (o && o.align === 'right') xx -= wd; cur.fillText(s, xx * K, (y + i * size * 0.3528 * 1.15) * K); }); },
      line(x1, y1, x2, y2) { cur.strokeStyle = draw; cur.lineWidth = lw * K; cur.beginPath(); cur.moveTo(x1 * K, y1 * K); cur.lineTo(x2 * K, y2 * K); cur.stroke(); },
      rect(x, y, w, h, s) { if (s === 'F') { cur.fillStyle = fill; cur.fillRect(x * K, y * K, w * K, h * K); } else { cur.strokeStyle = draw; cur.lineWidth = lw * K; cur.strokeRect(x * K, y * K, w * K, h * K); } },
      addImage(src, fmt, x, y, w, h) { const im = new Image(); im.src = src; const ctx = cur; window.__pending = (window.__pending || 0) + 1; im.onload = () => { ctx.drawImage(im, x * K, y * K, w * K, h * K); window.__pending--; }; im.onerror = () => window.__pending--; },
      addPage() { add(); }, setPage(i) { cur = pages[i - 1]; }, getNumberOfPages() { return pages.length; },
      output() { window.__pages = pages.map(p => p.canvas); return new Blob(['%PDF-fake']); }
    };
    return d;
  }
  window.jspdf = { jsPDF: Doc };
})();
