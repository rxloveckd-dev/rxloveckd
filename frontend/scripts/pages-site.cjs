// Assembles the GitHub Pages site:
//   /rxloveckd/        → public-root/index.html, forwards to the private clinic system
//   /rxloveckd/demo/   → the static demo build
//   404.html           → demo app, so deep links like /rxloveckd/demo/patients still load
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const site = path.join(root, 'dist-pages');

fs.copyFileSync(path.join(root, 'public-root', 'index.html'), path.join(site, 'index.html'));
fs.copyFileSync(path.join(site, 'demo', 'index.html'), path.join(site, '404.html'));
fs.writeFileSync(path.join(site, '.nojekyll'), '');
for (const stale of ['assets']) {
  // Remove assets left from the old layout (demo used to live at the site root).
  fs.rmSync(path.join(site, stale), { recursive: true, force: true });
}
console.log('pages site: / → clinic system, /demo/ → demo');
