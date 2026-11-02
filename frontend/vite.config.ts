import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run build:pages` builds the static demo for https://rxloveckd-dev.github.io/rxloveckd/
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/rxloveckd/' : '/',
  define: { 'import.meta.env.VITE_STATIC_DEMO': JSON.stringify(mode === 'pages' ? 'true' : 'false') },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
}));
