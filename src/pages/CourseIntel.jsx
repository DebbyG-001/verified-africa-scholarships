import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, FlaskConical, BookOpen, MessageSquareQuote, Plus, Trash2, ArrowRight, ChevronDown, ShieldCheck, Users } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { STRATEGIES, GUIDES, RUMOURS } from '../lib/courses.js';
import { IMG } from '../lib/images.js';
import { Field, Modal, useToast, useConfirm, SmartImg, Empty } from '../components/ui.jsx';
import { fmtDate } from '../lib/insights.js';

export default function CourseIntel() {
  const { state, addCourseNote, removeCourseNote } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const loc = useLocation();
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [openRumour, setOpenRumour] = useState(null);
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => { if (loc.hash) setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 200); }, [loc.hash]);

  const areas = [...new Set(GUIDES.map((g) => g.area))];
  const guides = useMemo(() => GUIDES.filter((g) => (!area || g.area === area) && (!q || `${g.title} ${g.area} ${g.summary} ${g.tips.join(' ')} ${g.mistakes.join(' ')}`.toLowerCase().includes(q.toLowerCase()))), [q, area]);
  const rumours = RUMOURS.filter((r) => !q || `${r.claim} ${r.reality}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="page">
      <div className="container">
        <section className="ci-hero">
          <SmartImg className="ci-hero-img" src={IMG.studyGroup.src} alt={IMG.studyGroup.alt} eager />
          <div className="ci-hero-copy">
            <span className="eyebrow light">Course Intelligence</span>
            <h1 className="serif">Study smarter. Separate rumours from reality.</h1>
            <p>Research-backed study strategies, course survival guides and honest answers to common beliefs.</p>
            <div className="big-search light" role="search">
              <Search size={20} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses, tips or rumours" aria-label="Search Course Intelligence" />
            </div>
          </div>
        </section>

        <div className="legend">
          <span className="badge ok"><ShieldCheck size={13} />Backed by research</span><span className="small muted">Supported by published learning-science studies (sources named).</span>
          <span className="badge forest"><BookOpen size={13} />Horizon guide</span><span className="small muted">General guidance — your department’s syllabus and rules may differ.</span>
          <span className="badge warn"><Users size={13} />Opinion</span><span className="small muted">Personal views and notes. Not verified.</span>
        </div>

        {!q && (
          <section className="band" aria-labelledby="strat-h">
            <div className="section-head"><h2 id="strat-h" className="section-title">Study strategies that work</h2><span className="badge ok"><FlaskConical size={13} />Backed by research</span></div>
            <div className="strat-grid stagger">
              {STRATEGIES.map((s) => (
                <article key={s.title} className="strat">
                  <h3>{s.title}</h3>
                  <p className="small">{s.body}</p>
                  <p className="tiny muted source">Source: {s.source}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="band" aria-labelledby="guides-h">
          <div className="section-head">
            <h2 id="guides-h" className="section-title">Course survival guides</h2>
            <div className="row wrap"><button className="chip" aria-pressed={!area} onClick={() => setArea('')}>All</button>{areas.map((a) => <button key={a} className="chip" aria-pressed={area === a} onClick={() => setArea(area === a ? '' : a)}>{a}</button>)}</div>
          </div>
          {guides.length ? (
            <div className="guide-grid">
              {guides.map((g) => (
                <Link key={g.slug} to={`/learn/${g.slug}`} className="guide-card">
                  <SmartImg src={g.img.src.replace('w=1200', 'w=700')} alt="" />
                  <div className="guide-body">
                    <div className="row wrap" style={{ gap: 6 }}><span className="badge forest">Horizon guide</span><span className="badge">{g.level}</span></div>
                    <h3 className="serif">{g.title}</h3>
                    <p className="small muted clamp-2">{g.summary}</p>
                    <span className="link small">Read guide <ArrowRight size={14} /></span>
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className="muted">No guides match “{q}”.</p>}
        </section>

        <section id="rumours" className="band" aria-labelledby="rum-h">
          <div className="section-head"><h2 id="rum-h" className="section-title">Rumours & Reality</h2><span className="small muted">Common beliefs, checked.</span></div>
          <div className="rumours">
            {rumours.map((r, i) => (
              <div key={r.claim} className={`rumour ${openRumour === i ? 'open' : ''}`}>
                <button className="rumour-q" onClick={() => setOpenRumour(openRumour === i ? null : i)} aria-expanded={openRumour === i}>
                  <span className="badge warn">Rumour</span><span className="grow">“{r.claim}”</span><span className={`verdict v-${r.verdict.replace(/\s/g, '').toLowerCase()}`}>{r.verdict}</span><ChevronDown size={18} className={`chev ${openRumour === i ? 'open' : ''}`} />
                </button>
                {openRumour === i && <div className="rumour-a"><span className="badge forest">Reality · Horizon guide</span><p>{r.reality}</p></div>}
              </div>
            ))}
            {!rumours.length && <p className="muted">No rumours match “{q}”.</p>}
          </div>
        </section>

        <section className="band" aria-labelledby="notes-h">
          <div className="section-head">
            <div><h2 id="notes-h" className="section-title">Senior-student advice</h2><p className="small muted">Save advice you’ve heard from seniors, or your own lessons. Always labelled as opinion. Saved on this device only.</p></div>
            <button className="btn secondary" onClick={() => setNoteOpen(true)}><Plus size={16} />Add advice</button>
          </div>
          {state.courseNotes.length ? (
            <div className="notes-grid">
              {state.courseNotes.map((n) => (
                <article key={n.id} className="note-card">
                  <div className="row between"><span className="badge warn"><MessageSquareQuote size={13} />Opinion</span><button className="btn icon ghost sm" aria-label="Delete advice" onClick={async () => { if (await confirm({ title: 'Delete this advice?', body: 'This can’t be undone.', confirmLabel: 'Delete', danger: true })) { removeCourseNote(n.id); toast('Deleted.', { tone: 'info' }); } }}><Trash2 size={15} /></button></div>
                  <strong>{n.course}</strong>
                  <p className="small">{n.text}</p>
                  <span className="tiny muted">{n.from ? `From: ${n.from} · ` : ''}{fmtDate(n.at)}</span>
                </article>
              ))}
            </div>
          ) : (
            <Empty icon={MessageSquareQuote} title="No advice saved yet" body="When a senior tells you how a course really works, write it down here so you don’t forget. It stays clearly labelled as opinion.">
              <button className="btn primary" onClick={() => setNoteOpen(true)}><Plus size={16} />Add advice</button>
            </Empty>
          )}
        </section>
      </div>
      <NoteModal open={noteOpen} onClose={() => setNoteOpen(false)} onSave={(n) => { addCourseNote(n); setNoteOpen(false); toast('Advice saved.'); }} />
    </div>
  );
}

function NoteModal({ open, onClose, onSave }) {
  const [n, setN] = useState({ course: '', text: '', from: '' });
  const [err, setErr] = useState({});
  useEffect(() => { if (open) { setN({ course: '', text: '', from: '' }); setErr({}); } }, [open]);
  const save = () => {
    const e = {};
    if (!n.course.trim()) e.course = 'Which course is this about?';
    if (n.text.trim().length < 10) e.text = 'Write at least a sentence.';
    setErr(e); if (!Object.keys(e).length) onSave({ course: n.course.trim(), text: n.text.trim(), from: n.from.trim() });
  };
  return (
    <Modal open={open} onClose={onClose} title="Add advice" footer={<><button className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save advice</button></>}>
      <div className="stack" style={{ gap: 16 }}>
        <Field label="Course" id="nt-c" error={err.course}><input id="nt-c" className="input" value={n.course} onChange={(e) => setN({ ...n, course: e.target.value })} placeholder="e.g. CSC 201 — Data Structures" aria-invalid={!!err.course} data-autofocus maxLength={80} /></Field>
        <Field label="Advice" id="nt-t" error={err.text}><textarea id="nt-t" className="textarea" value={n.text} onChange={(e) => setN({ ...n, text: e.target.value })} aria-invalid={!!err.text} maxLength={1000} placeholder="e.g. Past questions repeat patterns — start them from week 3." /></Field>
        <Field label="Who said it" id="nt-f" optional hint="e.g. a 400-level student, or ‘me’."><input id="nt-f" className="input" value={n.from} onChange={(e) => setN({ ...n, from: e.target.value })} maxLength={60} /></Field>
      </div>
    </Modal>
  );
}
