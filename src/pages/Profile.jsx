import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Save, Download, Upload, LogOut, Bell, Check, X, ArrowRight, ShieldCheck, Map, UserRound, Cloud, Mail, Send } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { useAuth } from '../lib/auth.jsx';
import { ACADEMIC_STAGES, PROGRAMME_LENGTHS, HOME_COUNTRIES, EXPERIENCE_TYPES, expLabel, DECLARABLE_DOCS, SKILL_SUGGESTIONS } from '../lib/constants.js';
import { profileCompleteness, levelLabel } from '../lib/insights.js';
import { goalSummary } from '../lib/roadmap.js';
import { downloadText } from '../lib/files.js';
import { Field, Modal, Ring, Checkbox, Switch, useToast, useConfirm } from '../components/ui.jsx';
import ExperienceForm, { validateExperience, blankExperience } from '../components/ExperienceForm.jsx';

export default function Profile() {
  const store = useStore();
  const { state, updateProfile, addExperience, updateExperience, removeExperience, setSkills, setSettings, exportData, importData, sync } = store;
  const { user, signout, deleteAccount } = useAuth();
  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [delErr, setDelErr] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState(null);
  const [emailOn, setEmailOn] = useState(true);
  const [testBusy, setTestBusy] = useState(false);
  useEffect(() => {
    fetch('/api/me/prefs', { credentials: 'same-origin' }).then((r) => r.json()).then((d) => { setEmailPrefs(d.prefs); setEmailOn(d.email?.enabled !== false); }).catch(() => setEmailPrefs(false));
  }, []);
  const setEmailPref = async (k, v) => {
    const prev = emailPrefs;
    setEmailPrefs({ ...emailPrefs, [k]: v });
    try {
      const r = await fetch('/api/me/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ [k]: v }) });
      if (!r.ok) throw new Error();
      toast(v ? 'Emails turned on.' : 'Emails turned off.');
    } catch { setEmailPrefs(prev); toast('We couldn’t save that right now. Try again in a moment.', { tone: 'bad' }); }
  };
  const sendTestEmail = async () => {
    setTestBusy(true);
    try {
      const r = await fetch('/api/me/test-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: '{}' });
      const d = await r.json();
      toast(d.ok ? `Test email sent to ${user?.email}. Check your inbox (and spam).` : 'We couldn’t send the test email. Your email provider may not allow sending to this address yet.', { tone: d.ok ? 'ok' : 'bad', duration: 6000 });
    } catch { toast('We couldn’t send the test email right now.', { tone: 'bad' }); }
    setTestBusy(false);
  };
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const loc = useLocation();
  const [params, setParams] = useSearchParams();
  const p = state.profile;
  const prof = profileCompleteness(state);
  const [form, setForm] = useState(p);
  const [errors, setErrors] = useState({});
  const [edit, setEdit] = useState(null);
  const [editErr, setEditErr] = useState({});
  const [skill, setSkill] = useState('');
  const [skillErr, setSkillErr] = useState('');
  const fileRef = useRef(null);
  const ABOUT = ['name', 'country', 'city', 'institution', 'level', 'programmeLength', 'course', 'faculty', 'cgpa', 'cgpaScale', 'cgpaNA'];
  const pick = (o) => Object.fromEntries(ABOUT.map((k) => [k, o?.[k] ?? '']));
  const dirty = JSON.stringify(pick(form)) !== JSON.stringify(pick(p));

  useEffect(() => {
    const add = params.get('add');
    if (add && EXPERIENCE_TYPES.some((t) => t.value === add)) {
      setEditErr({}); setEdit({ value: blankExperience(add) });
      const n = new URLSearchParams(params); n.delete('add'); setParams(n, { replace: true });
    }
  }, [params]); // eslint-disable-line
  useEffect(() => { if (loc.hash) setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); }, [loc.hash]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const saveAbout = () => {
    const e = {};
    if (!form.name?.trim()) e.name = 'Your name can’t be empty.';
    if (!form.institution?.trim()) e.institution = 'Add your school or university.';
    if (!form.course?.trim()) e.course = 'Add your course.';
    if (form.cgpa && !form.cgpaNA && (Number.isNaN(Number(form.cgpa)) || Number(form.cgpa) > Number(form.cgpaScale))) e.cgpa = `Enter a number up to ${form.cgpaScale}.`;
    setErrors(e);
    if (Object.keys(e).length) { toast('Check the highlighted fields.', { tone: 'bad' }); return; }
    const levelChanged = form.level !== p.level || Number(form.programmeLength) !== Number(p.programmeLength) || form.course !== p.course;
    updateProfile({ ...pick(form), name: form.name.trim(), institution: form.institution.trim(), course: form.course.trim() }, { rebuild: levelChanged });
    toast(levelChanged ? 'Profile saved. Your roadmap was updated for your new level.' : 'Profile saved.');
  };

  const saveExp = () => {
    const e = validateExperience(edit.value); setEditErr(e);
    if (Object.keys(e).length) return;
    if (edit.id) { updateExperience(edit.id, edit.value); toast('Experience updated.'); } else { addExperience(edit.value); toast(`${expLabel(edit.value.type)} added to your profile.`); }
    setEdit(null);
  };

  const addSkill = (name) => {
    const n = (name ?? skill).trim();
    if (!n) return setSkillErr('Type a skill first.');
    if (state.skills.some((s) => s.name.toLowerCase() === n.toLowerCase())) return setSkillErr('Already in your skills.');
    setSkills([...state.skills, { name: n, level: 'Learning' }]); setSkill(''); setSkillErr(''); toast(`Added ${n}.`);
  };

  const onImport = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      if (!(await confirm({ title: 'Restore from this copy?', body: 'This replaces your current Horizon information on this device with the copy. Uploaded document files aren’t included in copies and will need re-uploading.', confirmLabel: 'Restore' }))) return;
      importData(text); toast('Your information was restored.'); navigate('/home');
    } catch { toast('That file isn’t a Horizon copy. Choose the file you downloaded from Horizon.', { tone: 'bad' }); }
  };

  const grouped = EXPERIENCE_TYPES.map((t) => ({ ...t, items: state.experiences.filter((e) => e.type === t.value) })).filter((g) => g.items.length);

  return (
    <div className="page">
      <div className="container">
        <div className="profile-head">
          <div className="avatar xl">{(p.name || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div className="grow">
            <span className="eyebrow">Profile</span>
            <h1 className="serif" style={{ fontSize: 'clamp(28px,4vw,40px)' }}>{p.name}</h1>
            <p className="muted">{levelLabel(p)} · {p.course} · {p.institution}</p>
          </div>
          <Ring value={prof.pct} size={96} sub="complete" />
        </div>

        {prof.missing.length > 0 && (
          <div className="panel tight missing-box">
            <strong className="small">Complete Your Profile</strong>
            <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
              {prof.missing.map((m) => <Link key={m.key} to={m.to} className="chip"><Plus size={14} />{m.label}</Link>)}
            </div>
          </div>
        )}

        <nav className="profile-tabs" aria-label="Profile sections">
          {[['about', 'About'], ['goal', 'Goal'], ['experience', 'Experience'], ['skills', 'Skills'], ['docs', 'Documents'], ['settings', 'Settings']].map(([k, l]) => <a key={k} href={`#${k}`} onClick={(e) => { e.preventDefault(); document.getElementById(k)?.scrollIntoView({ behavior: 'smooth' }); }}>{l}</a>)}
        </nav>

        <div className="stack-lg">
          <section id="about" className="panel">
            <div className="section-head"><h2 className="section-title">About you</h2>{dirty && <span className="badge warn">Unsaved changes</span>}</div>
            <div className="grid-2">
              <Field label="Name" id="pf-name" error={errors.name}><input id="pf-name" className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={!!errors.name} maxLength={80} /></Field>
              <Field label="Country" id="pf-country"><select id="pf-country" className="select" value={form.country} onChange={(e) => set({ country: e.target.value })}>{HOME_COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="City" id="pf-city" optional><input id="pf-city" className="input" value={form.city || ''} onChange={(e) => set({ city: e.target.value })} maxLength={60} /></Field>
              <Field label="Institution" id="pf-inst" error={errors.institution}><input id="pf-inst" className="input" value={form.institution} onChange={(e) => set({ institution: e.target.value })} aria-invalid={!!errors.institution} maxLength={120} /></Field>
              <Field label="Level" id="pf-level"><select id="pf-level" className="select" value={form.level} onChange={(e) => set({ level: e.target.value })}>{ACADEMIC_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
              {/^\d+$/.test(form.level) && <Field label="Programme length" id="pf-len"><select id="pf-len" className="select" value={form.programmeLength} onChange={(e) => set({ programmeLength: Number(e.target.value) })}>{PROGRAMME_LENGTHS.map((n) => <option key={n} value={n}>{n} years</option>)}</select></Field>}
              <Field label="Course" id="pf-course" error={errors.course}><input id="pf-course" className="input" value={form.course} onChange={(e) => set({ course: e.target.value })} aria-invalid={!!errors.course} maxLength={100} /></Field>
              <Field label="Faculty or department" id="pf-fac" optional><input id="pf-fac" className="input" value={form.faculty || ''} onChange={(e) => set({ faculty: e.target.value })} maxLength={100} /></Field>
              <Field label="CGPA" id="pf-cgpa" error={errors.cgpa} optional><input id="pf-cgpa" className="input" inputMode="decimal" value={form.cgpa || ''} disabled={form.cgpaNA} onChange={(e) => set({ cgpa: e.target.value.replace(/[^\d.]/g, '') })} aria-invalid={!!errors.cgpa} /></Field>
              <Field label="Scale" id="pf-scale"><select id="pf-scale" className="select" value={form.cgpaScale} disabled={form.cgpaNA} onChange={(e) => set({ cgpaScale: e.target.value })}><option value="5.0">5.0</option><option value="4.0">4.0</option><option value="7.0">7.0</option><option value="100">Percentage</option></select></Field>
            </div>
            <div style={{ marginTop: 12 }}><Checkbox checked={form.cgpaNA} onChange={(v) => set({ cgpaNA: v })}><span className="small">I don’t have a CGPA yet, or prefer not to say</span></Checkbox></div>
            <div className="row" style={{ marginTop: 18 }}>
              <button className="btn primary" onClick={saveAbout} disabled={!dirty}><Save size={16} />Save changes</button>
              {dirty && <button className="btn ghost" onClick={() => { setForm(p); setErrors({}); }}>Discard</button>}
            </div>
          </section>

          <section id="goal" className="panel">
            <div className="section-head"><h2 className="section-title">Goal</h2><Link to="/roadmap?goal=1" className="btn secondary sm"><Pencil size={14} />Change goal</Link></div>
            <p className="serif" style={{ fontSize: 22 }}>{goalSummary(p)}</p>
            <p className="small muted" style={{ marginTop: 6 }}>{p.goal?.targetLevel ? `Target: ${p.goal.targetLevel}` : ''}{p.goal?.targetYear ? ` · from ${p.goal.targetYear}` : ''}{p.destinations?.length ? ` · ${p.destinations.join(', ')}` : p.openToAnywhere ? ' · Open to anywhere' : ''}</p>
            <Link to="/roadmap" className="link small" style={{ display: 'inline-flex', marginTop: 12, gap: 6 }}><Map size={15} />Open my roadmap</Link>
          </section>

          <section id="experience" className="panel">
            <div className="section-head"><h2 className="section-title">Experience & achievements</h2><button className="btn primary sm" onClick={() => { setEditErr({}); setEdit({ value: blankExperience('project') }); }}><Plus size={15} />Add Experience</button></div>
            <div className="row wrap" style={{ gap: 6, marginBottom: 16 }}>
              {EXPERIENCE_TYPES.map((t) => <button key={t.value} className="chip" onClick={() => { setEditErr({}); setEdit({ value: blankExperience(t.value) }); }}><Plus size={13} />{t.label}</button>)}
            </div>
            {grouped.length === 0 ? <p className="muted small">Nothing added yet. Projects, roles, courses and awards all count — Horizon uses them in your CV and drafts.</p> : grouped.map((g) => (
              <div key={g.value} className="exp-group">
                <h3 className="eyebrow">{g.label}</h3>
                {g.items.map((e) => (
                  <div key={e.id} className="exp-row">
                    <div className="grow" style={{ minWidth: 0 }}>
                      <strong>{e.title}</strong>
                      <div className="tiny muted">{[e.org, e.start && `${e.start}${e.current ? ' – present' : e.end ? ` – ${e.end}` : ''}`].filter(Boolean).join(' · ')}</div>
                      {e.description ? <p className="small clamp-2" style={{ marginTop: 4 }}>{e.description}</p> : <p className="tiny text-warn" style={{ marginTop: 4 }}>Add a description so Horizon can use this in drafts.</p>}
                    </div>
                    <button className="btn icon ghost sm" aria-label={`Edit ${e.title}`} onClick={() => { setEditErr({}); setEdit({ id: e.id, value: e }); }}><Pencil size={16} /></button>
                    <button className="btn icon ghost sm" aria-label={`Delete ${e.title}`} onClick={async () => { if (await confirm({ title: `Delete “${e.title}”?`, body: 'It will be removed from your profile, CV and future drafts.', confirmLabel: 'Delete', danger: true })) { removeExperience(e.id); toast('Deleted.', { tone: 'info' }); } }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            ))}
          </section>

          <section id="skills" className="panel">
            <h2 className="section-title" style={{ marginBottom: 14 }}>Skills</h2>
            <form className="row" style={{ alignItems: 'flex-start' }} onSubmit={(e) => { e.preventDefault(); addSkill(); }}>
              <div className="grow"><Field id="pf-skill" error={skillErr}><input id="pf-skill" className="input" value={skill} onChange={(e) => { setSkill(e.target.value); setSkillErr(''); }} placeholder="Add a skill" aria-label="Add a skill" aria-invalid={!!skillErr} maxLength={40} /></Field></div>
              <button className="btn secondary" type="submit"><Plus size={16} />Add</button>
            </form>
            <div className="stack" style={{ gap: 8, marginTop: 14 }}>
              {state.skills.map((s) => (
                <div key={s.name} className="exp-row">
                  <strong className="grow">{s.name}</strong>
                  <select className="select" style={{ width: 150, minHeight: 40 }} value={s.level} onChange={(e) => setSkills(state.skills.map((x) => (x.name === s.name ? { ...x, level: e.target.value } : x)))} aria-label={`Level for ${s.name}`}><option>Learning</option><option>Comfortable</option><option>Strong</option></select>
                  <button className="btn icon ghost sm" aria-label={`Remove ${s.name}`} onClick={() => { setSkills(state.skills.filter((x) => x.name !== s.name)); toast(`Removed ${s.name}.`, { tone: 'info', action: { label: 'Undo', onClick: () => setSkills(state.skills) } }); }}><X size={16} /></button>
                </div>
              ))}
            </div>
            <div className="row wrap" style={{ gap: 6, marginTop: 14 }}>
              <span className="tiny muted">Suggestions:</span>
              {[...SKILL_SUGGESTIONS.tech, ...SKILL_SUGGESTIONS.general].filter((x) => !state.skills.some((s) => s.name.toLowerCase() === x.toLowerCase())).slice(0, 8).map((x) => <button key={x} className="chip" onClick={() => addSkill(x)}><Plus size={13} />{x}</button>)}
            </div>
          </section>

          <section id="docs" className="panel">
            <div className="section-head"><h2 className="section-title">Documents you have</h2><Link to="/documents" className="btn secondary sm">Open vault<ArrowRight size={14} /></Link></div>
            <p className="small muted" style={{ marginBottom: 12 }}>Tick documents that exist, even if they aren’t uploaded yet. Horizon reminds you to upload them.</p>
            <div className="grid-2" style={{ gap: 10 }}>
              {DECLARABLE_DOCS.map((d) => <div key={d.key} className="doc-check"><Checkbox checked={p.docsHave?.includes(d.key)} onChange={(v) => { updateProfile({ docsHave: v ? [...(p.docsHave || []), d.key] : (p.docsHave || []).filter((x) => x !== d.key) }); }}><span className="small">{d.label}</span></Checkbox></div>)}
            </div>
          </section>

          <section id="settings" className="panel">
            <h2 className="section-title" style={{ marginBottom: 14 }}>Settings & data</h2>
            <div className="email-prefs">
              <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                <Mail size={20} className="muted" style={{ flex: 'none', marginTop: 2 }} />
                <div className="grow"><strong>Email notifications</strong><div className="small muted">Sent to {user?.email}. Every email has a one-click unsubscribe link.</div></div>
              </div>
              {!emailOn && <div className="notice warn" style={{ marginTop: 12 }}>Emails are switched off on this Horizon for now.</div>}
              {emailPrefs === false && <div className="notice bad" style={{ marginTop: 12 }}>We couldn’t load your email settings. Refresh the page to try again.</div>}
              {emailPrefs && (
                <div className="stack" style={{ gap: 0, marginTop: 10 }}>
                  {[['newOpps', 'New opportunities', 'Once a day, when new opportunities that fit your profile are added.'], ['idle', 'Unfinished applications', 'When an application you’ve started hasn’t changed for 3 days.'], ['deadlines', 'Deadline reminders', '2 days and 1 day before a deadline, for applications not yet submitted and saved opportunities.']].map(([k, l, d]) => (
                    <div key={k} className="pref-row">
                      <div className="grow"><strong className="small">{l}</strong><div className="tiny muted">{d}</div></div>
                      <Switch checked={!!emailPrefs[k]} onChange={(v) => setEmailPref(k, v)} label={l} />
                    </div>
                  ))}
                  <div className="row" style={{ marginTop: 12 }}><button className="btn secondary sm" onClick={sendTestEmail} disabled={testBusy || !emailOn}><Send size={14} />{testBusy ? 'Sending…' : 'Send me a test email'}</button></div>
                </div>
              )}
            </div>
            <div className="setting">
              <Bell size={20} /><div className="grow"><strong>Smart nudges</strong><div className="small muted">Helpful reminders on your Home page about deadlines, missing materials and roadmap tasks. At most three at a time.</div></div>
              <Switch checked={state.settings.nudges} onChange={(v) => { setSettings({ nudges: v }); toast(v ? 'Nudges on.' : 'Nudges off.'); }} label="Smart nudges" />
            </div>
            <div className="setting">
              <UserRound size={20} /><div className="grow"><strong>Account</strong><div className="small muted">Signed in as {user?.name} · {user?.email}</div></div>
            </div>
            <div className="setting">
              <Cloud size={20} /><div className="grow"><strong>Saved to your account</strong><div className="small muted">Your profile, roadmap, applications, drafts and documents are saved to your account, so you can sign in on any device. {sync === 'saving' ? 'Saving…' : sync === 'error' ? 'Your latest changes haven’t saved yet — Horizon will keep trying.' : 'All changes saved.'}</div></div>
            </div>
            <div className="setting">
              <Download size={20} /><div className="grow"><strong>Download a copy of my information</strong><div className="small muted">Profile, roadmap, applications and drafts. Document files aren’t included — download those from the vault.</div></div>
              <button className="btn secondary sm" onClick={() => { downloadText(exportData(), `horizon-copy-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); toast('Copy downloaded.'); }}>Download</button>
            </div>
            <div className="setting">
              <Upload size={20} /><div className="grow"><strong>Restore from a copy</strong><div className="small muted">Use a copy you downloaded earlier.</div></div>
              <button className="btn secondary sm" onClick={() => fileRef.current?.click()}>Choose file</button>
              <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { onImport(e.target.files[0]); e.target.value = ''; }} />
            </div>
            <div className="setting">
              <LogOut size={20} /><div className="grow"><strong>Sign out</strong><div className="small muted">Your information stays in your account. It’s removed from this browser so the next person using this device can’t see it.</div></div>
              <button className="btn secondary sm" onClick={async () => { await signout(); navigate('/', { replace: true }); }}>Sign out</button>
            </div>
            <div className="setting danger">
              <Trash2 size={20} /><div className="grow"><strong>Delete my account</strong><div className="small muted">Permanently deletes your account and everything saved in it, including uploaded documents. Download a copy first if you want to keep anything.</div></div>
              <button className="btn danger sm" onClick={() => { setDelPw(''); setDelErr(''); setDelOpen(true); }}>Delete account</button>
            </div>
          </section>
        </div>
      </div>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete your account?" size="sm"
        footer={<><button className="btn secondary" onClick={() => setDelOpen(false)}>Cancel</button><button className="btn danger" disabled={delBusy} onClick={async () => {
          if (!delPw) return setDelErr('Enter your password to confirm.');
          setDelBusy(true);
          const r = await deleteAccount(delPw).catch(() => ({ ok: false }));
          setDelBusy(false);
          if (!r.ok) return setDelErr(r.errors?.password || 'We couldn’t complete that right now. Try again in a moment.');
          setDelOpen(false); toast('Your account has been deleted.', { tone: 'info' }); navigate('/', { replace: true });
        }}>{delBusy ? 'Deleting…' : 'Delete permanently'}</button></>}>
        <div className="stack" style={{ gap: 14 }}>
          <p className="muted">This permanently removes your account, roadmap, applications, drafts and documents. It can’t be undone.</p>
          <Field label="Your password" id="del-pw" error={delErr}><input id="del-pw" className="input" type="password" autoComplete="current-password" value={delPw} onChange={(e) => { setDelPw(e.target.value); setDelErr(''); }} aria-invalid={!!delErr} data-autofocus /></Field>
        </div>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit experience' : `Add ${expLabel(edit?.value.type).toLowerCase()}`}
        footer={<><button className="btn secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn primary" onClick={saveExp}><Check size={16} />Save</button></>}>
        {edit && <ExperienceForm value={edit.value} onChange={(v) => setEdit((x) => ({ ...x, value: v }))} errors={editErr} idPrefix="pf-exp" />}
      </Modal>
    </div>
  );
}
