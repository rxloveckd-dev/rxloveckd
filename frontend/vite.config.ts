import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Version shown in the app: package.json version, plus the commit and date of this build. */
const appVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version as string;
let commit = '';
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  /* not a git checkout */
}

// Modes:
//   (default)  dev/production build talking to the Express API
//   pages      static demo for https://rxloveckd-dev.github.io/rxloveckd/demo/ (browser storage only);
//              the site root forwards to the clinic system (public-root/index.html)
//   gas        one self-contained Index.html served by the private Google Apps Script web app
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/rxloveckd/demo/' : mode === 'gas' ? './' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(commit),
    __APP_BUILT__: JSON.stringify(new Date().toISOString()),
    'import.meta.env.VITE_STATIC_DEMO': JSON.stringify(mode === 'pages' ? 'true' : 'false'),
    'import.meta.env.VITE_GAS': JSON.stringify(mode === 'gas' ? 'true' : 'false'),
    // Optional trial Sheet for the public demo; never point this at the clinic's real Sheet.
    'import.meta.env.VITE_SHEETS_API_URL': JSON.stringify(mode === 'pages' ? (process.env.SHEETS_API_URL ?? '') : ''),
  },
  plugins: mode === 'gas' ? [react(), viteSingleFile()] : [react()],
  // Apps Script's HtmlService does not run <script type="module">: build a classic script instead.
  build:
    mode === 'gas'
      ? { target: 'es2019', modulePreload: false, rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } } }
      : undefined,
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
}));
