import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Plus, Pencil, Trash2, X, Sparkles } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { useAuth } from '../lib/auth.jsx';
import { ACADEMIC_STAGES, PROGRAMME_LENGTHS, GOAL_TYPES, TARGET_LEVELS, DESTINATIONS, HOME_COUNTRIES, SKILL_SUGGESTIONS, DECLARABLE_DOCS, expLabel } from '../lib/constants.js';
import { goalSummary } from '../lib/roadmap.js';
import { IMG } from '../lib/images.js';
import Logo from '../components/Logo.jsx';
import { Field, Checkbox, Modal, SmartImg, useToast, Spinner } from '../components/ui.jsx';
import ExperienceForm, { validateExperience, blankExperience } from '../components/ExperienceForm.jsx';

const STEPS = [
  { key: 'about', title: 'Tell us about yourself', sub: 'Just the basics, so Horizon can speak to you properly.', img: IMG.heroSide },
  { key: 'academic', title: 'Where are you academically?', sub: 'Your level shapes your roadmap and which opportunities fit.', img: IMG.lecture },
  { key: 'study', title: 'What are you studying?', sub: 'Horizon uses this to connect you with relevant opportunities.', img: IMG.library },
  { key: 'goal', title: 'What are you working toward?', sub: 'Pick the goal that matters most right now. You can change it later.', img: IMG.graduation },
  { key: 'where', title: 'Where do you want to go?', sub: 'Choose countries you’d like to study or work in.', img: IMG.abroad },
  { key: 'done', title: 'What have you already done?', sub: 'Projects, competitions, awards and courses. Everything counts — small things too.', img: IMG.coding },
  { key: 'skills', title: 'What skills do you have?', sub: 'Choose from suggestions or add your own.', img: IMG.teamwork },
  { key: 'experience', title: 'What experience do you have?', sub: 'Work, internships, leadership, volunteering and research.', img: IMG.office },
  { key: 'docs', title: 'What documents do you already have?', sub: 'Just tick what exists. You can upload them to your vault later.', img: IMG.vault },
  { key: 'build', title: 'Build my Horizon', sub: 'Review your details, then Horizon builds your roadmap.', img: IMG.roadmap },
];

const INITIAL = {
  profile: { name: '', country: '', city: '', level: '', institution: '', programmeLength: 4, cgpa: '', cgpaScale: '5.0', cgpaNA: false, course: '', faculty: '', interests: '', goal: { type: '', field: '', targetLevel: "Master's", targetYear: '', text: '' }, destinations: [], openToAnywhere: false, docsHave: [] },
  experiences: [],
  skills: [],
  step: 0,
};

function validate(stepKey, d) {
  const p = d.profile; const e = {};
  if (stepKey === 'about') {
    if (!p.name.trim()) e.name = 'Please tell us your name.';
    else if (p.name.trim().length < 2) e.name = 'That looks too short.';
    if (!p.country) e.country = 'Choose the country you’re from.';
  }
  if (stepKey === 'academic') {
    if (!p.level) e.level = 'Choose your current level.';
    if (!p.institution.trim()) e.institution = 'Add your school or university.';
    if (p.cgpa && !p.cgpaNA) {
      const n = Number(p.cgpa); const max = Number(p.cgpaScale) || 100;
      if (Number.isNaN(n) || n < 0) e.cgpa = 'Enter your CGPA as a number, e.g. 4.21.';
      else if (n > max) e.cgpa = `That’s higher than the ${p.cgpaScale} scale you selected.`;
    }
  }
  if (stepKey === 'study') {
    if (!p.course.trim()) e.course = 'Tell us what you study (or plan to study).';
  }
  if (stepKey === 'goal') {
    if (!p.goal.type) e.goalType = 'Choose the goal that matters most right now.';
    if (!p.goal.field.trim()) e.goalField = 'Add the field you want to focus on.';
    if (p.goal.targetYear && !/^20\d\d$/.test(p.goal.targetYear)) e.targetYear = 'Enter a year like 2028.';
    else if (p.goal.targetYear && Number(p.goal.targetYear) < new Date().getFullYear()) e.targetYear = 'Choose this year or a future year.';
  }
  if (stepKey === 'where') {
    if (p.goal.type === 'study-abroad' && !p.destinations.length && !p.openToAnywhere) e.destinations = 'Pick at least one destination, or tick “I’m open to anywhere”.';
  }
  return e;
}

export default function Onboarding() {
  const { state, saveOnboardingDraft, completeOnboarding } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [d, setD] = useState(() => state.onboardingDraft || { ...INITIAL, profile: { ...INITIAL.profile, name: user?.name || '' } });
  const [errors, setErrors] = useState({});
  const [dir, setDir] = useState(1);
  const [building, setBuilding] = useState(false);
  const headingRef = useRef(null);
  const step = STEPS[d.step];

  useEffect(() => { if (state.profile && !building) navigate('/home', { replace: true }); }, []); // eslint-disable-line
  useEffect(() => { saveOnboardingDraft(d); }, [d]); // eslint-disable-line  — never lose entered information
  useEffect(() => { headingRef.current?.focus(); window.scrollTo({ top: 0 }); }, [d.step]);

  const setP = (patch) => setD((x) => ({ ...x, profile: { ...x.profile, ...patch } }));
  const setGoal = (patch) => setD((x) => ({ ...x, profile: { ...x.profile, goal: { ...x.profile.goal, ...patch } } }));

  const go = (delta) => {
    if (delta > 0) {
      const e = validate(step.key, d);
      setErrors(e);
      if (Object.keys(e).length) {
        setTimeout(() => document.querySelector('[aria-invalid="true"], .option-error')?.focus?.(), 20);
        return;
      }
    } else setErrors({});
    setDir(delta);
    setD((x) => ({ ...x, step: Math.min(Math.max(x.step + delta, 0), STEPS.length - 1) }));
  };
  const jump = (i) => { setErrors({}); setDir(i < d.step ? -1 : 1); setD((x) => ({ ...x, step: i })); };

  const build = () => {
    for (let i = 0; i < STEPS.length - 1; i++) {
      const e = validate(STEPS[i].key, d);
      if (Object.keys(e).length) { setErrors(e); jump(i); toast('A few details need attention before we build your roadmap.', { tone: 'bad' }); return; }
    }
    setBuilding(true);
    const profile = { ...d.profile, name: d.profile.name.trim(), institution: d.profile.institution.trim(), course: d.profile.course.trim(), goal: { ...d.profile.goal, field: d.profile.goal.field.trim(), text: d.profile.goal.text.trim() } };
    setTimeout(() => {
      completeOnboarding({ profile, experiences: d.experiences, skills: d.skills });
      toast('Your Horizon is ready.');
      navigate('/home', { replace: true });
    }, 1400);
  };

  const pct = Math.round(((d.step + 1) / STEPS.length) * 100);

  if (building) {
    return (
      <div className="ob-building">
        <SmartImg className="ob-building-bg" src={IMG.roadmap.src} alt="" eager />
        <div className="ob-building-card" role="status">
          <Spinner size={28} />
          <h1 className="serif">Building your roadmap…</h1>
          <p className="muted">Working backwards from “{goalSummary(d.profile)}”.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding">
      <aside className="ob-side">
        <SmartImg key={step.key} className="ob-img" src={step.img.src} alt={step.img.alt} eager />
        <div className="ob-side-inner">
          <Link to="/" className="brand" aria-label="Horizon home"><Logo light /></Link>
          <ol className="ob-steps" aria-label="Setup steps">
            {STEPS.map((s, i) => (
              <li key={s.key}>
                <button className={`ob-step ${i === d.step ? 'current' : i < d.step ? 'done' : ''}`} onClick={() => i < d.step && jump(i)} disabled={i > d.step} aria-current={i === d.step ? 'step' : undefined}>
                  <span className="ob-step-n">{i < d.step ? <Check size={13} strokeWidth={3} /> : i + 1}</span>{s.title}
                </button>
              </li>
            ))}
          </ol>
          <p className="tiny" style={{ opacity: .75 }}>Your answers are saved as you go.</p>
        </div>
      </aside>

      <section className="ob-main">
        <div className="ob-top">
          <div className="ob-progress">
            <div className="row between small"><span className="muted">Step {d.step + 1} of {STEPS.length}</span><span className="muted">{pct}%</span></div>
            <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress"><i style={{ width: `${pct}%` }} /></div>
          </div>
          <Link to="/" className="btn ghost sm"><X size={18} /><span className="hide-xs">Save & exit</span></Link>
        </div>

        <div className={`ob-card ${dir > 0 ? 'fwd' : 'back'}`} key={d.step}>
          <h1 className="serif" tabIndex={-1} ref={headingRef}>{step.title}</h1>
          <p className="ob-sub">{step.sub}</p>
          <div className="ob-body">
            {step.key === 'about' && <StepAbout p={d.profile} setP={setP} errors={errors} />}
            {step.key === 'academic' && <StepAcademic p={d.profile} setP={setP} errors={errors} />}
            {step.key === 'study' && <StepStudy p={d.profile} setP={setP} errors={errors} />}
            {step.key === 'goal' && <StepGoal p={d.profile} setGoal={setGoal} errors={errors} />}
            {step.key === 'where' && <StepWhere p={d.profile} setP={setP} errors={errors} />}
            {step.key === 'done' && <ExperienceStep d={d} setD={setD} group="done" empty="Nothing yet? That’s completely fine — your roadmap will help you start." />}
            {step.key === 'skills' && <StepSkills d={d} setD={setD} />}
            {step.key === 'experience' && <ExperienceStep d={d} setD={setD} group="experience" empty="No experience yet is normal, especially early on. Horizon will suggest where to start." />}
            {step.key === 'docs' && <StepDocs p={d.profile} setP={setP} />}
            {step.key === 'build' && <StepReview d={d} jump={jump} />}
          </div>
        </div>

        <div className="ob-actions">
          <button className="btn ghost" onClick={() => go(-1)} disabled={d.step === 0}><ArrowLeft size={18} />Back</button>
          {step.key === 'build'
            ? <button className="btn primary lg" onClick={build}><Sparkles size={18} />Build my Horizon</button>
            : <button className="btn primary lg" onClick={() => go(1)}>{['done', 'skills', 'experience', 'docs'].includes(step.key) && !hasContent(step.key, d) ? 'Skip for now' : 'Continue'}<ArrowRight size={18} /></button>}
        </div>
      </section>
    </div>
  );
}

function hasContent(key, d) {
  if (key === 'done') return d.experiences.some((e) => ['project', 'competition', 'award', 'certification', 'publication'].includes(e.type));
  if (key === 'experience') return d.experiences.some((e) => ['work', 'internship', 'leadership', 'volunteering', 'research'].includes(e.type));
  if (key === 'skills') return d.skills.length > 0;
  if (key === 'docs') return d.profile.docsHave.length > 0;
  return true;
}

function StepAbout({ p, setP, errors }) {
  return (
    <div className="stack" style={{ gap: 18 }}>
      <Field label="Your name" id="ob-name" error={errors.name}>
        <input id="ob-name" className="input" autoComplete="name" value={p.name} onChange={(e) => setP({ name: e.target.value })} aria-invalid={!!errors.name} placeholder="e.g. Adaeze Okafor" maxLength={80} />
      </Field>
      <div className="grid-2">
        <Field label="Country you’re from" id="ob-country" error={errors.country}>
          <select id="ob-country" className="select" value={p.country} onChange={(e) => setP({ country: e.target.value })} aria-invalid={!!errors.country}>
            <option value="">Choose a country</option>
            {HOME_COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="City" id="ob-city" optional>
          <input id="ob-city" className="input" value={p.city} onChange={(e) => setP({ city: e.target.value })} placeholder="e.g. Lagos" maxLength={60} />
        </Field>
      </div>
    </div>
  );
}

function StepAcademic({ p, setP, errors }) {
  const numeric = /^\d+$/.test(p.level);
  return (
    <div className="stack" style={{ gap: 18 }}>
      <Field label="Current level" id="ob-level" error={errors.level}>
        <div className="option-grid compact" role="radiogroup" aria-label="Current level">
          {ACADEMIC_STAGES.map((s) => (
            <button key={s.value} type="button" role="radio" aria-checked={p.level === s.value} className={`option ${errors.level ? 'option-error' : ''}`} onClick={() => setP({ level: s.value })}><strong>{s.label}</strong></button>
          ))}
        </div>
      </Field>
      <Field label="School or university" id="ob-inst" error={errors.institution}>
        <input id="ob-inst" className="input" value={p.institution} onChange={(e) => setP({ institution: e.target.value })} aria-invalid={!!errors.institution} placeholder="e.g. University of Lagos" maxLength={120} />
      </Field>
      {numeric && (
        <Field label="How many years is your programme?" id="ob-len" hint="Used to place you correctly on your roadmap.">
          <div className="row wrap">
            {PROGRAMME_LENGTHS.map((n) => <button key={n} type="button" className="chip" aria-pressed={Number(p.programmeLength) === n} onClick={() => setP({ programmeLength: n })}>{n} years</button>)}
          </div>
        </Field>
      )}
      <div className="grid-2">
        <Field label="Current CGPA" id="ob-cgpa" error={errors.cgpa} optional hint="Only used in your CV and drafts if you choose to include it.">
          <input id="ob-cgpa" className="input" inputMode="decimal" value={p.cgpa} disabled={p.cgpaNA} onChange={(e) => setP({ cgpa: e.target.value.replace(/[^\d.]/g, '') })} aria-invalid={!!errors.cgpa} placeholder="e.g. 4.21" />
        </Field>
        <Field label="Grading scale" id="ob-scale">
          <select id="ob-scale" className="select" value={p.cgpaScale} disabled={p.cgpaNA} onChange={(e) => setP({ cgpaScale: e.target.value })}>
            <option value="5.0">5.0 scale</option><option value="4.0">4.0 scale</option><option value="7.0">7.0 scale</option><option value="100">Percentage</option>
          </select>
        </Field>
      </div>
      <Checkbox checked={p.cgpaNA} onChange={(v) => setP({ cgpaNA: v, cgpa: v ? '' : p.cgpa })}><span>I don’t have a CGPA yet, or prefer not to say</span></Checkbox>
    </div>
  );
}

function StepStudy({ p, setP, errors }) {
  const examples = ['Computer Science', 'Software Engineering', 'Electrical Engineering', 'Medicine', 'Economics', 'Law', 'Mass Communication', 'Mathematics'];
  return (
    <div className="stack" style={{ gap: 18 }}>
      <Field label="Course of study" id="ob-course" error={errors.course}>
        <input id="ob-course" className="input" value={p.course} onChange={(e) => setP({ course: e.target.value })} aria-invalid={!!errors.course} placeholder="e.g. Computer Science" maxLength={100} list="course-list" />
        <datalist id="course-list">{examples.map((x) => <option key={x} value={x} />)}</datalist>
      </Field>
      <div className="row wrap" aria-label="Quick picks">{examples.slice(0, 6).map((x) => <button key={x} type="button" className="chip" aria-pressed={p.course === x} onClick={() => setP({ course: x })}>{x}</button>)}</div>
      <Field label="Faculty or department" id="ob-fac" optional>
        <input id="ob-fac" className="input" value={p.faculty} onChange={(e) => setP({ faculty: e.target.value })} placeholder="e.g. Faculty of Science" maxLength={100} />
      </Field>
      <Field label="Topics you’re most interested in" id="ob-int" optional hint="Separate with commas, e.g. machine learning, robotics, fintech">
        <input id="ob-int" className="input" value={p.interests} onChange={(e) => setP({ interests: e.target.value })} maxLength={200} />
      </Field>
    </div>
  );
}

function StepGoal({ p, setGoal, errors }) {
  const g = p.goal;
  useEffect(() => { if (!g.field && p.course) setGoal({ field: p.course }); }, []); // eslint-disable-line
  return (
    <div className="stack" style={{ gap: 20 }}>
      <Field label="Main goal" id="ob-goal" error={errors.goalType}>
        <div className="option-grid" role="radiogroup" aria-label="Main goal">
          {GOAL_TYPES.map((t) => (
            <button key={t.value} type="button" role="radio" aria-checked={g.type === t.value} className={`option ${errors.goalType ? 'option-error' : ''}`} onClick={() => setGoal({ type: t.value })}>
              <strong>{t.label}</strong><span>{t.hint}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Field you want to focus on" id="ob-gfield" error={errors.goalField} hint="Can be more specific than your course, e.g. Artificial Intelligence.">
        <input id="ob-gfield" className="input" value={g.field} onChange={(e) => setGoal({ field: e.target.value })} aria-invalid={!!errors.goalField} placeholder="e.g. Artificial Intelligence" maxLength={100} />
      </Field>
      {['study-abroad', 'research', 'scholarship'].includes(g.type) && (
        <div className="grid-2">
          <Field label="Target level of study" id="ob-tl">
            <select id="ob-tl" className="select" value={g.targetLevel} onChange={(e) => setGoal({ targetLevel: e.target.value })}>{TARGET_LEVELS.map((x) => <option key={x}>{x}</option>)}</select>
          </Field>
          <Field label="Target start year" id="ob-ty" error={errors.targetYear} optional>
            <input id="ob-ty" className="input" inputMode="numeric" maxLength={4} value={g.targetYear} onChange={(e) => setGoal({ targetYear: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 2028" aria-invalid={!!errors.targetYear} />
          </Field>
        </div>
      )}
      <Field label="Describe your goal in your own words" id="ob-gtext" optional hint="Horizon uses this in drafts exactly as you write it.">
        <textarea id="ob-gtext" className="textarea" style={{ minHeight: 90 }} value={g.text} onChange={(e) => setGoal({ text: e.target.value })} placeholder={g.type ? `e.g. ${goalSummary(p)} and work on AI tools for African languages.` : 'e.g. Study Artificial Intelligence abroad and build AI tools for healthcare.'} maxLength={400} />
      </Field>
    </div>
  );
}

function StepWhere({ p, setP, errors }) {
  const toggle = (c) => setP({ destinations: p.destinations.includes(c) ? p.destinations.filter((x) => x !== c) : [...p.destinations, c] });
  return (
    <div className="stack" style={{ gap: 18 }}>
      {p.goal.type !== 'study-abroad' && <div className="notice"><span>This step is optional for your goal. Pick places if you have any in mind.</span></div>}
      <div className="row wrap" role="group" aria-label="Destinations">
        {DESTINATIONS.map((c) => <button key={c} type="button" className="chip" aria-pressed={p.destinations.includes(c)} onClick={() => toggle(c)}>{p.destinations.includes(c) && <Check size={14} />}{c}</button>)}
      </div>
      <Checkbox checked={p.openToAnywhere} onChange={(v) => setP({ openToAnywhere: v })}><span>I’m open to anywhere</span></Checkbox>
      {errors.destinations && <div className="field"><div className="error" role="alert">{errors.destinations}</div></div>}
    </div>
  );
}

function ExperienceStep({ d, setD, group, empty }) {
  const types = group === 'done' ? ['project', 'competition', 'award', 'certification', 'publication'] : ['work', 'internship', 'leadership', 'volunteering', 'research'];
  const items = d.experiences.filter((e) => types.includes(e.type));
  const [editing, setEditing] = useState(null); // {value, id?}
  const [errs, setErrs] = useState({});
  const save = () => {
    const e = validateExperience(editing.value);
    setErrs(e);
    if (Object.keys(e).length) return;
    setD((x) => ({ ...x, experiences: editing.id ? x.experiences.map((y) => (y.id === editing.id ? { ...editing.value, id: editing.id } : y)) : [...x.experiences, { ...editing.value, id: 'e' + Math.random().toString(36).slice(2, 9) }] }));
    setEditing(null);
  };
  return (
    <div className="stack" style={{ gap: 14 }}>
      {items.length === 0 && <div className="notice">{empty}</div>}
      {items.map((e) => (
        <div key={e.id} className="exp-row">
          <div className="grow"><strong>{e.title}</strong><div className="tiny muted">{expLabel(e.type)}{e.org ? ` · ${e.org}` : ''}</div></div>
          <button className="btn icon ghost sm" aria-label={`Edit ${e.title}`} onClick={() => { setErrs({}); setEditing({ id: e.id, value: e }); }}><Pencil size={16} /></button>
          <button className="btn icon ghost sm" aria-label={`Remove ${e.title}`} onClick={() => setD((x) => ({ ...x, experiences: x.experiences.filter((y) => y.id !== e.id) }))}><Trash2 size={16} /></button>
        </div>
      ))}
      <div className="row wrap">
        {types.map((t) => <button key={t} type="button" className="chip" onClick={() => { setErrs({}); setEditing({ value: blankExperience(t) }); }}><Plus size={15} />{expLabel(t)}</button>)}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit entry' : `Add ${expLabel(editing?.value.type).toLowerCase()}`}
        footer={<><button className="btn secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
        {editing && <ExperienceForm value={editing.value} onChange={(v) => setEditing((x) => ({ ...x, value: v }))} errors={errs} types={types} idPrefix="ob-exp" />}
      </Modal>
    </div>
  );
}

function StepSkills({ d, setD }) {
  const [custom, setCustom] = useState('');
  const [err, setErr] = useState('');
  const tech = /(comput|software|engineer|data|math|physics|stat|tech|information)/i.test(d.profile.course + d.profile.goal.field);
  const sugg = useMemo(() => [...(tech ? SKILL_SUGGESTIONS.tech : []), ...SKILL_SUGGESTIONS.general], [tech]);
  const has = (n) => d.skills.some((s) => s.name.toLowerCase() === n.toLowerCase());
  const toggle = (n) => setD((x) => ({ ...x, skills: has(n) ? x.skills.filter((s) => s.name.toLowerCase() !== n.toLowerCase()) : [...x.skills, { name: n, level: 'Learning' }] }));
  const add = (e) => {
    e.preventDefault();
    const n = custom.trim();
    if (!n) return setErr('Type a skill first.');
    if (n.length > 40) return setErr('Keep skill names short.');
    if (has(n)) return setErr('You’ve already added that skill.');
    setErr(''); toggle(n); setCustom('');
  };
  const setLevel = (n, level) => setD((x) => ({ ...x, skills: x.skills.map((s) => (s.name === n ? { ...s, level } : s)) }));
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="row wrap" role="group" aria-label="Suggested skills">
        {sugg.map((s) => <button key={s} type="button" className="chip" aria-pressed={has(s)} onClick={() => toggle(s)}>{has(s) ? <Check size={14} /> : <Plus size={14} />}{s}</button>)}
      </div>
      <form onSubmit={add} className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow"><Field id="ob-skill" error={err}><input id="ob-skill" className="input" value={custom} onChange={(e) => { setCustom(e.target.value); setErr(''); }} placeholder="Add another skill" aria-label="Add another skill" aria-invalid={!!err} /></Field></div>
        <button className="btn secondary" type="submit"><Plus size={16} />Add</button>
      </form>
      {d.skills.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="label">Your skills ({d.skills.length})</span>
          {d.skills.map((s) => (
            <div key={s.name} className="exp-row">
              <strong className="grow">{s.name}</strong>
              <select className="select" style={{ width: 150, minHeight: 40 }} value={s.level} onChange={(e) => setLevel(s.name, e.target.value)} aria-label={`Level for ${s.name}`}>
                <option>Learning</option><option>Comfortable</option><option>Strong</option>
              </select>
              <button className="btn icon ghost sm" aria-label={`Remove ${s.name}`} onClick={() => toggle(s.name)}><X size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepDocs({ p, setP }) {
  const toggle = (k) => setP({ docsHave: p.docsHave.includes(k) ? p.docsHave.filter((x) => x !== k) : [...p.docsHave, k] });
  return (
    <div className="stack" style={{ gap: 10 }}>
      {DECLARABLE_DOCS.map((doc) => (
        <div key={doc.key} className={`doc-check ${p.docsHave.includes(doc.key) ? 'on' : ''}`}>
          <Checkbox checked={p.docsHave.includes(doc.key)} onChange={() => toggle(doc.key)}><span><strong>{doc.label}</strong></span></Checkbox>
        </div>
      ))}
      <p className="tiny muted" style={{ marginTop: 6 }}>Horizon won’t treat these as uploaded until you add them to your document vault.</p>
    </div>
  );
}

function StepReview({ d, jump }) {
  const p = d.profile;
  const rows = [
    ['About you', `${p.name}${p.city ? `, ${p.city}` : ''} · ${p.country}`, 0],
    ['Academic', `${ACADEMIC_STAGES.find((s) => s.value === p.level)?.label || '—'} · ${p.institution}${p.cgpa && !p.cgpaNA ? ` · CGPA ${p.cgpa}/${p.cgpaScale}` : ''}`, 1],
    ['Studying', p.course, 2],
    ['Goal', goalSummary(p), 3],
    ['Destinations', p.openToAnywhere ? 'Open to anywhere' : p.destinations.join(', ') || 'None chosen', 4],
    ['Achievements', `${d.experiences.filter((e) => ['project', 'competition', 'award', 'certification', 'publication'].includes(e.type)).length} added`, 5],
    ['Skills', d.skills.map((s) => s.name).join(', ') || 'None yet', 6],
    ['Experience', `${d.experiences.filter((e) => ['work', 'internship', 'leadership', 'volunteering', 'research'].includes(e.type)).length} added`, 7],
    ['Documents you have', p.docsHave.map((k) => DECLARABLE_DOCS.find((x) => x.key === k)?.label).join(', ') || 'None yet', 8],
  ];
  return (
    <div className="review">
      {rows.map(([k, v, i]) => (
        <div key={k} className="review-row">
          <div className="grow"><span className="tiny muted">{k}</span><div>{v}</div></div>
          <button className="btn ghost sm" onClick={() => jump(i)} aria-label={`Edit ${k}`}><Pencil size={15} />Edit</button>
        </div>
      ))}
    </div>
  );
}
