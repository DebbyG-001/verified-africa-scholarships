import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, CircleDashed, ExternalLink, FileText, PenLine, Trash2, Clock, ChevronRight, Info, Upload, History, Save, Sparkles } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { APP_STATUSES, statusLabel } from '../lib/constants.js';
import { deadlineInfo, readiness, fmtDate, timeAgo } from '../lib/insights.js';
import { wordCount } from '../lib/draft.js';
import { Ring, Empty, useToast, useConfirm, Field, Checkbox } from '../components/ui.jsx';

export default function ApplicationWorkspace() {
  const { id } = useParams();
  const { state, setApplicationStatus, updateApplication, removeApplication } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const app = state.applications.find((a) => a.id === id);
  const [notes, setNotes] = useState(app?.notes || '');
  useEffect(() => { setNotes(app?.notes || ''); }, [app?.id]); // eslint-disable-line

  // warn before leaving with unsaved notes
  useEffect(() => {
    if (!app || notes === (app.notes || '')) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [notes, app]);

  if (!app) {
    return <div className="page"><div className="container"><Empty icon={Info} title="This application isn’t here" body="It may have been removed. Your other applications are still in your tracker."><Link to="/applications" className="btn primary">Go to Applications</Link></Empty></div></div>;
  }

  const opp = app.opp;
  const d = deadlineInfo(opp);
  const r = readiness(state, app);
  const essays = state.essays.filter((e) => app.essayIds.includes(e.id));
  const statusIdx = APP_STATUSES.findIndex((s) => s.value === app.status);

  const setStatus = (s) => {
    const prev = app.status;
    setApplicationStatus(app.id, s);
    toast(`Status: ${statusLabel(s)}`, { action: { label: 'Undo', onClick: () => setApplicationStatus(app.id, prev) } });
  };
  const toggleCheck = (text, v) => updateApplication(app.id, { checks: { ...app.checks, [text]: v } });

  return (
    <div className="page">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb"><Link to="/applications">Applications</Link><ChevronRight size={14} /><span className="truncate" style={{ maxWidth: 300 }} aria-current="page">{opp.title}</span></nav>

        <div className="ws-head">
          <div className="grow" style={{ minWidth: 0 }}>
            <span className="eyebrow">Prepare Application</span>
            <h1 className="serif ws-title">{opp.title}</h1>
            <div className="row wrap small muted" style={{ gap: 14, marginTop: 8 }}>
              {opp.provider && <span>{opp.provider}</span>}
              <span className={`deadline ${d.tone}`}><Clock size={14} />{d.label}</span>
              {opp.id && <Link to={`/opportunities/${opp.id}`} className="link small">Opportunity details</Link>}
            </div>
          </div>
          <div className="row wrap">
            {opp.applyLink && <a href={opp.applyLink} target="_blank" rel="noopener noreferrer" className="btn secondary">Apply on official site<ExternalLink size={16} /></a>}
          </div>
        </div>

        <div className="stepper" role="group" aria-label="Application status">
          {APP_STATUSES.map((s, i) => (
            <button key={s.value} className={`stp ${i < statusIdx ? 'past' : ''} ${i === statusIdx ? 'current' : ''} ${['rejected', 'closed'].includes(s.value) ? 'alt' : ''}`} aria-pressed={i === statusIdx} onClick={() => setStatus(s.value)}>
              <span className="stp-dot">{i < statusIdx ? <Check size={12} strokeWidth={3} /> : null}</span>{s.label}
            </button>
          ))}
        </div>

        <div className="ws-layout">
          <div className="stack-lg">
            <section className="panel" aria-labelledby="ready-h">
              <div className="row" style={{ gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <Ring value={r.pct} size={96} sub="ready" />
                <div className="grow">
                  <h2 id="ready-h" className="section-title">Application Readiness</h2>
                  <p className="small muted">{r.missing.length ? `${r.missing.length} thing${r.missing.length > 1 ? 's' : ''} still to prepare.` : 'Everything on the list is ready. Review it once more, then submit on the official site.'}</p>
                  {r.missing.length === 0 && ['preparing', 'drafting', 'interested'].includes(app.status) && <button className="btn primary sm" style={{ marginTop: 10 }} onClick={() => setStatus('ready')}>Mark as Ready to Apply</button>}
                  {app.status === 'ready' && <button className="btn primary sm" style={{ marginTop: 10 }} onClick={() => setStatus('applied')}>I’ve submitted it</button>}
                </div>
              </div>
              <div className="ready-cols">
                <div>
                  <h3 className="eyebrow">Complete</h3>
                  {r.complete.length ? r.complete.map((x) => (
                    <div key={x.key} className="ready-item ok">
                      <Check size={16} /><div className="grow"><strong>{x.label}</strong><div className="tiny muted">{x.detail}</div></div>
                      {x.manual && <button className="link tiny" onClick={() => toggleCheck(x.source, false)}>Undo</button>}
                      {x.docId && <Link className="link tiny" to={`/documents?open=${x.docId}`}>View</Link>}
                    </div>
                  )) : <p className="small muted">Nothing yet — start with the items on the right.</p>}
                </div>
                <div>
                  <h3 className="eyebrow">Missing</h3>
                  {r.missing.length ? r.missing.map((x) => (
                    <div key={x.key} className="ready-item miss">
                      <CircleDashed size={16} />
                      <div className="grow"><strong>{x.label}</strong><div className="tiny muted">{x.detail}{x.source && x.source !== x.label ? ` · “${x.source}”` : ''}</div></div>
                      {x.to && <Link to={x.to} className="btn secondary sm">{x.key === 'statement' ? <><PenLine size={14} />Write</> : x.key === 'cv' ? 'Build' : x.key === 'profile' ? 'Complete' : <><Upload size={14} />Upload</>}</Link>}
                      {x.manual && <Checkbox checked={false} onChange={(v) => toggleCheck(x.source, v)} label={`Mark ${x.label} as ready`}><span className="tiny">Ready</span></Checkbox>}
                    </div>
                  )) : <p className="small muted">Nothing missing.</p>}
                </div>
              </div>
            </section>

            <section className="panel" aria-labelledby="mat-h">
              <div className="section-head"><h2 id="mat-h" className="section-title">Application materials</h2></div>
              <div className="stack">
                <div className="mat-row">
                  <span className="mat-ic"><PenLine size={18} /></span>
                  <div className="grow"><strong>Essays & personal statements</strong><div className="tiny muted">Drafted from your own profile. Nothing is invented.</div></div>
                  <Link to={`/essays/new?app=${app.id}`} className="btn primary sm"><Sparkles size={14} />New draft</Link>
                </div>
                {essays.map((e) => (
                  <Link key={e.id} to={`/essays/${e.id}`} className="essay-link">
                    <FileText size={16} /><span className="grow truncate">{e.title}</span><span className="tiny muted nowrap">{wordCount(e.content)} words · {timeAgo(e.updatedAt)}</span><ArrowRight size={15} />
                  </Link>
                ))}
                <div className="mat-row">
                  <span className="mat-ic"><FileText size={18} /></span>
                  <div className="grow"><strong>CV</strong><div className="tiny muted">{state.cv?.updatedAt ? `Last saved ${timeAgo(state.cv.updatedAt)}` : 'Not built in Horizon yet'}</div></div>
                  <Link to={`/cv?for=${app.id}`} className="btn secondary sm">{state.cv?.updatedAt ? 'Tailor CV' : 'Build CV'}</Link>
                </div>
              </div>
            </section>

            <section className="panel" aria-labelledby="notes-h">
              <h2 id="notes-h" className="section-title" style={{ marginBottom: 10 }}>Notes</h2>
              <Field id="app-notes" hint="Contacts, questions to ask, submission reference numbers…">
                <textarea id="app-notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes for this application" maxLength={4000} aria-label="Application notes" />
              </Field>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn primary sm" disabled={notes === (app.notes || '')} onClick={() => { updateApplication(app.id, { notes }); toast('Notes saved.'); }}><Save size={14} />Save notes</button>
                {notes !== (app.notes || '') && <span className="tiny muted">Unsaved changes</span>}
              </div>
            </section>
          </div>

          <aside className="stack-lg">
            <section className="panel tight">
              <h2 className="side-title" style={{ marginBottom: 10 }}>Opportunity</h2>
              <dl className="meta-list">
                <div><dt>Deadline</dt><dd>{d.known ? fmtDate(opp.deadline) : opp.deadlineText || 'Not stated'}</dd></div>
                <div><dt>Type</dt><dd>{opp.type}</dd></div>
                {opp.requiredDocuments?.length > 0 && <div><dt>Asks for</dt><dd>{opp.requiredDocuments.join(', ')}</dd></div>}
              </dl>
              {opp.eligibility?.length > 0 && (
                <details className="details"><summary>Eligibility ({opp.eligibility.length})</summary><ul className="bullets small">{opp.eligibility.map((e, i) => <li key={i}>{e}</li>)}</ul></details>
              )}
              <div className="stack" style={{ gap: 8, marginTop: 14 }}>
                {opp.applyLink ? <a href={opp.applyLink} target="_blank" rel="noopener noreferrer" className="btn secondary block">Apply<ExternalLink size={15} /></a> : <p className="tiny muted">No application link saved for this one.</p>}
              </div>
            </section>
            <section className="panel tight">
              <h2 className="side-title" style={{ marginBottom: 10 }}><History size={17} />History</h2>
              <ol className="history">
                {[...(app.history || [])].reverse().map((h, i) => <li key={i}><strong className="small">{statusLabel(h.status)}</strong><span className="tiny muted">{fmtDate(h.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></li>)}
              </ol>
            </section>
            <button className="btn danger-ghost" onClick={async () => { if (await confirm({ title: 'Remove this application?', body: 'Your essays stay saved. The opportunity stays in your saved list.', confirmLabel: 'Remove', danger: true })) { removeApplication(app.id); toast('Application removed.', { tone: 'info' }); navigate('/applications'); } }}><Trash2 size={15} />Remove application</button>
          </aside>
        </div>
      </div>
    </div>
  );
}
