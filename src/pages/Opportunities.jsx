import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, LayoutGrid, List, RefreshCw, Heart, CloudOff, SearchX, ShieldCheck } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { useOpportunities, OPP_TYPES } from '../lib/opps.js';
import { matchOpportunity, deadlineInfo, daysUntil, studentFields, timeAgo } from '../lib/insights.js';
import { CATEGORY_IMAGES, IMG } from '../lib/images.js';
import OppCard, { OppCardSkeleton } from '../components/OppCard.jsx';
import { Drawer, SmartImg, Spinner, Checkbox, Empty, useToast } from '../components/ui.jsx';

const LEVELS = ['Undergraduate', 'Masters', 'PhD', 'Secondary school'];
const FIELDS = ['Computer science & tech', 'Engineering', 'STEM', 'Health & medicine', 'Business & economics', 'Law & policy', 'Agriculture & environment', 'Arts & humanities', 'Education'];
const DEADLINES = [['', 'Any time'], ['7', 'Next 7 days'], ['30', 'Next 30 days'], ['90', 'Next 3 months'], ['known', 'Has a stated deadline']];
const SORTS = [['match', 'Best match'], ['deadline', 'Deadline: soonest'], ['az', 'Title: A–Z'], ['provider', 'Organisation: A–Z']];

export default function Opportunities() {
  const { state } = useStore();
  const toast = useToast();
  const opps = useOpportunities();
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const [view, setView] = useState(() => { try { return localStorage.getItem('horizon:oppView') || 'grid'; } catch { return 'grid'; } });
  const [qInput, setQInput] = useState(params.get('q') || '');

  const f = {
    q: params.get('q') || '', type: params.get('type') || '', level: params.get('level') || '', field: params.get('field') || '',
    location: params.get('location') || '', deadline: params.get('deadline') || '', funding: params.get('funding') || '',
    trusted: params.get('trusted') === '1', saved: params.get('saved') === '1', closed: params.get('closed') === '1', sort: params.get('sort') || 'match',
  };
  const setF = (patch) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v === false || v == null || (k === 'sort' && v === 'match')) n.delete(k); else n.set(k, v === true ? '1' : v);
    }
    setParams(n, { replace: true });
  };
  useEffect(() => { const t = setTimeout(() => { if (qInput !== f.q) setF({ q: qInput.trim() ? qInput : '' }); }, 250); return () => clearTimeout(t); }, [qInput]); // eslint-disable-line
  useEffect(() => { try { localStorage.setItem('horizon:oppView', view); } catch { /* ignore */ } }, [view]);

  // Saved opportunities remain visible even if the live feed is unavailable.
  const pool = useMemo(() => {
    const saved = Object.values(state.saved).map((s) => s.opp);
    if (f.saved) return saved;
    return [...opps.items, ...saved.filter((s) => !opps.items.some((o) => o.id === s.id))];
  }, [opps.items, state.saved, f.saved]);

  const scored = useMemo(() => pool.map((o) => ({ o, m: matchOpportunity(o, state), d: deadlineInfo(o) })), [pool, state]);
  const locations = useMemo(() => [...new Set(pool.flatMap((o) => o.locations || []))].sort(), [pool]);
  const myFields = studentFields(state.profile);

  const results = useMemo(() => {
    const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    let r = scored.filter(({ o, d }) => {
      if (!f.closed && d.closed) return false;
      if (f.type && o.type !== f.type) return false;
      if (f.level && !(o.levels || []).includes(f.level)) return false;
      if (f.field && !(o.fields || []).includes(f.field)) return false;
      if (f.location && !(o.locations || []).includes(f.location) && !(f.location === 'Africa' && o.africaWide)) return false;
      if (f.funding === 'full' && o.funding !== 'Fully funded') return false;
      if (f.funding === 'stated' && !o.funding && !o.fundingAmount) return false;
      if (f.trusted && !o.isTrusted) return false;
      if (f.deadline) {
        if (!d.known) return false;
        if (f.deadline !== 'known' && (d.days < 0 || d.days > Number(f.deadline))) return false;
      }
      if (terms.length) {
        const hay = `${o.title} ${o.provider} ${o.type} ${o.description} ${(o.eligibility || []).join(' ')} ${(o.requiredDocuments || []).join(' ')} ${(o.locations || []).join(' ')} ${(o.fields || []).join(' ')} ${o.sourceDomain}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    const dl = (x) => (x.d.known && x.d.days >= 0 ? x.d.days : 99999);
    if (f.sort === 'deadline') r.sort((a, b) => dl(a) - dl(b));
    else if (f.sort === 'az') r.sort((a, b) => a.o.title.localeCompare(b.o.title));
    else if (f.sort === 'provider') r.sort((a, b) => (a.o.provider || 'zzz').localeCompare(b.o.provider || 'zzz'));
    else r.sort((a, b) => b.m.score - a.m.score || dl(a) - dl(b));
    return r;
  }, [scored, f.q, f.type, f.level, f.field, f.location, f.funding, f.trusted, f.deadline, f.closed, f.sort]);

  const typeCounts = useMemo(() => {
    const c = {};
    for (const { o, d } of scored) if (f.closed || !d.closed) c[o.type] = (c[o.type] || 0) + 1;
    return c;
  }, [scored, f.closed]);
  const closedCount = scored.filter((x) => x.d.closed).length;
  const activeCount = ['type', 'level', 'field', 'location', 'deadline', 'funding'].filter((k) => f[k]).length + (f.trusted ? 1 : 0) + (f.saved ? 1 : 0) + (f.closed ? 1 : 0);
  const clearAll = () => { setQInput(''); setParams(new URLSearchParams(), { replace: true }); };

  const loading = (opps.status === 'loading' || opps.status === 'idle') && !f.saved;
  const failed = ['error', 'not_connected'].includes(opps.status) && !f.saved;

  const filters = (
    <div className="filters">
      <FilterGroup label="Academic level">
        <select className="select" value={f.level} onChange={(e) => setF({ level: e.target.value })} aria-label="Academic level">
          <option value="">Any level</option>{LEVELS.map((l) => <option key={l} value={l}>{l === 'Masters' ? "Master's" : l}</option>)}
        </select>
      </FilterGroup>
      <FilterGroup label="Field of study">
        <select className="select" value={f.field} onChange={(e) => setF({ field: e.target.value })} aria-label="Field of study">
          <option value="">Any field</option>
          {[...myFields, ...FIELDS.filter((x) => !myFields.includes(x))].map((x) => <option key={x} value={x}>{x}{myFields.includes(x) ? ' (yours)' : ''}</option>)}
        </select>
      </FilterGroup>
      <FilterGroup label="Location mentioned">
        <select className="select" value={f.location} onChange={(e) => setF({ location: e.target.value })} aria-label="Location">
          <option value="">Anywhere</option><option value="Africa">Africa (region-wide)</option>{locations.map((l) => <option key={l}>{l}</option>)}
        </select>
      </FilterGroup>
      <FilterGroup label="Deadline">
        <select className="select" value={f.deadline} onChange={(e) => setF({ deadline: e.target.value })} aria-label="Deadline">{DEADLINES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </FilterGroup>
      <FilterGroup label="Funding">
        <select className="select" value={f.funding} onChange={(e) => setF({ funding: e.target.value })} aria-label="Funding">
          <option value="">Any</option><option value="full">Fully funded</option><option value="stated">Funding or award stated</option>
        </select>
      </FilterGroup>
      <div className="stack" style={{ gap: 12, paddingTop: 4 }}>
        <Checkbox checked={f.trusted} onChange={(v) => setF({ trusted: v })}><span className="small">Verified sources only</span></Checkbox>
        <Checkbox checked={f.saved} onChange={(v) => setF({ saved: v })}><span className="small">Saved opportunities only</span></Checkbox>
        <Checkbox checked={f.closed} onChange={(v) => setF({ closed: v })}><span className="small">Include closed ({closedCount})</span></Checkbox>
      </div>
      <p className="tiny muted">Level, field, location and funding are read from each listing’s own text. Listings that don’t mention them are hidden while that filter is on.</p>
    </div>
  );

  return (
    <div className="page opp-page">
      <section className="opp-hero">
        <SmartImg className="opp-hero-img" src={IMG.library.src} alt="" eager />
        <div className="container opp-hero-inner">
          <span className="eyebrow light">Find Opportunities</span>
          <h1 className="serif">Scholarships, competitions and programmes — organised around you.</h1>
          <form className="big-search" role="search" onSubmit={(e) => { e.preventDefault(); setF({ q: qInput }); }}>
            <Search size={20} />
            <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search by title, organisation, country or requirement" aria-label="Search opportunities" />
            {qInput && <button type="button" className="btn icon ghost sm" aria-label="Clear search" onClick={() => { setQInput(''); setF({ q: '' }); }}><X size={18} /></button>}
            <select className="select" value={f.type} onChange={(e) => setF({ type: e.target.value })} aria-label="Opportunity type">
              <option value="">All types</option>{OPP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="btn primary" type="submit">Search</button>
          </form>
        </div>
      </section>

      <div className="container">
        {/* categories */}
        <div className="cat-rail" role="group" aria-label="Categories">
          <button className={`cat-pill ${!f.type && !f.saved ? 'on' : ''}`} onClick={() => setF({ type: '', saved: false })}><span className="cat-pill-img all" /><span>All<small>{Object.values(typeCounts).reduce((a, b) => a + b, 0)}</small></span></button>
          {OPP_TYPES.filter((t) => typeCounts[t]).map((t) => (
            <button key={t} className={`cat-pill ${f.type === t ? 'on' : ''}`} onClick={() => setF({ type: f.type === t ? '' : t })} aria-pressed={f.type === t}>
              <SmartImg className="cat-pill-img" src={CATEGORY_IMAGES[t]?.src.replace('w=1200', 'w=160')} alt="" /><span>{t}<small>{typeCounts[t]}</small></span>
            </button>
          ))}
          <button className={`cat-pill ${f.saved ? 'on' : ''}`} onClick={() => setF({ saved: !f.saved })} aria-pressed={f.saved}><span className="cat-pill-img saved"><Heart size={18} /></span><span>Saved<small>{Object.keys(state.saved).length}</small></span></button>
        </div>

        <div className="opp-layout">
          <aside className="opp-filters" aria-label="Filters">
            <div className="row between" style={{ marginBottom: 12 }}><strong>Filters</strong>{activeCount > 0 && <button className="link small" onClick={clearAll}>Clear all</button>}</div>
            {filters}
          </aside>

          <section aria-labelledby="results-h">
            <div className="results-bar">
              <div>
                <h2 id="results-h" className="results-count" aria-live="polite">
                  {loading ? 'Finding opportunities for you…' : failed ? 'Opportunities' : `${results.length} ${results.length === 1 ? 'opportunity' : 'opportunities'}${f.saved ? ' saved' : ''}`}
                </h2>
                {opps.fetchedAt && !f.saved && <span className="tiny muted">Updated {timeAgo(opps.fetchedAt)}{opps.stale ? ' · showing the last available results' : ''}</span>}
              </div>
              <div className="row wrap" style={{ gap: 8 }}>
                <button className="btn secondary sm show-md" onClick={() => setDrawer(true)}><SlidersHorizontal size={16} />Filters{activeCount ? ` (${activeCount})` : ''}</button>
                <select className="select sort" value={f.sort} onChange={(e) => setF({ sort: e.target.value })} aria-label="Sort by">{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                <div className="seg" role="group" aria-label="View">
                  <button aria-pressed={view === 'grid'} onClick={() => setView('grid')} aria-label="Grid view"><LayoutGrid size={16} /></button>
                  <button aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label="List view"><List size={16} /></button>
                </div>
                {!f.saved && opps.status === 'ok' && <button className="btn ghost sm" onClick={async () => { const r = await opps.reload(true); toast(r.status === 'ok' ? (r.stale ? 'Couldn’t refresh right now — showing the last results.' : 'Opportunities are up to date.') : 'We couldn’t refresh right now.', { tone: r.status === 'ok' && !r.stale ? 'ok' : 'info' }); }} disabled={opps.status === 'refreshing'} aria-label="Check for new opportunities">{opps.status === 'refreshing' ? <Spinner size={16} /> : <RefreshCw size={16} />}<span className="hide-xs">Refresh</span></button>}
              </div>
            </div>

            {activeCount > 0 && (
              <div className="active-filters">
                {f.type && <Tag onClear={() => setF({ type: '' })}>{f.type}</Tag>}
                {f.level && <Tag onClear={() => setF({ level: '' })}>{f.level === 'Masters' ? "Master's" : f.level}</Tag>}
                {f.field && <Tag onClear={() => setF({ field: '' })}>{f.field}</Tag>}
                {f.location && <Tag onClear={() => setF({ location: '' })}>{f.location}</Tag>}
                {f.deadline && <Tag onClear={() => setF({ deadline: '' })}>{DEADLINES.find((x) => x[0] === f.deadline)?.[1]}</Tag>}
                {f.funding && <Tag onClear={() => setF({ funding: '' })}>{f.funding === 'full' ? 'Fully funded' : 'Funding stated'}</Tag>}
                {f.trusted && <Tag onClear={() => setF({ trusted: false })}>Verified only</Tag>}
                {f.saved && <Tag onClear={() => setF({ saved: false })}>Saved</Tag>}
                {f.closed && <Tag onClear={() => setF({ closed: false })}>Including closed</Tag>}
              </div>
            )}

            {opps.status === 'refreshing' && <div className="notice" style={{ marginBottom: 16 }}><Spinner size={16} /><span>Checking for new opportunities. This can take a minute or two — you can keep browsing.</span></div>}

            {loading ? (
              <div className="opp-grid">{Array.from({ length: 6 }).map((_, i) => <OppCardSkeleton key={i} />)}</div>
            ) : failed ? (
              <Empty icon={CloudOff} title="We couldn’t load opportunities right now." body={opps.status === 'not_connected' ? 'Opportunity listings aren’t available at the moment. Your saved opportunities are still here.' : 'Try again in a moment. Your saved opportunities are still here.'}>
                <button className="btn primary" onClick={() => opps.reload()}><RefreshCw size={16} />Try Again</button>
                {Object.keys(state.saved).length > 0 && <button className="btn secondary" onClick={() => setF({ saved: true })}>View saved</button>}
              </Empty>
            ) : results.length === 0 ? (
              f.saved && !activeCount_excluding(f) && !f.q ? (
                <Empty icon={Heart} title="No saved opportunities yet" body="Save opportunities you’re interested in. Horizon tracks their deadlines and helps you prepare.">
                  <button className="btn primary" onClick={() => setF({ saved: false })}>Browse opportunities</button>
                </Empty>
              ) : (
                <Empty icon={SearchX} title="We couldn’t find opportunities matching your current criteria." body={`Try removing a filter, searching a broader term${!f.closed && closedCount ? ', or including closed opportunities to see past listings' : ''}.`}>
                  {activeCount > 0 && <button className="btn primary" onClick={clearAll}>Clear all filters</button>}
                  {f.q && <button className="btn secondary" onClick={() => { setQInput(''); setF({ q: '' }); }}>Clear search</button>}
                  {!f.closed && closedCount > 0 && <button className="btn secondary" onClick={() => setF({ closed: true })}>Include closed</button>}
                </Empty>
              )
            ) : (
              <div className={view === 'list' ? 'opp-list' : 'opp-grid'}>
                {results.map(({ o }) => <OppCard key={o.id} opp={o} list={view === 'list'} />)}
              </div>
            )}
            {!loading && !failed && results.length > 0 && (
              <p className="tiny muted center" style={{ marginTop: 28 }}><ShieldCheck size={13} /> Listings come from their original sources. Always confirm details on the official page before applying.</p>
            )}
          </section>
        </div>
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Filters"
        footer={<><button className="btn secondary" onClick={clearAll}>Clear all</button><button className="btn primary" onClick={() => setDrawer(false)}>Show {results.length} results</button></>}>
        {filters}
      </Drawer>
    </div>
  );
}

function activeCount_excluding(f) { return ['type', 'level', 'field', 'location', 'deadline', 'funding'].some((k) => f[k]) || f.trusted || f.closed; }

function FilterGroup({ label, children }) {
  return <div className="field"><span className="label small">{label}</span>{children}</div>;
}
function Tag({ children, onClear }) {
  return <button className="chip on" onClick={onClear} aria-label={`Remove filter ${children}`}>{children}<X size={14} className="x" /></button>;
}
