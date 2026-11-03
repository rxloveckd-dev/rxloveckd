// Updates the clinic system (Google Apps Script) in one step:
//   npm run deploy:gas
// 1. builds apps-script/Index.html from the current code
// 2. uploads Code.gs + Index.html (clasp push)
// 3. points the clinic's existing link at the new version (clasp deploy -i <same id>)
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const gasDir = path.join(root, 'apps-script');
/** The deployment behind the clinic link (and the github.io short link). */
const DEPLOYMENT_ID = 'AKfycbyPSbvU5OCGfq3IxjADaUoNDcKiTAzEaIx0v1Dyx8kPl5ERqYPFP4uipauoR1a-RmCE';
const CLASP = 'npx -y @google/clasp@2.4.2';
const version = require(path.join(root, 'frontend', 'package.json')).version;

const run = (cmd, cwd) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
};

run('npm run build:gas -w frontend', root);
run(`${CLASP} push -f`, gasDir);
run(`${CLASP} deploy -i ${DEPLOYMENT_ID} -d "Love CKD ${version}"`, gasDir);
console.log(`\nเสร็จแล้ว: ระบบคลินิกเป็นเวอร์ชัน ${version}`);
