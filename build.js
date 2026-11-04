// Reconstruit index.html à partir de src/ : node build.js
const fs = require('fs');
const app = fs.readFileSync('src/app.html', 'utf8');
const shim = fs.readFileSync('src/shim.js', 'utf8');
const head = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  + '<meta name="theme-color" content="#122C58"><link rel="icon" href="favicon-32.png?v=3" type="image/png"><link rel="apple-touch-icon" href="apple-touch-icon.png?v=3"><link rel="manifest" href="manifest.webmanifest">'
  + '<style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;padding:0}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style>'
  + '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>'
  + '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>'
  + '<script src="firebase-config.js"></script>'
  + '</head><body>';
const page = head + '<script>' + shim + '</script>\n' + app + '\n</body></html>\n';
for (const m of page.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(m[1]);
fs.writeFileSync('index.html', page);
console.log('index.html reconstruit');
