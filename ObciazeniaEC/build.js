/* Buduje jeden samodzielny plik dist/ObciazeniaEC.html (wszystkie skrypty wbudowane, działa offline).
   Użycie: node build.js */
'use strict';
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'src');
let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const a = html.indexOf('<!--SCRIPTS-->'), b = html.indexOf('<!--/SCRIPTS-->');
if (a < 0 || b < 0) throw new Error('brak znaczników SCRIPTS w index.html');
const block = html.slice(a, b);
const files = [...block.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const inl = files.map(f => {
  const code = fs.readFileSync(path.join(src, f), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>/* ${f} */\n${code}\n</script>`;
}).join('\n');
html = html.slice(0, a) + inl + '\n' + html.slice(b + '<!--/SCRIPTS-->'.length);
const pkg = { version: '1.0.0' };
html = html.replace('<title>ObciążeniaEC</title>', `<title>ObciążeniaEC</title>\n<meta name="generator" content="ObciazeniaEC ${pkg.version}">`);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
const out = path.join(__dirname, 'dist', 'ObciazeniaEC.html');
fs.writeFileSync(out, html);
console.log('zapisano', out, (html.length / 1024).toFixed(0) + ' kB', files.length + ' skryptów');
