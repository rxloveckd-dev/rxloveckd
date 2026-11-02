import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run build:pages` builds the static demo for https://rxloveckd-dev.github.io/rxloveckd/
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/rxloveckd/' : '/',
  define: {
    'import.meta.env.VITE_STATIC_DEMO': JSON.stringify(mode === 'pages' ? 'true' : 'false'),
    // Apps Script web app URL of the trial Google Sheet (apps-script/Code.gs); empty = browser storage.
    'import.meta.env.VITE_SHEETS_API_URL': JSON.stringify(mode === 'pages' ? (process.env.SHEETS_API_URL ?? '') : ''),
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
}));
