// Server-side connection to the existing "Africa Scholarship and Essay Crawler" Actor on Apify.
// The APIFY_API_TOKEN secret is only ever read here and sent in an Authorization header to Apify.
// It is never written to responses, logs or the browser bundle.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeAll } from './normalize.js';

const ACTOR = 'seyi_glory~africa-scholarship-and-essay-crawler';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // reuse results for 6 hours
const MIN_REFRESH_GAP_MS = 5 * 60 * 1000; // never start fresh crawls more often than every 5 minutes

// Mirrors the Actor's documented input prefill so a fresh run crawls the same trusted sources.
const RUN_INPUT = {
  startUrls: [{ url: 'https://scholarsworld.ng/all-scholarships/' }, { url: 'https://brainsbeyondborders.org/' }],
  maxRequestsPerCrawl: 60,
  trustedDomains: [
    'daad.de', 'ec.europa.eu', 'mastercardfdn.org', 'chevening.org', 'fulbright.org', 'docs.google.com', 'forms.gle',
    'airbus.com', 'un.org', 'fao.org', 'who.int', 'worldbank.org', 'gatesfoundation.org', 'fordfoundation.org',
    'microsoft.com', 'ox.ac.uk', 'cam.ac.uk', 'harvard.edu', 'mit.edu', 'stanford.edu',
  ],
};

export function createOpportunityService(root) {
  const cacheDir = path.join(root, '.cache');
  const cacheFile = path.join(cacheDir, 'opportunities.json');
  let cache = readDiskCache();
  let inflight = null;
  let lastFreshRun = 0;

  function base() { return (process.env.APIFY_BASE_URL || 'https://api.apify.com').replace(/\/$/, ''); }
  function token() { return (process.env.APIFY_API_TOKEN || '').trim(); }

  function readDiskCache() {
    try { return JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch { return null; }
  }
  function writeDiskCache(data) {
    try { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(data)); } catch { /* cache is optional */ }
  }

  async function call(url, init = {}, timeoutMs = 60000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: ctrl.signal,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
      });
      return res;
    } finally { clearTimeout(t); }
  }

  async function fromLastRun() {
    const res = await call(`${base()}/v2/acts/${ACTOR}/runs/last/dataset/items?status=SUCCEEDED&clean=true&format=json`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`last-run ${res.status}`);
    const items = await res.json();
    return Array.isArray(items) && items.length ? items : null;
  }

  async function freshRun() {
    lastFreshRun = Date.now();
    const res = await call(
      `${base()}/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=280&clean=true&format=json`,
      { method: 'POST', body: JSON.stringify(RUN_INPUT) },
      300000,
    );
    if (!res.ok) throw new Error(`run ${res.status}`);
    const items = await res.json();
    return Array.isArray(items) ? items : [];
  }

  async function load({ refresh = false } = {}) {
    if (!token()) return { status: 'unavailable', reason: 'not_connected' };

    const fresh = cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
    if (fresh && !refresh) return { status: 'ok', ...cache };
    if (refresh && Date.now() - lastFreshRun < MIN_REFRESH_GAP_MS && cache) return { status: 'ok', ...cache, note: 'recent' };

    if (!inflight) {
      inflight = (async () => {
        let raw = refresh ? null : await fromLastRun().catch(() => null);
        if (!raw) raw = await freshRun();
        const items = normalizeAll(raw);
        cache = { items, fetchedAt: Date.now() };
        writeDiskCache(cache);
        return cache;
      })().finally(() => { inflight = null; });
    }
    try {
      const data = await inflight;
      return { status: 'ok', ...data };
    } catch (err) {
      console.error('[opportunities] could not load:', err.message);
      if (cache) return { status: 'ok', ...cache, stale: true };
      return { status: 'unavailable', reason: 'failed' };
    }
  }

  return { load, isConnected: () => Boolean(token()) };
}
