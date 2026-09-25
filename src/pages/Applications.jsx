import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Clock, ClipboardList, LayoutGrid, List, ArrowRight, GripVertical, Compass } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { APP_STATUSES, statusLabel } from '../lib/constants.js';
import { deadlineInfo, readiness, fmtDate, timeAgo } from '../lib/insights.js';
import { IMG } from '../lib/images.js';
import { Modal, Field, Empty, Bar, useToast } from '../components/ui.jsx';

export default function Applications() {
  const { state, setApplicationStatus, addApplicationManual } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState(() => (window.innerWidth < 860 ? 'list' : 'board'));
  const [filter, setFilter] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const apps = state.applications;

  const byStatus = useMemo(() => Object.fromEntries(APP_STATUSES.map((s) => [s.value, apps.filter((a) => a.status === s.value)])), [apps]);
  const listed = useMemo(() => [...apps].filter((a) => !filter || a.status === filter).sort((a, b) => (a.opp.deadline || '9999').localeCompare(b.opp.deadline || '9999')), [apps, filter]);

  const move = (id, status) => {
    const a = apps.find((x) => x.id === id);
    if (!a || a.status === status) return;
    const prev = a.status;
    setApplicationStatus(id, status);
    toast(`Moved to ${statusLabel(status)}.`, { action: { label: 'Undo', onClick: () => setApplicationStatus(id, prev) } });
  };

  if (!apps.length) {
    return (
      <div className="page"><div className="container">
        <div className="page-head"><div><span className="eyebrow">Application tracker</span><h1>Applications</h1><p>Track every application from first interest to final decision.</p></div></div>
        <Empty img={IMG.prepare} title="You haven’t started any applications yet" body="Open an opportunity and choose “Prepare My Application”. Horizon will check what you have, what’s missing, and help you draft your materials.">
          <Link to="/opportunities" className="btn primary"><Compass size={16} />Find Opportunities</Link>
          <button className="btn secondary" onClick={() => setAddOpen(true)}><Plus size={16} />Track one manually</button>
        </Empty>
        <AddModal open={addOpen} onClose={() => setAddOpen(false)} onSave={(d) => { const id = addApplicationManual(d); setAddOpen(false); toast('Application added.'); navigate(`/applications/${id}`); }} />
      </div></div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <div><span className="eyebrow">Application tracker</span><h1>Applications</h1><p>Drag cards between columns, or open one to change its status, see what’s missing and add notes.</p></div>
          <div className="row wrap">
            <div className="seg" role="group" aria-label="View">
              <button aria-pressed={view === 'board'} onClick={() => setView('board')}><LayoutGrid size={16} />Board</button>
              <button aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={16} />List</button>
            </div>
            <button className="btn primary" onClick={() => setAddOpen(true)}><Plus size={16} />Add application</button>
          </div>
        </div>

        {view === 'board' ? (
          <div className="board" role="list">
            {APP_STATUSES.map((s) => (
              <section key={s.value} role="listitem" aria-label={`${s.label}, ${byStatus[s.value].length} applications`} className={`col ${overCol === s.value ? 'over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setOverCol(s.value); }} onDragLeave={() => setOverCol(null)}
                onDrop={(e) => { e.preventDefault(); setOverCol(null); if (dragId) move(dragId, s.value); setDragId(null); }}>
                <header className="col-head"><span className={`st-dot st-${s.value}`} />{s.label}<small>{byStatus[s.value].length}</small></header>
                <div className="col-body">
                  {byStatus[s.value].map((a) => <AppCard key={a.id} a={a} state={state} onDragStart={() => setDragId(a.id)} onMove={move} />)}
                  {byStatus[s.value].length === 0 && <div className="col-empty">Drop here</div>}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <>
            <div className="row wrap" style={{ marginBottom: 16 }}>
              <button className="chip" aria-pressed={!filter} onClick={() => setFilter('')}>All ({apps.length})</button>
              {APP_STATUSES.filter((s) => byStatus[s.value].length).map((s) => <button key={s.value} className="chip" aria-pressed={filter === s.value} onClick={() => setFilter(s.value)}>{s.label} ({byStatus[s.value].length})</button>)}
            </div>
            <div className="stack">{listed.map((a) => <AppCard key={a.id} a={a} state={state} wide onMove={move} />)}</div>
          </>
        )}
      </div>
      <AddModal open={addOpen} onClose={() => setAddOpen(false)} onSave={(d) => { const id = addApplicationManual(d); setAddOpen(false); toast('Application added.'); navigate(`/applications/${id}`); }} />
    </div>
  );
}

function AppCard({ a, state, onDragStart, onMove, wide }) {
  const d = deadlineInfo(a.opp);
  const r = readiness(state, a);
  return (
    <article className={`app-card ${wide ? 'wide' : ''}`} draggable={!wide} onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}>
      {!wide && <GripVertical size={16} className="grip muted" aria-hidden="true" />}
      <div className="grow" style={{ minWidth: 0 }}>
        <Link to={`/applications/${a.id}`} className="app-title clamp-2">{a.opp.title}</Link>
        <div className="tiny muted truncate">{a.opp.provider || a.opp.type}</div>
        <div className={`deadline ${d.tone} tiny`} style={{ marginTop: 8 }}><Clock size={13} />{d.label}</div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}><div className="grow"><Bar value={r.pct} label="Readiness" /></div><span className="tiny muted">{r.ok}/{r.total}</span></div>
        {r.missing.length > 0 && ['interested', 'preparing', 'drafting'].includes(a.status) && <div className="tiny muted" style={{ marginTop: 6 }}>Missing: {r.missing.slice(0, 2).map((x) => x.label).join(', ')}{r.missing.length > 2 ? ` +${r.missing.length - 2}` : ''}</div>}
      </div>
      <div className={wide ? 'row' : 'app-card-foot'}>
        <select className="select mini" value={a.status} onChange={(e) => onMove(a.id, e.target.value)} aria-label={`Status for ${a.opp.title}`}>
          {APP_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {wide && <Link to={`/applications/${a.id}`} className="btn secondary sm">Open<ArrowRight size={14} /></Link>}
      </div>
    </article>
  );
}

function AddModal({ open, onClose, onSave }) {
  const [d, setD] = useState({ title: '', provider: '', deadline: '', link: '', notes: '' });
  const [err, setErr] = useState({});
  const save = () => {
    const e = {};
    if (!d.title.trim()) e.title = 'Add the name of the opportunity.';
    if (d.link && !/^https?:\/\/\S+\.\S+/.test(d.link)) e.link = 'Enter a full link starting with http:// or https://';
    setErr(e);
    if (!Object.keys(e).length) { onSave({ ...d, title: d.title.trim(), deadline: d.deadline || null }); setD({ title: '', provider: '', deadline: '', link: '', notes: '' }); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Track an application"
      footer={<><button className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Add application</button></>}>
      <div className="stack" style={{ gap: 16 }}>
        <p className="small muted">For opportunities you found outside Horizon. Enter the details from the official page.</p>
        <Field label="Opportunity name" id="am-t" error={err.title}><input id="am-t" className="input" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} aria-invalid={!!err.title} data-autofocus maxLength={160} /></Field>
        <Field label="Organisation" id="am-p" optional><input id="am-p" className="input" value={d.provider} onChange={(e) => setD({ ...d, provider: e.target.value })} maxLength={120} /></Field>
        <div className="grid-2">
          <Field label="Deadline" id="am-d" optional><input id="am-d" type="date" className="input" value={d.deadline} onChange={(e) => setD({ ...d, deadline: e.target.value })} /></Field>
          <Field label="Application link" id="am-l" error={err.link} optional><input id="am-l" className="input" type="url" value={d.link} onChange={(e) => setD({ ...d, link: e.target.value })} placeholder="https://" aria-invalid={!!err.link} /></Field>
        </div>
        <Field label="Notes" id="am-n" optional><textarea id="am-n" className="textarea" style={{ minHeight: 80 }} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
