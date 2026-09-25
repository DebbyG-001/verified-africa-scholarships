// Vercel entry point: every /api/* request is routed here (see vercel.json).
import { getApp } from '../server/app.js';

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  try {
    const app = await getApp(process.cwd(), { timers: false });
    return app.handleApi(req, res, url);
  } catch (err) {
    console.error('[startup]', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: 'Horizon could not start. Check the environment variables in Vercel.' }));
  }
}
