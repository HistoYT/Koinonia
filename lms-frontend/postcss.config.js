import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    // Ruta explícita: sin esto, el plugin de Tailwind busca su config a partir
    // de process.cwd() (la raíz del repo) en vez de esta carpeta lms-frontend/.
    tailwindcss: { config: path.join(__dirname, 'tailwind.config.js') },
    autoprefixer: {},
  },
};
