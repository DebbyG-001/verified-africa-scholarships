// Scheduled emails. Runs every hour while the server is up; every email is recorded in email_log
// so the same reminder is never sent twice.
//  - New opportunities: once a day Horizon checks for new listings and emails each student the ones
//    that are a Strong or Possible match for their profile.
//  - Unattended applications: an application still in progress with no changes for 3 days.
//  - Deadlines: 2 days and 1 day before the deadline, for applications not yet submitted and
//    saved opportunities not yet started.
import { layout, item, section, esc } from './mailer.js';
import { unsubscribeUrl, appUrl, DEFAULT_PREFS } from './auth.js';
import { matchOpportunity, daysUntil, deadlineInfo, fmtDate } from '../src/lib/insights.js';
import { ACTIVE_STATUSES, statusLabel } from '../src/lib/constants.js';

const HOUR = 3600e3;
const DAY = 864e5;
const CRAWL_EVERY = DAY;
const IDLE_AFTER = 3 * DAY;

export function startNotifications({ db, mailer, opportunities, timers = true }) {
  let running = false;

  function footer(userId, types) {
    const labels = { newOpps: 'new opportunity emails', idle: 'application reminders', deadlines: 'deadline reminders' };
    const links = types.map((t) => `<a href="${unsubscribeUrl(userId, t)}" style="color:#6E747C">Stop ${labels[t]}</a>`).join(' · ');
    return `You’re getting this because you have a Horizon account. ${links} · <a href="${unsubscribeUrl(userId, 'all')}" style="color:#6E747C">Stop all emails</a> · <a href="${appUrl()}/profile#settings" style="color:#6E747C">Email settings</a>`;
  }
  const listHeaders = (userId) => ({ 'List-Unsubscribe': `<${unsubscribeUrl(userId, 'all')}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });

  async function sendOnce(user, keys, kind, message) {
    const claimed = [];
    for (const k of keys) if (await db.claimEmail(k, user.id, kind)) claimed.push(k);
    if (!claimed.length) return false;
    try { await mailer.send({ to: user.email, headers: listHeaders(user.id), ...message }); return true; }
    catch { for (const k of claimed) await db.releaseEmail(k); return false; } // try again next hour
  }

  async function users() {
    const { rows } = await db.q('SELECT u.id, u.email, u.name, u.prefs, s.state FROM users u LEFT JOIN user_state s ON s.user_id=u.id');
    return rows.map((r) => ({ ...r, prefs: { ...DEFAULT_PREFS, ...r.prefs } }));
  }

  // ---------- new opportunities ----------
  async function checkNewOpportunities(allUsers) {
    const last = await db.getMeta('lastCrawlAt');
    let result;
    if (!last || Date.now() - last > CRAWL_EVERY) {
      result = await opportunities.load({ refresh: true });
      if (result.status === 'ok' && !result.stale) await db.setMeta('lastCrawlAt', Date.now());
    } else result = await opportunities.load();
    if (result.status !== 'ok' || !result.items?.length) return;

    const items = result.items;
    const { rows } = await db.q('SELECT id FROM seen_opportunities WHERE id = ANY($1)', [items.map((o) => o.id)]);
    const seen = new Set(rows.map((r) => r.id));
    const fresh = items.filter((o) => !seen.has(o.id));
    if (!fresh.length) return;
    const firstEver = !(await db.one('SELECT 1 FROM seen_opportunities LIMIT 1'));
    for (const o of fresh) await db.q('INSERT INTO seen_opportunities(id,title,first_seen) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [o.id, o.title, Date.now()]);
    if (firstEver) return; // the first list is the starting point, not "new"

    for (const u of allUsers) {
      if (!u.prefs.newOpps || !u.state?.profile) continue;
      const matches = fresh
        .filter((o) => !deadlineInfo(o).closed)
        .map((o) => ({ o, m: matchOpportunity(o, u.state) }))
        .filter((x) => x.m.label === 'Strong match' || x.m.label === 'Possible match')
        .sort((a, b) => b.m.score - a.m.score)
        .slice(0, 8);
      if (!matches.length) continue;
      const first = u.name.split(' ')[0];
      const body = matches.map(({ o, m }) => item({
        title: o.title,
        meta: [m.label, o.provider, deadlineInfo(o).label].filter(Boolean).join(' · '),
        url: `${appUrl()}/opportunities/${o.id}`,
      })).join('') + (matches[0].m.reasons[0] ? `<p style="font-size:13px;color:#6E747C;margin-top:12px">Why the top one may fit: ${esc(matches[0].m.reasons[0])} Always check the eligibility on the official page.</p>` : '');
      await sendOnce(u, matches.map(({ o }) => `new:${u.id}:${o.id}`), 'newOpps', {
        subject: matches.length === 1 ? `New opportunity for you: ${matches[0].o.title}` : `${matches.length} new opportunities that may fit you`,
        html: layout({ preheader: matches.map((x) => x.o.title).slice(0, 2).join(' · '), heading: matches.length === 1 ? 'A new opportunity may fit you' : `${matches.length} new opportunities may fit you`, intro: `Hi ${first}, these were just added to Horizon and connect to your profile.`, body, cta: { label: 'See them in Horizon', url: `${appUrl()}/opportunities` }, footer: footer(u.id, ['newOpps']) }),
        text: `New opportunities on Horizon:\n${matches.map(({ o }) => `- ${o.title}: ${appUrl()}/opportunities/${o.id}`).join('\n')}`,
      });
    }
  }

  // ---------- reminders ----------
  async function sendReminders(allUsers) {
    for (const u of allUsers) {
      const s = u.state;
      if (!s || (!u.prefs.idle && !u.prefs.deadlines)) continue;
      const apps = s.applications || [];
      const essays = s.essays || [];
      const idle = []; const deadlines = [];

      for (const a of apps) {
        if (!ACTIVE_STATUSES.includes(a.status)) continue;
        const d = daysUntil(a.opp?.deadline);
        if (u.prefs.deadlines && (d === 1 || d === 2)) deadlines.push({ key: `deadline:${u.id}:${a.id}:${a.opp.deadline}:${d}`, title: a.opp.title, meta: `Closes ${d === 1 ? 'tomorrow' : 'in 2 days'} (${fmtDate(a.opp.deadline)}) · ${statusLabel(a.status)}`, url: `${appUrl()}/applications/${a.id}` });
        if (!u.prefs.idle || (d !== null && d < 0)) continue;
        const last = Math.max(a.updatedAt || a.createdAt || 0, ...essays.filter((e) => e.appId === a.id).map((e) => e.updatedAt || 0));
        if (last && Date.now() - last >= IDLE_AFTER) idle.push({ key: `idle:${u.id}:${a.id}:${last}`, title: a.opp.title, meta: `No changes for ${Math.floor((Date.now() - last) / DAY)} days · ${statusLabel(a.status)}${a.opp.deadline ? ` · closes ${fmtDate(a.opp.deadline)}` : ''}`, url: `${appUrl()}/applications/${a.id}` });
      }
      if (u.prefs.deadlines) {
        for (const { opp } of Object.values(s.saved || {})) {
          if (apps.some((a) => a.oppId === opp.id)) continue;
          const d = daysUntil(opp.deadline);
          if (d === 1 || d === 2) deadlines.push({ key: `deadline:${u.id}:saved-${opp.id}:${opp.deadline}:${d}`, title: opp.title, meta: `Saved, not started · closes ${d === 1 ? 'tomorrow' : 'in 2 days'} (${fmtDate(opp.deadline)})`, url: `${appUrl()}/opportunities/${opp.id}` });
        }
      }
      if (!idle.length && !deadlines.length) continue;

      const first = u.name.split(' ')[0];
      const subject = deadlines.length
        ? (deadlines.length === 1 ? `Deadline ${deadlines[0].meta.includes('tomorrow') ? 'tomorrow' : 'in 2 days'}: ${deadlines[0].title}` : `${deadlines.length} deadlines coming up`)
        : (idle.length === 1 ? `Pick up where you left off: ${idle[0].title}` : `${idle.length} applications are waiting for you`);
      const body = (deadlines.length ? section('Deadlines coming up', deadlines.map(item).join('')) : '') + (idle.length ? section('Waiting for you', idle.map(item).join('')) : '');
      const types = [...(deadlines.length ? ['deadlines'] : []), ...(idle.length ? ['idle'] : [])];
      await sendOnce(u, [...deadlines, ...idle].map((x) => x.key), types.join('+'), {
        subject,
        html: layout({ preheader: subject, heading: deadlines.length ? 'Your deadlines are close' : 'Your applications are waiting', intro: `Hi ${first}, a quick reminder so nothing slips.`, body, cta: { label: 'Open Horizon', url: `${appUrl()}/applications` }, footer: footer(u.id, types) }),
        text: `${subject}\n\n${[...deadlines, ...idle].map((x) => `- ${x.title} (${x.meta}): ${x.url}`).join('\n')}`,
      });
    }
  }

  async function tick() {
    if (running || !mailer.configured()) return;
    running = true;
    try {
      const all = await users();
      await checkNewOpportunities(all).catch((e) => console.error('[notify] new opportunities:', e.message));
      await sendReminders(all).catch((e) => console.error('[notify] reminders:', e.message));
    } catch (e) { console.error('[notify]', e.message); }
    finally { running = false; }
  }

  if (timers) { setTimeout(tick, 60e3); setInterval(tick, HOUR); }

  // Signed-in students can send themselves a test email from Settings.
  async function sendTest(user) {
    const r = await mailer.send({
      to: user.email,
      subject: 'Your Horizon emails are working',
      html: layout({ heading: 'Emails are set up', intro: `Hi ${user.name.split(' ')[0]}, this is a test from Horizon. You’ll get emails like this for new opportunities that fit you, applications left untouched for 3 days, and deadlines 2 days and 1 day away.`, cta: { label: 'Open Horizon', url: `${appUrl()}/home` }, footer: footer(user.id, ['newOpps', 'idle', 'deadlines']) }),
      text: 'This is a test email from Horizon.',
      headers: listHeaders(user.id),
    });
    return r;
  }

  return { runNow: tick, sendTest };
}
