import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildRoadmap } from './roadmap.js';
import { clearFiles, deleteFile, pushLocalFile } from './files.js';
import { useAuth } from './auth.jsx';

const KEY = 'horizon:v1';
export const uid = (p = '') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const EMPTY = {
  profile: null,
  roadmap: null,
  experiences: [],
  skills: [],
  documents: [],
  saved: {}, // oppId -> { opp snapshot, savedAt }
  applications: [],
  essays: [],
  cv: null,
  activity: [],
  dismissedNudges: {},
  gapOverrides: {}, // gap key -> 'done' | 'not-needed'
  courseNotes: [],
  settings: { nudges: true },
  onboardingDraft: null,
  ownerId: null, // account this device copy belongs to
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch { return EMPTY; }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);
  const [saveError, setSaveError] = useState(false);
  const first = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pendingApps = useRef({});

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    try { localStorage.setItem(KEY, JSON.stringify(state)); setSaveError(false); } catch { setSaveError(true); }
  }, [state]);

  // keep tabs in sync
  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY) setState(load()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ---- account sync: the account copy is the source of truth; this device keeps a working copy ----
  const { user, status } = useAuth();
  // Which account the in-memory data belongs to; "ready" only when it matches the signed-in account.
  const [loadedFor, setLoadedFor] = useState(null);
  const ready = status === 'in' ? loadedFor === user?.id : status !== 'loading';
  const [sync, setSync] = useState('idle'); // idle | saving | saved | error
  const skipPush = useRef(false);
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => { if (sync !== 'error' || status !== 'in') return; const t = setTimeout(() => setRetryTick((n) => n + 1), 15000); return () => clearTimeout(t); }, [sync, status]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'in') {
      // Signed out: never leave another student's information on a shared device.
      if (stateRef.current.ownerId) { clearFiles().catch(() => {}); setState(EMPTY); }
      setLoadedFor(null);
      return;
    }
    let cancelled = false;
    setLoadedFor(null);
    fetch('/api/me/state', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then(async (remote) => {
        if (cancelled) return;
        const local = stateRef.current;
        if (remote.state) {
          if (local.ownerId !== user.id) await clearFiles().catch(() => {});
          skipPush.current = true;
          setState({ ...EMPTY, ...remote.state, ownerId: user.id });
        } else if (local.ownerId && local.ownerId !== user.id) {
          await clearFiles().catch(() => {});
          setState({ ...EMPTY, ownerId: user.id });
        } else {
          // New account: keep what the student already set up on this device and move it into the account.
          setState({ ...local, ownerId: user.id });
          for (const d of local.documents || []) pushLocalFile(d.id).catch(() => {});
        }
        setLoadedFor(user.id);
      })
      .catch(() => { if (!cancelled) { setSync('error'); setLoadedFor(user.id); } });
    return () => { cancelled = true; };
  }, [status, user?.id]); // eslint-disable-line

  useEffect(() => {
    if (!ready || status !== 'in' || state.ownerId !== user?.id) return;
    if (skipPush.current) { skipPush.current = false; return; }
    setSync('saving');
    const t = setTimeout(() => {
      fetch('/api/me/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ state }) })
        .then((r) => setSync(r.ok ? 'saved' : 'error'))
        .catch(() => setSync('error'));
    }, 800);
    return () => clearTimeout(t);
  }, [state, ready, status, retryTick]); // eslint-disable-line

  const update = useCallback((fn) => setState((s) => fn(s)), []);

  const log = (s, text, to) => ({ ...s, activity: [{ id: uid('a'), text, to, at: Date.now() }, ...s.activity].slice(0, 60) });

  const actions = useMemo(() => ({
    update,
    log: (text, to) => update((s) => log(s, text, to)),

    saveOnboardingDraft: (draft) => update((s) => ({ ...s, onboardingDraft: draft })),
    completeOnboarding: ({ profile, experiences, skills }) => update((s) => {
      const next = {
        ...s, profile: { ...profile, createdAt: Date.now() },
        experiences, skills, onboardingDraft: null,
      };
      next.roadmap = buildRoadmap(next.profile, s.roadmap);
      return log(next, 'Built your Horizon roadmap', '/roadmap');
    }),
    updateProfile: (patch, { rebuild = false } = {}) => update((s) => {
      const profile = { ...s.profile, ...patch, goal: { ...s.profile?.goal, ...(patch.goal || {}) } };
      const next = { ...s, profile };
      if (rebuild) next.roadmap = buildRoadmap(profile, s.roadmap);
      return log(next, rebuild ? 'Updated your goal and roadmap' : 'Updated your profile', '/profile');
    }),

    toggleTask: (id) => update((s) => {
      const tasks = s.roadmap.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? Date.now() : null } : t));
      const t = tasks.find((x) => x.id === id);
      const next = { ...s, roadmap: { ...s.roadmap, tasks } };
      return t.done ? log(next, `Completed “${t.title}”`, '/roadmap') : next;
    }),
    setTaskNotes: (id, notes) => update((s) => ({ ...s, roadmap: { ...s.roadmap, tasks: s.roadmap.tasks.map((t) => (t.id === id ? { ...t, notes } : t)) } })),
    addTask: (task) => update((s) => log({ ...s, roadmap: { ...s.roadmap, tasks: [...s.roadmap.tasks, { id: uid('t'), custom: true, done: false, notes: '', priority: 'Medium', why: '', explanation: '', timeframe: '', ...task }] } }, `Added “${task.title}” to your roadmap`, '/roadmap')),
    removeTask: (id) => update((s) => ({ ...s, roadmap: { ...s.roadmap, tasks: s.roadmap.tasks.filter((t) => t.id !== id) } })),

    addExperience: (exp) => update((s) => log({ ...s, experiences: [{ ...exp, id: uid('e') }, ...s.experiences] }, `Added “${exp.title}” to your profile`, '/profile')),
    updateExperience: (id, patch) => update((s) => ({ ...s, experiences: s.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
    removeExperience: (id) => update((s) => ({ ...s, experiences: s.experiences.filter((e) => e.id !== id) })),
    setSkills: (skills) => update((s) => ({ ...s, skills })),

    addDocument: (doc) => update((s) => log({ ...s, documents: [doc, ...s.documents] }, `Uploaded ${doc.name}`, `/documents?open=${doc.id}`)),
    updateDocument: (id, patch) => update((s) => ({ ...s, documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d)) })),
    removeDocument: (id) => { deleteFile(id).catch(() => {}); update((s) => ({ ...s, documents: s.documents.filter((d) => d.id !== id) })); },

    toggleSave: (opp) => update((s) => {
      const saved = { ...s.saved };
      if (saved[opp.id]) { delete saved[opp.id]; return { ...s, saved }; }
      saved[opp.id] = { opp, savedAt: Date.now() };
      return log({ ...s, saved }, `Saved ${opp.title}`, `/opportunities/${opp.id}`);
    }),

    startApplication: (opp) => {
      const found = stateRef.current.applications.find((a) => a.oppId === opp.id);
      if (found) return found.id;
      const pend = pendingApps.current[opp.id];
      if (pend && Date.now() - pend.at < 3000) return pend.id;
      const id = uid('app');
      pendingApps.current[opp.id] = { id, at: Date.now() };
      update((s) => {
        if (s.applications.some((a) => a.oppId === opp.id)) return s;
        const app = {
          id, oppId: opp.id, opp, status: 'preparing', notes: '', createdAt: Date.now(), updatedAt: Date.now(),
          checks: {}, essayIds: [], history: [{ status: 'preparing', at: Date.now() }],
        };
        const saved = s.saved[opp.id] ? s.saved : { ...s.saved, [opp.id]: { opp, savedAt: Date.now() } };
        return log({ ...s, saved, applications: [app, ...s.applications] }, `Started preparing ${opp.title}`, `/applications/${id}`);
      });
      return id;
    },
    addApplicationManual: (data) => {
      const id = uid('app');
      update((s) => log({
        ...s, applications: [{
          id, oppId: null, status: 'interested', notes: data.notes || '', createdAt: Date.now(), updatedAt: Date.now(), checks: {}, essayIds: [],
          history: [{ status: 'interested', at: Date.now() }],
          opp: { id: null, title: data.title, provider: data.provider || '', deadline: data.deadline || null, deadlineText: '', applyLink: data.link || '', requiredDocuments: [], eligibility: [], type: data.type || 'Opportunity', manual: true },
        }, ...s.applications],
      }, `Added ${data.title} to applications`, `/applications/${id}`));
      return id;
    },
    setApplicationStatus: (id, status) => update((s) => {
      const app = s.applications.find((a) => a.id === id);
      if (!app || app.status === status) return s;
      const applications = s.applications.map((a) => (a.id === id ? { ...a, status, updatedAt: Date.now(), history: [...(a.history || []), { status, at: Date.now() }] } : a));
      return log({ ...s, applications }, `Moved ${app.opp.title} to ${status === 'ready' ? 'Ready to Apply' : status[0].toUpperCase() + status.slice(1)}`, `/applications/${id}`);
    }),
    updateApplication: (id, patch) => update((s) => ({ ...s, applications: s.applications.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a)) })),
    removeApplication: (id) => update((s) => ({ ...s, applications: s.applications.filter((a) => a.id !== id) })),

    saveEssay: (essay) => update((s) => {
      const exists = s.essays.some((e) => e.id === essay.id);
      const essays = exists ? s.essays.map((e) => (e.id === essay.id ? { ...essay, updatedAt: Date.now() } : e)) : [{ ...essay, updatedAt: Date.now(), createdAt: Date.now() }, ...s.essays];
      let applications = s.applications;
      if (essay.appId) applications = applications.map((a) => (a.id === essay.appId && !a.essayIds.includes(essay.id) ? { ...a, essayIds: [...a.essayIds, essay.id], status: ['interested', 'preparing'].includes(a.status) ? 'drafting' : a.status } : a));
      const next = { ...s, essays, applications };
      return exists ? next : log(next, `Saved a draft: ${essay.title}`, `/essays/${essay.id}`);
    }),
    removeEssay: (id) => update((s) => ({ ...s, essays: s.essays.filter((e) => e.id !== id), applications: s.applications.map((a) => ({ ...a, essayIds: a.essayIds.filter((x) => x !== id) })) })),

    saveCV: (cv) => update((s) => log({ ...s, cv: { ...cv, updatedAt: Date.now() } }, 'Saved your CV', '/cv')),

    dismissNudge: (id) => update((s) => ({ ...s, dismissedNudges: { ...s.dismissedNudges, [id]: Date.now() + 3 * 864e5 } })),
    setGapOverride: (key, value) => update((s) => {
      const gapOverrides = { ...s.gapOverrides };
      if (value) gapOverrides[key] = value; else delete gapOverrides[key];
      return { ...s, gapOverrides };
    }),
    addCourseNote: (note) => update((s) => ({ ...s, courseNotes: [{ ...note, id: uid('n'), at: Date.now() }, ...s.courseNotes] })),
    removeCourseNote: (id) => update((s) => ({ ...s, courseNotes: s.courseNotes.filter((n) => n.id !== id) })),
    setSettings: (patch) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

    exportData: () => JSON.stringify({ app: 'horizon', version: 1, exportedAt: new Date().toISOString(), data: { ...state } }, null, 2),
    importData: (text) => {
      const parsed = JSON.parse(text);
      if (parsed?.app !== 'horizon' || !parsed.data) throw new Error('not horizon');
      setState({ ...EMPTY, ...parsed.data, ownerId: stateRef.current.ownerId });
    },
    clearDevice: async () => {
      await clearFiles().catch(() => {});
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      skipPush.current = true;
      setState(EMPTY);
    },
    resetAll: async () => {
      await clearFiles().catch(() => {});
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      setState(EMPTY);
    },
  }), [update, state]);

  return <Ctx.Provider value={{ state, ...actions, saveError, ready, sync }}>{children}</Ctx.Provider>;
}

export function useStore() { return useContext(Ctx); }
