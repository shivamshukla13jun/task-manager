import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // dev server proxies to the API so the demo runs same-origin
      '/api': 'http://localhost:3000',
      '/encryption': 'http://localhost:3000',
    },
  },
});
