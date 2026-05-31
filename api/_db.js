const { neon } = require('@neondatabase/serverless');

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables.');
  }
  return neon(process.env.DATABASE_URL);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function dbError(err) {
  const msg = err.message || String(err);
  if (msg.includes('does not exist')) return 'Table not found — run schema.sql in your Neon SQL Editor first.';
  if (msg.includes('DATABASE_URL'))   return 'DATABASE_URL not configured in Vercel environment variables.';
  if (msg.includes('duplicate key'))  return 'A record with that value already exists.';
  if (msg.includes('foreign key'))    return 'Referenced record does not exist.';
  return msg;
}

// Simple token verification — tokens are "superadmin:id" or "owner:id:storeId" base64 encoded
function verifyToken(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const decoded = Buffer.from(auth.slice(7), 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 2) return null;
    return { type: parts[0], id: parts[1], storeId: parts[2] || null };
  } catch { return null; }
}

function makeToken(type, id, storeId) {
  const payload = storeId ? `${type}:${id}:${storeId}` : `${type}:${id}`;
  return Buffer.from(payload).toString('base64');
}

module.exports = { getDb, setCors, dbError, verifyToken, makeToken };
