// api/_db.js
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function dbError(err) {
  const msg = err.message || String(err);
  if (msg.includes('does not exist')) {
    return 'Table not found — please run schema.sql in your Neon SQL Editor first. Then visit /api/setup to verify.';
  }
  if (msg.includes('DATABASE_URL')) {
    return 'DATABASE_URL not configured. Add it in Vercel → Project → Settings → Environment Variables.';
  }
  if (msg.includes('duplicate key')) return 'A record with that ID already exists.';
  if (msg.includes('foreign key'))   return 'Referenced record does not exist.';
  return msg;
}

module.exports = { getDb, setCors, dbError };
