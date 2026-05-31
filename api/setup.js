const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: 'DATABASE_URL not set', fix: 'Add it in Vercel → Project → Settings → Environment Variables, then redeploy.' });
  }
  try {
    const sql = getDb();
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('locations','rooms','bookings','expenses','staff')
      ORDER BY table_name
    `;
    const found   = tables.map(t => t.table_name);
    const missing = ['bookings','expenses','locations','rooms','staff'].filter(t => !found.includes(t));
    if (missing.length) {
      return res.status(500).json({ ok: false, error: `Missing tables: ${missing.join(', ')}`, fix: 'Run schema.sql in Neon Console → SQL Editor.', found, missing });
    }
    const [l,r,b,e,s] = await Promise.all([
      sql`SELECT COUNT(*)::int AS n FROM locations`,
      sql`SELECT COUNT(*)::int AS n FROM rooms`,
      sql`SELECT COUNT(*)::int AS n FROM bookings`,
      sql`SELECT COUNT(*)::int AS n FROM expenses`,
      sql`SELECT COUNT(*)::int AS n FROM staff`,
    ]);
    return res.status(200).json({ ok: true, message: 'Database configured correctly ✓', counts: { locations: l[0].n, rooms: r[0].n, bookings: b[0].n, expenses: e[0].n, staff: s[0].n } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: dbError(err), raw: err.message, fix: 'Check DATABASE_URL is correct and run schema.sql.' });
  }
};
