import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, CalendarClock, Check, ChevronRight, CircleDashed, Clock, Compass, FileText, Target, X, Activity, Map } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { useOpportunities } from '../lib/opps.js';
import { roadmapProgress, goalSummary } from '../lib/roadmap.js';
import { profileCompleteness, gapAnalysis, nudges, nextAction, levelLabel, firstName, matchOpportunity, daysUntil, deadlineInfo, fmtDate, timeAgo, docStatus } from '../lib/insights.js';
import { ACTIVE_STATUSES, statusLabel, DECLARABLE_DOCS } from '../lib/constants.js';
import { IMG } from '../lib/images.js';
import { Ring, Bar, useToast, SmartImg } from '../components/ui.jsx';
import OppCard, { OppCardSkeleton } from '../components/OppCard.jsx';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const store = useStore();
  const { state, toggleTask, dismissNudge } = store;
  const toast = useToast();
  const navigate = useNavigate();
  const opps = useOpportunities();
  const p = state.profile;
  const rp = roadmapProgress(state.roadmap);
  const prof = profileCompleteness(state);
  const gaps = gapAnalysis(state);
  const next = nextAction(state);
  const ns = nudges(state);

  const recommended = useMemo(() => {
    if (opps.status !== 'ok') return [];
    return opps.items.map((o) => ({ o, m: matchOpportunity(o, state) })).filter((x) => !deadlineInfo(x.o).closed).sort((a, b) => b.m.score - a.m.score).slice(0, 3);
  }, [opps.items, opps.status, state]);

  const deadlines = useMemo(() => {
    const list = [];
    for (const a of state.applications) if (ACTIVE_STATUSES.includes(a.status) && a.opp.deadline && daysUntil(a.opp.deadline) >= 0) list.push({ title: a.opp.title, date: a.opp.deadline, to: `/applications/${a.id}`, tag: statusLabel(a.status) });
    for (const { opp } of Object.values(state.saved)) if (!state.applications.some((a) => a.oppId === opp.id) && opp.deadline && daysUntil(opp.deadline) >= 0) list.push({ title: opp.title, date: opp.deadline, to: `/opportunities/${opp.id}`, tag: 'Saved' });
    return list.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  }, [state.applications, state.saved]);

  const apps = state.applications;
  const appCounts = { active: apps.filter((a) => ACTIVE_STATUSES.includes(a.status)).length, applied: apps.filter((a) => ['applied', 'interview'].includes(a.status)).length, done: apps.filter((a) => ['accepted', 'rejected', 'closed'].includes(a.status)).length };
  const missingDocs = [
    { key: 'cv', label: 'CV' }, { key: 'transcript', label: 'Transcript' }, { key: 'recommendation', label: 'Recommendation letter' },
    { key: 'statement', label: 'Personal statement' }, ...(p.goal?.type === 'study-abroad' ? [{ key: 'id', label: 'Passport' }] : []),
  ].map((x) => ({ ...x, ...docStatus(state, x.key) })).filter((x) => !['uploaded', 'built'].includes(x.status));

  const completeTask = () => { toggleTask(next.taskId); toast('Nice work — roadmap updated.'); };

  return (
    <div className="page">
      <div className="container">
        <section className="dash-hero">
          <SmartImg className="dash-hero-img" src={IMG.campus.src} alt="" eager />
          <div className="dash-hero-inner">
            <div className="dash-hero-copy">
              <span className="eyebrow light">{greeting()}, {firstName(p)}</span>
              <h1 className="serif">{goalSummary(p)}</h1>
              <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
                <span className="badge light">{levelLabel(p)}</span>
                <span className="badge light">{p.course}</span>
                <span className="badge light">{p.institution}</span>
              </div>
            </div>
            <div className="dash-hero-stats">
              <Link to="/roadmap" className="hero-stat"><Ring value={rp.pct} size={76} stroke={7} color="#fff" track="rgba(255,255,255,.22)" textColor="#fff" /><span>Roadmap<br />progress</span></Link>
              <Link to="/profile" className="hero-stat"><Ring value={prof.pct} size={76} stroke={7} color="#F2B48D" track="rgba(255,255,255,.22)" textColor="#fff" /><span>Profile<br />complete</span></Link>
            </div>
          </div>
        </section>

        <div className="dash-grid">
          <div className="dash-main stack-lg">
            {/* NEXT STEP */}
            <section className="next-step" aria-labelledby="next-h">
              <div className="next-badge"><Target size={16} />Your next step</div>
              <h2 id="next-h" className="serif">{next.title}</h2>
              <p><strong>Why it matters: </strong>{next.why}</p>
              <div className="row wrap" style={{ marginTop: 18 }}>
                <button className="btn sun lg" onClick={() => navigate(next.action.to)}>{next.action.label}<ArrowRight size={18} /></button>
                {next.taskId && <button className="btn outline-light" onClick={completeTask}><Check size={16} />Mark as done</button>}
              </div>
            </section>

            {/* NUDGES */}
            {ns.length > 0 && (
              <section aria-labelledby="nudges-h">
                <div className="section-head"><h2 id="nudges-h" className="section-title">Worth your attention</h2></div>
                <div className="stack" style={{ gap: 10 }}>
                  {ns.map((n) => (
                    <div key={n.id} className={`nudge ${n.tone}`}>
                      <Bell size={18} />
                      <div className="grow"><strong>{n.title}</strong><div className="small muted">{n.body}</div></div>
                      <Link to={n.action.to} className="btn secondary sm">{n.action.label}</Link>
                      <button className="btn icon ghost sm" aria-label="Remind me later" title="Remind me later" onClick={() => { dismissNudge(n.id); toast('Hidden for 3 days.', { tone: 'info' }); }}><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ROADMAP */}
            <section className="panel" aria-labelledby="rm-h">
              <div className="section-head">
                <div><span className="eyebrow">My Roadmap</span><h2 id="rm-h" className="section-title">{rp.current?.label || 'Current stage'}</h2></div>
                <Link to="/roadmap" className="btn ghost sm">Full roadmap<ChevronRight size={16} /></Link>
              </div>
              <div className="row" style={{ gap: 14, marginBottom: 14 }}>
                <div className="grow"><Bar value={rp.currentTotal ? (rp.currentDone / rp.currentTotal) * 100 : 0} label="Current stage progress" /></div>
                <span className="small muted nowrap">{rp.currentDone} of {rp.currentTotal} done</span>
              </div>
              <div className="task-mini-list">
                {(state.roadmap?.tasks || []).filter((t) => t.stage === rp.current?.key).slice(0, 5).map((t) => (
                  <div key={t.id} className={`task-mini ${t.done ? 'done' : ''}`}>
                    <button className={`checkbox ${t.done ? 'on' : ''}`} role="checkbox" aria-checked={t.done} aria-label={`Mark “${t.title}” as ${t.done ? 'not done' : 'done'}`} onClick={() => toggleTask(t.id)}><Check size={14} strokeWidth={3} /></button>
                    <Link to={`/roadmap?task=${encodeURIComponent(t.id)}`} className="grow task-mini-title">{t.title}</Link>
                    <span className={`badge ${t.priority === 'High' ? 'sun' : ''}`}>{t.priority}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* RECOMMENDED */}
            <section aria-labelledby="rec-h">
              <div className="section-head">
                <div><span className="eyebrow">Recommended for You</span><h2 id="rec-h" className="section-title">Opportunities that may fit</h2></div>
                <Link to="/opportunities" className="btn ghost sm">See all<ChevronRight size={16} /></Link>
              </div>
              {opps.status === 'loading' || opps.status === 'idle' ? (
                <div className="opp-grid three">{[0, 1, 2].map((i) => <OppCardSkeleton key={i} />)}</div>
              ) : opps.status === 'ok' && recommended.length ? (
                <div className="opp-grid three">{recommended.map(({ o }) => <OppCard key={o.id} opp={o} compact />)}</div>
              ) : (
                <div className="panel center stack" style={{ justifyItems: 'center' }}>
                  <Compass size={28} className="muted" />
                  <strong>{opps.status === 'ok' ? 'No open opportunities right now' : 'We couldn’t load opportunities right now.'}</strong>
                  <p className="muted small" style={{ maxWidth: 420 }}>{opps.status === 'ok' ? 'All current listings have closed. Check back soon — new listings are added regularly.' : 'Try again in a moment. Your saved opportunities are still available.'}</p>
                  {opps.status !== 'ok' && <button className="btn secondary sm" onClick={() => opps.reload()}>Try Again</button>}
                </div>
              )}
            </section>
          </div>

          <aside className="dash-side stack-lg">
            {/* DEADLINES */}
            <section className="panel tight" aria-labelledby="dl-h">
              <div className="section-head"><h2 id="dl-h" className="side-title"><CalendarClock size={18} />Upcoming deadlines</h2></div>
              {deadlines.length ? (
                <ul className="dl-list">
                  {deadlines.map((x) => {
                    const d = daysUntil(x.date);
                    return (
                      <li key={x.to}><Link to={x.to} className="dl-item">
                        <div className="dl-date"><strong>{new Date(x.date + 'T12:00').getDate()}</strong><span>{new Date(x.date + 'T12:00').toLocaleString(undefined, { month: 'short' })}</span></div>
                        <div className="grow" style={{ minWidth: 0 }}><div className="truncate small" style={{ fontWeight: 600 }}>{x.title}</div><div className={`tiny ${d <= 14 ? 'text-bad' : 'muted'}`}>{d === 0 ? 'Today' : `${d} days left`} · {x.tag}</div></div>
                      </Link></li>
                    );
                  })}
                </ul>
              ) : <p className="small muted">No deadlines yet. Save opportunities and Horizon will track their deadlines here.</p>}
            </section>

            {/* APPLICATIONS */}
            <section className="panel tight" aria-labelledby="ap-h">
              <div className="section-head"><h2 id="ap-h" className="side-title"><FileText size={18} />Applications</h2><Link to="/applications" className="link small">Open</Link></div>
              <div className="app-stats">
                <div><strong>{appCounts.active}</strong><span>In progress</span></div>
                <div><strong>{appCounts.applied}</strong><span>Submitted</span></div>
                <div><strong>{Object.keys(state.saved).length}</strong><span>Saved</span></div>
              </div>
            </section>

            {/* MISSING DOCS */}
            <section className="panel tight" aria-labelledby="md-h">
              <div className="section-head"><h2 id="md-h" className="side-title"><CircleDashed size={18} />Missing documents</h2><Link to="/documents" className="link small">Vault</Link></div>
              {missingDocs.length ? (
                <ul className="md-list">
                  {missingDocs.map((m) => (
                    <li key={m.key}>
                      <span className="grow small">{m.label}{m.status === 'declared' && <span className="tiny muted"> · you have it, upload it</span>}{m.status === 'draft' && <span className="tiny muted"> · draft in Horizon</span>}</span>
                      <Link className="btn secondary sm" to={m.key === 'cv' && m.status !== 'declared' ? '/cv' : m.key === 'statement' ? (m.status === 'draft' ? '/essays' : '/essays/new') : `/documents?upload=1&category=${{ transcript: 'academic', recommendation: 'recommendations', id: 'identity', cv: 'career' }[m.key]}`}>{m.key === 'statement' ? (m.status === 'draft' ? 'Open' : 'Write') : m.key === 'cv' && m.status !== 'declared' ? 'Build' : 'Upload'}</Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="small muted"><Check size={14} /> Your key documents are in place.</p>}
            </section>

            {/* GAPS */}
            <section className="panel tight" aria-labelledby="gp-h">
              <div className="section-head"><h2 id="gp-h" className="side-title"><Map size={18} />What you’re missing</h2><Link to="/roadmap#gaps" className="link small">Review</Link></div>
              <div className="row" style={{ gap: 10, marginBottom: 10 }}><div className="grow"><Bar value={gaps.pct} className="sun" label="Goal readiness" /></div><span className="small muted">{gaps.met}/{gaps.total}</span></div>
              <p className="small muted">You’re not behind. These are the areas to start building: {gaps.open.slice(0, 3).map((g) => g.title.toLowerCase()).join(', ') || 'none — great work'}.</p>
            </section>

            {/* ACTIVITY */}
            <section className="panel tight" aria-labelledby="ac-h">
              <div className="section-head"><h2 id="ac-h" className="side-title"><Activity size={18} />Recent activity</h2></div>
              {state.activity.length ? (
                <ul className="activity">
                  {state.activity.slice(0, 6).map((a) => (
                    <li key={a.id}>{a.to ? <Link to={a.to}>{a.text}</Link> : a.text}<span className="tiny muted"><Clock size={11} /> {timeAgo(a.at)}</span></li>
                  ))}
                </ul>
              ) : <p className="small muted">Your progress will appear here.</p>}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
