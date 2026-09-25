// Sends email through Resend (https://resend.com).
// If the configured sending address isn't on a domain verified in Resend (for example a Gmail address),
// Resend won't accept it, so we send from Resend's shared address and set Reply-To to the configured one.
const API = 'https://api.resend.com';

export function createMailer() {
  const key = () => (process.env.RESEND_API_KEY || '').trim();
  const name = () => process.env.EMAIL_FROM_NAME || 'Horizon';
  const wanted = () => (process.env.EMAIL_FROM_ADDRESS || '').trim();
  let verified = null; // cached list of verified domains
  let lastCheck = 0;

  async function fromAddress() {
    const addr = wanted();
    if (!verified || Date.now() - lastCheck > 3600e3) {
      try {
        const r = await fetch(`${API}/domains`, { headers: { Authorization: `Bearer ${key()}` } });
        const j = await r.json();
        verified = (j.data || []).filter((d) => d.status === 'verified').map((d) => d.name.toLowerCase());
        lastCheck = Date.now();
      } catch { verified = verified || []; }
    }
    const domain = addr.split('@')[1]?.toLowerCase();
    const ok = domain && verified.some((d) => domain === d || domain.endsWith('.' + d));
    return ok ? { from: `${name()} <${addr}>`, replyTo: undefined, shared: false } : { from: `${name()} <onboarding@resend.dev>`, replyTo: addr || undefined, shared: true };
  }

  async function send({ to, subject, html, text, headers }) {
    if (!key()) throw new Error('Email is not configured (RESEND_API_KEY missing).');
    const f = await fromAddress();
    const r = await fetch(`${API}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: f.from, to: [to], subject, html, text, reply_to: f.replyTo, headers }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = j.message || `status ${r.status}`;
      console.error(`[email] could not send "${subject}" to ${to}: ${msg}`);
      throw new Error(msg);
    }
    return { id: j.id, sharedSender: f.shared };
  }

  return { send, configured: () => Boolean(key()), sender: fromAddress };
}

// ---------- templates ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function layout({ preheader = '', heading, intro, body, cta, footer }) {
  const html = `<!doctype html><html><body style="margin:0;background:#F6F4EF;font-family:Inter,Segoe UI,Arial,sans-serif;color:#16181B">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F4EF;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;border:1px solid #E3DFD5;overflow:hidden">
<tr><td style="background:#17332B;padding:22px 28px;color:#fff;font-family:Georgia,serif;font-size:22px;font-weight:600">Horizon</td></tr>
<tr><td style="padding:28px">
<h1 style="font-family:Georgia,serif;font-weight:500;font-size:24px;line-height:1.25;margin:0 0 12px">${esc(heading)}</h1>
${intro ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#464B52">${esc(intro)}</p>` : ''}
${body || ''}
${cta ? `<p style="margin:24px 0 4px"><a href="${esc(cta.url)}" style="display:inline-block;background:#17332B;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px">${esc(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #E3DFD5;font-size:12px;line-height:1.6;color:#6E747C">${footer || ''}</td></tr>
</table></td></tr></table></body></html>`;
  return html;
}

export const item = ({ title, meta, url }) =>
  `<div style="border:1px solid #E3DFD5;border-radius:12px;padding:12px 14px;margin:0 0 10px"><a href="${esc(url)}" style="color:#16181B;font-weight:600;text-decoration:none;font-size:15px">${esc(title)}</a>${meta ? `<div style="font-size:13px;color:#6E747C;margin-top:3px">${esc(meta)}</div>` : ''}</div>`;

export const section = (title, inner) => `<h2 style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6E747C;margin:22px 0 10px">${esc(title)}</h2>${inner}`;
export { esc };
