// api/auth.js — handles all auth: super-admin, store owner, store staff
const { getDb, setCors, dbError, makeToken } = require('./_db.js');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type } = req.query; // ?type=super | ?type=owner | ?type=staff
  let sql;
  try { sql = getDb(); } catch (err) { return res.status(500).json({ error: err.message }); }

  try {
    // ── SUPER ADMIN LOGIN ──
    if (type === 'super') {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
      const rows = await sql`
        SELECT id, name, email FROM super_admins
        WHERE lower(email) = lower(${email}) AND password_hash = ${password} AND active = true
        LIMIT 1
      `;
      if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });
      const u = rows[0];
      return res.status(200).json({
        id: u.id, name: u.name, email: u.email,
        role: 'super_admin',
        token: makeToken('super', u.id)
      });
    }

    // ── STORE OWNER LOGIN ──
    if (type === 'owner') {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
      const rows = await sql`
        SELECT o.id, o.name, o.email, o.phone,
               s.id AS store_id, s.name AS store_name, s.slug, s.status AS store_status, s.plan_id,
               sub.status AS sub_status, sub.current_period_end,
               p.name AS plan_name
        FROM store_owners o
        JOIN stores s ON s.owner_id = o.id
        LEFT JOIN subscriptions sub ON sub.store_id = s.id AND sub.status IN ('active','trialing')
        LEFT JOIN subscription_plans p ON p.id = s.plan_id
        WHERE lower(o.email) = lower(${email}) AND o.password_hash = ${password} AND o.active = true
        LIMIT 1
      `;
      if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });
      const u = rows[0];
      return res.status(200).json({
        id: u.id, name: u.name, email: u.email, phone: u.phone,
        role: 'store_owner',
        store: { id: u.store_id, name: u.store_name, slug: u.slug, status: u.store_status, planName: u.plan_name },
        token: makeToken('owner', u.id, u.store_id)
      });
    }

    // ── STAFF LOGIN (PIN-based, per store) ──
    if (type === 'staff') {
      const { email, pin, store_id } = req.body || {};
      if (!email || !pin || !store_id) return res.status(400).json({ error: 'Email, PIN and store required' });
      const rows = await sql`
        SELECT id, name, email, role, location_id, store_id, active
        FROM staff
        WHERE lower(email) = lower(${email}) AND pin_hash = ${pin}
          AND store_id = ${store_id} AND active = true
        LIMIT 1
      `;
      if (!rows.length) return res.status(401).json({ error: 'Invalid email or PIN' });
      const u = rows[0];
      return res.status(200).json({
        id: u.id, name: u.name, email: u.email,
        role: u.role, locId: u.location_id, storeId: u.store_id,
        token: makeToken('staff', u.id, u.store_id)
      });
    }

    return res.status(400).json({ error: 'type parameter required: super | owner | staff' });
  } catch (err) {
    return res.status(500).json({ error: dbError(err) });
  }
};
