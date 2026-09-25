// Postgres storage (Neon). Creates its own tables on start-up.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_state (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state JSONB,
  saved_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS files (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BYTEA NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires BIGINT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS email_log (
  key TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  sent_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS seen_opportunities (
  id TEXT PRIMARY KEY,
  title TEXT,
  first_seen BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value JSONB
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
`;

export async function createDb(root) {
  const url = (process.env.DATABASE_URL || '').trim();
  if (!url) throw new Error('DATABASE_URL is not set. Add your database connection string to .env.');
  // Use strict certificate checking (what "require" means today) without the driver's deprecation warning.
  const connectionString = url.replace(/sslmode=(require|prefer|verify-ca)/, 'sslmode=verify-full');
  // Hosted databases close idle connections, so keep them short-lived and retry once if one drops mid-query.
  const pool = new pg.Pool({ connectionString, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 15000, keepAlive: true });
  pool.on('error', (e) => console.error('[db] idle connection closed:', e.message));
  const transient = (e) => /terminated|ECONNRESET|socket disconnected|timeout|Connection ended|EPIPE|ETIMEDOUT/i.test(e?.message || '');
  const q = async (text, params) => {
    for (let attempt = 1; ; attempt++) {
      try { return await pool.query(text, params); }
      catch (e) { if (attempt >= 3 || !transient(e)) throw e; await new Promise((r) => setTimeout(r, 300 * attempt)); }
    }
  };
  await q(SCHEMA);

  const one = async (text, params) => (await q(text, params)).rows[0] || null;

  const db = {
    q, one,
    getMeta: async (key) => (await one('SELECT value FROM app_meta WHERE key=$1', [key]))?.value ?? null,
    setMeta: (key, value) => q('INSERT INTO app_meta(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value', [key, JSON.stringify(value)]),
    // Records an email once; returns false if that exact email was already sent.
    claimEmail: async (key, userId, kind) => (await q('INSERT INTO email_log(key,user_id,kind,sent_at) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [key, userId, kind, Date.now()])).rowCount === 1,
    releaseEmail: (key) => q('DELETE FROM email_log WHERE key=$1', [key]),
  };

  await migrateFromFiles(root, db);
  return db;
}

// One-time move of accounts created before the database existed (the old .data/ folder).
async function migrateFromFiles(root, db) {
  const dir = path.join(root, '.data');
  const usersFile = path.join(dir, 'users.json');
  if (!fs.existsSync(usersFile)) return;
  const users = JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]');
  let moved = 0;
  for (const u of users) {
    const r = await db.q('INSERT INTO users(id,email,name,salt,hash,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [u.id, u.email, u.name, u.salt, u.hash, u.createdAt]);
    if (!r.rowCount) continue;
    moved++;
    const sf = path.join(dir, 'state', `${u.id}.json`);
    if (fs.existsSync(sf)) {
      const s = JSON.parse(fs.readFileSync(sf, 'utf8'));
      await db.q('INSERT INTO user_state(user_id,state,saved_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [u.id, JSON.stringify(s.state), s.savedAt || Date.now()]);
    }
    const fd = path.join(dir, 'files', u.id);
    if (fs.existsSync(fd)) {
      for (const name of fs.readdirSync(fd).filter((n) => !n.endsWith('.type'))) {
        const data = fs.readFileSync(path.join(fd, name));
        const type = fs.existsSync(path.join(fd, name + '.type')) ? fs.readFileSync(path.join(fd, name + '.type'), 'utf8') : 'application/octet-stream';
        await db.q('INSERT INTO files(user_id,id,type,size,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [u.id, name, type, data.length, data]);
      }
    }
  }
  fs.renameSync(dir, path.join(root, `.data-moved-to-database-${Date.now()}`));
  console.log(`[db] Moved ${moved} existing account(s) into the database.`);
}
