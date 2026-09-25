import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useStore } from '../lib/store.jsx';
import { IMG } from '../lib/images.js';
import Logo from '../components/Logo.jsx';
import { Field, SmartImg, Spinner, useToast } from '../components/ui.jsx';

export default function Auth({ mode }) {
  const isSignup = mode === 'signup';
  const { signup, signin, status } = useAuth();
  const { state, ready } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const loc = useLocation();
  const next = new URLSearchParams(loc.search).get('next');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const firstRef = useRef(null);

  // Already signed in: continue to the right place once the account's data has loaded.
  useEffect(() => {
    if (status === 'in' && ready) navigate(state.profile ? (next && next.startsWith('/') ? next : '/home') : '/start', { replace: true });
  }, [status, ready, state.profile]); // eslint-disable-line
  useEffect(() => { setErrors({}); firstRef.current?.focus(); }, [mode]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined, form: undefined })); };

  const validate = () => {
    const e = {};
    if (isSignup && !form.name.trim()) e.name = 'Tell us your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (!form.password) e.password = 'Enter your password.';
    else if (isSignup && form.password.length < 8) e.password = 'Use at least 8 characters.';
    else if (isSignup && (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))) e.password = 'Include at least one letter and one number.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { setTimeout(() => document.querySelector('.auth-form [aria-invalid="true"]')?.focus(), 20); return; }
    setBusy(true);
    const r = isSignup ? await signup({ name: form.name.trim(), email: form.email.trim(), password: form.password }) : await signin({ email: form.email.trim(), password: form.password });
    setBusy(false);
    if (!r.ok) { setErrors(r.errors || { form: 'We couldn’t complete that right now. Try again in a moment.' }); return; }
    toast(isSignup ? `Welcome to Horizon, ${r.user.name.split(' ')[0]}.` : `Welcome back, ${r.user.name.split(' ')[0]}.`);
  };

  const pw = form.password;
  const checks = [['8+ characters', pw.length >= 8], ['A letter', /[A-Za-z]/.test(pw)], ['A number', /\d/.test(pw)]];

  return (
    <div className="auth">
      <aside className="auth-side">
        <SmartImg className="auth-img" src={(isSignup ? IMG.heroMain : IMG.studyGroup).src} alt={(isSignup ? IMG.heroMain : IMG.studyGroup).alt} eager />
        <div className="auth-side-inner">
          <Link to="/" className="brand" aria-label="Horizon home"><Logo light /></Link>
          <div>
            <h2 className="serif">{isSignup ? 'Your future shouldn’t be a last-minute project.' : 'Pick up right where you left off.'}</h2>
            <p>{isSignup ? 'Create your account to save your roadmap, documents and applications — and reach them from any device.' : 'Your roadmap, documents, drafts and applications are saved to your account.'}</p>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-top">
          <Link to="/" className="brand show-auth-sm" aria-label="Horizon home"><Logo /></Link>
          <span className="small muted">{isSignup ? 'Already have an account?' : 'New to Horizon?'} <Link className="link" to={`/${isSignup ? 'signin' : 'signup'}${loc.search}`}>{isSignup ? 'Sign in' : 'Create an account'}</Link></span>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate key={mode}>
          <span className="eyebrow">{isSignup ? 'Create your account' : 'Sign in'}</span>
          <h1 className="serif">{isSignup ? 'Build your Horizon' : 'Welcome back'}</h1>
          <p className="muted">{isSignup ? 'It takes a minute. Then we’ll set up your goal and roadmap together.' : 'Sign in to continue to your dashboard.'}</p>

          {errors.form && <div className="notice bad" role="alert"><AlertCircle size={18} /><span>{errors.form}</span></div>}
          {status === 'offline' && <div className="notice warn" role="alert"><AlertCircle size={18} /><span>We couldn’t reach Horizon right now. Check your connection and try again.</span></div>}

          {isSignup && (
            <Field label="Full name" id="au-name" error={errors.name}>
              <input ref={firstRef} id="au-name" className="input" autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} maxLength={80} />
            </Field>
          )}
          <Field label="Email" id="au-email" error={errors.email}>
            <input ref={isSignup ? undefined : firstRef} id="au-email" className="input" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errors.email} maxLength={120} />
          </Field>
          {!isSignup && <Link to="/forgot-password" className="link small forgot-link">Forgot password?</Link>}
          <Field label="Password" id="au-pw" error={errors.password}>
            <div className="pw-wrap">
              <input id="au-pw" className="input" type={show ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} value={form.password} onChange={(e) => set('password', e.target.value)} aria-invalid={!!errors.password} maxLength={200} />
              <button type="button" className="pw-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </Field>
          {isSignup && (
            <ul className="pw-checks" aria-label="Password requirements">
              {checks.map(([l, ok]) => <li key={l} className={ok ? 'ok' : ''}><Check size={13} strokeWidth={3} />{l}</li>)}
            </ul>
          )}

          <button className="btn primary lg block" type="submit" disabled={busy || status === 'loading'}>
            {busy ? <><Spinner />{isSignup ? 'Creating your account…' : 'Signing you in…'}</> : <>{isSignup ? 'Create account' : 'Sign in'}<ArrowRight size={18} /></>}
          </button>


          {isSignup && state.profile && !state.ownerId && <p className="tiny muted"><Check size={12} /> The setup you’ve already done on this device will be saved to your new account.</p>}
          <p className="tiny muted auth-privacy"><ShieldCheck size={13} /> Your password is stored securely hashed, never in plain text.</p>
        </form>
      </main>
    </div>
  );
}
