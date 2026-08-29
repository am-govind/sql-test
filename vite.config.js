import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Vite runs in middleware mode behind the Express server in server/index.js,
// which owns the sqlbolt.com reverse proxy and the listening port.
export default defineConfig({
  base: '/sql-test/',
  plugins: [
    tailwindcss(),
  ],
  build: {
    target: 'esnext',
  },
});
