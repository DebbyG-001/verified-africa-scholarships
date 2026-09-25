import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setAccountMode } from './files.js';

const Ctx = createContext(null);

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), credentials: 'same-origin' });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, ...data };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | in | out | offline

  const check = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
      const d = await r.json();
      setUser(d.user); setStatus(d.user ? 'in' : 'out'); setAccountMode(!!d.user);
    } catch { setStatus('offline'); }
  }, []);
  useEffect(() => { check(); }, [check]);

  const signup = async (form) => {
    try {
      const r = await post('/api/auth/signup', form);
      if (r.ok) { setUser(r.user); setStatus('in'); setAccountMode(true); }
      return r;
    } catch { return { ok: false, errors: { form: 'We couldn’t reach Horizon right now. Check your connection and try again.' } }; }
  };
  const signin = async (form) => {
    try {
      const r = await post('/api/auth/signin', form);
      if (r.ok) { setUser(r.user); setStatus('in'); setAccountMode(true); }
      return r;
    } catch { return { ok: false, errors: { form: 'We couldn’t reach Horizon right now. Check your connection and try again.' } }; }
  };
  const signout = async () => {
    try { await post('/api/auth/signout'); } catch { /* still sign out locally */ }
    setUser(null); setStatus('out'); setAccountMode(false);
  };
  const deleteAccount = async (password) => {
    const r = await post('/api/auth/delete', { password });
    if (r.ok) { setUser(null); setStatus('out'); setAccountMode(false); }
    return r;
  };

  return <Ctx.Provider value={{ user, status, signup, signin, signout, deleteAccount, retry: check }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
