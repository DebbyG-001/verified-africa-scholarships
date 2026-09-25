// Local / always-on server: serves the app and the API from one process.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './env.js';
import { getApp } from './app.js';

// Prefer the folder the app was started from (npm scripts run from the project root); this avoids
// Windows path redirection giving a different, unreadable path for the same folder.
const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = fs.existsSync(path.join(process.cwd(), 'server', 'index.js')) ? process.cwd() : scriptRoot;
loadEnv(root);

const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 5173;
const app = await getApp(root, { timers: true });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

const httpServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return app.handleApi(req, res, url);
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
  console.log(app.mailer.configured() ? '  Emails: on (checks every hour).\n' : '  Emails: off (RESEND_API_KEY not set).\n');
  if (!app.opportunities.isConnected()) console.log('  Note: APIFY_API_TOKEN is not set, so opportunities cannot load yet. See .env.example.\n');
});
