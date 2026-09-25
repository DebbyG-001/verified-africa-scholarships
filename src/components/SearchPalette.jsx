import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Compass, FileText, Map, ClipboardList, GraduationCap, PenLine, CornerDownLeft, ArrowRight } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { useOpportunities } from '../lib/opps.js';
import { GUIDES, RUMOURS } from '../lib/courses.js';
import { catLabel, statusLabel } from '../lib/constants.js';
import { Spinner } from './ui.jsx';

const PAGES = [
  { title: 'Home', to: '/home' }, { title: 'My Roadmap', to: '/roadmap' }, { title: 'What You’re Missing (gap analysis)', to: '/roadmap#gaps' },
  { title: 'Find Opportunities', to: '/opportunities' }, { title: 'Saved Opportunities', to: '/opportunities?saved=1' },
  { title: 'My Documents', to: '/documents' }, { title: 'Upload Document', to: '/documents?upload=1' }, { title: 'Applications', to: '/applications' },
  { title: 'CV builder', to: '/cv' }, { title: 'Essays & statements', to: '/essays' }, { title: 'Course Intelligence', to: '/learn' },
  { title: 'Profile', to: '/profile' }, { title: 'Add Experience', to: '/profile?add=project' }, { title: 'Settings & data', to: '/profile#settings' },
];

function score(text, q) {
  const t = text.toLowerCase();
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  let s = 0;
  for (const term of terms) { const i = t.indexOf(term); if (i < 0) return 0; s += i === 0 ? 3 : /\s/.test(t[i - 1] || ' ') ? 2 : 1; }
  return s;
}

export default function SearchPalette({ open, onClose }) {
  const { state } = useStore();
  const opps = useOpportunities({ auto: open });
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 20); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const groups = useMemo(() => {
    const query = q.trim();
    if (!query) return [{ name: 'Go to', icon: ArrowRight, items: PAGES.slice(0, 8).map((p) => ({ ...p, sub: '' })) }];
    const pick = (arr, map, n = 5) => arr.map((x) => ({ x, s: score(map(x).hay, query) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map((r) => map(r.x));
    const savedOpps = Object.values(state.saved).map((s) => s.opp);
    const allOpps = [...opps.items, ...savedOpps.filter((o) => !opps.items.some((x) => x.id === o.id))];
    return [
      { name: 'Opportunities', icon: Compass, items: pick(allOpps, (o) => ({ title: o.title, sub: [o.provider, o.type].filter(Boolean).join(' · '), to: `/opportunities/${o.id}`, hay: `${o.title} ${o.provider} ${o.type} ${o.eligibility?.join(' ')} ${o.locations?.join(' ')}` }), 6) },
      { name: 'Documents', icon: FileText, items: pick(state.documents, (d) => ({ title: d.name, sub: `${catLabel(d.category)} · ${d.sub}`, to: `/documents?open=${d.id}`, hay: `${d.name} ${catLabel(d.category)} ${d.sub}` })) },
      { name: 'Roadmap tasks', icon: Map, items: pick(state.roadmap?.tasks || [], (t) => ({ title: t.title, sub: `${state.roadmap.stages.find((s) => s.key === t.stage)?.label || ''}${t.done ? ' · Done' : ''}`, to: `/roadmap?task=${encodeURIComponent(t.id)}`, hay: `${t.title} ${t.explanation}` })) },
      { name: 'Applications', icon: ClipboardList, items: pick(state.applications, (a) => ({ title: a.opp.title, sub: statusLabel(a.status), to: `/applications/${a.id}`, hay: `${a.opp.title} ${a.opp.provider} ${a.notes}` })) },
      { name: 'Essays', icon: PenLine, items: pick(state.essays, (e) => ({ title: e.title, sub: 'Draft', to: `/essays/${e.id}`, hay: `${e.title} ${e.question} ${e.content}` })) },
      { name: 'Course Intelligence', icon: GraduationCap, items: [...pick(GUIDES, (g) => ({ title: g.title, sub: `${g.area} · ${g.level}`, to: `/learn/${g.slug}`, hay: `${g.title} ${g.area} ${g.summary} ${g.tips.join(' ')}` })), ...pick(RUMOURS, (r) => ({ title: r.claim, sub: `Rumours & Reality · ${r.verdict}`, to: '/learn#rumours', hay: `${r.claim} ${r.reality}` }), 2)] },
      { name: 'Pages', icon: ArrowRight, items: pick(PAGES, (p) => ({ ...p, sub: '', hay: p.title }), 4) },
    ].filter((g) => g.items.length);
  }, [q, state, opps.items]);

  const flat = groups.flatMap((g) => g.items);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const go = (item) => { if (!item) return; onClose(); navigate(item.to); };

  if (!open) return null;
  let idx = -1;
  return createPortal(
    <div className="overlay search-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search Horizon"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === 'Enter') { e.preventDefault(); go(flat[active]); }
          if (e.key === 'Tab') e.preventDefault();
        }}>
        <div className="palette-input">
          <Search size={20} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search opportunities, documents, tasks, applications, courses…" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={flat[active] ? `pal-${active}` : undefined} />
          <button className="btn ghost sm" onClick={onClose}>Esc</button>
        </div>
        <div className="palette-list" id="palette-list" role="listbox" ref={listRef}>
          {q && opps.status === 'loading' && <div className="palette-note"><Spinner size={16} /> Finding opportunities for you…</div>}
          {groups.map((g) => (
            <div key={g.name} className="palette-group">
              <div className="palette-group-name">{g.name}</div>
              {g.items.map((it) => {
                idx += 1; const i = idx;
                return (
                  <button key={g.name + it.to + i} id={`pal-${i}`} role="option" aria-selected={i === active} data-active={i === active}
                    className="palette-item" onMouseEnter={() => setActive(i)} onClick={() => go(it)}>
                    <g.icon size={18} className="muted" />
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="truncate" style={{ display: 'block' }}>{it.title}</span>
                      {it.sub && <span className="tiny muted truncate" style={{ display: 'block' }}>{it.sub}</span>}
                    </span>
                    {i === active && <CornerDownLeft size={16} className="muted" />}
                  </button>
                );
              })}
            </div>
          ))}
          {q && !flat.length && (
            <div className="palette-empty">
              <strong>No results for “{q}”</strong>
              <span className="muted small">Try a shorter word, a document name, an organisation or a course.</span>
            </div>
          )}
        </div>
        <div className="palette-foot tiny muted"><span>↑↓ to move</span><span>Enter to open</span><span>Esc to close</span></div>
      </div>
    </div>, document.body);
}
