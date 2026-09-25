import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Eye, EyeOff, MailCheck } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { IMG } from '../lib/images.js';
import Logo from '../components/Logo.jsx';
import { Field, SmartImg, Spinner, useToast } from '../components/ui.jsx';

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
    return { ok: r.ok, ...(await r.json().catch(() => ({}))) };
  } catch { return { ok: false, errors: { form: 'We couldn’t reach Horizon right now. Check your connection and try again.' } }; }
}

function Shell({ children, heading, text }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <SmartImg className="auth-img" src={IMG.library.src} alt={IMG.library.alt} eager />
        <div className="auth-side-inner">
          <Link to="/" className="brand" aria-label="Horizon home"><Logo light /></Link>
          <div><h2 className="serif">{heading}</h2><p>{text}</p></div>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-top">
          <Link to="/" className="brand show-auth-sm" aria-label="Horizon home"><Logo /></Link>
          <Link className="link small" to="/signin"><ArrowLeft size={14} /> Back to sign in</Link>
        </div>
        {children}
      </main>
    </div>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErrors({ email: 'Enter a valid email address.' });
    setBusy(true);
    const r = await post('/api/auth/forgot', { email: email.trim() });
    setBusy(false);
    if (!r.ok) return setErrors(r.errors || { form: 'We couldn’t complete that right now. Try again in a moment.' });
    setSent(true);
  };

  return (
    <Shell heading="Locked out? It happens." text="We’ll email you a secure link to choose a new password. Your roadmap and documents stay exactly as they are.">
      {sent ? (
        <div className="auth-form" role="status">
          <div className="auth-icon"><MailCheck size={26} /></div>
          <span className="eyebrow">Check your email</span>
          <h1 className="serif">Look for our email</h1>
          <p className="muted">If an account exists for <strong>{email.trim()}</strong>, we’ve sent a link to reset your password. It works once and expires in 1 hour.</p>
          <p className="small muted">Nothing there after a few minutes? Check your spam or promotions folder, or <button className="link" onClick={() => setSent(false)}>try again</button>.</p>
          <Link to="/signin" className="btn secondary block">Back to sign in</Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          <span className="eyebrow">Forgot password</span>
          <h1 className="serif">Reset your password</h1>
          <p className="muted">Enter the email you signed up with and we’ll send you a reset link.</p>
          {errors.form && <div className="notice bad" role="alert"><AlertCircle size={18} /><span>{errors.form}</span></div>}
          <Field label="Email" id="fp-email" error={errors.email}>
            <input id="fp-email" className="input" type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setErrors({}); }} aria-invalid={!!errors.email} />
          </Field>
          <button className="btn primary lg block" type="submit" disabled={busy}>{busy ? <><Spinner />Sending…</> : <>Send reset link<ArrowRight size={18} /></>}</button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const toast = useToast();
  const { retry } = useAuth();
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(!token);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 8) return setErrors({ password: 'Use at least 8 characters.' });
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setErrors({ password: 'Include at least one letter and one number.' });
    setBusy(true);
    const r = await post('/api/auth/reset', { token, password: pw });
    setBusy(false);
    if (!r.ok) { if (r.expired) setExpired(true); return setErrors(r.errors || { form: 'We couldn’t complete that right now. Try again in a moment.' }); }
    await retry();
    toast('Password changed. You’re signed in.');
    navigate('/home', { replace: true });
  };
  const checks = [['8+ characters', pw.length >= 8], ['A letter', /[A-Za-z]/.test(pw)], ['A number', /\d/.test(pw)]];

  return (
    <Shell heading="Choose a new password." text="For your security, you’ll be signed out on other devices once it’s changed.">
      {expired ? (
        <div className="auth-form">
          <div className="auth-icon warn"><AlertCircle size={26} /></div>
          <h1 className="serif">This link has expired</h1>
          <p className="muted">Reset links work once and last 1 hour. Request a new one and use it straight away.</p>
          <Link to="/forgot-password" className="btn primary lg block">Request a new link</Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          <span className="eyebrow">Reset password</span>
          <h1 className="serif">Choose a new password</h1>
          {errors.form && <div className="notice bad" role="alert"><AlertCircle size={18} /><span>{errors.form}</span></div>}
          <Field label="New password" id="rp-pw" error={errors.password}>
            <div className="pw-wrap">
              <input id="rp-pw" className="input" type={show ? 'text' : 'password'} autoComplete="new-password" autoFocus value={pw} onChange={(e) => { setPw(e.target.value); setErrors({}); }} aria-invalid={!!errors.password} maxLength={200} />
              <button type="button" className="pw-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </Field>
          <ul className="pw-checks" aria-label="Password requirements">{checks.map(([l, ok]) => <li key={l} className={ok ? 'ok' : ''}><Check size={13} strokeWidth={3} />{l}</li>)}</ul>
          <button className="btn primary lg block" type="submit" disabled={busy}>{busy ? <><Spinner />Saving…</> : <>Save new password<ArrowRight size={18} /></>}</button>
        </form>
      )}
    </Shell>
  );
}
