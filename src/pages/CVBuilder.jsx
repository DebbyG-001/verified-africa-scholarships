import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, Download, FolderInput, Save, Pencil, Plus, Wand2, Target, Info, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useStore, uid } from '../lib/store.jsx';
import { expLabel } from '../lib/constants.js';
import { levelLabel } from '../lib/insights.js';
import { goalSummary } from '../lib/roadmap.js';
import { downloadWord, putFile } from '../lib/files.js';
import { Field, Checkbox, Modal, useToast, Switch } from '../components/ui.jsx';
import ExperienceForm, { validateExperience, blankExperience } from '../components/ExperienceForm.jsx';

const GROUPS = [
  { key: 'experience', title: 'Experience', types: ['internship', 'work', 'research'] },
  { key: 'leadership', title: 'Leadership & community', types: ['leadership', 'volunteering'] },
  { key: 'projects', title: 'Projects', types: ['project', 'competition'] },
  { key: 'awards', title: 'Awards, certifications & publications', types: ['award', 'certification', 'publication'] },
];

const fmtMonth = (d) => (d ? new Date(d + '-01T12:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '');
const range = (e) => (e.start ? `${fmtMonth(e.start)} – ${e.current ? 'Present' : e.end ? fmtMonth(e.end) : ''}`.replace(/ – $/, '') : '');
const words = (s) => new Set(String(s || '').toLowerCase().match(/[a-z][a-z+#.]{2,}/g) || []);

export default function CVBuilder() {
  const { state, saveCV, updateExperience, addExperience, addDocument } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const p = state.profile;
  const forApp = state.applications.find((a) => a.id === params.get('for'));
  const initial = state.cv || { email: '', phone: '', location: [p.city, p.country].filter(Boolean).join(', '), link: '', summary: '', gradYear: '', showCgpa: !!p.cgpa && !p.cgpaNA, hidden: {}, order: null, hiddenSkills: {} };
  const [cv, setCv] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState({});
  const [edit, setEdit] = useState(null);
  const [editErr, setEditErr] = useState({});
  const [tab, setTab] = useState('edit');
  const set = (patch) => { setCv((c) => ({ ...c, ...patch })); setDirty(true); };

  useEffect(() => {
    if (!dirty) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const exps = useMemo(() => {
    const list = [...state.experiences];
    if (cv.order) list.sort((a, b) => (cv.order.indexOf(a.id) + 1 || 999) - (cv.order.indexOf(b.id) + 1 || 999));
    else list.sort((a, b) => (b.start || '').localeCompare(a.start || ''));
    return list;
  }, [state.experiences, cv.order]);
  const visible = exps.filter((e) => !cv.hidden?.[e.id]);
  const skills = state.skills.filter((s) => !cv.hiddenSkills?.[s.name]);

  const suggestSummary = () => {
    const top = state.skills.slice(0, 3).map((s) => s.name);
    const s = `${levelLabel(p)} ${p.course} student at ${p.institution}${top.length ? ` with skills in ${top.join(', ')}` : ''}. Working toward: ${goalSummary(p).replace(/^./, (c) => c.toLowerCase())}.`;
    set({ summary: s });
    toast('Summary written from your profile. Edit it to sound like you.');
  };

  const tailor = () => {
    const opp = forApp.opp;
    const target = words(`${opp.title} ${opp.description} ${(opp.eligibility || []).join(' ')} ${(opp.fields || []).join(' ')} ${p.goal?.field}`);
    const score = (e) => [...words(`${e.title} ${e.description} ${e.org}`)].filter((w) => target.has(w)).length;
    const order = [...state.experiences].sort((a, b) => score(b) - score(a) || (b.start || '').localeCompare(a.start || '')).map((e) => e.id);
    const relevantSkills = state.skills.filter((s) => target.has(s.name.toLowerCase()));
    set({ order, tailoredFor: forApp.id });
    toast(`Reordered your entries by relevance to ${opp.title}${relevantSkills.length ? `. Skills the listing mentions: ${relevantSkills.map((s) => s.name).join(', ')}` : ''}. Nothing was added.`, { duration: 6500 });
  };

  const validate = () => {
    const e = {};
    if (cv.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cv.email)) e.email = 'Enter a valid email address.';
    if (cv.phone && !/^[+\d][\d\s()-]{6,}$/.test(cv.phone)) e.phone = 'Enter a valid phone number.';
    if (cv.link && !/^https?:\/\/\S+\.\S+/.test(cv.link)) e.link = 'Start the link with http:// or https://';
    if (cv.gradYear && !/^(19|20)\d\d$/.test(cv.gradYear)) e.gradYear = 'Enter a year like 2027.';
    setErrors(e);
    return !Object.keys(e).length;
  };
  const save = () => { if (!validate()) { toast('Check the highlighted fields.', { tone: 'bad' }); return false; } saveCV(cv); setDirty(false); toast('CV saved.'); return true; };

  const html = () => cvHtml(p, cv, visible, skills);
  const exportWord = () => { if (!validate()) return; downloadWord(html(), `${(p.name || 'CV').replace(/\s+/g, '_')}_CV`); toast('Downloaded as a Word document.'); };
  const print = () => {
    if (!validate()) return;
    const w = window.open('', '_blank');
    if (!w) return toast('Your browser blocked the print window. Allow pop-ups for this site and try again.', { tone: 'bad' });
    w.document.write(`<html><head><title>${esc(p.name)} — CV</title><style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;color:#111;line-height:1.45;font-size:11pt;padding:0 24px}h1{font-size:24pt;margin:0}h2{font-family:Arial,sans-serif;font-size:10pt;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid #999;padding-bottom:4px;margin-top:20px}p{margin:0 0 6px}.meta{color:#555;font-family:Arial,sans-serif;font-size:9.5pt}@page{margin:18mm}</style></head><body>${html()}<script>window.onload=()=>{window.print();}<\/script></body></html>`);
    w.document.close();
  };
  const toVault = async () => {
    if (!validate()) return;
    const id = uid('d');
    const blob = new Blob(['﻿', `<html><head><meta charset="utf-8"></head><body>${html()}</body></html>`], { type: 'application/msword' });
    try {
      await putFile(id, blob);
      addDocument({ id, name: `${p.name} — CV${forApp && cv.tailoredFor === forApp.id ? ` (${forApp.opp.title})` : ''}`, originalName: `${(p.name || 'CV').replace(/\s+/g, '_')}_CV.doc`, size: blob.size, mime: 'application/msword', ext: 'doc', category: 'career', sub: 'CV', status: 'Ready', uploadedAt: Date.now(), updatedAt: Date.now() });
      saveCV(cv); setDirty(false);
      toast('CV saved to My Documents under Career.', { action: { label: 'View', onClick: () => navigate(`/documents?open=${id}`) } });
    } catch { toast('This document couldn’t be saved. Try again.', { tone: 'bad' }); }
  };

  const saveExp = () => {
    const e = validateExperience(edit.value); setEditErr(e);
    if (Object.keys(e).length) return;
    if (edit.id) updateExperience(edit.id, edit.value); else addExperience(edit.value);
    setEdit(null); toast('Saved to your profile and CV.');
  };

  return (
    <div className="page">
      <div className="container">
        {forApp && <nav className="crumbs" aria-label="Breadcrumb"><Link to="/applications">Applications</Link><ChevronRight size={14} /><Link to={`/applications/${forApp.id}`}>{forApp.opp.title}</Link><ChevronRight size={14} /><span>CV</span></nav>}
        <div className="page-head">
          <div><span className="eyebrow">CV builder</span><h1>Your CV</h1><p>Built from your profile and experiences. Horizon never adds anything you haven’t told it.</p></div>
          <div className="row wrap">
            <span className="tiny muted">{dirty ? 'Unsaved changes' : state.cv?.updatedAt ? 'All changes saved' : ''}</span>
            <button className="btn primary" onClick={save}><Save size={16} />Save</button>
          </div>
        </div>

        {forApp && (
          <div className="notice sun" style={{ marginBottom: 20 }}><Target size={18} /><div className="grow"><strong>Tailoring for {forApp.opp.title}</strong><div className="small">Horizon can reorder your entries so the most relevant ones come first. It won’t add or change facts.</div></div><button className="btn primary sm" onClick={tailor}><Wand2 size={15} />Tailor CV</button></div>
        )}

        <div className="seg show-md" role="tablist" aria-label="CV view" style={{ marginBottom: 16 }}>
          <button role="tab" aria-selected={tab === 'edit'} aria-pressed={tab === 'edit'} onClick={() => setTab('edit')}><Pencil size={15} />Edit</button>
          <button role="tab" aria-selected={tab === 'preview'} aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}><Eye size={15} />Preview</button>
        </div>

        <div className="cv-layout">
          <div className={`cv-edit stack-lg ${tab === 'preview' ? 'hide-md' : ''}`}>
            <section className="panel">
              <h2 className="side-title">Contact details</h2>
              <p className="tiny muted" style={{ marginBottom: 12 }}>Only shown on your CV. Your name comes from your profile.</p>
              <div className="grid-2">
                <Field label="Email" id="cv-email" error={errors.email} optional><input id="cv-email" className="input" type="email" autoComplete="email" value={cv.email} onChange={(e) => set({ email: e.target.value })} aria-invalid={!!errors.email} /></Field>
                <Field label="Phone" id="cv-phone" error={errors.phone} optional><input id="cv-phone" className="input" type="tel" autoComplete="tel" value={cv.phone} onChange={(e) => set({ phone: e.target.value })} aria-invalid={!!errors.phone} /></Field>
                <Field label="Location" id="cv-loc" optional><input id="cv-loc" className="input" value={cv.location} onChange={(e) => set({ location: e.target.value })} /></Field>
                <Field label="Portfolio or profile link" id="cv-link" error={errors.link} optional><input id="cv-link" className="input" type="url" value={cv.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://" aria-invalid={!!errors.link} /></Field>
              </div>
            </section>

            <section className="panel">
              <div className="row between"><h2 className="side-title">Summary</h2><button className="btn ghost sm" onClick={suggestSummary}><Wand2 size={15} />Write from my profile</button></div>
              <Field id="cv-sum" hint="Two or three sentences. Keep it specific to you." optional>
                <textarea id="cv-sum" className="textarea" style={{ minHeight: 90 }} value={cv.summary} onChange={(e) => set({ summary: e.target.value })} maxLength={600} aria-label="Summary" />
              </Field>
            </section>

            <section className="panel">
              <div className="row between"><h2 className="side-title">Education</h2><Link to="/profile#about" className="link small">Edit in profile</Link></div>
              <p className="small" style={{ marginTop: 6 }}><strong>{p.institution}</strong> · {p.course} · {levelLabel(p)}</p>
              <div className="grid-2" style={{ marginTop: 12 }}>
                <Field label="Expected graduation year" id="cv-grad" error={errors.gradYear} optional><input id="cv-grad" className="input" inputMode="numeric" maxLength={4} value={cv.gradYear} onChange={(e) => set({ gradYear: e.target.value.replace(/\D/g, '') })} aria-invalid={!!errors.gradYear} /></Field>
                <div className="field"><span className="label">Show CGPA</span><div className="row"><Switch checked={cv.showCgpa} onChange={(v) => set({ showCgpa: v })} label="Show CGPA on CV" /><span className="small muted">{p.cgpa && !p.cgpaNA ? `${p.cgpa} / ${p.cgpaScale}` : 'Not added to your profile'}</span></div></div>
              </div>
            </section>

            {GROUPS.map((g) => {
              const items = exps.filter((e) => g.types.includes(e.type));
              return (
                <section key={g.key} className="panel">
                  <div className="row between"><h2 className="side-title">{g.title}</h2><button className="btn ghost sm" onClick={() => { setEditErr({}); setEdit({ value: blankExperience(g.types[0]), types: g.types }); }}><Plus size={15} />Add</button></div>
                  {items.length === 0 ? <p className="small muted" style={{ marginTop: 8 }}>Nothing here yet. Add something real — even small things count.</p> : (
                    <ul className="cv-items">
                      {items.map((e) => (
                        <li key={e.id} className={cv.hidden?.[e.id] ? 'off' : ''}>
                          <Checkbox checked={!cv.hidden?.[e.id]} onChange={(v) => set({ hidden: { ...cv.hidden, [e.id]: !v } })} label={`Include ${e.title} on CV`}>
                            <span><strong className="small">{e.title}</strong><span className="tiny muted" style={{ display: 'block' }}>{expLabel(e.type)}{e.org ? ` · ${e.org}` : ''}{range(e) ? ` · ${range(e)}` : ''}</span></span>
                          </Checkbox>
                          <button className="btn icon ghost sm" aria-label={`Edit ${e.title}`} onClick={() => { setEditErr({}); setEdit({ id: e.id, value: e, types: g.types }); }}><Pencil size={15} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}

            <section className="panel">
              <div className="row between"><h2 className="side-title">Skills</h2><Link to="/profile#skills" className="link small">Manage skills</Link></div>
              {state.skills.length ? (
                <div className="row wrap" style={{ marginTop: 10 }}>
                  {state.skills.map((s) => <button key={s.name} className="chip" aria-pressed={!cv.hiddenSkills?.[s.name]} onClick={() => set({ hiddenSkills: { ...cv.hiddenSkills, [s.name]: !cv.hiddenSkills?.[s.name] } })}>{cv.hiddenSkills?.[s.name] ? <EyeOff size={14} /> : <Eye size={14} />}{s.name}</button>)}
                </div>
              ) : <p className="small muted">No skills yet. <Link to="/profile#skills" className="link">Add skills</Link></p>}
            </section>
          </div>

          <div className={`cv-preview-col ${tab === 'edit' ? 'hide-md' : ''}`}>
            <div className="cv-actions">
              <button className="btn secondary sm" onClick={print}><Printer size={15} />Print / Save as PDF</button>
              <button className="btn secondary sm" onClick={exportWord}><Download size={15} />Word</button>
              <button className="btn secondary sm" onClick={toVault}><FolderInput size={15} />Save to Documents</button>
            </div>
            <div className="cv-paper" aria-label="CV preview" dangerouslySetInnerHTML={{ __html: html() }} />
            <p className="tiny muted" style={{ marginTop: 10 }}><Info size={12} /> This preview updates as you edit.</p>
          </div>
        </div>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit entry' : 'Add entry'}
        footer={<><button className="btn secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn primary" onClick={saveExp}>Save</button></>}>
        {edit && <ExperienceForm value={edit.value} onChange={(v) => setEdit((x) => ({ ...x, value: v }))} errors={editErr} types={edit.types} idPrefix="cv-exp" />}
      </Modal>
    </div>
  );
}

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function cvHtml(p, cv, visible, skills) {
  const contact = [cv.email, cv.phone, cv.location, cv.link].filter(Boolean).map(esc).join(' · ');
  const sec = (title, items) => (items.length ? `<h2>${title}</h2>${items.map((e) => `<p><strong>${esc(e.title)}</strong>${e.org ? `, ${esc(e.org)}` : ''}${range(e) ? ` <span class="meta">— ${range(e)}</span>` : ''}${e.description ? `<br>${esc(e.description)}` : ''}${e.link ? `<br><span class="meta">${esc(e.link)}</span>` : ''}</p>`).join('')}` : '');
  const edu = `<p><strong>${esc(p.institution)}</strong><br>${esc(p.course)} · ${esc(levelLabel(p))}${cv.gradYear ? ` · Expected graduation ${esc(cv.gradYear)}` : ''}${cv.showCgpa && p.cgpa && !p.cgpaNA ? `<br>CGPA: ${esc(p.cgpa)} / ${esc(p.cgpaScale)}` : ''}</p>`;
  return `<h1>${esc(p.name)}</h1>${contact ? `<p class="meta">${contact}</p>` : ''}${cv.summary ? `<h2>Summary</h2><p>${esc(cv.summary)}</p>` : ''}<h2>Education</h2>${edu}${GROUPS.map((g) => sec(g.title, visible.filter((e) => g.types.includes(e.type)))).join('')}${skills.length ? `<h2>Skills</h2><p>${skills.map((s) => esc(s.name)).join(' · ')}</p>` : ''}`;
}
