import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    port: 3000,
    open: false,
    host: true,
    proxy: {
      '/sqlbolt-proxy': {
        target: 'https://sqlbolt.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/sqlbolt-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['frame-options'];
          });
        }
      },
      '/cs': {
        target: 'https://sqlbolt.com',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
          });
        }
      }
    }
  },
  build: {
    target: 'esnext',
  }
});
