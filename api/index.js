// Vercel entry point: every /api/* request is routed here (see vercel.json).
import { getApp } from '../server/app.js';

export default async function handler(req, res) {
  let url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  // After Vercel's rewrite the original path arrives as ?path=…; rebuild the real address from it.
  const original = url.searchParams.get('path');
  if (original !== null && !url.pathname.startsWith('/api/') || url.pathname === '/api/index') {
    const params = new URLSearchParams(url.search);
    params.delete('path');
    const qs = params.toString();
    url = new URL(`/api/${original || ''}${qs ? `?${qs}` : ''}`, url.origin);
  }
  try {
    const app = await getApp(process.cwd(), { timers: false });
    return app.handleApi(req, res, url);
  } catch (err) {
    console.error('[startup]', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: 'Horizon could not start: ' + err.message.replace(/postgres(ql)?:\/\/\S+/gi, '[database address]') }));
  }
}
