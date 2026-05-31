const { getDb, setCors, dbError } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: 'DATABASE_URL not set', fix: 'Add it in Vercel → Project → Settings → Environment Variables.' });
  }
  try {
    const sql = getDb();
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name IN ('stores','store_owners','subscription_plans','subscriptions','locations','rooms','bookings','staff','customers','super_admins')
      ORDER BY table_name
    `;
    const found = tables.map(t => t.table_name);
    const required = ['bookings','customers','locations','rooms','staff','store_owners','stores','subscription_plans','subscriptions','super_admins'];
    const missing = required.filter(t => !found.includes(t));
    if (missing.length) {
      return res.status(500).json({ ok: false, error: `Missing tables: ${missing.join(', ')}`, fix: 'Run schema.sql in Neon Console → SQL Editor.', found, missing });
    }
    const [stores, plans, admins] = await Promise.all([
      sql`SELECT COUNT(*)::int AS n FROM stores`,
      sql`SELECT COUNT(*)::int AS n FROM subscription_plans`,
      sql`SELECT COUNT(*)::int AS n FROM super_admins`
    ]);
    return res.status(200).json({ ok: true, message: 'BNBMS database configured correctly ✓', counts: { stores: stores[0].n, plans: plans[0].n, admins: admins[0].n }, found });
  } catch (err) {
    return res.status(500).json({ ok: false, error: dbError(err), raw: err.message });
  }
};
