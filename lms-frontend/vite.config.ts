import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  // La app se sirve desde /LideresVIP/, no desde la raíz del sitio.
  base: '/LideresVIP/',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../public/LideresVIP'),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
});
