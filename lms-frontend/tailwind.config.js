import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  // Rutas absolutas: el build corre desde la raíz del repo (Koinonia/), no
  // desde lms-frontend/, así que los globs relativos no resolverían bien.
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{ts,tsx}'),
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#123B5D',
          blueLight: '#1E5A85',
          ink: '#0F3252',
          gold: '#C8A45D',
          cream: '#F7F5EF',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
