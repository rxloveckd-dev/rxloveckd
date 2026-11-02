// Turns the single-file Vite build into a page Apps Script's HtmlService can run:
// the inlined app script becomes a classic <script> at the end of <body> (after #root exists).
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'dist-gas', 'index.html');
const out = path.join(__dirname, '..', '..', 'apps-script', 'Index.html');
let html = fs.readFileSync(src, 'utf8');

const match = html.match(/<script type="module" crossorigin>([\s\S]*?)<\/script>/);
if (!match) throw new Error('inlined module script not found in dist-gas/index.html');
// Function replacers: the minified code contains "$'" / "$&", which a string replacement would expand.
html = html.replace(match[0], () => '');
html = html.replace('</body>', () => `<script>${match[1]}</script>\n</body>`);

if (/type="module"/.test(html)) throw new Error('a module script is still present');
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(process.cwd(), out)} (${Math.round(html.length / 1024)} KB)`);
