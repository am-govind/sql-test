/**
 * Application server.
 *
 * Serves the exam shell and reverse-proxies sqlbolt.com onto the same origin.
 * The proxy is what makes the embedded workspace possible at all: SQLBolt sends
 * `x-frame-options: SAMEORIGIN`, and reading its DOM to detect task completion
 * requires the iframe to be same-origin.
 */

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { loadEnvFile } from './load-env.js';
import { mountApiRoutes } from './api-routes.js';

loadEnvFile();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT) || 4000;
const isDev = process.env.NODE_ENV !== 'production';
const UPSTREAM = 'https://sqlbolt.com';

/**
 * Every link and asset on sqlbolt.com is root-absolute (`/lesson/...`,
 * `/cs/css/main.min.css`), so these must be proxied at the exact paths
 * upstream uses. A prefixed mount point would break the page's own navigation.
 */
const SQLBOLT_PATH_PATTERN = /^\/(lesson|topic|cs)(\/|$)/;

const app = express();

mountApiRoutes(app);

app.use(
  createProxyMiddleware({
    target: UPSTREAM,
    changeOrigin: true,
    followRedirects: true,
    // Filtering rather than mounting: `app.use('/lesson', ...)` would strip the
    // mount path and forward `/select_queries_introduction` upstream.
    pathFilter: (pathname) => SQLBOLT_PATH_PATTERN.test(pathname),
    on: {
      proxyRes(proxyRes) {
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
        delete proxyRes.headers['content-security-policy-report-only'];
      },
      error(err, req, res) {
        console.error(`[proxy] ${req.url} failed: ${err.message}`);
        // Answer with a body the client bridge can recognise as a failed embed
        // so it swaps in the offline workspace instead of hanging on a blank frame.
        if (res && typeof res.writeHead === 'function' && !res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<!doctype html><title>Upstream unavailable</title>');
        }
      },
    },
  })
);

const server = http.createServer(app);

if (isDev) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    root: ROOT,
    appType: 'spa',
    server: { middlewareMode: true, hmr: { server } },
  });
  app.use(vite.middlewares);
} else {
  const dist = path.join(ROOT, 'dist');
  app.use(express.static(dist));
  app.use((req, res) => res.sendFile(path.join(dist, 'index.html')));
}

server.listen(PORT, () => {
  console.log(`SQLBolt exam platform (${isDev ? 'dev' : 'production'}) on http://localhost:${PORT}`);
});
