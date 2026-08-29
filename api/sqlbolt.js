/**
 * Serverless reverse proxy for sqlbolt.com, the Vercel counterpart to the
 * Express proxy in server/index.js that serves this role locally.
 *
 * Serving SQLBolt from our own origin is what makes the embedded workspace
 * possible: SQLBolt sends `x-frame-options: SAMEORIGIN`, and the bridge in
 * src/services/sqlboltBridge.js can only read the iframe's DOM to detect task
 * completion while that frame stays same-origin.
 */

const UPSTREAM = 'https://sqlbolt.com';

/**
 * SQLBolt's lesson, topic and asset trees, and nothing else. Without this the
 * function would be an open proxy that fetched any URL a caller handed it.
 */
const ALLOWED_PATH = /^(?:lesson|topic|cs)(?:\/[A-Za-z0-9._-]+)*\/?$/;

const STRIPPED_HEADERS = new Set([
  // The whole reason this proxy exists.
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  // fetch() has already decoded the body, so upstream's framing of it is stale.
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
]);

export default async function handler(req, res) {
  const requested = String(req.query.upstream || '');

  if (requested.includes('..') || !ALLOWED_PATH.test(requested)) {
    res.status(400).send('Unsupported upstream path');
    return;
  }

  const url = new URL(`/${requested}`, UPSTREAM);
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'upstream') url.searchParams.set(key, String(value));
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'user-agent': req.headers['user-agent'] ?? 'Mozilla/5.0',
        accept: req.headers.accept ?? '*/*',
      },
    });

    upstream.headers.forEach((value, key) => {
      if (!STRIPPED_HEADERS.has(key.toLowerCase())) res.setHeader(key, value);
    });

    res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error(`[proxy] ${url.pathname} failed: ${error.message}`);
    // A body the client bridge recognises as a failed embed, so it swaps in the
    // offline workspace instead of hanging on a blank frame.
    res.status(502).send('<!doctype html><title>Upstream unavailable</title>');
  }
}
