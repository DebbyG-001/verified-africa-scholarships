import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './env.js';
import { createOpportunityService } from './opportunities.js';
import { runWriting, writingAvailable } from './writing.js';
import { createAuth } from './auth.js';
import { createDb } from './db.js';
import { createMailer } from './mailer.js';
import { startNotifications } from './notifications.js';

// Prefer the folder the app was started from (npm scripts run from the project root); this avoids
// Windows path redirection giving a different, unreadable path for the same folder.
const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = fs.existsSync(path.join(process.cwd(), 'server', 'index.js')) ? process.cwd() : scriptRoot;
loadEnv(root);

const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 5173;
const opportunities = createOpportunityService(root);
const db = await createDb(root);
const mailer = createMailer();
const auth = createAuth(db, mailer, { secureCookies: isProd && process.env.INSECURE_COOKIES !== '1' });
const notifications = startNotifications({ db, mailer, opportunities });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req, limit = 200000) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw new Error('too large'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function handleApi(req, res, url) {
  try {
    if (url.pathname === '/api/health') return send(res, 200, { ok: true });
    if (url.pathname === '/api/me/test-email' && req.method === 'POST') {
      const u = await auth.userFrom(req);
      if (!u) return send(res, 401, { error: 'signed_out' });
      try { const r = await notifications.sendTest(u); return send(res, 200, { ok: true, sharedSender: r.sharedSender }); }
      catch (e) { return send(res, 502, { ok: false, message: e.message }); }
    }
    if (await auth.handle(req, res, url)) return;
    if (url.pathname === '/api/opportunities' && req.method === 'GET') {
      const out = await opportunities.load({ refresh: url.searchParams.get('refresh') === '1' });
      return send(res, 200, out);
    }
    if (url.pathname === '/api/status' && req.method === 'GET') {
      return send(res, 200, { opportunities: opportunities.isConnected(), enhancedWriting: writingAvailable() });
    }
    if (url.pathname === '/api/writing' && req.method === 'POST') {
      const body = await readBody(req);
      return send(res, 200, await runWriting(body));
    }
    return send(res, 404, { status: 'error' });
  } catch (err) {
    console.error('[server]', err.message);
    if (res.headersSent) return res.end();
    return send(res, err.code === 413 ? 413 : 500, { status: 'error' });
  }
}

const httpServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  if (vite) return vite.middlewares(req, res, () => { res.writeHead(404); res.end(); });
  return serveStatic(req, res, url);
});

let vite;
if (!isProd) {
  const { createServer } = await import('vite');
  // Live reload shares this server's port, so the browser's reload channel connects cleanly.
  vite = await createServer({ root, server: { middlewareMode: true, hmr: { server: httpServer } }, appType: 'spa' });
}

const dist = path.join(root, 'dist');
function serveStatic(req, res, url) {
  let file = path.normalize(path.join(dist, decodeURIComponent(url.pathname)));
  if (!file.startsWith(dist)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
  const ext = path.extname(file);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}

httpServer.listen(port, () => {
  console.log(`\n  Horizon is running at http://localhost:${port}\n`);
  console.log(mailer.configured() ? '  Emails: on (checks every hour).\n' : '  Emails: off (RESEND_API_KEY not set).\n');
  if (!opportunities.isConnected()) console.log('  Note: APIFY_API_TOKEN is not set, so opportunities cannot load yet. See .env.example.\n');
});
