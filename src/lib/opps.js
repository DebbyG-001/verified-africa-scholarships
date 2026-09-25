import { useEffect, useSyncExternalStore } from 'react';

// Shared opportunity feed. Loaded once, reused across pages.
let snapshot = { status: 'idle', items: [], fetchedAt: null, stale: false };
const subs = new Set();
const set = (patch) => { snapshot = { ...snapshot, ...patch }; subs.forEach((f) => f()); };
let inflight = null;

export function loadOpportunities({ refresh = false } = {}) {
  if (inflight) return inflight;
  if (snapshot.status === 'ok' && !refresh) return Promise.resolve(snapshot);
  set({ status: snapshot.items.length ? 'refreshing' : 'loading' });
  inflight = fetch(`/api/opportunities${refresh ? '?refresh=1' : ''}`)
    .then((r) => r.json())
    .then((data) => {
      if (data.status === 'ok') set({ status: 'ok', items: data.items || [], fetchedAt: data.fetchedAt, stale: !!data.stale });
      else set({ status: data.reason === 'not_connected' ? 'not_connected' : 'error' });
      return snapshot;
    })
    .catch(() => { set({ status: snapshot.items.length ? 'ok' : 'error', stale: true }); return snapshot; })
    .finally(() => { inflight = null; });
  return inflight;
}

export function useOpportunities({ auto = true } = {}) {
  const snap = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => snapshot);
  useEffect(() => { if (auto && snapshot.status === 'idle') loadOpportunities(); }, [auto]);
  return { ...snap, reload: (refresh = false) => loadOpportunities({ refresh }) };
}

export function findOpportunity(id, saved) {
  return snapshot.items.find((o) => o.id === id) || saved?.[id]?.opp || null;
}

export const OPP_TYPES = ['Scholarship', 'Essay competition', 'Fellowship', 'Internship', 'Grant', 'Competition', 'Programme', 'Conference', 'Opportunity'];
