import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Compass, FolderOpen, Map, PenLine, Sparkles, Target, FileText, Upload, Search, Bookmark, CircleDashed, ShieldCheck } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { useAuth } from '../lib/auth.jsx';
import { IMG, CATEGORY_IMAGES } from '../lib/images.js';
import Logo from '../components/Logo.jsx';
import { SmartImg } from '../components/ui.jsx';

const STEPS = [
  { icon: Target, title: 'Set your goal', body: 'Tell Horizon where you are and where you want to go — like studying AI abroad after your degree.' },
  { icon: Map, title: 'Get a roadmap', body: 'Horizon works backwards from your goal and lays out what to do in each year of study.' },
  { icon: Compass, title: 'Find opportunities', body: 'Browse scholarships, essay competitions and programmes, with clear reasons why each may fit you.' },
  { icon: PenLine, title: 'Apply prepared', body: 'Keep documents in one vault, see what each application needs, and draft essays from your real experience.' },
];

const JOURNEY = [
  { stage: '100 Level', title: 'Build the foundation', points: ['Strong academic start', 'Explore your interests', 'Start collecting evidence'], img: IMG.lecture },
  { stage: '200 Level', title: 'Start building', points: ['First real projects', 'Join communities', 'Identify target opportunities'], img: IMG.teamwork },
  { stage: '300 Level', title: 'Go deeper', points: ['Internships and research', 'Leadership roles', 'First statement drafts'], img: IMG.office },
  { stage: 'Final Year', title: 'Apply with confidence', points: ['Finalise portfolio', 'Request recommendations', 'Submit applications'], img: IMG.heroSmall },
];

export default function Landing() {
  const { state } = useStore();
  const { status } = useAuth();
  const navigate = useNavigate();
  const signedIn = status === 'in';
  const hasProfile = signedIn && !!state.profile;
  const start = () => navigate(!signedIn ? '/signup' : hasProfile ? '/home' : '/start');

  return (
    <div className="landing">
      <header className="l-nav">
        <div className="container topbar-inner">
          <Link to="/" className="brand" aria-label="Horizon home"><Logo /></Link>
          <nav className="l-links" aria-label="Landing">
            <a href="#how">How it works</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#opportunities">Opportunities</a>
            <a href="#vault">Documents</a>
          </nav>
          <div className="row" style={{ gap: 6 }}>
            {!signedIn && <Link to="/signin" className="btn ghost sm">Sign in</Link>}
            <button className="btn primary sm" onClick={start}>{hasProfile ? 'Open my Horizon' : signedIn ? 'Continue setup' : 'Build My Horizon'}</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">For students who plan ahead</span>
            <h1 className="serif">Your future shouldn’t be a last&#8209;minute project.</h1>
            <p className="lead">Horizon helps you prepare early for scholarships, internships, study abroad and your career. Set a goal, follow a year-by-year roadmap, and apply with everything ready.</p>
            <div className="row wrap" style={{ gap: 12, marginTop: 28 }}>
              <button className="btn primary lg" onClick={start}>{hasProfile ? 'Continue to my Horizon' : 'Build My Horizon'}<ArrowRight size={18} /></button>
              <a className="btn secondary lg" href="#how">Explore How It Works</a>
            </div>
            <ul className="hero-points">
              <li><Check size={16} />Free to use</li>
              <li><Check size={16} />Saved to your account, on any device</li>
              <li><Check size={16} />Takes about 5 minutes to set up</li>
            </ul>
          </div>
          <div className="hero-visual" aria-hidden="false">
            <SmartImg className="hv-main" src={IMG.heroMain.src} alt={IMG.heroMain.alt} eager />
            <SmartImg className="hv-side" src={IMG.heroSide.src} alt={IMG.heroSide.alt} eager />
            <div className="hv-card hv-card-1">
              <span className="eyebrow" style={{ fontSize: 11 }}>Your next step</span>
              <strong>Add one leadership experience</strong>
              <span className="tiny muted">Some of your target opportunities value leadership.</span>
            </div>
            <div className="hv-card hv-card-2">
              <div className="row" style={{ gap: 10 }}>
                <div className="mini-ring"><span>62%</span></div>
                <div><strong className="small">Roadmap progress</strong><div className="tiny muted">Illustration</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="l-section">
        <div className="container">
          <div className="l-head">
            <span className="eyebrow">How Horizon works</span>
            <h2 className="serif">From “I want to…” to a plan you can follow.</h2>
            <p>Start with where you are today. Horizon turns your goal into clear steps, shows what you’re missing, and helps you act on it.</p>
          </div>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step-n">0{i + 1}</span>
                <s.icon size={26} strokeWidth={1.6} />
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="example-quote">
            <Sparkles size={20} />
            <p><span className="muted">For example:</span> “I’m a 200-level Computer Science student and I want to study Artificial Intelligence abroad.” Horizon builds your roadmap, identifies your gaps and helps you find opportunities that fit.</p>
          </div>
        </div>
      </section>

      {/* ROADMAP PREVIEW */}
      <section id="roadmap" className="l-section alt">
        <div className="container split">
          <div className="split-copy">
            <span className="eyebrow">Goal-backward roadmap</span>
            <h2 className="serif">Plan backwards from the goal. Work forwards with confidence.</h2>
            <p>Every task comes with why it matters, a timeframe and a priority. Tick things off and your progress updates everywhere in Horizon.</p>
            <ul className="ticks">
              <li><Check size={18} />Year-by-year steps for your level</li>
              <li><Check size={18} />Gap analysis: what you have vs. what your goal needs</li>
              <li><Check size={18} />Encouraging, practical next steps</li>
            </ul>
          </div>
          <div className="preview roadmap-preview" aria-label="Roadmap preview (illustration)">
            <div className="preview-tag">Preview</div>
            {[
              { l: 'Final Year', t: ['Request recommendations', 'Apply to target programmes'], s: 'upcoming' },
              { l: '300 Level', t: ['Seek an internship', 'Build a stronger AI project'], s: 'upcoming' },
              { l: '200 Level', t: ['Build foundational projects', 'Identify target opportunities'], s: 'current' },
              { l: '100 Level', t: ['Build academic foundation', 'Start collecting certificates'], s: 'past' },
            ].map((st) => (
              <div key={st.l} className={`rp-stage ${st.s}`}>
                <div className="rp-dot" />
                <div>
                  <div className="row" style={{ gap: 8 }}><strong>{st.l}</strong>{st.s === 'current' && <span className="badge sun">You are here</span>}</div>
                  {st.t.map((x, i) => (
                    <div key={x} className="rp-task"><span className={`checkbox ${st.s === 'past' || (st.s === 'current' && i === 0) ? 'on' : ''}`}><Check size={13} strokeWidth={3} /></span>{x}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OPPORTUNITIES */}
      <section id="opportunities" className="l-section">
        <div className="container">
          <div className="l-head">
            <span className="eyebrow">Opportunity discovery</span>
            <h2 className="serif">Real opportunities, organised around you.</h2>
            <p>Horizon brings in scholarship and essay-competition listings from trusted sources, then lets you search, filter by deadline, level and field, and save the ones worth pursuing.</p>
          </div>
          <div className="cat-strip">
            {['Scholarship', 'Essay competition', 'Fellowship', 'Programme'].map((c) => (
              <div key={c} className="cat-tile">
                <SmartImg src={CATEGORY_IMAGES[c].src} alt="" />
                <span>{c === 'Programme' ? 'Programmes' : c + 's'}</span>
              </div>
            ))}
          </div>
          <div className="feature-row">
            <div><Search size={20} /><strong>Search and filter</strong><span>By deadline, level, field, location, funding and type.</span></div>
            <div><Target size={20} /><strong>Why this may match you</strong><span>Clear reasons based on your profile and the listing’s own criteria. Never a guarantee.</span></div>
            <div><Bookmark size={20} /><strong>Save and track</strong><span>Saved opportunities become applications you can prepare step by step.</span></div>
            <div><ShieldCheck size={20} /><strong>Source and trust</strong><span>Every listing shows where it came from and whether it links to a recognised funder.</span></div>
          </div>
        </div>
      </section>

      {/* VAULT + PREPARE */}
      <section id="vault" className="l-section alt">
        <div className="container split reverse">
          <div className="split-copy">
            <span className="eyebrow">Document vault</span>
            <h2 className="serif">Upload once. Use everywhere.</h2>
            <p>Keep your transcript, CV, certificates and recommendation letters organised in one place. Horizon checks them against what each opportunity asks for.</p>
            <ul className="ticks">
              <li><Check size={18} />Drag-and-drop uploads with previews</li>
              <li><Check size={18} />Automatic categories you can change</li>
              <li><Check size={18} />See what’s missing for each application</li>
            </ul>
          </div>
          <div className="preview vault-preview" aria-label="Document vault preview (illustration)">
            <div className="preview-tag">Preview</div>
            <div className="vp-drop"><Upload size={22} /><strong>Drop your documents here</strong><span className="tiny muted">PDF, Word, JPG, PNG or text</span></div>
            {[['Transcript_2025.pdf', 'Academic', 'ok'], ['My_CV.docx', 'Career', 'ok'], ['Recommendation letter', 'Recommendations', 'missing']].map(([n, c, s]) => (
              <div key={n} className="vp-file">
                {s === 'ok' ? <FileText size={18} /> : <CircleDashed size={18} />}
                <span className="grow">{n}<span className="tiny muted" style={{ display: 'block' }}>{c}</span></span>
                <span className={`badge ${s === 'ok' ? 'ok' : 'warn'}`}>{s === 'ok' ? 'Ready' : 'Missing'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="container split" style={{ marginTop: 80 }}>
          <div className="split-copy">
            <span className="eyebrow">Application preparation</span>
            <h2 className="serif">Know exactly what’s ready and what isn’t.</h2>
            <p>Open any opportunity to see your application readiness. Draft personal statements from your real experiences. Horizon never invents achievements, and asks you when something is missing.</p>
            <ul className="ticks">
              <li><Check size={18} />Readiness checklist per opportunity</li>
              <li><Check size={18} />Essay builder: generate, edit, shorten, expand</li>
              <li><Check size={18} />CV builder that uses your own profile</li>
            </ul>
          </div>
          <div className="preview prep-preview" aria-label="Application readiness preview (illustration)">
            <div className="preview-tag">Preview</div>
            <strong className="serif" style={{ fontSize: 20 }}>Application readiness</strong>
            <div className="pp-cols">
              <div><span className="eyebrow" style={{ fontSize: 11 }}>Complete</span>{['Profile', 'CV', 'Transcript'].map((x) => <div key={x} className="pp-item ok"><Check size={15} />{x}</div>)}</div>
              <div><span className="eyebrow" style={{ fontSize: 11 }}>Missing</span>{['Recommendation letter', 'Personal statement'].map((x) => <div key={x} className="pp-item miss"><CircleDashed size={15} />{x}</div>)}</div>
            </div>
            <div className="btn primary sm" aria-hidden="true" style={{ pointerEvents: 'none', alignSelf: 'flex-start' }}>Prepare My Application</div>
          </div>
        </div>
      </section>

      {/* MATCHING */}
      <section className="l-section">
        <div className="container match-band">
          <SmartImg className="match-img" src={IMG.matching.src} alt={IMG.matching.alt} />
          <div className="match-copy">
            <span className="eyebrow">Personalised, honest matching</span>
            <h2 className="serif">Why this may match you — in plain words.</h2>
            <p>Horizon compares your level, field, background and goal with what each listing actually says. It highlights the criteria worth double-checking, and it never claims you’re eligible.</p>
            <div className="match-line" style={{ marginTop: 18 }}><Sparkles size={16} /><span>“It mentions undergraduate students, and you’re in 200 Level.”</span></div>
            <div className="match-line" style={{ marginTop: 8, background: 'var(--warn-soft)', color: '#6B3F07' }}><CircleDashed size={16} /><span>“Check: open to final-year students only.”</span></div>
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section className="l-section alt">
        <div className="container">
          <div className="l-head">
            <span className="eyebrow">The student journey</span>
            <h2 className="serif">Small steps each year add up.</h2>
          </div>
          <div className="journey">
            {JOURNEY.map((j) => (
              <article key={j.stage} className="journey-card">
                <SmartImg src={j.img.src} alt={j.img.alt} />
                <div className="journey-body">
                  <span className="badge light">{j.stage}</span>
                  <h3 className="serif">{j.title}</h3>
                  <ul>{j.points.map((p) => <li key={p}>{p}</li>)}</ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <SmartImg className="final-bg" src={IMG.campus.src} alt="" />
        <div className="container final-inner">
          <h2 className="serif">Build early. Apply with confidence.</h2>
          <p>Set your goal in a few minutes and get a roadmap made for your level, your field and where you want to go.</p>
          <button className="btn light lg" onClick={start}>{hasProfile ? 'Continue to my Horizon' : 'Build My Horizon'}<ArrowRight size={18} /></button>
        </div>
      </section>

      <footer className="l-foot">
        <div className="container row between wrap">
          <Logo />
          <nav className="row wrap small" aria-label="Footer" style={{ gap: 20 }}>
            <a href="#how">How it works</a><a href="#roadmap">Roadmap</a><a href="#opportunities">Opportunities</a><a href="#vault">Documents</a>
            <button className="link" onClick={start}>{hasProfile ? 'Open Horizon' : 'Get started'}</button>
          </nav>
          <span className="tiny muted">Opportunity details come from their original sources. Always confirm on the official page before applying.</span>
        </div>
      </footer>
    </div>
  );
}
