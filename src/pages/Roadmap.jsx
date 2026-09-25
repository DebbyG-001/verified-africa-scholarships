import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, Flag, Plus, Pencil, Trash2, ArrowRight, Sparkles, Undo2, Clock, StickyNote } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { roadmapProgress, goalSummary } from '../lib/roadmap.js';
import { gapAnalysis } from '../lib/insights.js';
import { GOAL_TYPES, TARGET_LEVELS, DESTINATIONS } from '../lib/constants.js';
import { IMG } from '../lib/images.js';
import { Ring, Bar, Modal, Field, useToast, useConfirm, SmartImg } from '../components/ui.jsx';

export default function Roadmap() {
  const { state, toggleTask, setTaskNotes, addTask, removeTask, updateProfile, setGapOverride } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const loc = useLocation();
  const navigate = useNavigate();
  const rm = state.roadmap;
  const rp = roadmapProgress(rm);
  const gaps = gapAnalysis(state);
  const focusTask = params.get('task');
  const [filter, setFilter] = useState('all');
  const [openStages, setOpenStages] = useState(() => new Set([rp.current?.key, focusTask?.split(':')[0]].filter(Boolean)));
  const [expanded, setExpanded] = useState(() => new Set(focusTask ? [focusTask] : []));
  const [goalOpen, setGoalOpen] = useState(params.get('goal') === '1');
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (focusTask) {
      const stage = focusTask.split(':')[0];
      const t = rm.tasks.find((x) => x.id === focusTask);
      setOpenStages((s) => new Set([...s, t?.stage || stage]));
      setExpanded((s) => new Set([...s, focusTask]));
      setTimeout(() => document.getElementById(`task-${focusTask}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    }
  }, [focusTask]); // eslint-disable-line
  useEffect(() => { if (loc.hash === '#gaps') setTimeout(() => document.getElementById('gaps')?.scrollIntoView({ behavior: 'smooth' }), 200); }, [loc.hash]);

  const stages = useMemo(() => [...rm.stages].reverse(), [rm.stages]);
  const toggleStage = (k) => setOpenStages((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleExpand = (id) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const onToggle = (t) => { toggleTask(t.id); if (!t.done) toast(`Done: ${t.title}`, { action: { label: 'Undo', onClick: () => toggleTask(t.id) } }); };

  return (
    <div className="page">
      <div className="container">
        <div className="rm-hero">
          <SmartImg className="rm-hero-img" src={IMG.roadmap.src} alt={IMG.roadmap.alt} eager />
          <div className="rm-hero-copy">
            <span className="eyebrow">My Roadmap · working backwards from your goal</span>
            <h1 className="serif">{goalSummary(state.profile)}</h1>
            <p className="muted">{rp.done} of {rp.total} steps complete{rp.current ? ` · You are in ${rp.current.label}` : ''}</p>
            <div className="row wrap" style={{ marginTop: 16 }}>
              <button className="btn secondary" onClick={() => setGoalOpen(true)}><Pencil size={16} />Change goal</button>
              <button className="btn secondary" onClick={() => setAddOpen(true)}><Plus size={16} />Add task</button>
            </div>
          </div>
          <div className="rm-hero-ring"><Ring value={rp.pct} size={120} stroke={10} sub="complete" /></div>
        </div>

        <div className="rm-layout">
          <section aria-labelledby="timeline-h">
            <div className="section-head">
              <h2 id="timeline-h" className="section-title">Year by year</h2>
              <div className="seg" role="group" aria-label="Filter tasks">
                {[['all', 'All'], ['open', 'To do'], ['done', 'Done']].map(([k, l]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}
              </div>
            </div>

            <div className="goal-cap"><Flag size={18} /><div><span className="tiny muted">Goal</span><strong>{goalSummary(state.profile)}</strong></div></div>

            <ol className="timeline">
              {stages.map((s) => {
                const all = rm.tasks.filter((t) => t.stage === s.key);
                const tasks = all.filter((t) => filter === 'all' || (filter === 'open' ? !t.done : t.done));
                const done = all.filter((t) => t.done).length;
                const open = openStages.has(s.key);
                return (
                  <li key={s.key} className={`tl-stage ${s.status}`}>
                    <div className="tl-marker" aria-hidden="true">{done === all.length && all.length ? <Check size={14} strokeWidth={3} /> : null}</div>
                    <div className="tl-content">
                      <button className="tl-head" onClick={() => toggleStage(s.key)} aria-expanded={open} aria-controls={`stage-${s.key}`}>
                        <div className="grow">
                          <div className="row wrap" style={{ gap: 8 }}>
                            <h3 className="serif">{s.label}</h3>
                            {s.status === 'current' && <span className="badge sun">You are here</span>}
                            {s.status === 'past' && <span className="badge">Earlier stage</span>}
                          </div>
                          <div className="row" style={{ gap: 10, marginTop: 8, maxWidth: 360 }}><div className="grow"><Bar value={all.length ? (done / all.length) * 100 : 0} label={`${s.label} progress`} /></div><span className="tiny muted nowrap">{done}/{all.length}</span></div>
                        </div>
                        <ChevronDown size={20} className={`chev ${open ? 'open' : ''}`} />
                      </button>
                      <div id={`stage-${s.key}`} className={`tl-body ${open ? 'open' : ''}`}>
                        <div className="tl-inner">
                          {s.status === 'past' && <p className="small muted" style={{ marginBottom: 10 }}>This stage is behind you. Tick off anything you’ve already done, or catch up on what matters now.</p>}
                          {tasks.length === 0 && <p className="small muted">{filter === 'done' ? 'Nothing completed here yet.' : 'Everything here is done. 🎉'}</p>}
                          {tasks.map((t) => (
                            <TaskItem key={t.id} t={t} expanded={expanded.has(t.id)} highlight={focusTask === t.id}
                              onToggle={() => onToggle(t)} onExpand={() => toggleExpand(t.id)} onNotes={(v) => { setTaskNotes(t.id, v); toast('Note saved.'); }}
                              onRemove={async () => { if (await confirm({ title: 'Remove this task?', body: `“${t.title}” will be removed from your roadmap.`, confirmLabel: 'Remove', danger: true })) { removeTask(t.id); toast('Task removed.', { tone: 'info' }); } }}
                              onAction={() => navigate(t.action.to)} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section id="gaps" aria-labelledby="gaps-h" className="gaps">
            <div className="gaps-card">
              <span className="eyebrow">Gap analysis</span>
              <h2 id="gaps-h" className="serif">What You’re Missing</h2>
              <p className="small muted">Where you are now, compared with what your goal usually requires.</p>
              <div className="row" style={{ gap: 10, margin: '14px 0 6px' }}><div className="grow"><Bar value={gaps.pct} className="sun" label="Goal readiness" /></div><strong className="small">{gaps.met}/{gaps.total}</strong></div>
              <div className="encourage"><Sparkles size={16} /><span>You’re not behind. These are simply the areas to start building.</span></div>
              <ul className="gap-list">
                {gaps.items.map((g) => (
                  <li key={g.key} className={`gap ${g.met ? 'met' : ''}`}>
                    <span className={`gap-ic ${g.met ? 'ok' : ''}`}>{g.met ? <Check size={14} strokeWidth={3} /> : <span className="dot" />}</span>
                    <div className="grow">
                      <div className="row between" style={{ alignItems: 'flex-start' }}><strong className="small">{g.title}</strong><span className="tiny muted nowrap">{g.area}</span></div>
                      <div className="tiny muted">Needed: {g.need} · You have: {g.override === 'done' ? 'Handled' : g.override === 'not-needed' ? 'Not needed' : g.have}</div>
                      {!g.met && <p className="tiny" style={{ marginTop: 4 }}>{g.why}</p>}
                      <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
                        {!g.met && g.action && !g.action.override && <Link to={g.action.to} className="btn secondary sm">{g.action.label}<ArrowRight size={14} /></Link>}
                        {!g.met && g.canSkip && <>
                          <button className="btn secondary sm" onClick={() => { setGapOverride(g.key, 'done'); toast('Marked as handled.'); }}>I’ve handled this</button>
                          <button className="btn ghost sm" onClick={() => { setGapOverride(g.key, 'not-needed'); toast('Marked as not needed.'); }}>Not needed</button>
                        </>}
                        {g.override && <button className="btn ghost sm" onClick={() => setGapOverride(g.key, null)}><Undo2 size={14} />Undo</button>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>

      <GoalModal open={goalOpen} onClose={() => setGoalOpen(false)} profile={state.profile} onSave={(patch) => { updateProfile(patch, { rebuild: true }); setGoalOpen(false); toast('Goal updated. Your roadmap has been rebuilt and your completed steps kept.'); }} />
      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} stages={rm.stages} current={rp.current?.key} onSave={(t) => { addTask(t); setAddOpen(false); setOpenStages((s) => new Set([...s, t.stage])); toast('Task added to your roadmap.'); }} />
    </div>
  );
}

function TaskItem({ t, expanded, highlight, onToggle, onExpand, onNotes, onRemove, onAction }) {
  const [notes, setNotes] = useState(t.notes || '');
  useEffect(() => setNotes(t.notes || ''), [t.notes]);
  return (
    <div id={`task-${t.id}`} className={`task ${t.done ? 'done' : ''} ${highlight ? 'highlight' : ''}`}>
      <div className="task-row">
        <button className={`checkbox ${t.done ? 'on' : ''}`} role="checkbox" aria-checked={t.done} aria-label={`Mark “${t.title}” as ${t.done ? 'not done' : 'done'}`} onClick={onToggle}><Check size={14} strokeWidth={3} /></button>
        <button className="task-title" onClick={onExpand} aria-expanded={expanded}>
          <span className="grow">{t.title}</span>
          <span className="row" style={{ gap: 6 }}>
            {t.notes && <StickyNote size={14} className="muted" aria-label="Has notes" />}
            <span className={`badge ${t.priority === 'High' ? 'sun' : t.priority === 'Low' ? 'outline' : ''}`}>{t.priority}</span>
            <ChevronDown size={16} className={`chev ${expanded ? 'open' : ''}`} />
          </span>
        </button>
      </div>
      {expanded && (
        <div className="task-detail">
          {t.explanation && <p>{t.explanation}</p>}
          {t.why && <p className="why"><strong>Why it matters: </strong>{t.why}</p>}
          <div className="row wrap small muted" style={{ gap: 14 }}>
            {t.timeframe && <span className="row" style={{ gap: 5 }}><Clock size={14} />{t.timeframe}</span>}
            <span>Status: {t.done ? 'Done' : 'To do'}</span>
          </div>
          <Field label="Notes" id={`notes-${t.id}`} optional>
            <textarea id={`notes-${t.id}`} className="textarea" style={{ minHeight: 70 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note, link or reminder for yourself" maxLength={1000} />
          </Field>
          <div className="row wrap" style={{ gap: 8 }}>
            {notes !== (t.notes || '') && <button className="btn primary sm" onClick={() => onNotes(notes)}>Save note</button>}
            {t.action && <button className="btn secondary sm" onClick={onAction}>{t.action.label}<ArrowRight size={14} /></button>}
            {t.custom && <button className="btn danger-ghost sm" onClick={onRemove}><Trash2 size={14} />Remove</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function GoalModal({ open, onClose, profile, onSave }) {
  const [g, setG] = useState(profile.goal);
  const [dest, setDest] = useState(profile.destinations || []);
  const [err, setErr] = useState({});
  useEffect(() => { if (open) { setG(profile.goal); setDest(profile.destinations || []); setErr({}); } }, [open]); // eslint-disable-line
  const save = () => {
    const e = {};
    if (!g.type) e.type = 'Choose a goal.';
    if (!g.field?.trim()) e.field = 'Add the field you want to focus on.';
    setErr(e);
    if (!Object.keys(e).length) onSave({ goal: { ...g, field: g.field.trim() }, destinations: dest });
  };
  return (
    <Modal open={open} onClose={onClose} title="Change your goal" size="lg"
      footer={<><button className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save and rebuild roadmap</button></>}>
      <div className="stack" style={{ gap: 18 }}>
        <Field label="Main goal" error={err.type}>
          <div className="option-grid" role="radiogroup" aria-label="Main goal">
            {GOAL_TYPES.map((t) => <button key={t.value} type="button" role="radio" aria-checked={g.type === t.value} className="option" onClick={() => setG({ ...g, type: t.value })}><strong>{t.label}</strong><span>{t.hint}</span></button>)}
          </div>
        </Field>
        <div className="grid-2">
          <Field label="Field" id="gm-field" error={err.field}><input id="gm-field" className="input" value={g.field || ''} onChange={(e) => setG({ ...g, field: e.target.value })} aria-invalid={!!err.field} /></Field>
          <Field label="Target level" id="gm-tl"><select id="gm-tl" className="select" value={g.targetLevel || "Master's"} onChange={(e) => setG({ ...g, targetLevel: e.target.value })}>{TARGET_LEVELS.map((x) => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <Field label="In your own words" id="gm-text" optional><textarea id="gm-text" className="textarea" style={{ minHeight: 80 }} value={g.text || ''} onChange={(e) => setG({ ...g, text: e.target.value })} maxLength={400} /></Field>
        <Field label="Destinations" optional>
          <div className="row wrap">{DESTINATIONS.map((c) => <button key={c} type="button" className="chip" aria-pressed={dest.includes(c)} onClick={() => setDest(dest.includes(c) ? dest.filter((x) => x !== c) : [...dest, c])}>{c}</button>)}</div>
        </Field>
        <p className="tiny muted">Tasks you’ve completed are kept. Your own tasks are kept too.</p>
      </div>
    </Modal>
  );
}

function AddTaskModal({ open, onClose, stages, current, onSave }) {
  const blank = { title: '', stage: current || stages[0]?.key, priority: 'Medium', timeframe: '', explanation: '', why: '' };
  const [t, setT] = useState(blank);
  const [err, setErr] = useState('');
  useEffect(() => { if (open) { setT(blank); setErr(''); } }, [open]); // eslint-disable-line
  const save = () => { if (!t.title.trim()) return setErr('Give the task a short title.'); onSave({ ...t, title: t.title.trim() }); };
  return (
    <Modal open={open} onClose={onClose} title="Add a task"
      footer={<><button className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Add task</button></>}>
      <div className="stack" style={{ gap: 16 }}>
        <Field label="Task" id="at-title" error={err}><input id="at-title" className="input" value={t.title} onChange={(e) => { setT({ ...t, title: e.target.value }); setErr(''); }} aria-invalid={!!err} placeholder="e.g. Take the IELTS practice test" maxLength={120} data-autofocus /></Field>
        <div className="grid-2">
          <Field label="Stage" id="at-stage"><select id="at-stage" className="select" value={t.stage} onChange={(e) => setT({ ...t, stage: e.target.value })}>{stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></Field>
          <Field label="Priority" id="at-pr"><select id="at-pr" className="select" value={t.priority} onChange={(e) => setT({ ...t, priority: e.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></Field>
        </div>
        <Field label="Timeframe" id="at-tf" optional><input id="at-tf" className="input" value={t.timeframe} onChange={(e) => setT({ ...t, timeframe: e.target.value })} placeholder="e.g. Before March" maxLength={60} /></Field>
        <Field label="Why it matters" id="at-why" optional><textarea id="at-why" className="textarea" style={{ minHeight: 70 }} value={t.why} onChange={(e) => setT({ ...t, why: e.target.value })} maxLength={300} /></Field>
      </div>
    </Modal>
  );
}
