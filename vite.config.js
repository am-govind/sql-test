import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Vite runs in middleware mode behind the Express server in server/index.js,
// which owns the sqlbolt.com reverse proxy and the listening port.
export default defineConfig({
  // Root by default, which is what Vercel and the local server both serve from.
  // GitHub Pages serves from a repo subpath instead and sets BASE_PATH to match.
  base: process.env.BASE_PATH || '/',
  plugins: [
    tailwindcss(),
  ],
  build: {
    target: 'esnext',
  },
});
