import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, ExternalLink, Clock, MapPin, Wallet, ShieldCheck, ShieldAlert, Sparkles, AlertTriangle, Check, CircleDashed, FileText, ListChecks, Info, GraduationCap, Building2, CalendarDays, Globe2, ChevronRight, CloudOff } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { useOpportunities, findOpportunity } from '../lib/opps.js';
import { imageForOpportunity, CATEGORY_IMAGES } from '../lib/images.js';
import { deadlineInfo, fmtDate, matchOpportunity, readiness, docKind } from '../lib/insights.js';
import { statusLabel } from '../lib/constants.js';
import { SaveButton } from '../components/OppCard.jsx';
import { SmartImg, Bar, Empty, useToast, LoadingBlock } from '../components/ui.jsx';

export default function OpportunityDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const store = useStore();
  const { state, startApplication } = store;
  const toast = useToast();
  const opps = useOpportunities();
  const opp = useMemo(() => findOpportunity(id, state.saved), [id, state.saved, opps.items]); // eslint-disable-line
  const app = state.applications.find((a) => a.oppId === id);

  const prepare = () => {
    const appId = startApplication(opp);
    if (!app) toast('Application started. Here’s what you need.');
    navigate(`/applications/${appId}`);
  };
  useEffect(() => { if (opp && params.get('prepare') === '1') prepare(); }, [opp]); // eslint-disable-line

  if (!opp) {
    if (opps.status === 'loading' || opps.status === 'idle') return <div className="page"><div className="container"><LoadingBlock text="Loading opportunity…" /></div></div>;
    return (
      <div className="page"><div className="container">
        <Empty icon={CloudOff} title={opps.status === 'ok' ? 'This opportunity is no longer listed' : 'We couldn’t load this opportunity right now.'} body={opps.status === 'ok' ? 'It may have been removed from its source. Browse current opportunities instead.' : 'Try again in a moment.'}>
          {opps.status !== 'ok' && <button className="btn primary" onClick={() => opps.reload()}>Try Again</button>}
          <Link to="/opportunities" className="btn secondary">Browse opportunities</Link>
        </Empty>
      </div></div>
    );
  }

  const d = deadlineInfo(opp);
  const m = matchOpportunity(opp, state);
  const r = readiness(state, app || { id: 'preview', opp, checks: {}, essayIds: [] });
  const img = CATEGORY_IMAGES[opp.type] || imageForOpportunity(opp);
  const funding = [opp.funding, opp.fundingAmount].filter(Boolean).join(' · ');
  const fromSnapshotOnly = !opps.items.some((o) => o.id === opp.id);

  const sections = [['overview', 'Overview'], ['eligibility', 'Eligibility'], ['deadline', 'Deadline'], ['benefits', 'Benefits'], ['documents', 'Required documents'], ['process', 'How to apply'], ['match', 'Why it may match you'], ['source', 'Source']];

  return (
    <div className="page detail-page">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb"><Link to="/opportunities">Opportunities</Link><ChevronRight size={14} /><Link to={`/opportunities?type=${encodeURIComponent(opp.type)}`}>{opp.type}</Link><ChevronRight size={14} /><span className="truncate" style={{ maxWidth: 280 }} aria-current="page">{opp.title}</span></nav>
      </div>

      <section className="container detail-hero">
        <SmartImg className="detail-img" src={img.src} alt="" eager />
        <div className="detail-hero-copy">
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="badge light">{opp.type}</span>
            {opp.isTrusted ? <span className="badge ok"><ShieldCheck size={13} />Verified source</span> : <span className="badge light"><ShieldAlert size={13} />Not verified</span>}
            {d.closed && <span className="badge dark">Closed</span>}
            {app && <span className="badge sun">In your applications · {statusLabel(app.status)}</span>}
          </div>
          <h1 className="serif">{opp.title}</h1>
          <p className="detail-org"><Building2 size={16} />{opp.provider || 'Provider not stated in the listing'}</p>
        </div>
      </section>

      <div className="container">
        {fromSnapshotOnly && <div className="notice warn" style={{ marginBottom: 20 }}><Info size={18} /><span>You’re viewing the version you saved. This listing isn’t in the latest results, so check the official page for updates.</span></div>}
        <div className="detail-layout">
          <div className="detail-main">
            <nav className="detail-tabs" aria-label="Sections">{sections.map(([k, l]) => <a key={k} href={`#${k}`} onClick={(e) => { e.preventDefault(); document.getElementById(k)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{l}</a>)}</nav>

            <section id="overview" className="d-sec">
              <h2 className="serif">Overview</h2>
              {opp.description ? <p className="lead-sm">{opp.description}</p> : <p className="muted">The listing doesn’t include a description. The key facts Horizon found are below.</p>}
              <dl className="facts">
                <Fact icon={Building2} k="Organisation" v={opp.provider} />
                <Fact icon={ListChecks} k="Type" v={opp.type} />
                <Fact icon={CalendarDays} k="Deadline" v={d.known ? fmtDate(opp.deadline) : opp.deadlineText} />
                <Fact icon={GraduationCap} k="Level mentioned" v={opp.levels?.join(', ')} />
                <Fact icon={MapPin} k="Location mentioned" v={opp.locations?.join(', ') || (opp.africaWide ? 'Africa (region-wide)' : '')} />
                <Fact icon={Wallet} k="Funding" v={funding} />
              </dl>
            </section>

            <section id="eligibility" className="d-sec">
              <h2 className="serif">Eligibility</h2>
              {opp.eligibility?.length ? <ul className="bullets">{opp.eligibility.map((e, i) => <li key={i}>{e}</li>)}</ul> : <p className="muted">Eligibility isn’t listed. Check the official page before applying.</p>}
              {m.cautions.length > 0 && (
                <div className="notice warn" style={{ marginTop: 14 }}><AlertTriangle size={18} /><div><strong>Worth double-checking</strong><ul className="plain">{m.cautions.map((c, i) => <li key={i}>{c}</li>)}</ul></div></div>
              )}
            </section>

            <section id="deadline" className="d-sec">
              <h2 className="serif">Deadline</h2>
              <div className={`deadline-box ${d.tone}`}>
                <Clock size={22} />
                <div><strong>{d.known ? fmtDate(opp.deadline, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Deadline not stated'}</strong>
                  <div className="small">{d.known ? (d.closed ? 'This opportunity has closed.' : d.label) : opp.deadlineText ? `The listing says: “${opp.deadlineText}”` : 'Check the official page for the current deadline.'}</div></div>
              </div>
            </section>

            <section id="benefits" className="d-sec">
              <h2 className="serif">Benefits</h2>
              {opp.benefits?.length ? <ul className="bullets">{opp.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul> : funding ? <p>{funding} <span className="tiny muted">(from the listing’s text)</span></p> : <p className="muted">Benefits aren’t described in the listing. The official page may have details.</p>}
            </section>

            <section id="documents" className="d-sec">
              <h2 className="serif">Required documents</h2>
              {m.reqs?.length ? (
                <ul className="req-list">
                  {m.reqs.map((q, i) => {
                    const ok = ['uploaded', 'built'].includes(q.status);
                    const kind = q.key ? docKind(q.key) : null;
                    return (
                      <li key={i} className={ok ? 'ok' : ''}>
                        {ok ? <Check size={16} className="text-ok" /> : <CircleDashed size={16} className="muted" />}
                        <span className="grow">{q.text}<span className="tiny muted" style={{ display: 'block' }}>{ok ? (q.status === 'built' ? 'Built in Horizon' : 'In your vault') : q.status === 'draft' ? 'Draft started in Horizon' : q.status === 'declared' ? 'You said you have this — upload it to use it' : q.status === 'unknown' ? 'Check what’s needed' : 'Not in your vault yet'}</span></span>
                        {!ok && kind && (q.key === 'statement'
                          ? <Link className="btn secondary sm" to={app ? `/essays/new?app=${app.id}` : `/essays/new?opp=${opp.id}`}>Write</Link>
                          : q.key === 'cv' && q.status !== 'declared' ? <Link className="btn secondary sm" to="/cv">Build</Link>
                          : <Link className="btn secondary sm" to={`/documents?upload=1&category=${kind.cat}`}>Upload</Link>)}
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="muted">The listing doesn’t specify required documents. Most applications ask for a CV, transcript and a personal statement.</p>}
            </section>

            <section id="process" className="d-sec">
              <h2 className="serif">How to apply</h2>
              <p className="tiny muted" style={{ marginBottom: 10 }}>Suggested steps from Horizon. The official page has the exact process.</p>
              <ol className="process">
                <li><strong>Confirm eligibility</strong> on the official page.</li>
                <li><strong>Gather documents</strong>{opp.requiredDocuments?.length ? `: ${opp.requiredDocuments.slice(0, 4).join(', ')}${opp.requiredDocuments.length > 4 ? '…' : ''}` : ''}.</li>
                <li><strong>Prepare your writing</strong>: tailor your statement or essay to this opportunity.</li>
                <li><strong>Submit</strong> {opp.applyLink ? `through the official application page (${opp.applyDomain})` : 'through the process described on the source page'}{d.known && !d.closed ? ` before ${fmtDate(opp.deadline)}` : ''}.</li>
              </ol>
            </section>

            <section id="match" className="d-sec">
              <h2 className="serif">Why this may match you</h2>
              {m.reasons.length ? <ul className="reasons">{m.reasons.map((x, i) => <li key={i}><Sparkles size={16} />{x}</li>)}</ul> : <p className="muted">Horizon couldn’t find specific links between this listing and your profile. It may still be worth reading the full criteria.</p>}
              <p className="tiny muted" style={{ marginTop: 10 }}>Based on your profile and what the listing says. This is not a guarantee of eligibility — always confirm with the provider.</p>
            </section>

            <section id="source" className="d-sec">
              <h2 className="serif">Source & trust</h2>
              <div className="source-box">
                {opp.isTrusted ? <ShieldCheck size={22} className="text-ok" /> : <ShieldAlert size={22} className="muted" />}
                <div className="grow">
                  <strong>{opp.isTrusted ? 'Verified source' : 'Not verified'}</strong>
                  <p className="small muted">{opp.isTrusted ? 'Marked verified because the application link is on a recognised funder’s website, or the listing includes detailed eligibility and document requirements.' : 'Horizon couldn’t confirm this listing against a recognised funder. Check the details carefully and never pay a fee to apply.'}</p>
                  {opp.sourceUrl && <a className="link small" href={opp.sourceUrl} target="_blank" rel="noopener noreferrer">Listed on {opp.sourceDomain}<ExternalLink size={13} /></a>}
                </div>
              </div>
            </section>
          </div>

          <aside className="detail-side">
            <div className="side-card">
              <div className={`deadline ${d.tone}`} style={{ fontSize: 15 }}><Clock size={16} />{d.label}</div>
              <div className="stack" style={{ gap: 10, marginTop: 16 }}>
                <button className="btn primary lg block" onClick={prepare}>{app ? 'Continue My Application' : 'Prepare My Application'}<ArrowRight size={18} /></button>
                <SaveButton opp={opp} withLabel />
                {opp.applyLink
                  ? <a className="btn secondary block" href={opp.applyLink} target="_blank" rel="noopener noreferrer">Apply<ExternalLink size={16} /></a>
                  : opp.sourceUrl ? <a className="btn secondary block" href={opp.sourceUrl} target="_blank" rel="noopener noreferrer">View official listing<ExternalLink size={16} /></a> : null}
                {!opp.applyLink && <p className="tiny muted">No direct application link was provided. The source page explains how to apply.</p>}
              </div>
              <div className="readiness-mini">
                <div className="row between"><strong className="small">Application Readiness</strong><span className="small muted">{r.ok}/{r.total}</span></div>
                <Bar value={r.pct} label="Application readiness" />
                <div className="rm-cols">
                  <div><span className="tiny muted">Complete</span>{r.complete.length ? r.complete.map((x) => <div key={x.key} className="rm-item ok"><Check size={14} />{x.label}</div>) : <div className="tiny muted">Nothing yet</div>}</div>
                  <div><span className="tiny muted">Missing</span>{r.missing.length ? r.missing.map((x) => <div key={x.key} className="rm-item miss"><CircleDashed size={14} />{x.label}</div>) : <div className="tiny muted">Nothing — you’re ready</div>}</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="mobile-cta">
        <SaveButton opp={opp} />
        <button className="btn primary grow" onClick={prepare}>{app ? 'Continue application' : 'Prepare My Application'}</button>
        {opp.applyLink && <a className="btn secondary icon" href={opp.applyLink} target="_blank" rel="noopener noreferrer" aria-label="Apply on the official site"><ExternalLink size={18} /></a>}
      </div>
    </div>
  );
}

function Fact({ icon: Icon, k, v }) {
  return (
    <div className="fact"><Icon size={18} /><div><dt>{k}</dt><dd className={v ? '' : 'muted'}>{v || 'Not stated in listing'}</dd></div></div>
  );
}
