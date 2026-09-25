import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Sparkles, RefreshCw, Minimize2, Maximize2, Wand2, Save, Download, Copy, FolderInput, History, AlertTriangle, ChevronRight, Check, FileText, Trash2, Info, MessageCircleQuestion } from 'lucide-react';
import { useStore, uid } from '../lib/store.jsx';
import { findOpportunity, useOpportunities } from '../lib/opps.js';
import { composeDraft, shorten, improveClarity, expand, wordCount, missingQuestions, placeholders, studentFacts, oppFacts, detectIntent, INTENT_LABEL } from '../lib/draft.js';
import { downloadText, downloadWord, putFile } from '../lib/files.js';
import { fmtDate, timeAgo } from '../lib/insights.js';
import { Field, Drawer, useToast, useConfirm, Spinner, Empty } from '../components/ui.jsx';

let statusCache = null;
function useWritingMode() {
  const [enhanced, setEnhanced] = useState(statusCache?.enhancedWriting || false);
  useEffect(() => {
    if (statusCache) return;
    fetch('/api/status').then((r) => r.json()).then((s) => { statusCache = s; setEnhanced(!!s.enhancedWriting); }).catch(() => {});
  }, []);
  return enhanced;
}

const TONES = [['confident', 'Confident'], ['warm', 'Warm and personal'], ['formal', 'Formal']];

export default function EssayBuilder() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state, saveEssay, removeEssay, addDocument } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  useOpportunities();
  const enhanced = useWritingMode();

  const existing = state.essays.find((e) => e.id === id);
  const appFromParam = state.applications.find((a) => a.id === params.get('app'));
  const [essay, setEssay] = useState(() => existing || {
    id: uid('es'), appId: appFromParam?.id || null, oppId: appFromParam?.oppId || params.get('opp') || null,
    title: appFromParam ? `Personal statement — ${appFromParam.opp.title}` : 'Personal statement',
    question: '', wordLimit: '', tone: 'confident', instructions: '', content: '', answers: {}, variant: 0, versions: [],
  });
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [manual, setManual] = useState(false);
  const [savedAt, setSavedAt] = useState(existing?.updatedAt || null);
  const editorRef = useRef(null);
  const isNew = !existing && id === 'new';
  useEffect(() => { const t = editorRef.current; if (t) { t.style.height = 'auto'; t.style.height = Math.max(460, t.scrollHeight) + 'px'; } }, [essay.content, manual, busy]);

  useEffect(() => { if (existing && existing.id !== essay.id) setEssay(existing); }, [id]); // eslint-disable-line

  const app = state.applications.find((a) => a.id === essay.appId);
  const opp = app?.opp || (essay.oppId ? findOpportunity(essay.oppId, state.saved) : null);
  const qs = useMemo(() => missingQuestions(state, { question: essay.question, opp }, essay.answers || {}), [state, essay.question, opp, essay.answers]);
  const words = wordCount(essay.content);
  const limit = Number(essay.wordLimit) || null;
  const holes = placeholders(essay.content);

  const set = (patch) => { setEssay((e) => ({ ...e, ...patch })); setDirty(true); };

  // Autosave once the essay exists in the store, so nothing is lost when navigating away.
  useEffect(() => {
    if (!dirty || (!existing && !essay.content)) return;
    const t = setTimeout(() => { persist(essay, false); }, 1200);
    return () => clearTimeout(t);
  }, [essay, dirty]); // eslint-disable-line
  useEffect(() => {
    if (!dirty) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  function persist(e, announce = true) {
    saveEssay(e);
    setDirty(false); setSavedAt(Date.now());
    if (isNew || id === 'new') navigate(`/essays/${e.id}`, { replace: true });
    if (announce) toast('Draft saved.');
  }

  const withVersion = (label) => (essay.content.trim() ? [{ content: essay.content, at: Date.now(), label }, ...(essay.versions || [])].slice(0, 20) : essay.versions || []);

  const validateSetup = () => {
    const e = {};
    if (!essay.question.trim()) e.question = 'Paste the application question or prompt.';
    if (essay.wordLimit && (!/^\d+$/.test(String(essay.wordLimit)) || Number(essay.wordLimit) < 50 || Number(essay.wordLimit) > 5000)) e.wordLimit = 'Enter a number between 50 and 5000.';
    const requiredQ = qs.filter((q) => !q.optional);
    if (requiredQ.length && !(essay.answers || {})[requiredQ[0].key]) e.answers = 'Answer the questions below first, so Horizon doesn’t have to guess.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  async function runEnhanced(action, current) {
    const r = await fetch('/api/writing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, question: essay.question, wordLimit: limit, tone: essay.tone, instructions: essay.instructions, facts: studentFacts(state) + '\n\nStudent answers:\n' + Object.entries(essay.answers || {}).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `- ${k}: ${v}`).join('\n'), opportunity: oppFacts(opp), current }) }).then((x) => x.json());
    if (r.status !== 'ok') throw new Error('unavailable');
    return r.text;
  }

  const act = async (action) => {
    if (action === 'generate' && !validateSetup()) { setTimeout(() => document.querySelector('.essay-setup [aria-invalid="true"], .essay-setup .error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30); return; }
    if (action !== 'generate' && !essay.content.trim()) { toast('Generate or write a draft first.', { tone: 'info' }); return; }
    if (action === 'rewrite' && !(await confirm({ title: 'Rewrite this draft?', body: 'Horizon will write a fresh version. Your current text is kept in version history, so you can restore it.', confirmLabel: 'Rewrite' }))) return;
    if (action === 'generate' && essay.content.trim() && !(await confirm({ title: 'Replace the current draft?', body: 'Your current text will be kept in version history.', confirmLabel: 'Generate new draft' }))) return;
    setBusy(action);
    const labels = { generate: 'Generated draft', rewrite: 'Before rewrite', shorten: 'Before shortening', expand: 'Before expanding', clarity: 'Before clarity edits' };
    const versions = withVersion(labels[action]);
    await new Promise((r) => setTimeout(r, 500));
    let text = essay.content; let note = '';
    try {
      if (enhanced) text = await runEnhanced(action, essay.content);
      else throw new Error('standard');
    } catch (err) {
      if (enhanced && err.message === 'unavailable') note = 'Enhanced writing wasn’t available, so Horizon used standard drafting.';
      const cfg = { question: essay.question, wordLimit: limit, tone: essay.tone, opp, instructions: essay.instructions };
      if (action === 'generate') text = composeDraft(state, cfg, essay.answers, essay.variant || 0).text;
      if (action === 'rewrite') text = composeDraft(state, cfg, essay.answers, (essay.variant || 0) + 1).text;
      if (action === 'shorten') { text = shorten(essay.content, limit ? Math.min(limit, Math.round(words * 0.8)) : Math.round(words * 0.8)); }
      if (action === 'expand') { const r = expand(state, essay.content, { wordLimit: limit }); text = r.text; if (!r.usedProfile) note = 'Horizon has no unused details on your profile, so it added prompts for you to fill in.'; }
      if (action === 'clarity') { const r = improveClarity(essay.content); text = r.text; note = r.changes ? `Made ${r.changes} clarity edit${r.changes > 1 ? 's' : ''}.` : 'No obvious clarity issues found.'; }
    }
    const next = { ...essay, content: text, versions: action === 'generate' && !essay.content.trim() ? versions : versions, variant: action === 'rewrite' ? (essay.variant || 0) + 1 : essay.variant, status: 'draft' };
    setEssay(next);
    persist(next, false);
    setBusy('');
    toast(note || { generate: 'Draft ready. Review and edit it — it’s yours.', rewrite: 'Rewritten. The previous version is in history.', shorten: `Shortened to ${wordCount(text)} words.`, expand: `Expanded to ${wordCount(text)} words.`, clarity: 'Clarity improved.' }[action], { tone: note && !note.startsWith('Made') ? 'info' : 'ok' });
    setTimeout(() => editorRef.current?.focus(), 50);
  };

  const exportAs = async (kind) => {
    setExportOpen(false);
    if (!essay.content.trim()) return toast('There’s nothing to export yet.', { tone: 'info' });
    if (holes.length && !(await confirm({ title: 'Your draft still has prompts to fill in', body: `There ${holes.length === 1 ? 'is 1 [Add: …] prompt' : `are ${holes.length} [Add: …] prompts`} in your text. Export anyway?`, confirmLabel: 'Export anyway' }))) return;
    const base = essay.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'Horizon_draft';
    if (kind === 'txt') { downloadText(essay.content, `${base}.txt`); toast('Downloaded as a text file.'); }
    if (kind === 'doc') { downloadWord(`<h1>${esc(essay.title)}</h1>${essay.question ? `<p><em>${esc(essay.question)}</em></p>` : ''}${essay.content.split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('')}`, base); toast('Downloaded as a Word document.'); }
    if (kind === 'copy') { try { await navigator.clipboard.writeText(essay.content); toast('Copied to clipboard.'); } catch { toast('Couldn’t copy automatically. Select the text and copy it manually.', { tone: 'bad' }); } }
    if (kind === 'vault') {
      const docId = uid('d');
      const blob = new Blob([essay.content], { type: 'text/plain' });
      try {
        await putFile(docId, blob);
        const sub = /purpose/i.test(essay.title) ? 'Statement of purpose' : /essay/i.test(essay.title) ? 'Essay' : 'Personal statement';
        addDocument({ id: docId, name: essay.title, originalName: `${base}.txt`, size: blob.size, mime: 'text/plain', ext: 'txt', category: 'applications', sub, status: 'Draft', uploadedAt: Date.now(), updatedAt: Date.now() });
        toast('Saved to My Documents under Applications.', { action: { label: 'View', onClick: () => navigate(`/documents?open=${docId}`) } });
      } catch { toast('This document couldn’t be saved. Try again.', { tone: 'bad' }); }
    }
  };

  return (
    <div className="page">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          {app ? <><Link to="/applications">Applications</Link><ChevronRight size={14} /><Link to={`/applications/${app.id}`} className="truncate" style={{ maxWidth: 220 }}>{app.opp.title}</Link></> : <Link to="/essays">Essays & statements</Link>}
          <ChevronRight size={14} /><span aria-current="page">Essay builder</span>
        </nav>

        <div className="page-head" style={{ marginTop: 12 }}>
          <div className="grow" style={{ minWidth: 0 }}>
            <span className="eyebrow">Essay & personal statement builder</span>
            <input className="title-input serif" value={essay.title} onChange={(e) => set({ title: e.target.value })} aria-label="Draft title" maxLength={140} />
          </div>
          <div className="row wrap">
            <span className="tiny muted" aria-live="polite">{busy ? '' : dirty ? 'Unsaved changes' : savedAt ? `Saved ${timeAgo(savedAt)}` : ''}</span>
            {existing && <button className="btn ghost sm" onClick={async () => { if (await confirm({ title: 'Delete this draft?', body: 'This can’t be undone.', confirmLabel: 'Delete', danger: true })) { removeEssay(essay.id); toast('Draft deleted.', { tone: 'info' }); navigate(app ? `/applications/${app.id}` : '/essays'); } }}><Trash2 size={15} />Delete</button>}
          </div>
        </div>

        <div className="essay-layout">
          <aside className="essay-setup panel">
            <h2 className="side-title">Set up</h2>
            <Field label="Opportunity" id="es-opp" optional>
              <select id="es-opp" className="select" value={essay.appId ? `app:${essay.appId}` : essay.oppId ? `opp:${essay.oppId}` : ''} onChange={(e) => { const [k, v] = e.target.value.split(':'); if (k === 'app') { const a = state.applications.find((x) => x.id === v); set({ appId: v, oppId: a.oppId }); } else set({ appId: null, oppId: v || null }); }}>
                <option value="">General (no specific opportunity)</option>
                {state.applications.length > 0 && <optgroup label="Your applications">{state.applications.map((a) => <option key={a.id} value={`app:${a.id}`}>{a.opp.title}</option>)}</optgroup>}
                {Object.values(state.saved).filter(({ opp: o }) => !state.applications.some((a) => a.oppId === o.id)).length > 0 && <optgroup label="Saved opportunities">{Object.values(state.saved).filter(({ opp: o }) => !state.applications.some((a) => a.oppId === o.id)).map(({ opp: o }) => <option key={o.id} value={`opp:${o.id}`}>{o.title}</option>)}</optgroup>}
              </select>
            </Field>
            <Field label="Application question" id="es-q" error={errors.question} hint={essay.question ? `Horizon reads this as: ${INTENT_LABEL[detectIntent(essay.question)]}` : 'Paste the exact prompt from the application.'}>
              <textarea id="es-q" className="textarea" style={{ minHeight: 96 }} value={essay.question} onChange={(e) => { set({ question: e.target.value }); setErrors((x) => ({ ...x, question: undefined })); }} aria-invalid={!!errors.question} placeholder="e.g. Describe your academic and career goals and how this scholarship will help you achieve them." maxLength={2000} />
            </Field>
            <div className="grid-2" style={{ gap: 12 }}>
              <Field label="Word limit" id="es-wl" error={errors.wordLimit} optional>
                <input id="es-wl" className="input" inputMode="numeric" value={essay.wordLimit} onChange={(e) => set({ wordLimit: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 500" aria-invalid={!!errors.wordLimit} />
              </Field>
              <Field label="Tone" id="es-tone">
                <select id="es-tone" className="select" value={essay.tone} onChange={(e) => set({ tone: e.target.value })}>{TONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </Field>
            </div>
            <Field label="Additional instructions" id="es-ins" optional hint="e.g. “Mention my interest in healthcare AI.”">
              <textarea id="es-ins" className="textarea" style={{ minHeight: 70 }} value={essay.instructions} onChange={(e) => set({ instructions: e.target.value })} maxLength={1500} />
            </Field>

            {qs.length > 0 && (
              <div className="ask-box">
                <div className="row" style={{ gap: 8 }}><MessageCircleQuestion size={18} /><strong className="small">Horizon needs a few details from you</strong></div>
                <p className="tiny muted">Your profile doesn’t cover these yet. Horizon will use your answers word for word and won’t make anything up.</p>
                {errors.answers && <div className="field"><div className="error" role="alert">{errors.answers}</div></div>}
                {qs.map((q) => (
                  <Field key={q.key} label={q.label} id={`qa-${q.key}`} hint={q.hint} optional={q.optional}>
                    <textarea id={`qa-${q.key}`} className="textarea" style={{ minHeight: 72 }} value={(essay.answers || {})[`_${q.key}`] ?? ''} onChange={(e) => set({ answers: { ...(essay.answers || {}), [`_${q.key}`]: e.target.value } })} maxLength={1200} />
                    {((essay.answers || {})[`_${q.key}`] || '').trim() && <button className="btn secondary sm" style={{ justifySelf: 'start' }} onClick={() => { set({ answers: { ...(essay.answers || {}), [q.key]: essay.answers[`_${q.key}`].trim() } }); setErrors((x) => ({ ...x, answers: undefined })); toast('Answer saved for this draft.'); }}><Check size={14} />Use this answer</button>}
                  </Field>
                ))}
              </div>
            )}
            {Object.keys(essay.answers || {}).filter((k) => !k.startsWith('_')).length > 0 && (
              <details className="details"><summary>Your answers ({Object.keys(essay.answers).filter((k) => !k.startsWith('_')).length})</summary>
                <ul className="plain small">{Object.entries(essay.answers).filter(([k]) => !k.startsWith('_')).map(([k, v]) => <li key={k} className="row between" style={{ alignItems: 'flex-start' }}><span>{v}</span><button className="link tiny" onClick={() => { const a = { ...essay.answers }; delete a[k]; a[`_${k}`] = v; set({ answers: a }); }}>Edit</button></li>)}</ul>
              </details>
            )}
            <button className="btn primary lg block" onClick={() => act('generate')} disabled={!!busy}>{busy === 'generate' ? <><Spinner />Preparing your draft…</> : <><Sparkles size={18} />Generate Draft</>}</button>
            <p className="tiny muted center">{enhanced ? 'Enhanced writing is on. It still only uses your own information.' : 'Built only from your profile, experiences and answers.'}</p>
          </aside>

          <section className="essay-editor">
            <div className="draft-banner"><Info size={16} /><span><strong>Draft</strong> — review every sentence before using it. Text in [Add: …] marks where Horizon needs your input.</span></div>
            <div className="toolbar" role="toolbar" aria-label="Draft tools">
              <button className="btn secondary sm" onClick={() => act('rewrite')} disabled={!!busy}>{busy === 'rewrite' ? <Spinner size={15} /> : <RefreshCw size={15} />}Rewrite</button>
              <button className="btn secondary sm" onClick={() => act('shorten')} disabled={!!busy}>{busy === 'shorten' ? <Spinner size={15} /> : <Minimize2 size={15} />}Shorten</button>
              <button className="btn secondary sm" onClick={() => act('expand')} disabled={!!busy}>{busy === 'expand' ? <Spinner size={15} /> : <Maximize2 size={15} />}Expand</button>
              <button className="btn secondary sm" onClick={() => act('clarity')} disabled={!!busy}>{busy === 'clarity' ? <Spinner size={15} /> : <Wand2 size={15} />}Improve Clarity</button>
              <span className="grow" />
              <button className="btn ghost sm" onClick={() => setHistoryOpen(true)} disabled={!essay.versions?.length}><History size={15} />History{essay.versions?.length ? ` (${essay.versions.length})` : ''}</button>
            </div>
            <div className={`editor-wrap ${busy ? 'busy' : ''}`}>
              {busy && <div className="editor-busy"><Spinner size={22} /><span>{busy === 'generate' ? 'Preparing your draft…' : 'Working on your draft…'}</span></div>}
              {!essay.content && !busy && !manual ? (
                <div className="editor-empty">
                  <FileText size={28} className="muted" />
                  <strong>Your draft will appear here</strong>
                  <p className="small muted">Add the question on the left and choose Generate Draft — or just start writing.</p>
                  <button className="btn secondary sm" onClick={() => { setManual(true); setTimeout(() => editorRef.current?.focus(), 30); }}>Start writing myself</button>
                </div>
              ) : null}
              <textarea ref={editorRef} className="editor" value={essay.content} onChange={(e) => set({ content: e.target.value })} aria-label="Draft text — you can edit freely" style={{ display: !essay.content && !busy && !manual ? 'none' : undefined }} spellCheck />
            </div>
            <div className="editor-foot">
              <span className={`small ${limit && words > limit ? 'text-bad' : 'muted'}`}>{words} words{limit ? ` / ${limit}` : ''}{limit && words > limit ? ` — ${words - limit} over the limit` : ''}</span>
              {holes.length > 0 && <span className="small text-warn"><AlertTriangle size={14} /> {holes.length} [Add: …] prompt{holes.length > 1 ? 's' : ''} to fill in</span>}
              <span className="grow" />
              <div className="menu-wrap">
                <button className="btn secondary" onClick={() => setExportOpen((v) => !v)} aria-haspopup="menu" aria-expanded={exportOpen}><Download size={16} />Export</button>
                {exportOpen && (
                  <div className="menu up" role="menu" onKeyDown={(e) => e.key === 'Escape' && setExportOpen(false)}>
                    <button role="menuitem" className="menu-item" onClick={() => exportAs('doc')}><FileText size={16} />Download as Word (.doc)</button>
                    <button role="menuitem" className="menu-item" onClick={() => exportAs('txt')}><Download size={16} />Download as text (.txt)</button>
                    <button role="menuitem" className="menu-item" onClick={() => exportAs('copy')}><Copy size={16} />Copy to clipboard</button>
                    <button role="menuitem" className="menu-item" onClick={() => exportAs('vault')}><FolderInput size={16} />Save to My Documents</button>
                  </div>
                )}
              </div>
              <button className="btn primary" onClick={() => { if (!essay.content.trim() && !essay.question.trim()) return toast('Add a question or some text before saving.', { tone: 'info' }); persist({ ...essay, versions: essay.versions }); }} disabled={!!busy}><Save size={16} />Save</button>
            </div>
          </section>
        </div>
      </div>

      <Drawer open={historyOpen} onClose={() => setHistoryOpen(false)} title="Version history">
        {essay.versions?.length ? (
          <ul className="versions">
            {essay.versions.map((v, i) => (
              <li key={i} className="version">
                <div className="row between"><strong className="small">{v.label}</strong><span className="tiny muted">{fmtDate(v.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
                <p className="tiny muted clamp-3">{v.content}</p>
                <button className="btn secondary sm" onClick={() => { const versions = [{ content: essay.content, at: Date.now(), label: 'Before restoring' }, ...essay.versions.filter((_, j) => j !== i)].slice(0, 20); const next = { ...essay, content: v.content, versions }; setEssay(next); persist(next, false); setHistoryOpen(false); toast('Version restored.'); }}>Restore this version</button>
              </li>
            ))}
          </ul>
        ) : <Empty icon={History} title="No earlier versions" body="Each time you rewrite, shorten, expand or improve clarity, Horizon keeps the previous version here." />}
      </Drawer>
    </div>
  );
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
