// Accounts, sessions, password reset, email preferences and per-student storage (Postgres).
// Passwords are hashed with scrypt; session and reset tokens are random and stored only as hashes.
import crypto from 'node:crypto';
import { layout, esc } from './mailer.js';

const SESSION_DAYS = 30;
const RESET_MINUTES = 60;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_STATE_BYTES = 5 * 1024 * 1024;
export const EMAIL_TYPES = ['newOpps', 'idle', 'deadlines'];
export const DEFAULT_PREFS = { newOpps: true, idle: true, deadlines: true };

const secret = () => process.env.APP_SECRET || 'dev-only-secret-change-me';
export const appUrl = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const sign = (s) => crypto.createHmac('sha256', secret()).update(s).digest('hex').slice(0, 32);
export const unsubscribeUrl = (userId, type) => `${appUrl()}/api/email/unsubscribe?u=${userId}&t=${type}&s=${sign(`${userId}:${type}`)}`;

export function createAuth(db, mailer, { secureCookies }) {
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
  const samePassword = (password, u) => crypto.timingSafeEqual(Buffer.from(hashPassword(String(password || ''), u.salt), 'hex'), Buffer.from(u.hash, 'hex'));
  const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, createdAt: Number(u.created_at) });
  const normEmail = (e) => String(e || '').trim().toLowerCase();
  const validPassword = (p) => (String(p || '').length < 8 ? 'Use at least 8 characters.' : !/[A-Za-z]/.test(p) || !/\d/.test(p) ? 'Include at least one letter and one number.' : null);

  // brute-force protection
  const attempts = new Map();
  const limited = (key, max, windowMs) => { const a = attempts.get(key); if (!a || Date.now() - a.first > windowMs) return false; return a.count >= max; };
  const hit = (key, windowMs) => { const a = attempts.get(key); if (!a || Date.now() - a.first > windowMs) attempts.set(key, { count: 1, first: Date.now() }); else a.count++; };

  const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
  const parseCookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
  const cookie = (token, maxAge) => `hz_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookies ? '; Secure' : ''}`;

  async function startSession(res, userId) {
    const token = crypto.randomBytes(32).toString('hex');
    await db.q('INSERT INTO sessions(token_hash,user_id,expires) VALUES($1,$2,$3)', [sha(token), userId, Date.now() + SESSION_DAYS * 864e5]);
    res.setHeader('Set-Cookie', cookie(token, SESSION_DAYS * 86400));
  }
  async function currentUser(req) {
    const token = parseCookies(req).hz_session;
    if (!token) return null;
    return db.one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires>$2', [sha(token), Date.now()]);
  }

  async function readBody(req, limit) {
    let size = 0; const chunks = [];
    for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error('too large'), { code: 413 }); chunks.push(c); }
    return Buffer.concat(chunks);
  }
  const readJson = async (req, limit = 10000) => JSON.parse((await readBody(req, limit)).toString() || '{}');
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  const page = (res, status, title, message) => {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Horizon</title><body style="margin:0;background:#F6F4EF;font-family:Inter,Segoe UI,Arial,sans-serif;color:#16181B;display:grid;place-items:center;min-height:100vh;padding:20px"><div style="max-width:460px;background:#fff;border:1px solid #E3DFD5;border-radius:18px;padding:32px"><div style="font-family:Georgia,serif;font-size:22px;color:#17332B;font-weight:600;margin-bottom:18px">Horizon</div><h1 style="font-family:Georgia,serif;font-weight:500;font-size:24px;margin:0 0 10px">${esc(title)}</h1><p style="color:#464B52;line-height:1.6">${esc(message)}</p><p><a href="${appUrl()}/profile#settings" style="color:#17332B;font-weight:600">Manage email settings</a></p></div>`);
  };
  const safeId = (s) => /^[A-Za-z0-9_-]{1,64}$/.test(s);

  async function handle(req, res, url) {
    const p = url.pathname;

    // One-click unsubscribe from an email link (works without signing in; the link is signed).
    if (p === '/api/email/unsubscribe' && (req.method === 'GET' || req.method === 'POST')) {
      const u = url.searchParams.get('u'); const t = url.searchParams.get('t'); const s = url.searchParams.get('s') || '';
      const valid = u && (EMAIL_TYPES.includes(t) || t === 'all') && s.length === 32 && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(sign(`${u}:${t}`)));
      if (!valid) { page(res, 400, 'This link isn’t valid', 'The unsubscribe link may be incomplete. You can change your email settings in Horizon under Profile → Settings.'); return true; }
      const user = await db.one('SELECT prefs FROM users WHERE id=$1', [u]);
      if (!user) { page(res, 404, 'Account not found', 'This account no longer exists, so no more emails will be sent.'); return true; }
      const prefs = { ...DEFAULT_PREFS, ...user.prefs };
      for (const k of t === 'all' ? EMAIL_TYPES : [t]) prefs[k] = false;
      await db.q('UPDATE users SET prefs=$2 WHERE id=$1', [u, JSON.stringify(prefs)]);
      const label = { newOpps: 'new opportunity emails', idle: 'application reminders', deadlines: 'deadline reminders', all: 'all Horizon emails' }[t];
      page(res, 200, 'You’re unsubscribed', `You won’t receive ${label} any more. You can turn them back on at any time in your settings.`);
      return true;
    }

    if (!p.startsWith('/api/auth/') && !p.startsWith('/api/me/')) return false;
    // Only accept JSON posts from our own pages (blocks simple cross-site form posts).
    if (req.method !== 'GET' && !p.startsWith('/api/me/files/') && !String(req.headers['content-type'] || '').includes('application/json')) { json(res, 415, { error: 'bad_request' }); return true; }

    if (p === '/api/auth/me' && req.method === 'GET') {
      const u = await currentUser(req);
      json(res, 200, { user: u ? publicUser(u) : null, email: { enabled: mailer.configured() } });
      return true;
    }

    if (p === '/api/auth/signup' && req.method === 'POST') {
      const { name, email, password } = await readJson(req);
      const e = normEmail(email);
      const errors = {};
      if (!String(name || '').trim()) errors.name = 'Tell us your name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errors.email = 'Enter a valid email address.';
      const pwErr = validPassword(password); if (pwErr) errors.password = pwErr;
      if (!errors.email && await db.one('SELECT 1 FROM users WHERE email=$1', [e])) errors.email = 'An account with this email already exists. Sign in instead.';
      if (Object.keys(errors).length) { json(res, 400, { errors }); return true; }
      const salt = crypto.randomBytes(16).toString('hex');
      const u = await db.one('INSERT INTO users(id,email,name,salt,hash,prefs,created_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [crypto.randomUUID(), e, String(name).trim().slice(0, 80), salt, hashPassword(password, salt), JSON.stringify(DEFAULT_PREFS), Date.now()]);
      await startSession(res, u.id);
      json(res, 200, { user: publicUser(u) });
      return true;
    }

    if (p === '/api/auth/signin' && req.method === 'POST') {
      const { email, password } = await readJson(req);
      const e = normEmail(email);
      const key = `in|${e}|${clientIp(req)}`;
      if (limited(key, 8, 15 * 60e3)) { json(res, 429, { errors: { form: 'Too many attempts. Wait 15 minutes and try again.' } }); return true; }
      const u = await db.one('SELECT * FROM users WHERE email=$1', [e]);
      if (!u || !samePassword(password, u)) { hit(key, 15 * 60e3); json(res, 401, { errors: { form: 'That email and password don’t match an account.' } }); return true; }
      attempts.delete(key);
      await startSession(res, u.id);
      json(res, 200, { user: publicUser(u) });
      return true;
    }

    if (p === '/api/auth/signout' && req.method === 'POST') {
      const token = parseCookies(req).hz_session;
      if (token) await db.q('DELETE FROM sessions WHERE token_hash=$1', [sha(token)]);
      res.setHeader('Set-Cookie', cookie('', 0));
      json(res, 200, { ok: true });
      return true;
    }

    // Forgot password: always answers the same way so it never reveals whether an email has an account.
    if (p === '/api/auth/forgot' && req.method === 'POST') {
      const { email } = await readJson(req);
      const e = normEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { json(res, 400, { errors: { email: 'Enter a valid email address.' } }); return true; }
      if (!mailer.configured()) { json(res, 503, { errors: { form: 'Password reset emails aren’t available right now. Try again later.' } }); return true; }
      const key = `forgot|${e}`;
      const ipKey = `forgot-ip|${clientIp(req)}`;
      if (limited(key, 3, 60 * 60e3) || limited(ipKey, 10, 60 * 60e3)) { json(res, 200, { ok: true }); return true; }
      hit(key, 60 * 60e3); hit(ipKey, 60 * 60e3);
      const u = await db.one('SELECT * FROM users WHERE email=$1', [e]);
      if (u) {
        const token = crypto.randomBytes(32).toString('hex');
        await db.q('INSERT INTO password_resets(token_hash,user_id,expires,created_at) VALUES($1,$2,$3,$4)', [sha(token), u.id, Date.now() + RESET_MINUTES * 60e3, Date.now()]);
        const link = `${appUrl()}/reset-password?token=${token}`;
        mailer.send({
          to: u.email,
          subject: 'Reset your Horizon password',
          html: layout({ preheader: 'Use this link within 1 hour to choose a new password.', heading: 'Reset your password', intro: `Hi ${u.name.split(' ')[0]}, someone (hopefully you) asked to reset the password for your Horizon account. This link works once and expires in 1 hour.`, cta: { label: 'Choose a new password', url: link }, footer: 'If you didn’t ask for this, you can ignore this email — your password won’t change.' }),
          text: `Reset your Horizon password: ${link}\nThis link works once and expires in 1 hour. If you didn't ask for this, ignore this email.`,
        }).catch(() => {});
      }
      json(res, 200, { ok: true });
      return true;
    }

    if (p === '/api/auth/reset' && req.method === 'POST') {
      const { token, password } = await readJson(req);
      const row = token ? await db.one('SELECT * FROM password_resets WHERE token_hash=$1', [sha(String(token))]) : null;
      if (!row || row.used || Number(row.expires) < Date.now()) { json(res, 400, { errors: { form: 'This reset link has expired or was already used. Request a new one.' }, expired: true }); return true; }
      const pwErr = validPassword(password);
      if (pwErr) { json(res, 400, { errors: { password: pwErr } }); return true; }
      const salt = crypto.randomBytes(16).toString('hex');
      await db.q('UPDATE users SET salt=$2, hash=$3 WHERE id=$1', [row.user_id, salt, hashPassword(password, salt)]);
      await db.q('UPDATE password_resets SET used=TRUE WHERE user_id=$1', [row.user_id]);
      await db.q('DELETE FROM sessions WHERE user_id=$1', [row.user_id]); // sign out everywhere else
      const u = await db.one('SELECT * FROM users WHERE id=$1', [row.user_id]);
      await startSession(res, u.id);
      json(res, 200, { user: publicUser(u) });
      return true;
    }

    const u = await currentUser(req);
    if (!u) { json(res, 401, { error: 'signed_out' }); return true; }

    if (p === '/api/auth/delete' && req.method === 'POST') {
      const { password } = await readJson(req);
      if (!samePassword(password, u)) { json(res, 401, { errors: { password: 'That password isn’t right.' } }); return true; }
      await db.q('DELETE FROM users WHERE id=$1', [u.id]); // cascades to sessions, state, files, resets, email log
      res.setHeader('Set-Cookie', cookie('', 0));
      json(res, 200, { ok: true });
      return true;
    }

    if (p === '/api/me/prefs') {
      if (req.method === 'GET') { json(res, 200, { prefs: { ...DEFAULT_PREFS, ...u.prefs }, email: { enabled: mailer.configured() } }); return true; }
      if (req.method === 'PUT') {
        const body = await readJson(req);
        const prefs = { ...DEFAULT_PREFS, ...u.prefs };
        for (const k of EMAIL_TYPES) if (typeof body[k] === 'boolean') prefs[k] = body[k];
        await db.q('UPDATE users SET prefs=$2 WHERE id=$1', [u.id, JSON.stringify(prefs)]);
        json(res, 200, { prefs });
        return true;
      }
    }

    if (p === '/api/me/state') {
      if (req.method === 'GET') {
        const row = await db.one('SELECT state, saved_at FROM user_state WHERE user_id=$1', [u.id]);
        json(res, 200, row ? { state: row.state, savedAt: Number(row.saved_at) } : { state: null, savedAt: null });
        return true;
      }
      if (req.method === 'PUT') {
        const body = JSON.parse((await readBody(req, MAX_STATE_BYTES)).toString());
        const savedAt = Date.now();
        await db.q('INSERT INTO user_state(user_id,state,saved_at) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET state=EXCLUDED.state, saved_at=EXCLUDED.saved_at', [u.id, JSON.stringify(body.state), savedAt]);
        json(res, 200, { savedAt });
        return true;
      }
    }

    const m = p.match(/^\/api\/me\/files\/([^/]+)$/);
    if (m && safeId(m[1])) {
      if (req.method === 'PUT') {
        const buf = await readBody(req, MAX_FILE_BYTES);
        const type = String(req.headers['content-type'] || 'application/octet-stream').slice(0, 120);
        await db.q('INSERT INTO files(user_id,id,type,size,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,id) DO UPDATE SET type=EXCLUDED.type, size=EXCLUDED.size, data=EXCLUDED.data', [u.id, m[1], type, buf.length, buf]);
        json(res, 200, { ok: true });
        return true;
      }
      if (req.method === 'GET') {
        const f = await db.one('SELECT type, data FROM files WHERE user_id=$1 AND id=$2', [u.id, m[1]]);
        if (!f) { json(res, 404, { error: 'not_found' }); return true; }
        res.writeHead(200, { 'Content-Type': f.type, 'Cache-Control': 'private, no-store' });
        res.end(f.data);
        return true;
      }
      if (req.method === 'DELETE') {
        await db.q('DELETE FROM files WHERE user_id=$1 AND id=$2', [u.id, m[1]]);
        json(res, 200, { ok: true });
        return true;
      }
    }
    json(res, 404, { error: 'not_found' });
    return true;
  }

  return { handle, userFrom: currentUser };
}
