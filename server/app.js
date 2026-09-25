// Everything behind /api/. Shared by the local server (server/index.js) and Vercel (api/index.js).
import { createOpportunityService } from './opportunities.js';
import { runWriting, writingAvailable } from './writing.js';
import { createAuth } from './auth.js';
import { createDb } from './db.js';
import { createMailer } from './mailer.js';
import { startNotifications } from './notifications.js';

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req, limit = 200000) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw new Error('too large'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

let appPromise;
// timers: true runs the hourly email check inside this process (local/always-on servers).
// On Vercel, a scheduled request to /api/cron/notify runs it instead.
export function getApp(root, { timers = true } = {}) {
  appPromise ||= (async () => {
    const isProd = process.env.NODE_ENV === 'production';
    const opportunities = createOpportunityService(root);
    const db = await createDb(root);
    const mailer = createMailer();
    const auth = createAuth(db, mailer, { secureCookies: isProd && process.env.INSECURE_COOKIES !== '1' });
    const notifications = startNotifications({ db, mailer, opportunities, timers });

    async function handleApi(req, res, url) {
      try {
        if (url.pathname === '/api/health') return send(res, 200, { ok: true });
        if (url.pathname === '/api/cron/notify') {
          // Only the scheduler may trigger this (Vercel sends "Authorization: Bearer <CRON_SECRET>").
          const secret = process.env.CRON_SECRET;
          if (!secret || req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, { error: 'unauthorized' });
          await notifications.runNow();
          return send(res, 200, { ok: true });
        }
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
    return { handleApi, mailer, opportunities };
  })();
  appPromise.catch(() => { appPromise = null; }); // allow a retry after a failed start
  return appPromise;
}
