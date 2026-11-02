import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Modes:
//   (default)  dev/production build talking to the Express API
//   pages      static demo for https://rxloveckd-dev.github.io/rxloveckd/ (browser storage only)
//   gas        one self-contained Index.html served by the private Google Apps Script web app
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/rxloveckd/' : mode === 'gas' ? './' : '/',
  define: {
    'import.meta.env.VITE_STATIC_DEMO': JSON.stringify(mode === 'pages' ? 'true' : 'false'),
    'import.meta.env.VITE_GAS': JSON.stringify(mode === 'gas' ? 'true' : 'false'),
    // Optional trial Sheet for the public demo; never point this at the clinic's real Sheet.
    'import.meta.env.VITE_SHEETS_API_URL': JSON.stringify(mode === 'pages' ? (process.env.SHEETS_API_URL ?? '') : ''),
  },
  plugins: mode === 'gas' ? [react(), viteSingleFile()] : [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
}));
