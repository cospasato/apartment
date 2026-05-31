const { neon } = require('@neondatabase/serverless');

function getDb() {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL not set. Add it in Vercel → Project → Settings → Environment Variables.');
  return neon(process.env.DATABASE_URL);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Tenant-Id,X-Staff-Id,X-Super');
}

function dbErr(err) {
  const m = err.message || String(err);
  if (m.includes('does not exist'))  return 'Table not found — run schema.sql in Neon SQL Editor first.';
  if (m.includes('duplicate key'))   return 'A record with that value already exists.';
  if (m.includes('foreign key'))     return 'Referenced record does not exist.';
  if (m.includes('DATABASE_URL'))    return 'Database not configured. Add DATABASE_URL to Vercel env vars.';
  return m;
}

module.exports = { getDb, setCors, dbErr };
