/**
 * En desarrollo, Vite sirve React y reenvía /api y /lti al backend local.
 * En producción, Express sirve dist/; este proxy no sustituye el proxy HTTPS.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3001', '/lti': 'http://127.0.0.1:3001' },
  },
});
